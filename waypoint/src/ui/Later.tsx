// LATER: everything, search-first, no folders, no "overdue" group.

import { useState, type ReactNode } from 'react';
import { DAY } from '../core/dates';
import type { Item, Park } from '../core/types';
import { actions, useStore } from '../state/store';
import { describeItem } from './format';

interface Props {
  now: Date;
  onStart: (item: Item) => void;
  onResume: (park: Park) => void;
}

export function Later({ now, onStart, onResume }: Props) {
  const items = useStore((s) => s.items);
  const parks = useStore((s) => s.parks);
  const [q, setQ] = useState('');
  const match = (text: string) => text.toLowerCase().includes(q.trim().toLowerCase());

  const open = items.filter((i) => i.status === 'open' && match(i.title));
  const groups: { key: string; label: string; items: Item[]; open: boolean }[] = [
    { key: 'soon', label: 'Soon', items: open.filter((i) => (i.bucket === 'soon' || i.bucket === 'scheduled') && i.kind !== 'shopping' && i.kind !== 'note'), open: true },
    { key: 'waiting', label: 'Waiting on', items: open.filter((i) => i.kind === 'waiting'), open: true },
    { key: 'shopping', label: 'Shopping', items: open.filter((i) => i.kind === 'shopping'), open: true },
    { key: 'notes', label: 'Notes & ideas', items: open.filter((i) => i.kind === 'note'), open: false },
    { key: 'someday', label: 'Someday (tucked away)', items: open.filter((i) => i.bucket === 'someday'), open: false },
  ];
  const liveParks = parks.filter((p) => !p.resumedAt && match(p.title));
  const doneRecently = items.filter((i) => i.status === 'done' && i.doneAt && now.getTime() - i.doneAt < DAY && match(i.title));
  const total = open.length + liveParks.length;

  return (
    <div>
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input id="search" className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Search everything" />

      {total === 0 && doneRecently.length === 0 && <p className="empty">{q ? 'Nothing matches.' : 'Nothing waiting. Suspicious, but nice.'}</p>}

      {liveParks.length > 0 && (
        <Group label="Parked" count={liveParks.length} defaultOpen>
          {liveParks.map((p) => (
            <li key={p.id} className="list-item">
              <span className="title">
                {p.title}
                <small>Next: {p.nextAction}</small>
              </span>
              <button className="btn" onClick={() => onResume(p)}>
                Continue
              </button>
            </li>
          ))}
        </Group>
      )}

      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <Group key={g.key} label={g.label} count={g.items.length} defaultOpen={g.open || Boolean(q)}>
              {g.items.map((item) => (
                <li key={item.id} className="list-item">
                  <button className="check" aria-label={`Mark ${item.title} done`} onClick={() => actions.complete(item.id, new Date())} />
                  <span className="title">
                    {item.title}
                    {describeItem(item, now) && <small>{describeItem(item, now)}</small>}
                  </span>
                  {item.kind !== 'shopping' && item.kind !== 'waiting' && (
                    <button className="btn-quiet" onClick={() => onStart(item)} aria-label={`Start ${item.title}`}>
                      ▶
                    </button>
                  )}
                  <button className="btn-quiet" onClick={() => actions.drop(item.id, new Date())} aria-label={`Drop ${item.title}`}>
                    ✕
                  </button>
                </li>
              ))}
            </Group>
          ),
      )}

      {doneRecently.length > 0 && (
        <Group label="Done today" count={doneRecently.length} defaultOpen={false}>
          {doneRecently.map((item) => (
            <li key={item.id} className="list-item">
              <span className="title" style={{ color: 'var(--muted)' }}>
                ✓ {item.title}
              </span>
              <button className="btn-quiet" onClick={() => actions.restore(item.id, new Date())}>
                Undo
              </button>
            </li>
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ label, count, defaultOpen, children }: { label: string; count: number; defaultOpen: boolean; children: ReactNode }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary>
        <span>{label}</span>
        <span>{count}</span>
      </summary>
      <ul className="list">{children}</ul>
    </details>
  );
}
