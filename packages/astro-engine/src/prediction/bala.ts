/**
 * Tara bala and Chandra bala — the two classical daily strengths.
 *
 * Both answer the same question from different bodies: is today favourable for
 * *this* person, as opposed to favourable in general. Tara counts the running
 * nakshatra from the natal one in nines; Chandra counts the transiting Moon's
 * sign from the natal Moon's.
 *
 * Extracted from the muhurta scorer so a daily prediction and a muhurta window
 * cannot drift apart. Two copies of a rule is how an app ends up telling someone
 * the day is obstructive on one screen and auspicious on the next.
 */
import type { Kundali, RashiIndex } from '../core/types.js';
import {
  TARA_NAMES, INAUSPICIOUS_TARAS, FAVOURABLE_CHANDRA_HOUSES,
} from '../muhurta/activities.js';

export interface TaraBala {
  /** 1..9 — Janma, Sampat, Vipat, Kshema, Pratyari, Sadhaka, Vadha, Mitra, Ati-mitra. */
  number: number;
  name: string;
  favourable: boolean;
}

export interface ChandraBala {
  /** The transiting Moon's house counted from the natal Moon, 1..12. */
  houseFromMoon: number;
  favourable: boolean;
}

/** `nakshatra` is the running nakshatra index, 0..26. */
export function taraBala(natal: Kundali, nakshatra: number): TaraBala {
  const number = (((nakshatra - natal.positions.Moon.nakshatra + 27) % 27) % 9) + 1;
  return {
    number,
    name: TARA_NAMES[number - 1]!,
    favourable: !INAUSPICIOUS_TARAS.includes(number),
  };
}

/** `moonSign` is the transiting Moon's rashi. */
export function chandraBala(natal: Kundali, moonSign: RashiIndex): ChandraBala {
  const houseFromMoon = (((moonSign - natal.positions.Moon.rashi + 12) % 12) + 1);
  return { houseFromMoon, favourable: FAVOURABLE_CHANDRA_HOUSES.includes(houseFromMoon) };
}
