import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Avatar } from '../components/Portrait';
import { FeedbackDetail } from '../components/Trust';
import { Avatar as MiniAvatar } from '../components/Portrait';
import { PlanTag, Segmented, Sheet, Tick, ToggleRow, TopBar } from '../components/ui';
import { COUNTRIES } from '../domain/seed';
import { entitlements } from '../domain/entitlements';
import { FIELD_LABEL, INTENT_LABEL, REACH_LABEL, REACH_ORDER, SHARE_LABEL, VERIFICATION_LABEL } from '../domain/labels';
import { PREMIUM_VERIFICATION, updateSettings, verify } from '../domain/rules';
import { useState } from 'react';
import { isFeedbackVisible, maturity, MATURITY_LABEL } from '../domain/trust';
import type { Intent, Kind, Reach, ShareLevel, SharedField, State, VerificationKey } from '../domain/types';
import { useStore } from '../state/context';

export function YouScreen({ onOpenDemo }: { onOpenDemo: () => void }) {
  const { state, viewer, act } = useStore();
  const e = entitlements(viewer.plan);
  const s = viewer.settings;
  return (
    <>
      <TopBar title={<span className="display sm" style={{ fontSize: 26 }}>You</span>} />
      <div className="scroll">
        <div className="row">
          <Avatar p={viewer.profile.portraits[0]} size={68} />
          <div className="grow">
            <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
              <h1 className="display sm">{viewer.profile.firstName}</h1>
              <PlanTag plan={viewer.plan} />
            </div>
            <p className="small muted">{INTENT_LABEL[viewer.profile.intent]} · {MATURITY_LABEL[maturity(viewer, state.now)]}</p>
            <Link to={`/profile/${viewer.id}`} className="link small">See your profile as others do</Link>
          </div>
        </div>

        <section className="section">
          <div className="list">
            <ToggleRow
              title="Pause my profile"
              detail="Leave new Discovery for a while. Your connections and waiting lists stay exactly as they are."
              checked={s.discoveryPaused}
              onChange={(v) => act((st) => updateSettings(st, viewer.id, { discoveryPaused: v }))}
            />
          </div>
        </section>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Settings</p>
          <div className="list">
            <Row to="/you/profile" icon="user" title="Intentions" detail={`${INTENT_LABEL[viewer.profile.intent]} · open to ${viewer.profile.openTo.map((k) => (k === 'romantic' ? 'dating' : 'friendship')).join(' & ')}`} />
            <Row to="/you/discovery" icon="globe" title="Discovery reach" detail={REACH_LABEL[s.reach].title} />
            <Row to="/you/privacy" icon="eye" title="Privacy" detail={e.incognito ? (s.incognito ? 'Incognito on' : 'Standard') : 'Standard'} />
            <Row to="/you/feedback" icon="shield" title="Connection Feedback" detail={isFeedbackVisible(viewer) ? 'Visible' : 'Hidden'} />
          </div>
        </section>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Verification</p>
          <div className="card flat">
            <VerificationList />
            <p className="tiny faint" style={{ marginTop: 12 }}>
              {e.advancedVerification
                ? 'Premium includes employment and education verification.'
                : 'Identity, phone and photo verification are free. Employment and education are part of Premium.'}
            </p>
          </div>
        </section>

        <section className="section">
          <Link to="/premium" className="card gold link-card">
            <div className="row between">
              <div>
                <p className="h3">{viewer.plan === 'free' ? 'ekam Premium' : 'Your Premium'}</p>
                <p className="small muted" style={{ marginTop: 2 }}>More reach, more information, more control — never more people.</p>
              </div>
              <Icon name="next" />
            </div>
          </Link>
        </section>

        <section className="section">
          <div className="list">
            <button className="list-row" onClick={onOpenDemo}><Icon name="settings" /> <span className="grow">Prototype controls</span></button>
            <Link className="list-row" to="/safety"><Icon name="flag" /> <span className="grow">Trust &amp; Safety console</span></Link>
          </div>
        </section>
      </div>
    </>
  );
}

function Row({ to, icon, title, detail }: { to: string; icon: IconName; title: string; detail: string }) {
  return (
    <Link to={to} className="list-row">
      <Icon name={icon} />
      <div className="grow">
        <div style={{ fontWeight: 550 }}>{title}</div>
        <div className="small muted">{detail}</div>
      </div>
      <Icon name="next" size={16} className="faint" />
    </Link>
  );
}

// ---------------------------------------------------------------------------

export function FeedbackSettings() {
  const { viewer, act } = useStore();
  const control = entitlements(viewer.plan).feedbackVisibilityControl;
  const visible = isFeedbackVisible(viewer);
  return (
    <>
      <TopBar back title="Connection Feedback" />
      <div className="scroll">
        <div className="card tint" style={{ textAlign: 'center', padding: 22 }}>
          <div className="recip">
            See feedback <span className="arrow">⟷</span> Share feedback
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            You can see other people’s Connection Feedback only while yours is visible. That’s true for everyone, on
            every plan.
          </p>
        </div>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Feedback visibility</p>
          {control ? (
            <>
              <div className="list">
                <ToggleRow
                  title={visible ? 'On' : 'Off'}
                  detail={visible ? 'People can see your aggregated Connection Feedback.' : 'Your feedback is hidden.'}
                  checked={visible}
                  onChange={(v) => act((s) => updateSettings(s, viewer.id, { feedbackVisible: v }))}
                />
              </div>
              <div className="stat-grid" style={{ marginTop: 12 }}>
                <div className="stat" style={{ outline: visible ? '1.5px solid var(--ink)' : undefined }}>
                  <p className="h3">On</p>
                  <p className="small muted" style={{ marginTop: 4 }}>Your feedback is visible. You can view others who share theirs.</p>
                </div>
                <div className="stat" style={{ outline: !visible ? '1.5px solid var(--ink)' : undefined }}>
                  <p className="h3">Off</p>
                  <p className="small muted" style={{ marginTop: 4 }}>Your feedback is hidden. You can’t view anyone else’s.</p>
                </div>
              </div>
              <p className="tiny faint" style={{ marginTop: 10 }}>
                Premium lets you choose whether to participate visibly. It never lets you look without being seen.
              </p>
            </>
          ) : (
            <div className="card flat">
              <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
                <Icon name="lock" size={18} />
                <p className="h3">Always visible on Free</p>
              </div>
              <p className="small muted" style={{ marginTop: 6 }}>
                On Free, your aggregated feedback is visible to members who share their own. Viewing others’ feedback —
                and choosing whether yours is visible — is part of Premium.
              </p>
              <Link to="/premium" className="btn sm secondary" style={{ marginTop: 12 }}>About Premium</Link>
            </div>
          )}
        </section>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>What people shared about you</p>
          <FeedbackDetail user={viewer} own />
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

export function DiscoverySettings() {
  const { viewer, act, toast } = useStore();
  const e = entitlements(viewer.plan);
  const s = viewer.settings;
  const maxIdx = REACH_ORDER.indexOf(e.maxReach);
  const set = (patch: Partial<State['users'][string]['settings']>) => act((st) => updateSettings(st, viewer.id, patch));
  return (
    <>
      <TopBar back title="Discovery reach" />
      <div className="scroll">
        <p className="muted">
          Where your recommendations can come from. Reach changes who you might meet — never how many people you can date.
        </p>
        <section className="section" role="radiogroup" aria-label="Reach">
          {REACH_ORDER.map((r: Reach, i) => {
            const locked = i > maxIdx;
            return (
              <button
                key={r}
                className="option"
                role="radio"
                aria-checked={s.reach === r}
                onClick={() => (locked ? toast('Wider reach is part of Premium.') : set({ reach: r }))}
                aria-disabled={locked}
              >
                <span className="glyph">{locked ? <Icon name="lock" size={15} /> : <Icon name="globe" size={15} />}</span>
                <div className="grow">
                  <div className="row between">
                    <span style={{ fontWeight: 600 }}>{REACH_LABEL[r].title}</span>
                    {locked && <span className="plan-tag">Premium</span>}
                  </div>
                  <div className="small muted">
                    {r === 'local' ? `${viewer.profile.place.metro} and around` : r === 'regional' ? viewer.profile.place.region : r === 'national' ? `Anywhere in ${viewer.profile.place.country}` : REACH_LABEL[r].detail}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {s.reach === 'international' && (
          <section className="section">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Countries</p>
            <div className="chips">
              {COUNTRIES.filter((c) => c !== viewer.profile.place.country).map((c) => (
                <button
                  key={c}
                  className="chip"
                  aria-pressed={s.countries.includes(c)}
                  onClick={() => set({ countries: s.countries.includes(c) ? s.countries.filter((x) => x !== c) : [...s.countries, c] })}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>I’m open to</p>
          <div className="list">
            <ToggleRow title="Long-distance" detail="Being shown to people in other cities." checked={s.longDistance} onChange={(v) => set({ longDistance: v })} />
            <ToggleRow title="Relocation" detail="Moving for the right person, someday." checked={s.relocation} onChange={(v) => set({ relocation: v })} />
            <ToggleRow title="International relationships" detail="Being shown to people abroad who have international reach." checked={s.international} onChange={(v) => set({ international: v })} />
          </div>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

export function PrivacySettings() {
  const { viewer, act } = useStore();
  const e = entitlements(viewer.plan);
  const s = viewer.settings;
  const set = (patch: Partial<typeof s>) => act((st) => updateSettings(st, viewer.id, patch));
  const LEVELS: ShareLevel[] = ['discovery', 'mutual', 'primary'];
  return (
    <>
      <TopBar back title="Privacy" />
      <div className="scroll">
        <div className="notice-bar">
          <Icon name="lock" size={16} />
          Your exact location is never shown — only your city. Contact details are never shared by ekam.
        </div>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Visibility</p>
          <div className="list">
            <ToggleRow
              title="Incognito"
              detail="Browse profiles without appearing in anyone’s recent visitors."
              checked={s.incognito}
              locked={!e.incognito}
              onChange={(v) => set({ incognito: v })}
            />
            <ToggleRow
              title="Anonymous discovery"
              detail="Only people you’ve expressed interest in can discover you."
              checked={s.anonymousDiscovery}
              locked={!e.anonymousDiscovery}
              onChange={(v) => set({ anonymousDiscovery: v })}
            />
          </div>
        </section>

        <Visitors />

        <section className="section">
          <div className="row between" style={{ marginBottom: 6 }}>
            <p className="eyebrow">Progressive sharing</p>
            {!e.progressiveSharing && <span className="plan-tag">Premium</span>}
          </div>
          <p className="small muted" style={{ marginBottom: 12 }}>Choose when each detail becomes visible: Discovery → Mutual interest → Primary.</p>
          <div className="stack">
            {(Object.keys(FIELD_LABEL) as SharedField[]).map((f) => (
              <div key={f}>
                <div className="small" style={{ fontWeight: 550, marginBottom: 6 }}>{FIELD_LABEL[f]}</div>
                {e.progressiveSharing ? (
                  <Segmented
                    label={FIELD_LABEL[f]}
                    value={s.sharing[f]}
                    onChange={(v) => set({ sharing: { ...s.sharing, [f]: v } })}
                    options={LEVELS.map((l) => ({ value: l, label: l === 'discovery' ? 'Everyone' : l === 'mutual' ? 'Mutual' : 'Primary' }))}
                  />
                ) : (
                  <div className="small muted">{SHARE_LABEL[s.sharing[f]]}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

export function ProfileSettings() {
  const { viewer, act } = useStore();
  const INTENTS: Intent[] = ['casual', 'serious', 'long-term', 'marriage', 'exploring', 'friendship'];
  const setIntent = (intent: Intent) =>
    act((st) => {
      const u = st.users[viewer.id];
      const openTo: Kind[] = intent === 'friendship' ? ['friendship'] : u.profile.openTo.includes('romantic') ? u.profile.openTo : ['romantic', ...u.profile.openTo];
      return {
        ...st,
        users: {
          ...st.users,
          [viewer.id]: {
            ...u,
            profile: { ...u.profile, intent, openTo },
            history: { ...u.history, changes: { ...u.history.changes, intent: st.now } },
          },
        },
      };
    });
  const toggleKind = (k: Kind, on: boolean) =>
    act((st) => {
      const u = st.users[viewer.id];
      const openTo = on ? Array.from(new Set([...u.profile.openTo, k])) : u.profile.openTo.filter((x) => x !== k);
      if (!openTo.length) return st;
      return { ...st, users: { ...st.users, [viewer.id]: { ...u, profile: { ...u.profile, openTo } } } };
    });
  return (
    <>
      <TopBar back title="Intentions" />
      <div className="scroll">
        <p className="muted">Be honest about what you want right now. You can change it any time — changes appear in your profile history.</p>
        <section className="section" role="radiogroup" aria-label="Current intention">
          {INTENTS.map((i) => (
            <button key={i} className="option" role="radio" aria-checked={viewer.profile.intent === i} onClick={() => setIntent(i)}>
              {INTENT_LABEL[i]}
            </button>
          ))}
        </section>
        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Open to</p>
          <div className="list">
            <ToggleRow title="Dating" detail="Romantic Primary and waiting list." checked={viewer.profile.openTo.includes('romantic')} onChange={(v) => toggleKind('romantic', v)} disabled={viewer.profile.intent === 'friendship'} />
            <ToggleRow title="Friendship" detail="Friendship Primary and waiting list." checked={viewer.profile.openTo.includes('friendship')} onChange={(v) => toggleKind('friendship', v)} />
          </div>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

const VERIFY_STEPS: Record<VerificationKey, string> = {
  identity: 'Scan a government ID. We confirm your name and age, then delete the image.',
  phone: 'Confirm a one-time code sent by SMS. Your number is never shown to anyone.',
  photo: 'Take a short selfie video. We check it matches your profile photos.',
  employment: 'Connect a work email or upload a recent payslip. Only your job title is confirmed.',
  education: 'Upload a degree certificate or verify through your university email.',
  profile: 'We review your profile details for consistency. Nothing changes publicly except the tick.',
};

function VerificationList() {
  const { viewer, act, toast } = useStore();
  const [open, setOpen] = useState<VerificationKey | null>(null);
  const [checking, setChecking] = useState(false);
  const premium = entitlements(viewer.plan).advancedVerification;
  const keys = Object.keys(VERIFICATION_LABEL) as VerificationKey[];
  const locked = open ? PREMIUM_VERIFICATION.includes(open) && !premium : false;

  return (
    <>
      <div className="check-list">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className={`check${viewer.verification[k] ? '' : ' off'}`}
            style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}
            onClick={() => !viewer.verification[k] && setOpen(k)}
            aria-label={viewer.verification[k] ? `${VERIFICATION_LABEL[k]} verified` : `Verify ${VERIFICATION_LABEL[k].toLowerCase()}`}
          >
            <Tick on={viewer.verification[k]} />
            {VERIFICATION_LABEL[k]}
            {!viewer.verification[k] && <span className="tiny" style={{ color: 'var(--accent)', fontWeight: 600 }}>Verify</span>}
          </button>
        ))}
      </div>
      <Sheet open={!!open} onClose={() => !checking && setOpen(null)} label="Verify">
        {open && (
          <>
            <div className="row between">
              <p className="eyebrow">Verification</p>
              {PREMIUM_VERIFICATION.includes(open) && <span className="plan-tag">Premium</span>}
            </div>
            <h2 className="display sm" style={{ margin: '6px 0 8px' }}>Verify your {VERIFICATION_LABEL[open].toLowerCase()}</h2>
            <p className="muted">{VERIFY_STEPS[open]}</p>
            <p className="tiny faint" style={{ marginTop: 10 }}>
              A tick means this was independently confirmed. It doesn’t rank you, and it’s never required.
            </p>
            {locked ? (
              <Link to="/premium" className="btn secondary block" style={{ marginTop: 18 }} onClick={() => setOpen(null)}>
                About Premium
              </Link>
            ) : (
              <button
                className="btn primary block"
                style={{ marginTop: 18 }}
                disabled={checking}
                onClick={() => {
                  setChecking(true);
                  setTimeout(() => {
                    act((s) => verify(s, viewer.id, open));
                    toast(`${VERIFICATION_LABEL[open]} verified.`);
                    setChecking(false);
                    setOpen(null);
                  }, 1300);
                }}
              >
                {checking ? 'Checking…' : 'Start (demo)'}
              </button>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}

function Visitors() {
  const { state, viewer } = useStore();
  const week = new Date(state.now).getTime() - 7 * 86_400_000;
  const seen = new Set<string>();
  const list = state.visits
    .filter((v) => v.to === viewer.id && new Date(v.at).getTime() >= week)
    .filter((v) => (seen.has(v.from) ? false : (seen.add(v.from), true)));
  return (
    <section className="section">
      <p className="eyebrow" style={{ marginBottom: 6 }}>Recent profile visitors</p>
      <p className="small muted" style={{ marginBottom: 10 }}>
        The last 7 days, kept here rather than sent as notifications. Members browsing in Incognito never appear.
      </p>
      {list.length ? (
        <div className="list">
          {list.map((v) => {
            const u = state.users[v.from];
            return (
              <Link key={v.from} to={`/profile/${u.id}`} className="list-row">
                <MiniAvatar p={u.profile.portraits[0]} size={36} />
                <div className="grow">
                  <div style={{ fontWeight: 550 }}>{u.profile.firstName}</div>
                  <div className="tiny faint">{u.profile.place.city}</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="small muted">No visitors this week.</p>
      )}
    </section>
  );
}
