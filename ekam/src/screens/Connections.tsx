import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Portrait';
import { Empty, KindLabel, KindMark, Segmented, Sheet, TopBar } from '../components/ui';
import { relDays } from '../lib/format';
import { distance } from '../domain/discovery';
import { STAGE_LABEL } from '../domain/labels';
import { broadLocation } from '../domain/privacy';
import {
  moveToFriendship,
  other,
  primaryOf,
  returnToWaiting,
  slotFree,
  startPrimary,
  waitingOf,
} from '../domain/rules';
import type { Connection, Kind } from '../domain/types';
import { useStore } from '../state/context';

export function ConnectionsScreen() {
  const { state, viewer, act, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const kind: Kind = params.get('kind') === 'friendship' ? 'friendship' : 'romantic';
  const primary = primaryOf(state, viewer.id, kind);
  const waiting = waitingOf(state, viewer.id, kind);
  const free = slotFree(state, viewer.id, kind);
  const past = state.connections
    .filter((c) => c.status === 'closed' && c.users.includes(viewer.id) && c.kind === kind)
    .sort((a, b) => (b.closure?.at ?? '').localeCompare(a.closure?.at ?? ''));

  const [changeOpen, setChangeOpen] = useState(false);
  const [target, setTarget] = useState<string | undefined>();

  useEffect(() => {
    if (params.get('change') === '1') {
      setTarget(params.get('to') ?? undefined);
      setChangeOpen(true);
    }
  }, [params]);

  const begin = (c: Connection) => {
    const r = startPrimary(state, c.id, viewer.id);
    act((s) => startPrimary(s, c.id, viewer.id).state);
    const first = state.users[other(c, viewer.id)].profile.firstName;
    if (r.outcome === 'primary') nav(`/chat/${c.id}`);
    else if (r.outcome === 'invited') toast(`${first} is focused on someone else right now. Your invitation will wait, quietly.`);
  };

  return (
    <>
      <TopBar title={<span className="display sm" style={{ fontSize: 26 }}>Connections</span>} />
      <div className="scroll">
        <Segmented
          label="Connection type"
          value={kind}
          onChange={(k) => setParams({ kind: k })}
          options={[
            { value: 'romantic', label: 'Romantic' },
            { value: 'friendship', label: 'Friendship' },
          ]}
        />

        <section className="section" style={{ marginTop: 22 }}>
          <div className="section-head">
            <KindLabel kind={kind}>Primary</KindLabel>
            <span className="tiny faint">1 of 1</span>
          </div>
          {primary ? (
            <PrimaryCard conn={primary} onChange={() => { setTarget(undefined); setChangeOpen(true); }} />
          ) : (
            <div className="slot open" style={{ cursor: 'default' }}>
              <span className="slot-empty-mark"><KindMark kind={kind} size={20} /></span>
              <div className="grow">
                <p style={{ fontWeight: 550 }}>Your Primary is open</p>
                <p className="small muted">
                  {waiting.length ? 'Choose someone from your waiting list when you’re ready.' : 'When you have mutual interest, you can begin here.'}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-head">
            <p className="eyebrow">{kind === 'romantic' ? 'Romantic' : 'Friendship'} waiting · {waiting.length}</p>
            {primary && waiting.length > 0 && (
              <button className="btn quiet sm" onClick={() => { setTarget(undefined); setChangeOpen(true); }}>
                Change Primary
              </button>
            )}
          </div>
          {primary && waiting.length > 0 && (
            <p className="small muted" style={{ marginBottom: 12 }}>
              Your Primary {kind === 'romantic' ? 'romantic connection' : 'friendship'} is currently occupied. These people
              chose you too; their interest waits without pressure.
            </p>
          )}
          {waiting.length ? (
            <div className="list">
              {waiting.map((c) => (
                <WaitingItem key={c.id} conn={c} canBegin={free} onBegin={() => begin(c)} />
              ))}
            </div>
          ) : (
            <Empty title="No one waiting" action={<Link to={`/discover?kind=${kind}`} className="btn secondary">Discover</Link>}>
              When you and someone both express interest, they appear here.
            </Empty>
          )}
        </section>

        {past.length > 0 && (
          <section className="section">
            <details className="disclosure">
              <summary>
                <div className="grow">
                  <div className="h3">Past connections</div>
                  <div className="small muted">Closed respectfully · private to you</div>
                </div>
                <Icon name="down" className="chev" />
              </summary>
              <div className="body">
                {past.map((c) => {
                  const them = state.users[other(c, viewer.id)];
                  return (
                    <div key={c.id} className="row" style={{ padding: '8px 0' }}>
                      <Avatar p={them.profile.portraits[0]} size={36} />
                      <div className="grow">
                        <div style={{ fontWeight: 550 }}>{them.profile.firstName}</div>
                        <div className="tiny muted">Closed {relDays(c.closure!.at, state.now)} ago</div>
                      </div>
                      {c.feedbackDue.includes(viewer.id) ? (
                        <Link to={`/feedback/${c.id}`} className="btn sm secondary">Share feedback</Link>
                      ) : (
                        <span className="tiny faint">Feedback shared</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          </section>
        )}
      </div>

      {changeOpen && primary && (
        <ChangePrimaryFlow
          current={primary}
          initialTarget={target}
          onClose={() => {
            setChangeOpen(false);
            if (params.get('change')) setParams({ kind });
          }}
        />
      )}
    </>
  );
}

function PrimaryCard({ conn, onChange }: { conn: Connection; onChange: () => void }) {
  const { state, viewer } = useStore();
  const them = state.users[other(conn, viewer.id)];
  const latest = conn.stagesReached[conn.stagesReached.length - 1];
  return (
    <div className={`card ${conn.kind === 'romantic' ? 'romance' : 'friend'}`} style={{ padding: 16 }}>
      <div className="row">
        <Avatar p={them.profile.portraits[0]} size={64} />
        <div className="grow">
          <p className="display sm">{them.profile.firstName}</p>
          <p className="small muted">
            {conn.status === 'paused'
              ? `Paused · ${conn.pause?.reason}`
              : `Connected ${relDays(conn.primarySince!, state.now)}${latest ? ` · ${STAGE_LABEL[latest]}` : ''}`}
          </p>
        </div>
      </div>
      <div className="row" style={{ marginTop: 14, '--gap': '8px' } as React.CSSProperties}>
        <Link to={`/chat/${conn.id}`} className="btn primary sm grow">Continue</Link>
        <Link to={`/profile/${them.id}`} className="btn secondary sm">Profile</Link>
        <button className="btn secondary sm" onClick={onChange} aria-label="Change Primary">
          Change
        </button>
      </div>
    </div>
  );
}

function WaitingItem({ conn, canBegin, onBegin }: { conn: Connection; canBegin: boolean; onBegin: () => void }) {
  const { state, viewer } = useStore();
  const them = state.users[other(conn, viewer.id)];
  const p = them.profile;
  const inviteFromThem = conn.invite && conn.invite.by !== viewer.id;
  const inviteFromMe = conn.invite?.by === viewer.id;
  const far = distance(viewer, them);
  return (
    <div className="list-row">
      <Link to={`/profile/${them.id}`} className="row grow" style={{ textDecoration: 'none' }}>
        <Avatar p={p.portraits[0]} size={52} />
        <div className="grow">
          <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{p.firstName}</span>
            {conn.fromRomance && <span className="chip friend" style={{ padding: '2px 8px', fontSize: 11 }}>Once romantic</span>}
          </div>
          <div className="small muted">
            {p.age} · {broadLocation(p.place, viewer.profile.place.country)}
            {far === 'international' && ' · abroad'}
          </div>
          <div className="tiny faint">
            Mutual interest · {relDays(conn.mutualAt, state.now)}
            {inviteFromThem && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> · Ready when you are</span>}
            {inviteFromMe && ' · Your invitation is waiting'}
          </div>
        </div>
      </Link>
      {canBegin && !inviteFromMe && (
        <button className={`btn sm ${conn.kind === 'romantic' ? 'romance' : 'friend'}`} onClick={onBegin}>
          {inviteFromThem ? 'Accept' : 'Begin'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change Primary — intentional, respectful, never a shopping cart.
// ---------------------------------------------------------------------------

type Choice = 'continue' | 'friendship' | 'waiting' | 'close';

function ChangePrimaryFlow({
  current,
  initialTarget,
  onClose,
}: {
  current: Connection;
  initialTarget?: string;
  onClose: () => void;
}) {
  const { state, viewer, act, toast, later } = useStore();
  const nav = useNavigate();
  const waiting = waitingOf(state, viewer.id, current.kind);
  const [targetId, setTargetId] = useState<string | undefined>(initialTarget);
  const [step, setStep] = useState<'who' | 'decide' | 'confirm' | 'asking'>(initialTarget ? 'decide' : 'who');
  const [choice, setChoice] = useState<Choice | null>(null);
  const currentName = state.users[other(current, viewer.id)].profile.firstName;
  const target = waiting.find((c) => c.id === targetId);
  const targetName = target ? state.users[other(target, viewer.id)].profile.firstName : '';

  const activateTarget = (s: typeof state) => (target ? startPrimary(s, target.id, viewer.id).state : s);

  const finish = () => {
    if (!choice) return;
    if (choice === 'continue') {
      onClose();
      toast(`You’re continuing with ${currentName}.`);
      return;
    }
    if (choice === 'close') {
      onClose();
      nav(`/close/${current.id}${target ? `?next=${target.id}` : ''}`);
      return;
    }
    if (choice === 'waiting') {
      act((s) => activateTarget(returnToWaiting(s, current.id, viewer.id)));
      onClose();
      toast(`${currentName} returns to your waiting list. Your mutual interest is kept.`);
      if (target) nav(`/chat/${target.id}`);
      return;
    }
    // Friendship is a mutual choice — ask the other person first.
    setStep('asking');
    later(
      1600,
      (s) => activateTarget(moveToFriendship(s, current.id, viewer.id).state),
      `${currentName} also chose friendship.`,
    );
    setTimeout(() => {
      onClose();
      nav(target ? `/chat/${target.id}` : '/connections?kind=friendship');
    }, 1700);
  };

  const OPTIONS: { value: Choice; title: string; detail: string; glyph: React.ReactNode; romanticOnly?: boolean }[] = [
    {
      value: 'continue',
      title: current.kind === 'romantic' ? 'Continue dating' : 'Continue this friendship',
      detail: 'Keep things as they are. Nothing changes.',
      glyph: <KindMark kind={current.kind} />,
    },
    {
      value: 'friendship',
      title: 'Move to friendship',
      detail: `Ask ${currentName} if you’d both like to continue as friends. Frees your romantic slot.`,
      glyph: <KindMark kind="friendship" />,
      romanticOnly: true,
    },
    {
      value: 'waiting',
      title: 'Pause connection',
      detail: `Step back without ending it. Your mutual interest is kept and ${currentName} returns to your waiting list.`,
      glyph: <Icon name="pause" size={16} />,
    },
    {
      value: 'close',
      title: 'Close connection',
      detail: 'End respectfully, with a clear reason. You can share Connection Feedback after.',
      glyph: <Icon name="x" size={16} />,
    },
  ];

  return (
    <Sheet open onClose={onClose} label="Change Primary">
      {step === 'who' && (
        <div className="fade-in">
          <p className="eyebrow">Change Primary</p>
          <h2 className="display sm" style={{ margin: '6px 0 6px' }}>Who would you like to get to know?</h2>
          <p className="small muted" style={{ marginBottom: 16 }}>Take your time. {currentName} remains your Primary until you decide.</p>
          <div role="radiogroup">
            {waiting.map((c) => {
              const u = state.users[other(c, viewer.id)];
              return (
                <button key={c.id} className="option" role="radio" aria-checked={targetId === c.id} onClick={() => setTargetId(c.id)}>
                  <Avatar p={u.profile.portraits[0]} size={36} />
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{u.profile.firstName}</div>
                    <div className="tiny muted">{u.profile.age} · {u.profile.place.city} · mutual {relDays(c.mutualAt, state.now)}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <button className="btn primary block" style={{ marginTop: 18 }} disabled={!targetId} onClick={() => setStep('decide')}>
            Continue
          </button>
          <button className="btn quiet block" style={{ marginTop: 6 }} onClick={() => { setTargetId(undefined); setStep('decide'); }}>
            I just want to change things with {currentName}
          </button>
        </div>
      )}

      {step === 'decide' && (
        <div className="fade-in">
          <p className="eyebrow">First, {currentName}</p>
          <h2 className="display sm" style={{ margin: '6px 0 6px' }}>What would you like to do with {currentName}?</h2>
          <p className="small muted" style={{ marginBottom: 16 }}>
            {target
              ? `Before ${targetName} can become your Primary, your connection with ${currentName} needs a decision.`
              : 'Every option is respectful. Whatever you choose, it is shared with care.'}
          </p>
          <div role="radiogroup">
            {OPTIONS.filter((o) => !o.romanticOnly || current.kind === 'romantic').map((o) => (
              <button key={o.value} className="option" role="radio" aria-checked={choice === o.value} onClick={() => setChoice(o.value)}>
                <span className="glyph">{o.glyph}</span>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{o.title}</div>
                  <div className="small muted">{o.detail}</div>
                </div>
              </button>
            ))}
          </div>
          <button
            className="btn primary block"
            style={{ marginTop: 18 }}
            disabled={!choice}
            onClick={() => (choice === 'continue' || choice === 'close' ? finish() : setStep('confirm'))}
          >
            {choice === 'close' ? 'Continue to closure' : 'Continue'}
          </button>
        </div>
      )}

      {step === 'confirm' && choice && (
        <div className="fade-in">
          <p className="eyebrow">Take a moment</p>
          <h2 className="display sm" style={{ margin: '6px 0 12px' }}>Here’s what will happen</h2>
          <ol className="stack" style={{ paddingLeft: 18, margin: 0 }}>
            {choice === 'friendship' && (
              <>
                <li>{currentName} is asked whether they’d also like to move to friendship.</li>
                <li>If you both agree, your romantic slot opens and this becomes a friendship{primaryOf(state, viewer.id, 'friendship') ? ' on your friendship waiting list (your friendship Primary is taken)' : ' — your Primary friendship'}.</li>
              </>
            )}
            {choice === 'waiting' && (
              <>
                <li>{currentName} is told, kindly, that you’re stepping back for now.</li>
                <li>Your mutual interest is kept — you both return to each other’s waiting lists.</li>
              </>
            )}
            {target && <li>{targetName} becomes your Primary if they’re free, or receives a quiet invitation if not.</li>}
            <li>No one else is told anything. There are no public rejection counts.</li>
          </ol>
          <button className="btn primary block" style={{ marginTop: 22 }} onClick={finish}>
            Confirm
          </button>
          <button className="btn quiet block" style={{ marginTop: 6 }} onClick={() => setStep('decide')}>
            Go back
          </button>
        </div>
      )}

      {step === 'asking' && (
        <div className="empty fade-in" aria-live="polite">
          <KindMark kind="friendship" size={30} />
          <h2 className="display sm" style={{ marginTop: 12 }}>Asking {currentName}…</h2>
          <p className="muted">Moving to friendship is something you both choose.</p>
        </div>
      )}
    </Sheet>
  );
}
