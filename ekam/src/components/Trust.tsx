import { Link } from 'react-router-dom';
import { entitlements } from '../domain/entitlements';
import { TRAIT_LABEL, VERIFICATION_LABEL } from '../domain/labels';
import {
  feedbackAccess,
  interactionStats,
  isFeedbackVisible,
  maturity,
  MATURITY_CRITERIA,
  MATURITY_LABEL,
  MIN_FEEDBACK_FOR_SUMMARY,
  summarizeFeedback,
  TRAITS,
} from '../domain/trust';
import type { User, VerificationKey } from '../domain/types';
import { useStore } from '../state/context';
import { Icon } from './Icon';
import { Tick } from './ui';
import { monthYear } from '../lib/format';

const VKEYS: VerificationKey[] = ['identity', 'photo', 'phone', 'employment', 'education', 'profile'];

export function Verification({ user, compact }: { user: User; compact?: boolean }) {
  const keys = compact ? VKEYS.filter((k) => user.verification[k]) : VKEYS;
  return (
    <div className="check-list">
      {keys.map((k) => (
        <div key={k} className={`check${user.verification[k] ? '' : ' off'}`}>
          <Tick on={user.verification[k]} />
          {VERIFICATION_LABEL[k]}
        </div>
      ))}
    </div>
  );
}

/** The compact, expandable trust summary shown on every profile. */
export function TrustSummary({ user }: { user: User }) {
  const { state, viewer } = useStore();
  const m = maturity(user, state.now);
  const e = entitlements(viewer.plan);
  const fb = summarizeFeedback(state.feedback, user.id);
  const access = feedbackAccess(viewer, user);
  const verifiedCount = VKEYS.filter((k) => user.verification[k]).length;

  return (
    <details className="disclosure">
      <summary>
        <Icon name="shield" />
        <div className="grow">
          <div className="h3">Trust &amp; history</div>
          <div className="small muted">
            {verifiedCount} verified · {MATURITY_LABEL[m]}
            {e.transparency && user.history.meaningfulInteractions > 0 && ` · ${user.history.meaningfulInteractions} meaningful interactions`}
          </div>
        </div>
        <Icon name="down" className="chev" />
      </summary>
      <div className="body stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <section>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Profile authenticity</p>
          <Verification user={user} />
          <p className="tiny faint" style={{ marginTop: 10 }}>
            Verification means this information was independently confirmed — not that anyone is better than anyone else.
          </p>
        </section>

        <section>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Membership</p>
          <div className="row between">
            <span style={{ fontWeight: 550 }}>{MATURITY_LABEL[m]}</span>
            <span className="small muted">Since {monthYear(user.history.memberSince)}</span>
          </div>
          <p className="tiny faint" style={{ marginTop: 4 }}>{MATURITY_CRITERIA[m]}</p>
        </section>

        {e.transparency ? <PlatformHistory user={user} /> : <PremiumTeaser />}

        <section>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Connection feedback</p>
          {access.allowed ? (
            fb.enough ? (
              <Link to={`/profile/${user.id}/feedback`} className="row between link-card" style={{ textDecoration: 'none' }}>
                <span>
                  <span style={{ fontWeight: 550, display: 'block' }}>Overall {fb.pct.overall}% positive</span>
                  <span className="small muted">{fb.count} responses · Respect {fb.pct.respect}%</span>
                </span>
                <span className="btn sm secondary">View</span>
              </Link>
            ) : (
              <p className="small muted">Not enough feedback yet. We show a summary after {MIN_FEEDBACK_FOR_SUMMARY} responses.</p>
            )
          ) : (
            <FeedbackLocked reason={access.reason} name={user.profile.firstName} />
          )}
        </section>
      </div>
    </details>
  );
}

export function PlatformHistory({ user }: { user: User }) {
  const { state } = useStore();
  const h = user.history;
  const stats = interactionStats(h.durations);
  const active = state.connections.filter(
    (c) => (c.status === 'primary' || c.status === 'paused') && c.users.includes(user.id),
  ).length;
  if (h.meaningfulInteractions === 0) {
    return (
      <section>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Platform history</p>
        <p className="small muted">No platform history yet. That’s normal for someone who has just joined.</p>
      </section>
    );
  }
  return (
    <>
      <section>
        <div className="row between" style={{ marginBottom: 10 }}>
          <p className="eyebrow">Platform history</p>
          <span className="plan-tag">Premium</span>
        </div>
        <div className="stat-grid">
          <Stat v={h.meaningfulInteractions} k="Meaningful interactions" />
          <Stat v={h.mutualConnections} k="Mutual connections" />
          <Stat v={h.completedConversations} k="Completed conversations" />
          <Stat v={h.meetings} k="Progressed to meeting" />
          <Stat v={h.movedToFriendship} k="Moved to friendship" />
          <Stat v={active} k="Currently active" />
        </div>
      </section>
      {stats && (
        <section>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Interaction patterns</p>
          <dl className="facts">
            <div><dt>Average connection</dt><dd>{stats.average} days</dd></div>
            <div><dt>Median connection</dt><dd>{stats.median} days</dd></div>
            <div><dt>Shortest meaningful</dt><dd>{stats.shortest} days</dd></div>
            <div><dt>Longest</dt><dd>{stats.longest} days</dd></div>
            <div><dt>Beyond first conversation</dt><dd>{h.beyondInitialPct}%</dd></div>
            <div><dt>Progressed to meeting</dt><dd>{h.toMeetingPct}%</dd></div>
          </dl>
        </section>
      )}
      <section>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Profile history</p>
        <dl className="facts">
          <div><dt>Member since</dt><dd>{monthYear(h.memberSince)}</dd></div>
          <div><dt>Photos updated</dt><dd>{h.changes.photos ? monthYear(h.changes.photos) : 'Never'}</dd></div>
          <div><dt>Location updated</dt><dd>{h.changes.location ? monthYear(h.changes.location) : 'Never'}</dd></div>
          <div><dt>Intent updated</dt><dd>{h.changes.intent ? monthYear(h.changes.intent) : 'Never'}</dd></div>
        </dl>
      </section>
      <p className="tiny faint">
        Aggregated, factual context. We never reveal who someone connected with, what was said, or who ended things.
      </p>
    </>
  );
}

function Stat({ v, k }: { v: number | string; k: string }) {
  return (
    <div className="stat">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}

function PremiumTeaser() {
  return (
    <section className="lock-panel">
      <Icon name="lock" className="faint" />
      <p style={{ fontWeight: 550, marginTop: 6 }}>Platform history &amp; interaction patterns</p>
      <p className="small muted" style={{ margin: '4px 0 12px' }}>
        Premium shows aggregated, privacy-preserving context — never identities or conversations.
      </p>
      <Link to="/premium" className="btn sm secondary">About Premium</Link>
    </section>
  );
}

export function FeedbackLocked({
  reason,
  name,
}: {
  reason: 'free-plan' | 'viewer-hidden' | 'target-hidden';
  name: string;
}) {
  if (reason === 'target-hidden') {
    return (
      <p className="small muted">
        {name} has chosen not to share Connection Feedback, so it’s hidden — and {name} can’t view anyone else’s either.
      </p>
    );
  }
  return (
    <div className="lock-panel">
      <div className="recip">
        See feedback <span className="arrow">⟷</span> Share feedback
      </div>
      <p className="small muted" style={{ margin: '8px 0 12px' }}>
        {reason === 'free-plan'
          ? 'Viewing Connection Feedback is part of Premium — and only while your own feedback is visible.'
          : 'Your feedback is hidden, so other people’s is hidden from you. Turn yours on to see theirs.'}
      </p>
      <Link to={reason === 'free-plan' ? '/premium' : '/you/feedback'} className="btn sm secondary">
        {reason === 'free-plan' ? 'How feedback works' : 'Feedback visibility'}
      </Link>
    </div>
  );
}

/** Full aggregated feedback view — only rendered once access is allowed. */
export function FeedbackDetail({ user, own }: { user: User; own?: boolean }) {
  const { state, viewer } = useStore();
  const fb = summarizeFeedback(state.feedback, user.id);
  if (!fb.enough) {
    return (
      <div className="card tint">
        <p style={{ fontWeight: 550 }}>Not enough feedback yet</p>
        <p className="small muted" style={{ marginTop: 4 }}>
          {fb.count === 0 ? 'No responses so far.' : `${fb.count} of ${MIN_FEEDBACK_FOR_SUMMARY} responses.`} Percentages from one or two
          interactions would be misleading, so we wait.
        </p>
      </div>
    );
  }
  return (
    <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        {TRAITS.filter((t) => t !== 'responsiveness' || fb.pct[t] !== undefined).map((t) => (
          <div className="meter" key={t}>
            <span>{TRAIT_LABEL[t]}</span>
            <span className="small" style={{ fontWeight: 600 }}>{fb.pct[t]}% positive</span>
            <span className="bar"><i style={{ width: `${fb.pct[t]}%` }} /></span>
          </div>
        ))}
        <p className="tiny faint">From {fb.count} people after meaningful Primary connections.</p>
      </div>
      {fb.comments.length > 0 && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 12 }}>What people shared</p>
          <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
            {fb.comments.slice(0, 6).map((c) => (
              <CommentItem key={c.id} id={c.id} text={c.text} />
            ))}
          </div>
        </div>
      )}
      {!own && (
        <p className="small muted" style={{ textAlign: 'center' }}>
          Feedback is reciprocal.{' '}
          {isFeedbackVisible(viewer) ? 'Your feedback is visible while you view this.' : ''}
        </p>
      )}
    </div>
  );
}

function CommentItem({ id, text }: { id: string; text: string }) {
  return (
    <div>
      <p className="quote">“{text}”</p>
      <Link to={`/report/${id}`} className="tiny faint" style={{ marginLeft: 16 }}>
        Report
      </Link>
    </div>
  );
}
