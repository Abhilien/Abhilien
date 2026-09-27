import type { Plan, Reach } from './types';

/**
 * What each plan unlocks. Note what is *absent*: no plan changes the number
 * of Primary connections, the size of Discovery, or anyone's visibility rank.
 */
export interface Entitlements {
  maxReach: Reach;
  advancedFilters: boolean;
  transparency: boolean;
  profileHistory: boolean;
  advancedVerification: boolean;
  incognito: boolean;
  anonymousDiscovery: boolean;
  progressiveSharing: boolean;
  feedbackVisibilityControl: boolean;
  /** Future: a human matchmaker. Not part of the MVP. */
  matchmaker: boolean;
}

export const PRIMARY_SLOTS_PER_KIND = 1;
export const DAILY_RECOMMENDATIONS = 5;

const FREE: Entitlements = {
  maxReach: 'regional',
  advancedFilters: false,
  transparency: false,
  profileHistory: false,
  advancedVerification: false,
  incognito: false,
  anonymousDiscovery: false,
  progressiveSharing: false,
  feedbackVisibilityControl: false,
  matchmaker: false,
};

const PREMIUM: Entitlements = {
  maxReach: 'global',
  advancedFilters: true,
  transparency: true,
  profileHistory: true,
  advancedVerification: true,
  incognito: true,
  anonymousDiscovery: true,
  progressiveSharing: true,
  feedbackVisibilityControl: true,
  matchmaker: false,
};

export function entitlements(plan: Plan): Entitlements {
  switch (plan) {
    case 'free':
      return FREE;
    case 'premium':
      return PREMIUM;
    case 'concierge':
      return { ...PREMIUM, matchmaker: true };
  }
}
