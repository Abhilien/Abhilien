import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createSeedState, STATE_VERSION } from '../domain/seed';
import { releaseDueFeedback } from '../domain/rules';
import type { State } from '../domain/types';
import { StoreContext, type Toast } from './context';

const KEY = 'ekam.state';
const DAY = 86_400_000;

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* storage unavailable — start fresh */
  }
  return createSeedState();
}

function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const tick = (s: State): State => ({ ...s, now: new Date(Date.now() + s.day * DAY).toISOString() });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => releaseDueFeedback(tick(load())));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => save(state), [state]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    timers.current.push(window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600));
  }, []);

  const act = useCallback((fn: (s: State) => State) => {
    setState((s) => {
      try {
        return fn(tick(s));
      } catch (e) {
        console.error(e);
        return s;
      }
    });
  }, []);

  const later = useCallback(
    (ms: number, fn: (s: State) => State, text?: string) => {
      timers.current.push(
        window.setTimeout(() => {
          act(fn);
          if (text) toast(text);
        }, ms),
      );
    },
    [act, toast],
  );

  const reset = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setState(createSeedState());
  }, []);

  const viewer = state.users[state.viewerId];
  const value = useMemo(
    () => ({ state, viewer, act, later, toast, toasts, reset }),
    [state, viewer, act, later, toast, toasts, reset],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
