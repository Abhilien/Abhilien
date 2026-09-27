import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eligible } from '../domain/discovery';
import { hasInterest } from '../domain/rules';
import { PERSONAS } from '../domain/seed';
import type { State } from '../domain/types';
import { useStore } from '../state/store';
import { Avatar } from './Portrait';
import { PlanTag } from './ui';

type Theme = 'system' | 'light' | 'dark';

function readTheme(): Theme {
  try {
    return (localStorage.getItem('ekam.theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(t: Theme) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem('ekam.theme', t);
  } catch {
    /* ignore */
  }
}

/** Prototype-only controls: switch persona, move time, simulate the other side. */
export function DemoPanel({ onDone }: { onDone?: () => void }) {
  const { state, act, toast, reset } = useStore();
  const nav = useNavigate();
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => applyTheme(theme), [theme]);

  const go = (to: string) => {
    nav(to);
    onDone?.();
  };

  const switchTo = (id: string) => {
    act((s) => ({ ...s, viewerId: id, onboarded: true }));
    toast(`Now exploring as ${state.users[id].profile.firstName}`);
    go('/');
  };

  const simulateInterest = () => {
    const viewer = state.users[state.viewerId];
    const today = state.discovery[viewer.id]?.romantic?.ids ?? [];
    const candidate = today.find(
      (id) => !hasInterest(state, id, viewer.id, 'romantic') && eligible(state, viewer, state.users[id], 'romantic'),
    );
    if (!candidate) {
      toast('Open Discover first — then someone there can choose you.');
      return;
    }
    act((s: State) => ({
      ...s,
      interests: [...s.interests, { from: candidate, to: viewer.id, kind: 'romantic', at: s.now }],
    }));
    // Deliberately no notification: ekam never announces "someone likes you".
    toast(`${state.users[candidate].profile.firstName} chose you — you’ll only find out if you choose them too.`);
  };

  return (
    <div>
      <div className="aside-panel">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Explore as</p>
        {PERSONAS.map((id) => {
          const u = state.users[id];
          return (
            <button
              key={id}
              className="persona"
              aria-pressed={state.viewerId === id}
              onClick={() => switchTo(id)}
              style={{ padding: 10 }}
            >
              <Avatar p={u.profile.portraits[0]} size={40} />
              <div className="grow">
                <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                  <strong>{u.profile.firstName}</strong>
                  <PlanTag plan={u.plan} />
                </div>
                <div className="tiny muted">{u.persona?.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="aside-panel">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Simulate</p>
        <div className="chips">
          <button className="chip outline" onClick={simulateInterest}>Someone in Discover chooses you</button>
          <button
            className="chip outline"
            onClick={() => {
              act((s) => ({ ...s, day: s.day + 1 }));
              toast('It’s tomorrow. A fresh, small set of recommendations is ready.');
            }}
          >
            Move to tomorrow
          </button>
          <button
            className="chip outline"
            aria-pressed={state.offline}
            onClick={() => act((s) => ({ ...s, offline: !s.offline }))}
          >
            {state.offline ? 'Network: failing' : 'Network: fine'}
          </button>
          <button className="chip outline" onClick={() => go('/safety')}>Trust &amp; Safety console</button>
          <button className="chip outline" onClick={() => go('/welcome')}>Replay intro</button>
        </div>
        <div className="row" style={{ marginTop: 12, '--gap': '8px' } as React.CSSProperties}>
          <span className="tiny muted">Theme</span>
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} className="chip" aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          className="btn quiet sm"
          style={{ marginTop: 8, paddingLeft: 0 }}
          onClick={() => {
            reset();
            go('/welcome');
          }}
        >
          Reset all sample data
        </button>
      </div>
      <p className="tiny faint">
        Prototype. Everyone here is fictional; portraits are illustrations standing in for member photography.
      </p>
    </div>
  );
}
