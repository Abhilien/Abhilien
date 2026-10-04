import { useState } from 'react';
import { DAY, HOUR, MIN, formatTime } from '../core/dates';
import { lateCorrection, leaveStatus, planLeave, runningLateDraft, type LeaveStateName } from '../core/leave';
import { recommend } from '../core/recommend';
import type { Energy, Item, LeaveEvent, Park, Size } from '../core/types';
import { actions, useStore } from '../state/store';
import { Ring } from './Ring';

const STATE_ICON: Record<LeaveStateName, string> = { free: '🟢', ready: '🟡', soon: '🟠', now: '🔴', late: '⚫', gone: '✓' };
const STATE_WORD: Record<LeaveStateName, string> = {
  free: 'Free',
  ready: 'Get ready',
  soon: 'Leave soon',
  now: 'Leave now',
  late: 'Running late',
  gone: 'On your way',
};

export function nextEvent(events: LeaveEvent[], now: number): LeaveEvent | null {
  return (
    events
      .filter((e) => e.startAt > now - 30 * MIN && e.startAt - now < DAY && !(e.leftAt && e.startAt < now))
      .sort((a, b) => a.startAt - b.startAt)[0] ?? null
  );
}

interface NowProps {
  now: Date;
  onStart: (item: Item | null, title: string, size: Size | null) => void;
  onResume: (park: Park) => void;
  onAddEvent: () => void;
  onOverwhelm: () => void;
  onResetDay: () => void;
  toast: (msg: string) => void;
}

export function Now({ now, onStart, onResume, onAddEvent, onOverwhelm, onResetDay, toast }: NowProps) {
  const items = useStore((s) => s.items);
  const parks = useStore((s) => s.parks);
  const events = useStore((s) => s.events);
  const lags = useStore((s) => s.lags);
  const learning = useStore((s) => s.settings.learning);
  const welcomeBackDays = useStore((s) => s.welcomeBackDays);
  const inbox = useStore((s) => s.inbox);
  const digest = inbox.filter((m) => m.tier === 'digest');
  const [energy, setEnergy] = useState<Energy | null>(null);

  const t = now.getTime();
  const ev = nextEvent(events, t);
  const correction = learning ? lateCorrection(lags).correctionMin : 0;
  const plan = ev ? planLeave(ev, correction) : null;
  const status = ev && plan ? leaveStatus(ev, plan, t) : null;
  const leaveTakeover = status && ['ready', 'soon', 'now', 'late'].includes(status.state);

  const minutesFree = plan && status?.state === 'free' ? Math.round((plan.prepAt - t) / MIN) : status && !['free', 'gone'].includes(status.state) ? 0 : null;
  // Anything already raised as a cue above isn't suggested twice.
  const cued = new Set(inbox.map((m) => m.itemId));
  const rec = recommend({ items: items.filter((i) => !cued.has(i.id)), parks, now, minutesFree, energy });
  const resumable = parks.filter((p) => !p.resumedAt && t - p.createdAt < 7 * DAY).sort((a, b) => b.createdAt - a.createdAt)[0];
  const openCount = items.filter((i) => i.status === 'open' && i.bucket !== 'someday').length;
  const isEmpty = items.length === 0 && parks.length === 0 && events.length === 0;
  const lateAfternoon = now.getHours() >= 14 && now.getHours() < 21;
  const startedToday = items.some((i) => i.doneAt && t - i.doneAt < 12 * HOUR);

  return (
    <div className="stack">
      {welcomeBackDays && (
        <div className="banner" role="status">
          <span>👋 Welcome back. No catching up needed. I tucked older stuff away.</span>
          <button className="btn-quiet" onClick={actions.dismissWelcome}>
            OK
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="card empty">
          <h2>Hi. What’s on your mind?</h2>
          <p>Type or hold the mic and just talk. I’ll sort it out.</p>
          <p className="meta">Try: “call mom tomorrow”, “dentist at 6pm, 25 min drive”, “waiting for refund from Amazon”.</p>
          <button className="btn" onClick={() => actions.loadDemo(new Date())}>
            Show me a demo day
          </button>
        </div>
      )}

      {ev && plan && status && (
        <LeaveCard ev={ev} plan={plan} status={status} now={t} correction={correction} toast={toast} expanded={Boolean(leaveTakeover)} />
      )}

      {!leaveTakeover && !isEmpty && (
        <NextCard
          rec={rec}
          energy={energy}
          setEnergy={setEnergy}
          onStart={onStart}
          onResume={onResume}
          now={now}
        />
      )}

      {!leaveTakeover && resumable && !(rec.kind === 'resume' && rec.park.id === resumable.id) && (
        <ResumeCard park={resumable} onResume={onResume} />
      )}

      {!isEmpty && (
        <div className="card">
          <p className="eyebrow">Where are you?</p>
          <p className="meta" style={{ marginTop: 0 }}>
            Reminders tied to places and people fire when you tap these.
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <ContextButton label="🏠 I’m home" ev={{ type: 'arrive', place: 'home' }} toast={toast} />
            <ContextButton label="🚪 Leaving work" ev={{ type: 'leave', place: 'work' }} toast={toast} />
            <ContextButton label="🏢 Off to work" ev={{ type: 'leave_for', place: 'work' }} toast={toast} />
            <PersonButton toast={toast} items={items} />
          </div>
        </div>
      )}

      {digest.length > 0 && (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{digest.length} quieter reminders (held so they don’t interrupt)</summary>
          <ul className="list" style={{ marginTop: 10 }}>
            {digest.map((m) => (
              <li key={m.itemId} className="list-item">
                <span className="title">
                  {m.title}
                  <small>{m.body}</small>
                </span>
                <button className="btn-quiet" onClick={() => actions.dismissMessage(m.itemId)}>
                  OK
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {!isEmpty && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="note">{openCount} open in Later</span>
          <div className="row">
            <button className="btn-quiet" onClick={onAddEvent}>
              ＋ Appointment
            </button>
            {lateAfternoon && !startedToday && (
              <button className="btn-quiet" onClick={onResetDay}>
                ↺ Reset my day
              </button>
            )}
            <button className="btn-quiet" onClick={onOverwhelm}>
              😮‍💨 I’m overwhelmed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContextButton({ label, ev, toast }: { label: string; ev: Parameters<typeof actions.context>[0]; toast: (m: string) => void }) {
  return (
    <button
      className="chip"
      onClick={() => {
        const n = actions.context(ev, new Date());
        toast(n ? `${n} reminder${n > 1 ? 's' : ''} for right now` : 'Nothing tied to that. You’re clear.');
      }}
    >
      {label}
    </button>
  );
}

function PersonButton({ items, toast }: { items: Item[]; toast: (m: string) => void }) {
  const people = [...new Set(items.filter((i) => i.status === 'open' && i.trigger?.type === 'person').map((i) => (i.trigger as { name: string }).name))];
  if (people.length === 0) return null;
  return (
    <>
      {people.slice(0, 3).map((name) => (
        <ContextButton key={name} label={`👋 With ${name}`} ev={{ type: 'person', name }} toast={toast} />
      ))}
    </>
  );
}

interface LeaveCardProps {
  ev: LeaveEvent;
  plan: ReturnType<typeof planLeave>;
  status: ReturnType<typeof leaveStatus>;
  now: number;
  correction: number;
  expanded: boolean;
  toast: (msg: string) => void;
}

function LeaveCard({ ev, plan, status, now, correction, expanded, toast }: LeaveCardProps) {
  const prepSpan = plan.leaveAt - plan.prepAt;
  const fraction = status.state === 'free' ? 1 : Math.max(0, (plan.leaveAt - now) / prepSpan);
  const ringLabel = status.state === 'free' ? formatTime(plan.leaveAt) : status.minutesToLeave > 0 ? `${status.minutesToLeave}m` : 'now';
  const ringSub = status.state === 'free' ? 'leave at' : status.minutesToLeave > 0 ? 'to leave' : formatTime(status.etaIfLeavingNow);

  return (
    <section className="card time-card" data-state={status.state} aria-live="polite" aria-label={`${ev.title}: ${STATE_WORD[status.state]}`}>
      <div className="spread">
        <span className={`state-pill state-${status.state}`}>
          <span aria-hidden="true">{STATE_ICON[status.state]}</span> {STATE_WORD[status.state]}
        </span>
        <button className="btn-quiet" onClick={() => actions.removeEvent(ev.id)} aria-label={`Remove ${ev.title}`}>
          ✕
        </button>
      </div>
      <div className={expanded ? 'leave-body' : ''} style={expanded ? undefined : { marginTop: 6 }}>
        {expanded && <Ring fraction={fraction} label={ringLabel} sub={ringSub} />}
        <div>
          <h2>{status.headline}</h2>
          <p className="meta">{status.detail}</p>
          {correction > 0 && status.state !== 'gone' && (
            <p className="note">I’ve added your usual {correction} min. (See You → What I’ve learned.)</p>
          )}
        </div>
      </div>
      {expanded && (
        <>
          <ul className="checklist" style={{ marginTop: 12 }}>
            {ev.checklist.map((c, i) => (
              <li key={c.text}>
                <label>
                  <input type="checkbox" checked={c.done} onChange={() => actions.toggleChecklist(ev.id, i)} />
                  <span className={c.done ? 'done' : ''}>{c.text}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                actions.leaving(ev.id, new Date());
                toast('Have a good one. I noted the time to get better at this.');
              }}
            >
              I’m leaving
            </button>
            {(status.state === 'late' || status.state === 'now') && (
              <button
                className="btn"
                onClick={async () => {
                  const text = runningLateDraft(ev, status.etaIfLeavingNow);
                  try {
                    await navigator.clipboard.writeText(text);
                    toast('Copied a “running late” message. Paste it wherever you need.');
                  } catch {
                    toast(text);
                  }
                }}
              >
                Running late ▸
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

interface NextCardProps {
  rec: ReturnType<typeof recommend>;
  energy: Energy | null;
  setEnergy: (e: Energy | null) => void;
  onStart: NowProps['onStart'];
  onResume: NowProps['onResume'];
  now: Date;
}

function NextCard({ rec, energy, setEnergy, onStart, onResume, now }: NextCardProps) {
  return (
    <section className="card" aria-labelledby="next-title">
      <div className="spread">
        <p className="eyebrow" id="next-title">
          {rec.kind === 'resume' ? 'Pick up where you left off' : 'Next'}
        </p>
        {rec.kind !== 'resume' && (
        <div className="row" style={{ flexWrap: 'nowrap' }} role="group" aria-label="How much energy do you have?">
          {(
            [
              ['low', '🪫'],
              ['ok', '🙂'],
              ['good', '⚡'],
            ] as const
          ).map(([e, icon]) => (
            <button
              key={e}
              className="chip"
              aria-pressed={energy === e}
              aria-label={`Energy ${e}`}
              title={`Energy: ${e}`}
              onClick={() => setEnergy(energy === e ? null : e)}
            >
              {icon}
            </button>
          ))}
        </div>
        )}
      </div>

      {rec.kind === 'item' && (
        <>
          <h2>{rec.item.title}</h2>
          <p className="meta">{rec.reason}</p>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => onStart(rec.item, rec.item.title, rec.item.postponeCount >= 2 ? rec.size : null)}>
              ▶ Start
            </button>
            <button className="btn" onClick={() => actions.skip(rec.item.id, now)}>
              Something else
            </button>
            <button className="btn-quiet" onClick={() => actions.complete(rec.item.id, now)}>
              Done
            </button>
          </div>
        </>
      )}

      {rec.kind === 'resume' && (
        <>
          <h2>{rec.park.title}</h2>
          <p className="meta">{rec.reason}</p>
          <p style={{ margin: '8px 0 0' }}>
            <strong>Next:</strong> {rec.park.nextAction}
          </p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onResume(rec.park)}>
            ⟲ Continue
          </button>
        </>
      )}

      {rec.kind === 'rest' && (
        <>
          <h2>Nothing urgent. 🌿</h2>
          <p className="meta">{rec.reason}</p>
        </>
      )}
    </section>
  );
}

function ResumeCard({ park, onResume }: { park: Park; onResume: (p: Park) => void }) {
  return (
    <section className="card resume" aria-label="Where was I?">
      <p className="eyebrow">⟲ Where was I?</p>
      <h2 style={{ fontSize: 19 }}>{park.title}</h2>
      {park.where && <p className="meta">You stopped at: {park.where}</p>}
      <p style={{ margin: '6px 0 0' }}>
        <strong>Next:</strong> {park.nextAction}
      </p>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={() => onResume(park)}>
          Continue
        </button>
        <button className="btn-quiet" onClick={() => actions.discardPark(park.id)}>
          Not anymore
        </button>
      </div>
    </section>
  );
}

export function AddEventSheet({ onClose }: { onClose: () => void }) {
  const soon = new Date(Date.now() + 2 * HOUR);
  soon.setMinutes(0, 0, 0);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(`${String(soon.getHours()).padStart(2, '0')}:00`);
  const [travel, setTravel] = useState(20);
  const [prep, setPrep] = useState(20);
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
          const [h, m] = time.split(':').map(Number);
          const start = new Date();
          start.setHours(h ?? 0, m ?? 0, 0, 0);
          if (start.getTime() < Date.now()) start.setDate(start.getDate() + 1);
          actions.addEvent({
            title: title.trim() || 'Appointment',
            startAt: start.getTime(),
            travelMin: travel,
            prepMin: prep,
            bufferMin: 5,
            checklist: ['Phone', 'Keys', 'Wallet'].map((text) => ({ text, done: false })),
          });
          onClose();
        }}
      >
        <h2 id="ev-title">Add an appointment</h2>
        <p className="meta" style={{ marginTop: -6, marginBottom: 12 }}>
          Tip: you can also just type “dentist at 6pm, 25 min drive”.
        </p>
        <label className="field">
          <span>What</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dentist" autoFocus />
        </label>
        <label className="field">
          <span>Starts at</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
        <label className="field">
          <span>Travel time (min)</span>
          <input type="number" min={0} max={240} value={travel} onChange={(e) => setTravel(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Getting-ready time (min)</span>
          <input type="number" min={0} max={180} value={prep} onChange={(e) => setPrep(Number(e.target.value))} />
        </label>
        <div className="row">
          <button className="btn btn-primary" type="submit">
            Add
          </button>
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
