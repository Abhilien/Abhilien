import { createContext, useContext } from 'react';
import type { State, User } from '../domain/types';

export interface Toast {
  id: number;
  text: string;
}

export interface Store {
  state: State;
  viewer: User;
  /** Apply a pure domain transition. The simulated clock advances first. */
  act: (fn: (s: State) => State) => void;
  /** Like act, but runs after a short delay — used to simulate the other person. */
  later: (ms: number, fn: (s: State) => State, toast?: string) => void;
  toast: (text: string) => void;
  toasts: Toast[];
  reset: () => void;
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
