/**
 * Saved charts.
 *
 * Birth data is personal data under the DPDP Act, so it stays on the device:
 * this app has no account, no server and no analytics, and every read and write
 * is wrapped because storage throws in private mode and returns nothing when
 * site data has been cleared.
 */
import type { BirthData } from '@jyotish/engine';

export interface Profile {
  id: string;
  name: string;
  birth: BirthData;
  savedAt: string;
}

const KEY = 'kundali.profiles.v1';

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Profile[]) : [];
  } catch {
    return [];
  }
}

function persist(profiles: Profile[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profiles));
  } catch {
    /* Private mode or quota exceeded: the app must keep working regardless. */
  }
}

export function saveProfile(name: string, birth: BirthData): Profile {
  const profiles = loadProfiles();
  const profile: Profile = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || 'Unnamed',
    birth,
    savedAt: new Date().toISOString(),
  };
  profiles.unshift(profile);
  persist(profiles.slice(0, 50));
  return profile;
}

export function deleteProfile(id: string): void {
  persist(loadProfiles().filter((p) => p.id !== id));
}
