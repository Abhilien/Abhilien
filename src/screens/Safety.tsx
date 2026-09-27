import { Empty, TopBar } from '../components/ui';
import { REPORT_LABEL } from '../domain/labels';
import { moderateFeedback } from '../domain/rules';
import { useStore } from '../state/store';

/** Internal Trust & Safety console (demo). Moderators see authors; members never do. */
export function SafetyScreen() {
  const { state, act, toast } = useStore();
  const queue = state.feedback.filter((f) => f.status === 'held' || f.status === 'reported');

  return (
    <>
      <TopBar back title="Trust & Safety · review queue" />
      <div className="scroll">
        <div className="notice-bar warn" style={{ marginBottom: 16 }}>
          Internal tool, shown for the prototype. Decisions are about the comment, never a verdict on the person.
        </div>
        {queue.length === 0 ? (
          <Empty title="Queue is clear">Held and reported feedback appears here for human review.</Empty>
        ) : (
          <div className="stack">
            {queue.map((f) => (
              <div key={f.id} className="card">
                <div className="row between">
                  <span className={`chip ${f.status === 'held' ? 'gold' : ''}`}>
                    {f.status === 'held' ? 'Held by automatic screen' : `Reported · ${REPORT_LABEL[f.report!.reason]}`}
                  </span>
                  <span className="tiny faint">About {state.users[f.about]?.profile.firstName ?? f.about}</span>
                </div>
                <p className="quote" style={{ margin: '12px 0' }}>“{f.comment}”</p>
                <p className="tiny faint">
                  Guidelines: remove harassment, threats, discrimination, explicit content, doxxing, abuse, retaliation, or
                  content unrelated to the interaction.
                </p>
                <div className="row" style={{ marginTop: 12, '--gap': '8px' } as React.CSSProperties}>
                  <button className="btn sm danger" onClick={() => { act((s) => moderateFeedback(s, f.id, 'remove')); toast('Comment removed.'); }}>
                    Remove
                  </button>
                  <button className="btn sm secondary" onClick={() => { act((s) => moderateFeedback(s, f.id, 'publish')); toast('Comment restored.'); }}>
                    Keep — it’s fair
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
