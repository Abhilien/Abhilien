import { useCallback, useEffect, useRef, useState } from 'react';
import { DAYPART_TIME, formatDay } from '../core/dates';
import { parseCapture, type ParsedItem, type ParseResult } from '../core/parser';
import { useVoice } from './hooks';

const KIND_LABEL: Record<ParsedItem['kind'], string> = {
  task: 'Task',
  reminder: 'Reminder',
  waiting: 'Waiting on',
  shopping: 'Shopping',
  note: 'Note',
};

export function describeWhen(p: ParsedItem, now: Date): string {
  const parts: string[] = [];
  if (p.event) parts.push(`appointment · ${p.event.travelMin} min travel`);
  const t = p.trigger;
  if (t?.type === 'place') parts.push(`when you ${t.on} ${t.place === 'home' ? 'home' : `the ${t.place}`}`);
  if (t?.type === 'person') parts.push(`next time you see ${t.name}`);
  if (t?.type === 'leave_for') parts.push(`when you leave for the ${t.place}`);
  if (p.due?.date) {
    const day = formatDay(p.due.date, now);
    const time = p.due.time ?? (p.due.daypart ? `${p.due.daypart} (${DAYPART_TIME[p.due.daypart]})` : null);
    parts.push(`${p.kind === 'waiting' ? 'expected' : p.isDeadline ? 'due' : ''} ${day}${time ? ` · ${time}` : ''}`.trim());
  }
  if (p.estMinutes) parts.push(`~${p.estMinutes} min`);
  if (p.why) parts.push(`because ${p.why.replace(/^i'?m /i, "you're ")}`);
  return parts.join(' · ');
}

interface BarProps {
  onParsed: (result: ParseResult, text: string) => void;
}

export function CaptureBar({ onParsed }: BarProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    (value: string) => {
      const v = value.trim();
      if (!v) return;
      onParsed(parseCapture(v, new Date()), v);
      setText('');
    },
    [onParsed],
  );
  const voice = useVoice(submit);

  // Keyboard shortcut: "/" focuses capture from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      className="capture"
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
      }}
    >
      <div className="capture-inner">
        <label htmlFor="capture" className="sr-only">
          Capture anything
        </label>
        <input
          id="capture"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Get it out of your head… (press /)"
          autoComplete="off"
          enterKeyHint="done"
        />
        {voice.supported ? (
          <button
            type="button"
            className="mic"
            aria-label={voice.listening ? 'Listening. Release to save' : 'Hold to talk'}
            data-listening={voice.listening}
            onPointerDown={voice.start}
            onPointerUp={voice.stop}
            onPointerLeave={() => voice.listening && voice.stop()}
          >
            🎙
          </button>
        ) : (
          <button type="submit" className="mic" aria-label="Save">
            ↵
          </button>
        )}
      </div>
    </form>
  );
}

interface SheetProps {
  result: ParseResult;
  now: Date;
  onConfirm: (items: ParsedItem[]) => void;
  onCancel: () => void;
  onOverwhelm: () => void;
}

/** "Here's what I got": highlights only what needs a glance (dates, money, people, low confidence). */
export function ConfirmSheet({ result, now, onConfirm, onCancel, onOverwhelm }: SheetProps) {
  const [items, setItems] = useState(result.items);

  if (result.signal === 'overwhelm' && items.length === 0) {
    return (
      <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="sheet">
          <h2 id="confirm-title">That sounds like a lot.</h2>
          <p>Want to switch to one-thing mode for a bit? Everything else will wait.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={onOverwhelm}>
              Yes, help me focus
            </button>
            <button className="btn" onClick={onCancel}>
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const update = (i: number, patch: Partial<ParsedItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch, ambiguity: null } : x)));
  const remove = (i: number) => setItems((xs) => xs.filter((_, j) => j !== i));

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="sheet">
        <div className="spread">
          <h2 id="confirm-title">
            Got {items.length} {items.length === 1 ? 'thing' : 'things'}.
          </h2>
          <button className="btn-quiet" onClick={onCancel} aria-label="Discard capture">
            ✕
          </button>
        </div>
        <div className="parsed">
          {items.map((p, i) => {
            const flag = Boolean(p.due?.date || p.money || p.people.length || p.confidence < 0.7);
            return (
              <div className="parsed-item" key={i} data-flag={flag}>
                <div className="spread">
                  <span className="kind">{KIND_LABEL[p.kind]}{p.money ? ' · 💳' : ''}{p.meds ? ' · 💊' : ''}</span>
                  <button className="btn-quiet" onClick={() => remove(i)} aria-label={`Remove ${p.title}`}>
                    Remove
                  </button>
                </div>
                <input value={p.title} onChange={(e) => update(i, { title: e.target.value })} aria-label="Title" />
                {describeWhen(p, now) && <p className="meta">{describeWhen(p, now)}</p>}
                {p.ambiguity && (
                  <div style={{ marginTop: 8 }}>
                    <p className="meta" style={{ color: 'var(--text)', fontWeight: 600 }}>
                      {p.ambiguity.question}
                    </p>
                    <div className="row" style={{ marginTop: 6 }}>
                      {p.ambiguity.options.map((o) => (
                        <button key={o.label} className="chip" onClick={() => update(i, o.patch)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn btn-primary btn-big" disabled={items.length === 0} onClick={() => onConfirm(items)}>
          Looks right ✓
        </button>
      </div>
    </div>
  );
}
