// In-app cue toasts. Every cue ends in a decision: do it, shrink it,
// move it to a better moment, or drop it. There is never just "OK".

import { useState } from 'react';
import { laterOptions, type CueAction, type CueMessage } from '../core/cues';
import type { Item } from '../core/types';
import { actions, useStore } from '../state/store';

const ACTION_LABEL: Record<CueAction, string> = {
  do: 'Do it now',
  smaller: 'Make it smaller',
  later: 'Later ▸',
  done: 'Done',
  drop: 'Drop it',
  still_waiting: 'Still waiting',
  taken: 'Taken ✓',
};

interface Props {
  onStart: (item: Item, size: 'fine' | 'cant' | null) => void;
  toast: (msg: string) => void;
}

export function CueToasts({ onStart, toast }: Props) {
  const inbox = useStore((s) => s.inbox.filter((m) => m.tier !== 'digest'));
  const items = useStore((s) => s.items);
  const visible = inbox.slice(-2);
  if (visible.length === 0) return null;
  return (
    <section className="cues stack" aria-label="Reminders" aria-live="polite">
      {visible.map((m) => {
        const item = items.find((i) => i.id === m.itemId);
        return item ? <CueToast key={m.itemId} message={m} item={item} onStart={onStart} toast={toast} /> : null;
      })}
    </section>
  );
}

function CueToast({ message, item, onStart, toast }: { message: CueMessage; item: Item } & Props) {
  const [showLater, setShowLater] = useState(false);
  const now = new Date();

  const run = (a: CueAction) => {
    switch (a) {
      case 'do':
        if (item.kind === 'waiting') {
          const text = `Hi, just checking in on ${item.title.charAt(0).toLowerCase()}${item.title.slice(1)}. Any update? Thanks!`;
          navigator.clipboard?.writeText(text).catch(() => undefined);
          toast('Copied a friendly follow-up message.');
          actions.stillWaiting(item.id, now);
        } else {
          onStart(item, null);
        }
        break;
      case 'smaller':
        onStart(item, 'cant');
        break;
      case 'later':
        setShowLater(true);
        return;
      case 'done':
        actions.complete(item.id, now);
        toast('Done. Nice.');
        break;
      case 'drop':
        actions.drop(item.id, now);
        toast('Dropped. Not everything deserves doing.');
        break;
      case 'still_waiting':
        actions.stillWaiting(item.id, now);
        toast('I’ll check again in 3 days.');
        break;
      case 'taken':
        actions.taken(item.id, now);
        toast(`Taken at ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`);
        break;
    }
  };

  return (
    <div className="toast" data-tier={message.tier} role="alert">
      <div className="spread">
        <strong>{message.title}</strong>
        <button className="btn-quiet" aria-label="Dismiss" onClick={() => actions.dismissMessage(item.id)}>
          ✕
        </button>
      </div>
      <p className="meta" style={{ marginTop: 2 }}>
        {message.body}
      </p>
      <div className="row" style={{ marginTop: 10 }}>
        {showLater
          ? laterOptions(now).map((o) => (
              <button
                key={o.label}
                className="chip"
                onClick={() => {
                  actions.later(item.id, o, now);
                  toast(`Moved: ${o.label.toLowerCase()}.`);
                }}
              >
                {o.label}
              </button>
            ))
          : message.actions.map((a, i) => (
              <button key={a} className={i === 0 ? 'btn btn-primary' : 'btn'} onClick={() => run(a)}>
                {ACTION_LABEL[a]}
              </button>
            ))}
      </div>
    </div>
  );
}
