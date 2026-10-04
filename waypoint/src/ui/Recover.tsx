// Recovery modes: "I'm overwhelmed" and "Reset my day". Both shrink the world
// to one thing. Neither is therapy, and neither ever mentions what didn't get done.

import { useCallback, useEffect, useState } from 'react';
import { HOUR, formatTime } from '../core/dates';
import { scoreItem } from '../core/recommend';
import type { Item } from '../core/types';
import { actions, useStore } from '../state/store';

const actionable = (items: Item[]) =>
  items.filter(
    (i) =>
      i.status === 'open' &&
      i.bucket !== 'someday' &&
      !['note', 'waiting', 'shopping'].includes(i.kind) &&
      // Place/person reminders only make sense once that context happens.
      !(i.trigger && i.trigger.type !== 'leave_for'),
  );

interface Props {
  onStart: (item: Item) => void;
  onClose: () => void;
}

export function Overwhelm({ onStart, onClose }: Props) {
  const items = useStore((s) => s.items);
  const parks = useStore((s) => s.parks);
  const [phase, setPhase] = useState<'pause' | 'breathe' | 'pick' | 'one' | 'rest'>('pause');
  const [chosen, setChosen] = useState<Item | null>(null);
  const now = new Date();
  const top = actionable(items)
    .map((item) => ({ item, score: scoreItem(item, { items, parks, now, minutesFree: null, energy: null }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.item);

  const toPick = useCallback(() => setPhase('pick'), []);
  const exit = () => {
    actions.setOverwhelm(null);
    onClose();
  };

  return (
    <div className="fullscreen calm" role="dialog" aria-modal="true" aria-label="Overwhelm mode">
      <div className="fullscreen-inner">
        {phase === 'pause' && (
          <>
            <p className="big-text">Pause. You don’t have to fix everything.</p>
            <p className="meta">I’ve quieted reminders for the next hour.</p>
            <div className="row">
              <button className="btn" onClick={() => setPhase('breathe')}>
                Breathe for 30s
              </button>
              <button className="btn btn-primary" onClick={() => setPhase('pick')}>
                Skip
              </button>
            </div>
          </>
        )}
        {phase === 'breathe' && <Breathe onDone={toPick} />}
        {phase === 'pick' && (
          <>
            <p className="big-text">What’s the one thing that matters in the next hour?</p>
            <div className="stack">
              {top.map((item) => (
                <button
                  key={item.id}
                  className="btn btn-big"
                  onClick={() => {
                    setChosen(item);
                    setPhase('one');
                  }}
                >
                  {item.title}
                </button>
              ))}
              <button className="btn btn-big" onClick={() => setPhase('rest')}>
                Nothing. I need a break
              </button>
            </div>
          </>
        )}
        {phase === 'one' && chosen && (
          <>
            <p className="eyebrow">Just this</p>
            <p className="big-text">{chosen.title}</p>
            <p className="meta">Everything else is parked for today.</p>
            <button
              className="btn btn-primary btn-big"
              onClick={() => {
                exit();
                onStart(chosen);
              }}
            >
              ▶ Start small
            </button>
          </>
        )}
        {phase === 'rest' && (
          <>
            <p className="big-text">Good call. Take the break.</p>
            <p className="meta">Reminders stay quiet until {formatTime(Date.now() + HOUR)}. Nothing is going anywhere.</p>
          </>
        )}
        <button className="btn-quiet" onClick={exit} style={{ alignSelf: 'flex-start' }}>
          Back to normal
        </button>
      </div>
    </div>
  );
}

function Breathe({ onDone }: { onDone: () => void }) {
  const [left, setLeft] = useState(30);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onDone]);
  const inhale = Math.floor((30 - left) / 4) % 2 === 0;
  return (
    <>
      <p className="big-text" aria-live="polite">
        {inhale ? 'Breathe in…' : 'Breathe out…'}
      </p>
      <p className="meta">{left}s</p>
      <button className="btn" onClick={onDone}>
        Skip
      </button>
    </>
  );
}

export function ResetDay({ onStart, onClose }: Props) {
  const items = useStore((s) => s.items);
  const parks = useStore((s) => s.parks);
  const [plan, setPlan] = useState<Item[] | null>(null);
  const [rest, setRest] = useState(false);
  const now = new Date();
  const ranked = actionable(items)
    .map((item) => ({ item, score: scoreItem(item, { items, parks, now, minutesFree: null, energy: null }) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);

  return (
    <div className="fullscreen" role="dialog" aria-modal="true" aria-label="Reset my day">
      <div className="fullscreen-inner">
        <p className="eyebrow">It’s {formatTime(now.getTime())}</p>
        <p className="big-text">The day isn’t over. What would make today feel okay?</p>
        {!plan && !rest && (
          <div className="stack">
            <button className="btn btn-big" onClick={() => setPlan(ranked.slice(0, 1))}>
              One important thing
            </button>
            <button className="btn btn-big" onClick={() => setPlan(ranked.filter((i) => (i.estMinutes ?? 15) <= 10).slice(0, 3))}>
              Clear a few small things
            </button>
            <button className="btn btn-big" onClick={() => setRest(true)}>
              Rest, and reset tomorrow
            </button>
          </div>
        )}
        {plan && (
          <div className="stack">
            {plan.length === 0 && <p className="meta">Nothing small is waiting. That’s good news.</p>}
            {plan.map((item) => (
              <div key={item.id} className="card spread">
                <span>{item.title}</span>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onStart(item);
                  }}
                >
                  ▶ Start
                </button>
              </div>
            ))}
          </div>
        )}
        {rest && <p className="meta">Fair. Tomorrow starts fresh. I’ll show you what matters in the morning.</p>}
        <button className="btn-quiet" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
          Close
        </button>
      </div>
    </div>
  );
}
