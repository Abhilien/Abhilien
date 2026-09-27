// Curated discovery: a small, explained set each day. Never an infinite feed.
// Compatibility here is decision support — it never predicts who will fall in love.

import { DAILY_RECOMMENDATIONS, entitlements } from './entitlements';
import { REACH_ORDER } from './labels';
import { hasInterest, hasPassed, openConnectionBetween } from './rules';
import type { Intent, Kind, Reach, State, User } from './types';

export function effectiveReach(u: User): Reach {
  const max = entitlements(u.plan).maxReach;
  return REACH_ORDER.indexOf(u.settings.reach) > REACH_ORDER.indexOf(max) ? max : u.settings.reach;
}

export type Distance = 'local' | 'regional' | 'national' | 'international';

export function distance(a: User, b: User): Distance {
  const pa = a.profile.place;
  const pb = b.profile.place;
  if (pa.country !== pb.country) return 'international';
  if (pa.metro === pb.metro) return 'local';
  if (pa.region === pb.region) return 'regional';
  return 'national';
}

/** Is the candidate inside the viewer's reach — and open to that distance themselves? */
export function withinReach(viewer: User, cand: User): boolean {
  const reach = REACH_ORDER.indexOf(effectiveReach(viewer));
  const dist = distance(viewer, cand);
  switch (dist) {
    case 'local':
      return true;
    case 'regional':
      return reach >= 1;
    case 'national':
      return reach >= 2 && (cand.settings.longDistance || cand.settings.relocation);
    case 'international': {
      if (!cand.settings.international) return false;
      if (reach >= 4) return true;
      return reach === 3 && viewer.settings.countries.includes(cand.profile.place.country);
    }
  }
}

const SERIOUS: Intent[] = ['serious', 'long-term', 'marriage'];

function intentsCompatible(a: Intent, b: Intent): boolean {
  if (a === 'friendship' || b === 'friendship') return false;
  if ((a === 'casual' && b === 'marriage') || (a === 'marriage' && b === 'casual')) return false;
  return true;
}

export function eligible(s: State, viewer: User, cand: User, kind: Kind): boolean {
  if (cand.id === viewer.id) return false;
  if (!cand.profile.openTo.includes(kind) || !viewer.profile.openTo.includes(kind)) return false;
  if (cand.settings.discoveryPaused) return false;
  if (openConnectionBetween(s, viewer.id, cand.id)) return false;
  if (hasPassed(s, viewer.id, cand.id, kind) || hasInterest(s, viewer.id, cand.id, kind)) return false;
  // Anonymous Discovery: only revealed to people they've expressed interest in.
  if (cand.settings.anonymousDiscovery && entitlements(cand.plan).anonymousDiscovery) {
    if (!hasInterest(s, cand.id, viewer.id, kind)) return false;
  }
  if (kind === 'romantic') {
    if (!viewer.profile.seeking.includes(cand.profile.gender)) return false;
    if (!cand.profile.seeking.includes(viewer.profile.gender)) return false;
    if (!intentsCompatible(viewer.profile.intent, cand.profile.intent)) return false;
  }
  return withinReach(viewer, cand);
}

export interface Compatibility {
  reasons: string[];
  differences: string[];
  label: 'Strong alignment' | 'Good alignment' | 'Some alignment';
  score: number;
}

const joinTwo = (xs: string[]) => (xs.length > 1 ? `${xs[0]} & ${xs[1]}` : xs[0]);

export function compatibility(a: User, b: User, kind: Kind): Compatibility {
  const pa = a.profile;
  const pb = b.profile;
  const reasons: string[] = [];
  const differences: string[] = [];

  if (kind === 'romantic') {
    if (pa.intent === pb.intent || (SERIOUS.includes(pa.intent) && SERIOUS.includes(pb.intent))) {
      reasons.push(
        pa.intent === 'marriage' && pb.intent === 'marriage'
          ? 'Both looking toward marriage'
          : 'Similar relationship intentions',
      );
    } else {
      differences.push('Different relationship intentions');
    }
    if (pa.future.marriageTimeline && pa.future.marriageTimeline === pb.future.marriageTimeline) {
      reasons.push('Similar relationship timeline');
    }
    if (pa.future.children && pb.future.children) {
      if (pa.future.children === pb.future.children) reasons.push('Similar views on children');
      else differences.push('Different views on children');
    }
    if (pa.future.family && pa.future.family === pb.future.family) {
      reasons.push('Similar expectations around family');
    }
  }

  const dist = distance(a, b);
  if (dist === 'local') {
    reasons.push(`Both based in ${pa.place.metro}`);
  } else if (a.settings.relocation && b.settings.relocation) {
    reasons.push('Both open to relocation');
  } else if (a.settings.relocation !== b.settings.relocation) {
    differences.push('Different relocation preferences');
  }
  if (dist === 'international') {
    if (a.settings.international && b.settings.international) reasons.push('Both open to an international relationship');
    differences.push(`Different countries — ${pb.place.city} and ${pa.place.city}`);
  } else if (dist === 'national') {
    differences.push(`Long-distance to begin with — ${pb.place.city}`);
  }

  const sharedInterests = pa.interests.filter((i) => pb.interests.includes(i));
  if (sharedInterests.length) reasons.push(`Both enjoy ${joinTwo(sharedInterests.map((x) => x.toLowerCase()))}`);

  const sharedLifestyle = pa.lifestyle.filter((i) => pb.lifestyle.includes(i));
  if (sharedLifestyle.length >= 2) reasons.push('Similar lifestyle');

  const sharedValues = pa.values.filter((v) => pb.values.includes(v));
  if (sharedValues.length) reasons.push(`You both value ${sharedValues[0].toLowerCase()}`);

  const sharedLang = pa.languages.filter((l) => pb.languages.includes(l) && l !== 'English');
  if (sharedLang.length) reasons.push(`You both speak ${sharedLang[0]}`);

  const score = reasons.length * 2 - differences.length;
  const label = score >= 10 ? 'Strong alignment' : score >= 6 ? 'Good alignment' : 'Some alignment';
  return { reasons, differences, label, score };
}

/** Pick today's recommendations. Deterministic for a given state. */
export function curate(s: State, viewerId: string, kind: Kind): string[] {
  const viewer = s.users[viewerId];
  if (!viewer) return [];
  return Object.values(s.users)
    .filter((u) => eligible(s, viewer, u, kind))
    .map((u) => {
      const c = compatibility(viewer, u, kind);
      // People who already chose you get a small nudge — they're genuinely interested.
      const chose = hasInterest(s, u.id, viewerId, kind) ? 1 : 0;
      // Rotate a little day to day so the same people don't always lead.
      const rotate = ((hash(u.id) + s.day * 7) % 5) / 10;
      return { id: u.id, score: c.score + chose + rotate };
    })
    .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
    .slice(0, DAILY_RECOMMENDATIONS)
    .map((x) => x.id);
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Returns state with today's set stored (so it can't be refreshed endlessly). */
export function ensureDaily(s: State, viewerId: string, kind: Kind): State {
  const existing = s.discovery[viewerId]?.[kind];
  if (existing && existing.day === s.day) return s;
  const ids = curate(s, viewerId, kind);
  return {
    ...s,
    discovery: { ...s.discovery, [viewerId]: { ...s.discovery[viewerId], [kind]: { day: s.day, ids } } },
  };
}
