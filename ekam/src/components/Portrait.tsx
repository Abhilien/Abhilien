import { useId } from 'react';
import type { Portrait as P } from '../domain/types';

/**
 * Editorial duotone portrait. Stands in for member photography in this
 * prototype — every person in the sample community is fictional.
 */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(' ')})`;
}

export function PortraitArt({ p, label }: { p: P; label?: string }) {
  const id = useId().replace(/:/g, '');
  const cap = 'M66 99c1-29 15-45 34-45s33 16 34 45c-9-15-21-21-34-21s-25 6-34 21Z';
  const hair: { back?: string; front: string } = {
    0: { back: 'M57 112c-4-46 18-74 43-74s47 28 43 74c-2 26 5 44 11 58H46c6-14 13-32 11-58Z', front: cap },
    1: { back: 'M86 50a14 14 0 1 0 28 0 14 14 0 1 0-28 0Z', front: cap },
    2: { front: 'M67 97c0-28 14-43 33-43s33 15 33 43c-6-12-18-18-33-18s-27 6-33 18Z' },
    3: { front: 'M66 99c-1-31 14-47 35-47 18 0 33 13 32 41-9-14-21-18-38-18-12 0-21 8-29 24Z' },
  }[p.variant];
  return (
    <svg viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={p.from} />
          <stop offset="1" stopColor={p.to} />
        </linearGradient>
        <filter id={`n${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="200" height="240" fill={`url(#g${id})`} />
      <circle cx={p.variant % 2 ? 150 : 52} cy="62" r="46" fill={p.from} opacity="0.55" />
      <g>
        {hair.back && <path d={hair.back} fill={p.ink} />}
        <path d="M22 250c4-50 36-78 78-78s74 28 78 78Z" fill={mix(p.ink, p.to, 0.12)} />
        <rect x="88" y="128" width="24" height="48" rx="10" fill={mix(p.ink, p.to, 0.32)} />
        <ellipse cx="100" cy="104" rx="31" ry="37" fill={mix(p.ink, p.to, 0.38)} />
        <path d={hair.front} fill={p.ink} />
      </g>
      <rect width="200" height="240" filter={`url(#n${id})`} opacity="0.9" />
    </svg>
  );
}

export function Avatar({
  p,
  size = 48,
  round = true,
  label,
}: {
  p: P;
  size?: number;
  round?: boolean;
  label?: string;
}) {
  return (
    <div className={`portrait${round ? ' round' : ''}`} style={{ width: size, height: size }}>
      <PortraitArt p={p} label={label} />
    </div>
  );
}
