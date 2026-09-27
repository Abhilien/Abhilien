import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Portrait';
import { Empty, TopBar } from '../components/ui';
import { CLOSURE_REASONS, FRIEND_CLOSURE_REASONS } from '../domain/labels';
import { closeConnection, moveToFriendship, other, startPrimary } from '../domain/rules';
import { partnerFeedback } from '../state/simulate';
import { useStore } from '../state/store';

/** Respectful closure: a clear reason, an optional kind note, no shame. */
export function CloseScreen() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const nextId = params.get('next');
  const { state, viewer, act, later, toast } = useStore();
  const nav = useNavigate();
  const conn = state.connections.find((c) => c.id === id && c.users.includes(viewer.id));
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  if (!conn || conn.status === 'closed') {
    return (
      <>
        <TopBar back />
        <Empty title="Nothing to close">This connection has already been closed.</Empty>
      </>
    );
  }
  const them = state.users[other(conn, viewer.id)];
  const first = them.profile.firstName;
  const reasons = conn.kind === 'romantic' ? CLOSURE_REASONS : FRIEND_CLOSURE_REASONS;
  const suggestFriendship = reason === "I'd prefer friendship.";

  const confirm = () => {
    if (!reason) return;
    act((s) => {
      let n = closeConnection(s, conn.id, viewer.id, reason, note);
      if (nextId) n = startPrimary(n, nextId, viewer.id).state;
      return n;
    });
    later(4000, (s) => partnerFeedback(s, conn.id, viewer.id));
    toast(`Closed with care. ${first} will see your reason${note.trim() ? ' and note' : ''}.`);
    nav(`/feedback/${conn.id}${nextId ? `?next=${nextId}` : ''}`, { replace: true });
  };

  return (
    <>
      <TopBar back title="Close connection" />
      <div className="scroll">
        <div className="row">
          <Avatar p={them.profile.portraits[0]} size={52} />
          <div>
            <p className="eyebrow">Closing with care</p>
            <h1 className="display sm">Ending things with {first}</h1>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Closing is a normal part of getting to know someone. A clear, kind reason helps you both move on. It’s shared
          only with {first} — never shown publicly or counted anywhere.
        </p>

        <section className="section" role="radiogroup" aria-label="Reason">
          {reasons.map((r) => (
            <button key={r} className="option" role="radio" aria-checked={reason === r} onClick={() => setReason(r)}>
              {r}
            </button>
          ))}
        </section>

        {suggestFriendship && (
          <div className="card friend" style={{ marginTop: 14 }}>
            <p className="h3">Would you rather move to friendship?</p>
            <p className="small muted" style={{ marginTop: 4 }}>
              Instead of closing, you can ask {first} to continue as friends. Your romantic slot still opens.
            </p>
            <button
              className="btn friend sm"
              style={{ marginTop: 12 }}
              onClick={() => {
                toast(`Asking ${first}…`);
                later(1400, (s) => {
                  let n = moveToFriendship(s, conn.id, viewer.id).state;
                  if (nextId) n = startPrimary(n, nextId, viewer.id).state;
                  return n;
                }, `${first} also chose friendship.`);
                nav(nextId ? `/connections?kind=romantic` : '/connections?kind=friendship', { replace: true });
              }}
            >
              Ask {first} about friendship
            </button>
          </div>
        )}

        <section className="section field">
          <label htmlFor="note">A few words for {first} <span className="faint">(optional)</span></label>
          <textarea
            id="note"
            className="input"
            maxLength={400}
            placeholder="I really enjoyed our conversations, and I wish you the very best."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="tiny faint" style={{ marginTop: 6 }}>Kind and honest works best. {400 - note.length} characters left.</p>
        </section>

        <button className="btn primary block" style={{ marginTop: 20 }} disabled={!reason} onClick={confirm}>
          Close connection
        </button>
        <button className="btn quiet block" style={{ marginTop: 6 }} onClick={() => nav(-1)}>
          Not now
        </button>
      </div>
    </>
  );
}
