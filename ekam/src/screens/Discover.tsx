import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Portrait';
import { HeroCaption, PhotoHero, ProfileBody } from '../components/ProfileBody';
import { Empty, Segmented, Sheet, Skeleton, ToggleRow, TopBar } from '../components/ui';
import { effectiveReach, ensureDaily, refreshDaily } from '../domain/discovery';
import { entitlements } from '../domain/entitlements';
import { INTENT_LABEL, REACH_LABEL } from '../domain/labels';
import {
  expressInterest,
  hasInterest,
  hasPassed,
  name,
  other,
  pass,
  primaryOf,
  startPrimary,
  updateSettings,
  type InterestOutcome,
} from '../domain/rules';
import type { DiscoveryFilters, Intent, Kind } from '../domain/types';
import { useStore } from '../state/store';

type Result = { id: string; outcome: InterestOutcome };

export function DiscoverScreen() {
  const { state, viewer, act } = useStore();
  const [params, setParams] = useSearchParams();
  const canFriend = viewer.profile.openTo.includes('friendship');
  const canRomance = viewer.profile.openTo.includes('romantic');
  const kind: Kind = params.get('kind') === 'friendship' && canFriend ? 'friendship' : canRomance ? 'romantic' : 'friendship';
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const f = viewer.settings.filters;
  const filtersActive =
    entitlements(viewer.plan).advancedFilters && (f.minAge > 21 || f.maxAge < 45 || f.verifiedOnly || f.intents.length > 0);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setLoading(false);
      if (!state.offline) act((s) => ensureDaily(s, s.viewerId, kind));
    }, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, viewer.id, attempt, state.offline, state.day]);

  const daily = state.discovery[viewer.id]?.[kind];
  const ids = daily?.day === state.day ? daily.ids : [];
  const acted = (id: string) => hasInterest(state, viewer.id, id, kind) || hasPassed(state, viewer.id, id, kind);
  const currentIndex = ids.findIndex((id) => !acted(id));
  const current = currentIndex >= 0 ? state.users[ids[currentIndex]] : undefined;
  const reach = effectiveReach(viewer);

  const onInterest = () => {
    if (!current) return;
    const { outcome } = expressInterest(state, viewer.id, current.id, kind);
    act((s) => expressInterest(s, viewer.id, current.id, kind).state);
    setResult({ id: current.id, outcome });
  };

  return (
    <>
      <TopBar
        title={<span className="display sm" style={{ fontSize: 26 }}>Discover</span>}
        right={
          <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
            <button className="chip outline" onClick={() => setFiltersOpen(true)} aria-label="Filters">
              Filters{filtersActive ? ' ·' : ''}
            </button>
            <Link to="/you/discovery" className="chip outline" style={{ textDecoration: 'none' }}>
              <Icon name="globe" size={14} /> {REACH_LABEL[reach].title}
            </Link>
          </div>
        }
      />
      <div className="scroll flush">
        <div style={{ padding: '0 20px 14px' }}>
          {canFriend && canRomance && (
            <Segmented
              label="Connection type"
              value={kind}
              onChange={(k) => setParams({ kind: k })}
              options={[
                { value: 'romantic', label: 'Dating' },
                { value: 'friendship', label: 'Friendship' },
              ]}
            />
          )}
          {viewer.settings.discoveryPaused && (
            <div className="notice-bar" style={{ marginTop: 12 }}>
              <Icon name="pause" size={16} />
              You’re paused, so new people won’t see you — but you can still look around.
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '0 20px' }} aria-busy="true" aria-label="Loading recommendations">
            <Skeleton h={380} r={28} />
            <div style={{ height: 16 }} />
            <Skeleton h={18} w="60%" />
            <div style={{ height: 10 }} />
            <Skeleton h={14} w="85%" />
          </div>
        ) : state.offline && !ids.length ? (
          <Empty
            icon={<Icon name="refresh" size={28} className="faint" />}
            title="We couldn’t load today’s selection"
            action={<button className="btn secondary" onClick={() => setAttempt((a) => a + 1)}>Try again</button>}
          >
            Check your connection. Your selection will be the same when it loads — nothing is lost.
          </Empty>
        ) : !ids.length ? (
          <NothingInReach kind={kind} />
        ) : current ? (
          <div className="fade-in" key={current.id}>
            <div className="row between" style={{ padding: '0 20px 12px' }}>
              <p className="eyebrow">
                {ids.length} {ids.length === 1 ? 'person' : 'people'} worth considering
              </p>
              <div className="progress-dots" aria-label={`${currentIndex + 1} of ${ids.length}`}>
                {ids.map((id, i) => (
                  <span key={id} className={i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''} />
                ))}
              </div>
            </div>
            <div style={{ padding: '0 16px' }}>
              <article className="discover-card">
                <PhotoHero user={current}>
                  <HeroCaption user={current} />
                </PhotoHero>
                <div className="discover-body">
                  <ProfileBody user={current} kind={kind} />
                </div>
              </article>
            </div>
            <div className="decision-bar">
              <button className="btn ghost" onClick={() => act((s) => pass(s, viewer.id, current.id, kind))}>
                <Icon name="x" size={18} /> Pass
              </button>
              <button className={`btn ${kind === 'romantic' ? 'romance' : 'friend'}`} onClick={onInterest}>
                <Icon name={kind === 'romantic' ? 'heart' : 'friend'} size={18} /> I’m interested
              </button>
            </div>
          </div>
        ) : (
          <DoneForToday kind={kind} count={ids.length} />
        )}
      </div>

      <InterestResult result={result} kind={kind} onClose={() => setResult(null)} />
      <FiltersSheet open={filtersOpen} kind={kind} onClose={() => setFiltersOpen(false)} />
    </>
  );
}

function InterestResult({ result, kind, onClose }: { result: Result | null; kind: Kind; onClose: () => void }) {
  const { state, viewer, act, toast } = useStore();
  const nav = useNavigate();
  if (!result) return null;
  const person = state.users[result.id];
  const first = person.profile.firstName;
  const o = result.outcome;
  const primary = primaryOf(state, viewer.id, kind);

  return (
    <Sheet open onClose={onClose} label="Interest">
      <div style={{ textAlign: 'center' }}>
        <div className="row" style={{ justifyContent: 'center', '--gap': '0px' } as React.CSSProperties}>
          <Avatar p={viewer.profile.portraits[0]} size={64} />
          <div style={{ marginLeft: -12 }}>
            <Avatar p={person.profile.portraits[0]} size={64} />
          </div>
        </div>
        {o.type === 'sent' && (
          <>
            <h2 className="display sm" style={{ marginTop: 16 }}>Interest noted</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              If {first} chooses you too, you’ll have mutual interest. Until then, nothing changes — and {first} is never
              told if it isn’t mutual.
            </p>
            <button className="btn primary block" style={{ marginTop: 22 }} onClick={onClose}>Continue</button>
          </>
        )}
        {o.type === 'mutual' && o.slotFree && (
          <>
            <h2 className="display sm" style={{ marginTop: 16 }}>You chose each other</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              You and {first} have mutual interest. Your {kind === 'romantic' ? 'romantic' : 'friendship'} Primary is open —
              you can begin getting to know each other now, or keep {first} on your waiting list.
            </p>
            <button
              className={`btn block ${kind === 'romantic' ? 'romance' : 'friend'}`}
              style={{ marginTop: 22 }}
              onClick={() => {
                const r = startPrimary(state, o.connId, viewer.id);
                act((s) => startPrimary(s, o.connId, viewer.id).state);
                onClose();
                if (r.outcome === 'primary') nav(`/chat/${o.connId}`);
                else toast(`${first} is focused on someone else right now. Your invitation will wait.`);
              }}
            >
              Make {first} your Primary
            </button>
            <button className="btn quiet block" style={{ marginTop: 8 }} onClick={onClose}>Keep on waiting list</button>
          </>
        )}
        {o.type === 'mutual' && !o.slotFree && (
          <>
            <h2 className="display sm" style={{ marginTop: 16 }}>Mutual interest with {first}</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Your attention is with {primary ? name(state, other(primary, viewer.id)) : 'someone'} right now, so {first} joins
              your waiting list. Nothing changes in your current connection.
            </p>
            <button className="btn primary block" style={{ marginTop: 22 }} onClick={onClose}>Continue discovering</button>
            <button className="btn quiet block" style={{ marginTop: 8 }} onClick={() => { onClose(); nav(`/connections?kind=${kind}`); }}>
              View waiting list
            </button>
          </>
        )}
        {o.type === 'exists' && (
          <>
            <h2 className="display sm" style={{ marginTop: 16 }}>You’re already connected</h2>
            <button className="btn primary block" style={{ marginTop: 22 }} onClick={onClose}>Okay</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

function DoneForToday({ kind, count }: { kind: Kind; count: number }) {
  const { viewer } = useStore();
  const free = !entitlements(viewer.plan).transparency;
  return (
    <div style={{ padding: '0 20px' }}>
      <Empty
        icon={<Icon name="sun" size={30} className="faint" />}
        title="That’s everyone for today"
        action={<Link to={`/connections?kind=${kind}`} className="btn secondary">See your connections</Link>}
      >
        You considered {count} {count === 1 ? 'person' : 'people'} today. ekam shows a few people each day, on purpose —
        so each one gets real attention. A new selection arrives tomorrow.
      </Empty>
      {free && (
        <Link to="/premium" className="card gold link-card" style={{ marginTop: 8 }}>
          <p className="h3">Open to someone farther away?</p>
          <p className="small muted" style={{ marginTop: 4 }}>
            Premium expands where you discover — nationally or internationally. It never changes how many people you
            can date.
          </p>
        </Link>
      )}
    </div>
  );
}

function NothingInReach({ kind }: { kind: Kind }) {
  return (
    <div style={{ padding: '0 20px' }}>
      <Empty
        icon={<Icon name="globe" size={30} className="faint" />}
        title="No one new in your reach today"
        action={<Link to="/you/discovery" className="btn secondary">Discovery settings</Link>}
      >
        {kind === 'friendship'
          ? 'There’s no one new nearby looking for friendship right now. We’ll keep looking.'
          : 'We only show people who fit what you’ve both said matters. Widening your reach can help.'}
      </Empty>
    </div>
  );
}

const AGES = Array.from({ length: 25 }, (_, i) => 21 + i);
const FILTER_INTENTS: Intent[] = ['casual', 'serious', 'long-term', 'marriage', 'exploring'];

function FiltersSheet({ open, kind, onClose }: { open: boolean; kind: Kind; onClose: () => void }) {
  const { viewer, act, toast } = useStore();
  const allowed = entitlements(viewer.plan).advancedFilters;
  const [draft, setDraft] = useState<DiscoveryFilters>(viewer.settings.filters);
  useEffect(() => {
    if (open) setDraft(viewer.settings.filters);
  }, [open, viewer.settings.filters]);
  const set = (patch: Partial<DiscoveryFilters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Sheet open={open} onClose={onClose} label="Discovery filters">
      <div className="row between">
        <p className="eyebrow">Advanced filters</p>
        {!allowed && <span className="plan-tag">Premium</span>}
      </div>
      <h2 className="display sm" style={{ margin: '6px 0 6px' }}>Narrow today’s selection</h2>
      <p className="small muted" style={{ marginBottom: 16 }}>
        Filters make your five recommendations more relevant. They never add more people to your day.
      </p>
      <fieldset disabled={!allowed} style={{ border: 0, padding: 0, margin: 0, opacity: allowed ? 1 : 0.5 }}>
        <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="field grow">
            <label htmlFor="f-min">Age from</label>
            <select id="f-min" className="input" value={draft.minAge} onChange={(e) => set({ minAge: Math.min(+e.target.value, draft.maxAge) })}>
              {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="field grow">
            <label htmlFor="f-max">to</label>
            <select id="f-max" className="input" value={draft.maxAge} onChange={(e) => set({ maxAge: Math.max(+e.target.value, draft.minAge) })}>
              {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        {kind === 'romantic' && (
          <div style={{ marginTop: 16 }}>
            <div className="small" style={{ fontWeight: 550, marginBottom: 6 }}>Looking for</div>
            <div className="chips">
              {FILTER_INTENTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className="chip"
                  aria-pressed={draft.intents.includes(i)}
                  onClick={() => set({ intents: draft.intents.includes(i) ? draft.intents.filter((x) => x !== i) : [...draft.intents, i] })}
                >
                  {INTENT_LABEL[i]}
                </button>
              ))}
            </div>
            <p className="tiny faint" style={{ marginTop: 6 }}>None selected means any intention.</p>
          </div>
        )}
        <div className="list" style={{ marginTop: 16 }}>
          <ToggleRow
            title="Identity and photo verified only"
            checked={draft.verifiedOnly}
            onChange={(v) => set({ verifiedOnly: v })}
            disabled={!allowed}
          />
        </div>
      </fieldset>
      {allowed ? (
        <button
          className="btn primary block"
          style={{ marginTop: 18 }}
          onClick={() => {
            act((s) => refreshDaily(updateSettings(s, viewer.id, { filters: draft }), viewer.id, kind));
            onClose();
            toast('Filters applied to today’s selection.');
          }}
        >
          Apply
        </button>
      ) : (
        <Link to="/premium" className="btn secondary block" style={{ marginTop: 18 }} onClick={onClose}>
          About Premium
        </Link>
      )}
    </Sheet>
  );
}
