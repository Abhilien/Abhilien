import { Link } from 'react-router-dom';
import { Icon, Logo } from '../components/Icon';
import { Avatar } from '../components/Portrait';
import { KindLabel, KindMark, PlanTag, relDays } from '../components/ui';
import { ensureDaily } from '../domain/discovery';
import { STAGE_LABEL } from '../domain/labels';
import { hasInterest, hasPassed, other, primaryOf, updateSettings, waitingOf } from '../domain/rules';
import type { Connection, Kind } from '../domain/types';
import { useStore } from '../state/store';

function greeting(iso: string) {
  const h = new Date(iso).getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function HomeScreen({ onOpenDemo }: { onOpenDemo: () => void }) {
  const { state, viewer, act } = useStore();
  const romantic = primaryOf(state, viewer.id, 'romantic');
  const friend = primaryOf(state, viewer.id, 'friendship');
  const feedbackDue = state.connections.filter((c) => c.status === 'closed' && c.feedbackDue.includes(viewer.id));
  const invites = state.connections.filter((c) => c.status === 'mutual' && c.invite && c.invite.by !== viewer.id && c.users.includes(viewer.id));

  // Today's discovery is computed lazily and fixed for the day.
  const daily = ensureDaily(state, viewer.id, 'romantic').discovery[viewer.id]?.romantic;
  const remaining = (daily?.ids ?? []).filter(
    (id) => !hasInterest(state, viewer.id, id, 'romantic') && !hasPassed(state, viewer.id, id, 'romantic'),
  ).length;

  const lead = romantic
    ? romantic.status === 'paused'
      ? `Your connection with ${state.users[other(romantic, viewer.id)].profile.firstName} is paused and reserved.`
      : `Your attention is with ${state.users[other(romantic, viewer.id)].profile.firstName}.`
    : 'Your romantic Primary is open.';

  return (
    <>
      <header className="topbar">
        <div className="brand grow" style={{ fontSize: 24 }}>
          <Logo size={26} /> ekam
        </div>
        <PlanTag plan={viewer.plan} />
        <button className="icon-btn bare demo-btn" aria-label="Prototype controls" onClick={onOpenDemo}>
          <Icon name="settings" />
        </button>
      </header>
      <div className="scroll">
        <div className="fade-in">
          <p className="eyebrow">{greeting(state.now)}, {viewer.profile.firstName}</p>
          <h1 className="display" style={{ marginTop: 6 }}>{lead}</h1>
        </div>

        {viewer.settings.discoveryPaused && (
          <div className="notice-bar warn" style={{ marginTop: 18 }}>
            <Icon name="pause" size={18} />
            <div className="grow">
              Your profile is paused. You’re hidden from new Discovery; your connections and waiting lists are kept.
            </div>
            <button className="btn sm secondary" onClick={() => act((s) => updateSettings(s, viewer.id, { discoveryPaused: false }))}>
              Resume
            </button>
          </div>
        )}

        {feedbackDue.map((c) => (
          <Link key={c.id} to={`/feedback/${c.id}`} className="card link-card row" style={{ marginTop: 18 }}>
            <Avatar p={state.users[other(c, viewer.id)].profile.portraits[0]} size={44} />
            <div className="grow">
              <p className="h3">Share Connection Feedback</p>
              <p className="small muted">How was your experience with {state.users[other(c, viewer.id)].profile.firstName}? It’s private until you both respond.</p>
            </div>
            <Icon name="next" className="faint" />
          </Link>
        ))}

        {invites.map((c) => (
          <Link key={c.id} to={`/connections?kind=${c.kind}`} className="card link-card row" style={{ marginTop: 12 }}>
            <Avatar p={state.users[other(c, viewer.id)].profile.portraits[0]} size={44} />
            <div className="grow">
              <p className="h3">{state.users[other(c, viewer.id)].profile.firstName} is ready when you are</p>
              <p className="small muted">They’d like to make your connection Primary. There’s no rush.</p>
            </div>
            <Icon name="next" className="faint" />
          </Link>
        ))}

        <section className="section">
          <div className="section-head">
            <p className="eyebrow">Your connections</p>
          </div>
          <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <SlotCard kind="romantic" conn={romantic} waiting={waitingOf(state, viewer.id, 'romantic').length} />
            <SlotCard kind="friendship" conn={friend} waiting={waitingOf(state, viewer.id, 'friendship').length} />
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <p className="eyebrow">Waiting</p>
            <span className="tiny faint">Mutual interest, not yet active</span>
          </div>
          <div className="list">
            <WaitingRow kind="romantic" />
            <WaitingRow kind="friendship" />
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <p className="eyebrow">Discover</p>
          </div>
          <Link to="/discover" className="card link-card" style={{ padding: 20 }}>
            <div className="row between">
              <div>
                <p className="display sm">
                  {remaining > 0 ? `${remaining} ${remaining === 1 ? 'person' : 'people'} worth considering` : 'That’s everyone for today'}
                </p>
                <p className="small muted" style={{ marginTop: 4 }}>
                  {remaining > 0 ? 'Selected for you today, each with a reason.' : 'A new, small selection arrives tomorrow.'}
                </p>
              </div>
              <span className="icon-btn"><Icon name="arrowRight" size={18} /></span>
            </div>
          </Link>
        </section>

        <p className="tiny faint" style={{ textAlign: 'center', marginTop: 28 }}>
          No like counts. No rankings. No one here is a product.
        </p>
      </div>
    </>
  );
}

function SlotCard({ kind, conn, waiting }: { kind: Kind; conn?: Connection; waiting: number }) {
  const { state, viewer } = useStore();
  if (!conn) {
    return (
      <Link to={waiting ? `/connections?kind=${kind}` : `/discover?kind=${kind}`} className="slot open">
        <span className="slot-empty-mark"><KindMark kind={kind} size={20} /></span>
        <div className="grow">
          <KindLabel kind={kind}>{kind === 'romantic' ? 'Romantic · Open' : 'Friend · Open'}</KindLabel>
          <p className="small muted" style={{ marginTop: 2 }}>
            {waiting ? `Choose from ${waiting} ${waiting === 1 ? 'person' : 'people'} waiting` : 'Discover someone worth your attention'}
          </p>
        </div>
        <Icon name="next" className="faint" />
      </Link>
    );
  }
  const them = state.users[other(conn, viewer.id)];
  const latest = conn.stagesReached[conn.stagesReached.length - 1];
  return (
    <Link to={`/chat/${conn.id}`} className="slot">
      <Avatar p={them.profile.portraits[0]} size={60} />
      <div className="grow">
        <KindLabel kind={kind}>{kind === 'romantic' ? 'Romantic' : 'Friend'}</KindLabel>
        <p className="display sm" style={{ fontSize: 24, marginTop: 2 }}>{them.profile.firstName}</p>
        <p className="small muted">
          {conn.status === 'paused' ? 'Paused · reserved' : `${relDays(conn.primarySince!, state.now)}${latest ? ` · ${STAGE_LABEL[latest]}` : ''}`}
          {conn.fromRomance && ' · once romantic'}
        </p>
      </div>
      <span className="btn sm secondary">Continue</span>
    </Link>
  );
}

function WaitingRow({ kind }: { kind: Kind }) {
  const { state, viewer } = useStore();
  const list = waitingOf(state, viewer.id, kind);
  return (
    <Link to={`/connections?kind=${kind}`} className="list-row">
      <KindMark kind={kind} />
      <div className="grow">
        <div style={{ fontWeight: 550 }}>
          {list.length} {kind === 'romantic' ? 'romantic' : 'friendship'} mutual interest{list.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="avatar-stack">
        {list.slice(0, 3).map((c) => (
          <Avatar key={c.id} p={state.users[other(c, viewer.id)].profile.portraits[0]} size={28} />
        ))}
      </div>
      <Icon name="next" className="faint" />
    </Link>
  );
}
