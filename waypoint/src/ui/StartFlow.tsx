// The Start flow (Part 3 §8.4): size check → one physical step → timer →
// "stop here" counts as a win. The next step is only revealed when asked for.

import { useEffect, useRef, useState } from 'react';
import { MIN } from '../core/dates';
import { START_MINUTES, TIMER_CHOICES, firstStep, nextStep } from '../core/microsteps';
import type { Size } from '../core/types';
import { Ring } from './Ring';

interface Props {
  title: string;
  initialSize: Size | null;
  /** Resume uses the saved next action instead of the step library. */
  fixedStep?: string;
  onStarted: (size: Size, minutes: number) => void;
  onDone: () => void;
  onStopHere: (stepText: string) => void;
  onClose: () => void;
}

type Phase = 'size' | 'step' | 'timer' | 'end';

const SIZE_LABEL: Record<Size, string> = { fine: '😐 Fine', heavy: '😬 Heavy', cant: "🧱 Can't even" };

export function StartFlow({ title, initialSize, fixedStep, onStarted, onDone, onStopHere, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>(initialSize ? 'step' : 'size');
  const [size, setSize] = useState<Size>(initialSize ?? 'heavy');
  const [step, setStep] = useState(() => (fixedStep ? { text: fixedStep, index: Number.POSITIVE_INFINITY } : firstStep(title, initialSize ?? 'heavy')));
  const [minutes, setMinutes] = useState(START_MINUTES[initialSize ?? 'heavy']);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [overtime, setOvertime] = useState(false);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'timer') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'timer' && endsAt && now >= endsAt && !overtime) {
      setPhase('end');
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    }
  }, [phase, endsAt, now, overtime]);

  const pickSize = (s: Size) => {
    setSize(s);
    setStep(firstStep(title, s));
    setMinutes(START_MINUTES[s]);
    setPhase('step');
  };

  const start = () => {
    startedAt.current = Date.now();
    setEndsAt(Date.now() + minutes * MIN);
    setNow(Date.now());
    setOvertime(false);
    setPhase('timer');
    onStarted(size, minutes);
  };

  const remaining = endsAt ? Math.max(0, endsAt - now) : minutes * MIN;
  const mm = Math.floor(remaining / MIN);
  const ss = Math.floor((remaining % MIN) / 1000);
  const elapsed = Math.max(0, now - startedAt.current);

  return (
    <div className="fullscreen" role="dialog" aria-modal="true" aria-labelledby="start-title">
      <div className="fullscreen-inner">
        <div className="spread">
          <p className="eyebrow" id="start-title">
            {title}
          </p>
          <button className="btn-quiet" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {phase === 'size' && (
          <>
            <p className="big-text">How does it feel right now?</p>
            <div className="stack">
              {(['fine', 'heavy', 'cant'] as const).map((s) => (
                <button key={s} className="btn btn-big" onClick={() => pickSize(s)}>
                  {SIZE_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'step' && (
          <>
            <p className="eyebrow">{size === 'cant' ? 'Tiny version' : size === 'heavy' ? 'Small version' : 'First step'}</p>
            <p className="big-text">{step.text}</p>
            <p className="meta">Don’t finish it. Just start.</p>
            <div className="row" role="group" aria-label="Timer length">
              {TIMER_CHOICES.map((m) => (
                <button key={m} className="chip" aria-pressed={m === minutes} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-big" onClick={start}>
              ▶ Start {minutes} min
            </button>
          </>
        )}

        {phase === 'timer' && (
          <>
            <div className="timer-wrap" aria-live="off">
              {overtime ? (
                <Ring fraction={1} label={`+${Math.floor((now - (endsAt ?? now)) / MIN)}m`} sub="keep going" size={200} />
              ) : (
                <Ring fraction={remaining / (minutes * MIN)} label={`${mm}:${String(ss).padStart(2, '0')}`} sub="left" size={200} />
              )}
              <p className="step-text">{step.text}</p>
              <span className="sr-only" aria-live="polite">
                {overtime ? 'Timer running past the end' : `${mm} minutes left`}
              </span>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => onStopHere(step.text)}>
                Park it
              </button>
              <button className="btn" onClick={() => setPhase('end')}>
                Stop
              </button>
              <button className="btn btn-primary" onClick={onDone}>
                Done ✓
              </button>
            </div>
            <p className="note" style={{ textAlign: 'center' }}>
              {Math.floor(elapsed / MIN) > 0 ? `${Math.floor(elapsed / MIN)} min in.` : 'You started. That’s the hard part.'}
            </p>
          </>
        )}

        {phase === 'end' && (
          <>
            <p className="big-text">Nice, you started.</p>
            <p className="meta">Stopping here counts. I’ll save your place.</p>
            <div className="stack">
              <button className="btn btn-primary btn-big" onClick={() => onStopHere(step.text)}>
                Stop here ✓
              </button>
              <button
                className="btn btn-big"
                onClick={() => {
                  setOvertime(true);
                  setPhase('timer');
                }}
              >
                Keep going
              </button>
              {(() => {
                const n = nextStep(title, step.index);
                return n ? (
                  <button
                    className="btn btn-big"
                    onClick={() => {
                      setStep(n);
                      setPhase('step');
                    }}
                  >
                    Next step →
                  </button>
                ) : null;
              })()}
              <button className="btn-quiet" onClick={onDone}>
                Actually, it’s done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ParkProps {
  title: string;
  suggestedNext: string;
  onSave: (nextAction: string, where: string, link: string) => void;
  onCancel: () => void;
}

/** "Where was I?": one required field, everything else optional. */
export function ParkSheet({ title, suggestedNext, onSave, onCancel }: ParkProps) {
  const [next, setNext] = useState(suggestedNext);
  const [where, setWhere] = useState('');
  const [link, setLink] = useState('');
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="park-title">
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
          if (next.trim()) onSave(next.trim(), where.trim(), link.trim());
        }}
      >
        <h2 id="park-title">Save your place: {title}</h2>
        <label className="field">
          <span>What’s the very next thing you’d do?</span>
          <input value={next} onChange={(e) => setNext(e.target.value)} autoFocus required />
        </label>
        <label className="field">
          <span>Where were you? (optional)</span>
          <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Slide 7, page 12" />
        </label>
        <label className="field">
          <span>Link (optional)</span>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" inputMode="url" />
        </label>
        <div className="row">
          <button type="submit" className="btn btn-primary">
            Save my place
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
