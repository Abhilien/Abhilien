// Progressive information sharing: Discovery → Mutual interest → Primary.

import { holdsSlot, openConnectionBetween } from './rules';
import type { ShareLevel, SharedField, State } from './types';

const ORDER: ShareLevel[] = ['discovery', 'mutual', 'primary'];

export function relationshipLevel(s: State, viewerId: string, targetId: string): ShareLevel {
  if (viewerId === targetId) return 'primary';
  const c = openConnectionBetween(s, viewerId, targetId);
  if (!c) return 'discovery';
  return holdsSlot(c) ? 'primary' : 'mutual';
}

export function canSeeField(s: State, viewerId: string, targetId: string, field: SharedField): boolean {
  const need = s.users[targetId].settings.sharing[field];
  return ORDER.indexOf(relationshipLevel(s, viewerId, targetId)) >= ORDER.indexOf(need);
}

/** Only broad location is ever shown; never an exact location. */
export function broadLocation(place: { city: string; country: string }, viewerCountry: string): string {
  return place.country === viewerCountry ? place.city : `${place.city}, ${place.country}`;
}
