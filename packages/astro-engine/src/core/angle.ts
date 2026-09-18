/** Angle helpers. All angles are degrees unless a name says otherwise. */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Normalise to [0, 360). */
export function norm360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Normalise to (-180, 180]. */
export function norm180(deg: number): number {
  const r = norm360(deg);
  return r > 180 ? r - 360 : r;
}

/** Shortest separation between two longitudes, in [0, 180]. */
export function separation(a: number, b: number): number {
  return Math.abs(norm180(a - b));
}

/** Forward (anticlockwise / zodiacal) arc from `a` to `b`, in [0, 360). */
export function forwardArc(a: number, b: number): number {
  return norm360(b - a);
}

/** Split a longitude into degrees / minutes / seconds. */
export function toDMS(deg: number): { sign: 1 | -1; d: number; m: number; s: number } {
  const sign = deg < 0 ? -1 : 1;
  let x = Math.abs(deg);
  const d = Math.floor(x);
  x = (x - d) * 60;
  const m = Math.floor(x);
  const s = (x - m) * 60;
  return { sign, d, m, s };
}

/** Format a longitude as e.g. `12°34'56.7"`. */
export function formatDMS(deg: number, secondDecimals = 1): string {
  const { sign, d, m, s } = toDMS(deg);
  const ss = s.toFixed(secondDecimals).padStart(secondDecimals > 0 ? 3 + secondDecimals : 2, '0');
  return `${sign < 0 ? '-' : ''}${d}°${String(m).padStart(2, '0')}'${ss}"`;
}

/** Format as position within its sign, e.g. `12°34'56" Mesha`. */
export function formatSignPosition(longitude: number, signName: string): string {
  return `${formatDMS(norm360(longitude) % 30)} ${signName}`;
}
