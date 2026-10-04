import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Portrait';
import { Empty, TopBar } from '../components/ui';
import { TRAIT_PROMPT } from '../domain/labels';
import { other, submitFeedback } from '../domain/rules';
import { FEEDBACK_RELEASE_DAYS, TRAITS } from '../domain/trust';
import type { FeedbackStatus, Trait } from '../domain/types';
import { useStore } from '../state/context';

export function FeedbackScreen() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { state, viewer, act } = useStore();
  const nav = useNavigate();
  const conn = state.connections.find((c) => c.id === id && c.users.includes(viewer.id));
  const [traits, setTraits] = useState<Record<Trait, boolean>>(
    () => Object.fromEntries(TRAITS.map((t) => [t, false])) as Record<Trait, boolean>,
  );
  const [comment, setComment] = useState('');
  const [done, setDone] = useState<FeedbackStatus | null>(null);
  const next = params.get('next');
  const leave = () => nav(next ? `/chat/${next}` : '/', { replace: true });

  if (!conn) return <Empty title="Not found" />;
  const them = state.users[other(conn, viewer.id)];
  const first = them.profile.firstName;

  if (done) {
    return (
      <>
        <TopBar />
        <div className="scroll">
          <Empty
            icon={<Icon name="check" size={30} className="faint" />}
            title="Thank you"
            action={<button className="btn primary" onClick={leave}>{next ? 'Continue to your new Primary' : 'Done'}</button>}
          >
            {done === 'held'
              ? 'Your comment will be reviewed by our Trust & Safety team before it appears — this helps keep feedback fair.'
              : done === 'published'
                ? `You’ve both shared feedback, so it’s now part of each other’s aggregated Connection Feedback.`
                : `Your feedback stays private until ${first} responds too, or ${FEEDBACK_RELEASE_DAYS} days pass. Neither of you sees the other’s first.`}
          </Empty>
        </div>
      </>
    );
  }

  if (!conn.feedbackDue.includes(viewer.id)) {
    return (
      <>
        <TopBar back />
        <Empty title="Feedback shared" action={<button className="btn secondary" onClick={leave}>Done</button>}>
          You’ve already shared feedback about this connection.
        </Empty>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Connection feedback"
        right={<button className="btn quiet sm" onClick={leave}>Later</button>}
      />
      <div className="scroll">
        <div className="row">
          <Avatar p={them.profile.portraits[0]} size={52} />
          <div>
            <p className="eyebrow">After your connection</p>
            <h1 className="display sm">How was your experience with {first}?</h1>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          About how the interaction felt — not attractiveness, and not whether it worked out. It’s anonymous, aggregated
          with others, and only shown once there’s enough to be meaningful.
        </p>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>{first} was…</p>
          <div className="chips" role="group" aria-label="Traits">
            {TRAITS.map((t) => (
              <button
                key={t}
                className="chip"
                style={{ padding: '9px 14px', fontSize: 14 }}
                aria-pressed={traits[t]}
                onClick={() => setTraits((x) => ({ ...x, [t]: !x[t] }))}
              >
                {traits[t] && <Icon name="check" size={14} weight={2.2} />} {TRAIT_PROMPT[t]}
              </button>
            ))}
          </div>
          <p className="tiny faint" style={{ marginTop: 8 }}>Select all that apply. Leaving one unselected is okay.</p>
        </section>

        <section className="section field">
          <label htmlFor="fb-comment">What would you like future connections to know? <span className="faint">(optional)</span></label>
          <textarea
            id="fb-comment"
            className="input"
            maxLength={280}
            placeholder="Very respectful and easy to talk to. We weren’t romantically compatible, but the conversation was mature and comfortable."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="tiny faint" style={{ marginTop: 6 }}>
            Please don’t include names, contact details, locations, or anything hurtful. Comments that look harmful are
            held for human review.
          </p>
        </section>

        <button
          className="btn primary block"
          style={{ marginTop: 22 }}
          onClick={() => {
            const r = submitFeedback(state, conn.id, viewer.id, traits, comment);
            act((s) => submitFeedback(s, conn.id, viewer.id, traits, comment).state);
            setDone(r.status);
          }}
        >
          Share feedback
        </button>
      </div>
    </>
  );
}
