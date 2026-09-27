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

/**
 * The chart the viewer last looked at.
 *
 * Kept apart from the saved list: that list is a deliberate act of saving, this
 * is just so reopening the app does not present an empty form to someone who was
 * reading their own chart a minute ago. Only the birth data is stored — the
 * chart itself is recomputed on boot, which is both cheaper than serialising it
 * and immune to a stored shape going stale across a release.
 */
const LAST_KEY = 'kundali.last.v1';

export interface LastSession {
  name: string;
  birth: BirthData;
  tab: string;
}

export function loadLast(): LastSession | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSession;
    // A release may have changed BirthData's shape, so check before trusting it.
    return parsed?.birth?.location && typeof parsed.birth.year === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLast(name: string, birth: BirthData, tab: string): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ name, birth, tab }));
  } catch {
    /* Private mode or quota: losing the restore is not worth breaking a cast. */
  }
}

export function clearLast(): void {
  try { localStorage.removeItem(LAST_KEY); } catch { /* nothing to clear */ }
}
