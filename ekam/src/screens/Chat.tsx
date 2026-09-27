import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Portrait';
import { Empty, KindMark, relDays, Sheet } from '../components/ui';
import { CHECKIN_LABEL, INTENT_LABEL, PAUSE_REASONS, STAGE_LABEL, STAGES_FRIENDSHIP, STAGES_ROMANTIC } from '../domain/labels';
import {
  bothReadyToMeet,
  checkIn,
  moveToFriendship,
  other,
  pauseConnection,
  reachStage,
  resumeConnection,
  retryMessage,
  sendMessage,
  setMeetingReady,
} from '../domain/rules';
import type { CheckIn, Connection } from '../domain/types';
import { partnerCheckIn, partnerReadyToMeet, partnerReply } from '../state/simulate';
import { useStore } from '../state/store';

type Panel = null | 'menu' | 'pause' | 'meet' | 'checkin' | 'call-voice' | 'call-video' | 'friendship';

export function ChatScreen() {
  const { id = '' } = useParams();
  const { state, viewer, act, later } = useStore();
  const nav = useNavigate();
  const conn = state.connections.find((c) => c.id === id && c.users.includes(viewer.id));
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [conn?.messages.length, typing]);

  if (!conn) {
    return (
      <>
        <BackBar />
        <Empty title="Conversation not found">It may belong to another profile in this demo.</Empty>
      </>
    );
  }

  const them = state.users[other(conn, viewer.id)];
  const first = them.profile.firstName;
  const active = conn.status === 'primary';
  const shared = viewer.profile.interests.filter((i) => them.profile.interests.includes(i));
  const stages = conn.kind === 'romantic' ? STAGES_ROMANTIC : STAGES_FRIENDSHIP;

  const send = () => {
    const t = text.trim();
    if (!t || !active) return;
    setText('');
    act((s) => sendMessage(s, conn.id, viewer.id, t, s.offline));
    if (state.offline) return;
    setTyping(true);
    later(1500 + Math.random() * 900, (s) => {
      setTyping(false);
      const c = s.connections.find((x) => x.id === conn.id);
      return c && c.status === 'primary' ? partnerReply(s, c, viewer.id) : s;
    });
  };

  return (
    <>
      <div className="chat-head">
        <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
          <button className="icon-btn bare" aria-label="Back" onClick={() => nav(-1)}>
            <Icon name="back" />
          </button>
          <Link to={`/profile/${them.id}`} className="row grow" style={{ textDecoration: 'none', '--gap': '10px' } as React.CSSProperties}>
            <Avatar p={them.profile.portraits[0]} size={42} />
            <div className="grow">
              <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                <KindMark kind={conn.kind} size={14} />
                <span style={{ fontWeight: 600, fontSize: 16 }}>{first}</span>
              </div>
              <div className="tiny muted">
                {conn.primarySince ? `Connected ${relDays(conn.primarySince, state.now)}` : 'Waiting list'} ·{' '}
                {conn.kind === 'romantic' ? INTENT_LABEL[them.profile.intent] : conn.fromRomance ? 'Friendship · once romantic' : 'Friendship'}
              </div>
            </div>
          </Link>
          {conn.status !== 'closed' && (
            <button className="icon-btn bare" aria-label="Connection options" onClick={() => setPanel('menu')}>
              <Icon name="more" />
            </button>
          )}
        </div>
        {conn.status !== 'closed' && conn.status !== 'mutual' && (
          <div style={{ marginTop: 10 }}>
            <div className="stages" aria-label="Relationship progression">
              {stages.map((st) => (
                <span key={st} className={`stage-pill${conn.stagesReached.includes(st) ? ' reached' : ''}`}>
                  {STAGE_LABEL[st]}
                </span>
              ))}
            </div>
            {shared.length > 0 && <div className="tiny faint">Shared · {shared.join(' · ')}</div>}
          </div>
        )}
      </div>

      <StatusBanner conn={conn} onResume={() => act((s) => resumeConnection(s, conn.id, viewer.id))} />

      <div className="messages" aria-live="polite">
        {conn.messages.map((m) =>
          m.kind === 'system' ? (
            <div key={m.id} className="msg-system">{m.text}</div>
          ) : m.kind === 'plan' ? (
            <div key={m.id} className="msg-plan card tint">
              <p className="eyebrow">Date plan</p>
              <p style={{ fontWeight: 600, marginTop: 4 }}>{conn.datePlan?.venue}</p>
              <p className="small muted">{conn.datePlan?.time} · {conn.datePlan?.area} · {conn.datePlan?.budget}</p>
            </div>
          ) : (
            <div key={m.id} className={`bubble ${m.from === viewer.id ? 'me' : 'them'}${m.failed ? ' failed' : ''}`}>
              {m.text}
              {m.failed && (
                <button className="link tiny" style={{ display: 'block', marginTop: 4, color: 'inherit' }} onClick={() => act((s) => retryMessage(s, conn.id, m.id))}>
                  Not sent · Retry
                </button>
              )}
            </div>
          ),
        )}
        {typing && (
          <div className="typing" aria-label={`${first} is typing`}>
            <i /> <i /> <i />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {active && (
        <>
          <div className="row" style={{ padding: '6px 14px 0', '--gap': '6px', overflowX: 'auto' } as React.CSSProperties}>
            <button className="chip outline" onClick={() => setPanel('call-voice')}><Icon name="phone" size={14} /> Voice</button>
            <button className="chip outline" onClick={() => setPanel('call-video')}><Icon name="video" size={14} /> Video</button>
            <button className="chip outline" onClick={() => (bothReadyToMeet(conn) ? nav(`/chat/${conn.id}/plan`) : setPanel('meet'))}>
              <Icon name="calendar" size={14} /> {bothReadyToMeet(conn) ? 'Plan a date' : 'Meet'}
            </button>
            <button className="chip outline" onClick={() => setPanel('checkin')}>How’s it going?</button>
          </div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label className="sr-only" htmlFor="composer">Message {first}</label>
            <textarea
              id="composer"
              rows={1}
              placeholder={`Message ${first}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="icon-btn" type="submit" aria-label="Send" disabled={!text.trim()} style={{ width: 44, height: 44, background: 'var(--accent)', color: 'var(--accent-ink)', border: 0 }}>
              <Icon name="send" size={18} />
            </button>
          </form>
        </>
      )}

      <ChatPanels conn={conn} panel={panel} setPanel={setPanel} />
    </>
  );
}

function BackBar() {
  const nav = useNavigate();
  return (
    <div className="topbar">
      <button className="icon-btn bare" aria-label="Back" onClick={() => nav(-1)}>
        <Icon name="back" />
      </button>
    </div>
  );
}

function StatusBanner({ conn, onResume }: { conn: Connection; onResume: () => void }) {
  const { state, viewer } = useStore();
  const first = state.users[other(conn, viewer.id)].profile.firstName;
  if (conn.status === 'paused') {
    const byMe = conn.pause?.by === viewer.id;
    return (
      <div className="notice-bar warn" style={{ margin: '10px 14px 0' }}>
        <Icon name="pause" size={16} />
        <div className="grow">
          {byMe ? 'You paused' : `${first} paused`} this connection · {conn.pause?.reason}. It stays reserved for you both.
        </div>
        {byMe && <button className="btn sm secondary" onClick={onResume}>Resume</button>}
      </div>
    );
  }
  if (conn.status === 'mutual') {
    return (
      <div className="notice-bar" style={{ margin: '10px 14px 0' }}>
        <Icon name="info" size={16} />
        <div className="grow">
          {first} is on your waiting list. Conversation opens when you’re each other’s Primary.
          {conn.invite?.by === viewer.id && ' Your invitation is waiting.'}
        </div>
      </div>
    );
  }
  if (conn.status === 'closed' && conn.closure) {
    const byMe = conn.closure.by === viewer.id;
    return (
      <div className="card tint" style={{ margin: '10px 14px 0' }}>
        <p className="eyebrow">{byMe ? 'You closed this connection' : `${first} closed this connection`}</p>
        <p style={{ marginTop: 6, fontWeight: 550 }}>{conn.closure.reason}</p>
        {conn.closure.note && <p className="quote" style={{ marginTop: 8, fontSize: 17 }}>“{conn.closure.note}”</p>}
        {conn.feedbackDue.includes(viewer.id) && (
          <Link to={`/feedback/${conn.id}`} className="btn sm secondary" style={{ marginTop: 12 }}>
            Share Connection Feedback
          </Link>
        )}
      </div>
    );
  }
  return null;
}

function ChatPanels({ conn, panel, setPanel }: { conn: Connection; panel: Panel; setPanel: (p: Panel) => void }) {
  const { state, viewer, act, later, toast } = useStore();
  const nav = useNavigate();
  const first = state.users[other(conn, viewer.id)].profile.firstName;
  const [reason, setReason] = useState(PAUSE_REASONS[0]);
  const [answer, setAnswer] = useState<CheckIn | null>(null);
  const [calling, setCalling] = useState(false);
  const close = () => {
    setPanel(null);
    setAnswer(null);
    setCalling(false);
  };
  const mine = conn.checkins[viewer.id];
  const theirs = conn.checkins[other(conn, viewer.id)];

  return (
    <>
      <Sheet open={panel === 'menu'} onClose={close} label="Connection options">
        <p className="eyebrow" style={{ marginBottom: 12 }}>{first}</p>
        <div className="list">
          <Link className="list-row" to={`/profile/${other(conn, viewer.id)}`}><Icon name="user" /> View profile</Link>
          {conn.status === 'primary' && (
            <button className="list-row" onClick={() => setPanel('checkin')}><Icon name="info" /> How do you feel about this connection?</button>
          )}
          {conn.status === 'primary' && (
            <button className="list-row" onClick={() => setPanel('pause')}><Icon name="pause" /> Pause connection</button>
          )}
          {conn.status === 'paused' && (
            <button className="list-row" onClick={() => { act((s) => resumeConnection(s, conn.id, viewer.id)); close(); }}>
              <Icon name="play" /> Resume connection
            </button>
          )}
          {conn.kind === 'romantic' && conn.status !== 'mutual' && (
            <button className="list-row" onClick={() => setPanel('friendship')}><KindMark kind="friendship" size={20} /> Move to friendship</button>
          )}
          {conn.kind === 'romantic' && conn.status === 'primary' && conn.stagesReached.includes('meeting') && !conn.stagesReached.includes('relationship') && (
            <button className="list-row" onClick={() => { act((s) => reachStage(s, conn.id, 'relationship')); close(); toast('Marked as a relationship — just between you two.'); }}>
              <Icon name="heart" /> We’re in a relationship
            </button>
          )}
          {conn.kind === 'romantic' && conn.stagesReached.includes('relationship') && !conn.stagesReached.includes('marriage') && (
            <button className="list-row" onClick={() => { act((s) => reachStage(s, conn.id, 'marriage')); close(); toast('Noted: you’re considering marriage. We’ll share thoughtful resources.'); }}>
              <Icon name="sparkle" /> We’re considering marriage
            </button>
          )}
          <button className="list-row" onClick={() => { close(); nav(`/close/${conn.id}`); }} style={{ color: 'var(--danger)' }}>
            <Icon name="x" /> Close connection
          </button>
          <button className="list-row" onClick={() => { close(); toast('Our Trust & Safety team will review this privately.'); }}>
            <Icon name="flag" /> Report a safety concern
          </button>
        </div>
      </Sheet>

      <Sheet open={panel === 'pause'} onClose={close} label="Pause connection">
        <p className="eyebrow">Pause</p>
        <h2 className="display sm" style={{ margin: '6px 0 6px' }}>Take the time you need</h2>
        <p className="small muted" style={{ marginBottom: 14 }}>
          Your connection with {first} stays reserved — no one else can take this slot unless you release it.
        </p>
        <div role="radiogroup">
          {PAUSE_REASONS.map((r) => (
            <button key={r} className="option" role="radio" aria-checked={reason === r} onClick={() => setReason(r)}>
              {r}
            </button>
          ))}
        </div>
        <button className="btn primary block" style={{ marginTop: 18 }} onClick={() => { act((s) => pauseConnection(s, conn.id, viewer.id, reason)); close(); }}>
          Pause connection
        </button>
      </Sheet>

      <Sheet open={panel === 'meet'} onClose={close} label="Meeting">
        <p className="eyebrow">Meeting</p>
        <h2 className="display sm" style={{ margin: '6px 0 6px' }}>Would you like to meet {first}?</h2>
        <p className="small muted" style={{ marginBottom: 16 }}>
          {first} only sees this once you’re both comfortable. There’s no deadline.
        </p>
        {conn.meetingReady[viewer.id] ? (
          <div className="notice-bar"><Icon name="check" size={16} /> You’ve said you’re comfortable meeting. We’ll let you know if {first} is too.</div>
        ) : (
          <button
            className="btn primary block"
            onClick={() => {
              act((s) => setMeetingReady(s, conn.id, viewer.id, true));
              later(1800, (s) => partnerReadyToMeet(s, conn.id, viewer.id), `You’re both interested in meeting.`);
              close();
            }}
          >
            I’m comfortable meeting
          </button>
        )}
      </Sheet>

      <Sheet open={panel === 'checkin'} onClose={close} label="Check in">
        <p className="eyebrow">Private check-in</p>
        <h2 className="display sm" style={{ margin: '6px 0 6px' }}>How do you feel about this connection?</h2>
        <p className="small muted" style={{ marginBottom: 16 }}>Only you see your answer unless you both choose to continue.</p>
        {mine && !answer ? (
          <div className="notice-bar">
            <Icon name="check" size={16} /> You said: {CHECKIN_LABEL[mine]}.{' '}
            {mine === 'continue' && theirs === 'continue' ? `${first} would like to continue too.` : ''}
          </div>
        ) : (
          <div role="radiogroup">
            {(Object.keys(CHECKIN_LABEL) as CheckIn[])
              .filter((k) => conn.kind === 'romantic' || k !== 'friendship')
              .map((k) => (
                <button key={k} className="option" role="radio" aria-checked={answer === k} onClick={() => setAnswer(k)}>
                  {CHECKIN_LABEL[k]}
                </button>
              ))}
            <button
              className="btn primary block"
              style={{ marginTop: 18 }}
              disabled={!answer}
              onClick={() => {
                if (!answer) return;
                if (answer === 'close') {
                  close();
                  nav(`/close/${conn.id}`);
                  return;
                }
                if (answer === 'friendship') {
                  setPanel('friendship');
                  setAnswer(null);
                  return;
                }
                act((s) => checkIn(s, conn.id, viewer.id, answer));
                if (answer === 'continue') {
                  later(1400, (s) => partnerCheckIn(s, conn.id, viewer.id), `You both want to continue.`);
                } else {
                  toast('That’s okay. Nothing is shared — take your time.');
                }
                close();
              }}
            >
              Save privately
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={panel === 'friendship'} onClose={close} label="Move to friendship">
        <KindMark kind="friendship" size={28} />
        <h2 className="display sm" style={{ margin: '10px 0 6px' }}>Continue as friends?</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Not every connection needs to be romantic. If {first} agrees, your romantic slot opens and this connection
          continues as a friendship — nothing is thrown away.
        </p>
        <button
          className="btn friend block"
          onClick={() => {
            close();
            toast(`Asking ${first}…`);
            later(1500, (s) => moveToFriendship(s, conn.id, viewer.id).state, `${first} also chose friendship.`);
          }}
        >
          Ask {first}
        </button>
        <button className="btn quiet block" style={{ marginTop: 6 }} onClick={close}>Not now</button>
      </Sheet>

      <Sheet open={panel === 'call-voice' || panel === 'call-video'} onClose={close} label="Call">
        <div className="empty" style={{ paddingTop: 12 }}>
          <Avatar p={state.users[other(conn, viewer.id)].profile.portraits[0]} size={96} />
          <h2 className="display sm" style={{ marginTop: 14 }}>
            {calling ? `${panel === 'call-video' ? 'Video' : 'Voice'} call with ${first}` : `Call ${first}?`}
          </h2>
          <p className="muted small" style={{ marginTop: 6 }}>
            {calling ? 'Connected · calls happen in-app, so your number stays private.' : 'Your phone number is never shared.'}
          </p>
          {calling ? (
            <button
              className="btn danger block"
              style={{ marginTop: 20 }}
              onClick={() => {
                act((s) => reachStage(s, conn.id, panel === 'call-video' ? 'video' : 'voice'));
                close();
                toast('Call ended.');
              }}
            >
              End call
            </button>
          ) : (
            <button className="btn primary block" style={{ marginTop: 20 }} onClick={() => setCalling(true)}>
              <Icon name={panel === 'call-video' ? 'video' : 'phone'} size={18} /> Start call
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}
