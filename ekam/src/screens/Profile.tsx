import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { HeroCaption, PhotoHero, ProfileBody } from '../components/ProfileBody';
import { FeedbackDetail, FeedbackLocked } from '../components/Trust';
import { Empty, TopBar } from '../components/ui';
import { expressInterest, hasInterest, holdsSlot, openConnectionBetween, recordVisit, slotFree, startPrimary } from '../domain/rules';
import { feedbackAccess } from '../domain/trust';
import type { Kind } from '../domain/types';
import { useStore } from '../state/context';

export function ProfileScreen() {
  const { id = '' } = useParams();
  const { state, viewer, act, toast } = useStore();
  const nav = useNavigate();
  const user = state.users[id];
  useEffect(() => {
    act((s) => recordVisit(s, s.viewerId, id));
  }, [act, id]);
  if (!user) {
    return (
      <>
        <TopBar back />
        <Empty title="This profile isn’t available">They may have paused or closed their account.</Empty>
      </>
    );
  }
  const conn = openConnectionBetween(state, viewer.id, id);
  const kind: Kind = conn?.kind ?? (user.profile.openTo.includes('romantic') ? 'romantic' : 'friendship');
  const sent = hasInterest(state, viewer.id, id, kind);
  const first = user.profile.firstName;

  let action: React.ReactNode = null;
  if (conn && holdsSlot(conn)) {
    action = (
      <button className="btn primary block" onClick={() => nav(`/chat/${conn.id}`)}>
        Open conversation
      </button>
    );
  } else if (conn) {
    action = slotFree(state, viewer.id, conn.kind) ? (
      <button
        className={`btn block ${conn.kind === 'romantic' ? 'romance' : 'friend'}`}
        onClick={() => {
          const r = startPrimary(state, conn.id, viewer.id);
          act((s) => startPrimary(s, conn.id, viewer.id).state);
          if (r.outcome === 'primary') nav(`/chat/${conn.id}`);
          else toast(`${first} is focused on someone else right now. Your invitation will wait.`);
        }}
      >
        Make {first} your Primary
      </button>
    ) : (
      <button className="btn secondary block" onClick={() => nav(`/connections?kind=${conn.kind}&change=1&to=${conn.id}`)}>
        Change Primary to {first}
      </button>
    );
  } else if (!sent && user.id !== viewer.id) {
    action = (
      <button
        className={`btn block ${kind === 'romantic' ? 'romance' : 'friend'}`}
        onClick={() => {
          const r = expressInterest(state, viewer.id, id, kind);
          act((s) => expressInterest(s, viewer.id, id, kind).state);
          toast(r.outcome.type === 'mutual' ? `Mutual interest with ${first}.` : 'Interest noted.');
        }}
      >
        I’m interested
      </button>
    );
  } else if (sent) {
    action = <p className="small muted" style={{ textAlign: 'center' }}>You’ve expressed interest. If it’s mutual, you’ll both know.</p>;
  }

  return (
    <>
      <TopBar back title={first} />
      <div className="scroll flush">
        <div style={{ padding: '0 16px' }}>
          <article className="discover-card">
            <PhotoHero user={user}>
              <HeroCaption user={user} />
            </PhotoHero>
            <div className="discover-body">
              <ProfileBody user={user} kind={kind} />
            </div>
          </article>
        </div>
        {action && <div style={{ padding: '16px 20px 24px' }}>{action}</div>}
      </div>
    </>
  );
}

export function ProfileFeedbackScreen() {
  const { id = '' } = useParams();
  const { state, viewer } = useStore();
  const user = state.users[id];
  if (!user) return <Empty title="Not found" />;
  const access = feedbackAccess(viewer, user);
  return (
    <>
      <TopBar back title={`${user.profile.firstName} · Connection feedback`} />
      <div className="scroll">
        <p className="eyebrow">Connection feedback</p>
        <h1 className="display sm" style={{ margin: '6px 0 6px' }}>What people experienced with {user.profile.firstName}</h1>
        <p className="small muted" style={{ marginBottom: 22 }}>
          About the quality of the interaction — never attractiveness. Reviewers are never identified.
        </p>
        {access.allowed ? <FeedbackDetail user={user} /> : <FeedbackLocked reason={access.reason} name={user.profile.firstName} />}
        <div className="notice-bar" style={{ marginTop: 24 }}>
          <Icon name="info" size={16} />
          <span>Negative feedback never labels anyone a scammer. Harmful comments can be reported and are reviewed by people.</span>
        </div>
      </div>
    </>
  );
}
