/**
 * @jyotish/engine — deterministic Vedic astrology calculations.
 *
 * Design contract, which the rest of the product depends on:
 *   1. Everything here is a pure function. No I/O, no clock, no randomness.
 *   2. No language model ever computes a position, a period or a rule outcome.
 *      Models may narrate what this engine returns; they may not add to it.
 *   3. Where classical authorities disagree, the disagreement is represented,
 *      not resolved by fiat.
 */

export * from './core/types.js';
export * from './core/angle.js';
export * from './core/constants.js';
export * from './core/time.js';
export * from './core/ayanamsa.js';
export * from './core/ephemeris.js';
export * from './chart/houses.js';
export * from './chart/kundali.js';
export * from './chart/varga.js';
export * from './chart/dignity.js';
export * from './chart/aspects.js';
