/**
 * Kundali diagrams as inline SVG.
 *
 * Both regional conventions are supported because they are not interchangeable
 * to the people who read them: a North Indian chart holds the houses fixed and
 * moves the signs, a South Indian chart holds the signs fixed and moves the
 * houses. Showing a South Indian user a North Indian diagram is not a styling
 * choice, it reads as a different chart.
 *
 * Inline SVG rather than canvas so the diagram scales on any screen, prints,
 * and stays legible to a screen reader.
 */
import { GRAHA_ABBR } from '@jyotish/engine';
import type { Kundali, Graha, RashiIndex, BhavaNumber } from '@jyotish/engine';

const SIZE = 400;

export interface ChartRenderOptions {
  /** Grahas to show per house. Defaults to the rashi chart's own placements. */
  placements?: { rashi: RashiIndex; grahas: Graha[] }[];
  /** Sign of the ascendant, needed to number the houses. */
  lagnaRashi: RashiIndex;
  /** Marks retrograde grahas with a trailing mark. */
  retrograde?: Graha[];
  /** Short sign labels for the South Indian grid, so they can be localised. */
  signLabels?: readonly string[];
  /** Graha abbreviations, so the diagram can be read in Devanagari. */
  grahaLabels?: Record<Graha, string>;
  title?: string;
}

/**
 * Three-letter sign abbreviations.
 *
 * Deliberately not `name.slice(0, 3)`: that collapses Vrishabha and Vrischika
 * to the same "Vri", which puts a graha in the wrong sign for anyone reading
 * the diagram rather than the table.
 */
export const SIGN_ABBR_SA: readonly string[] = [
  'Mes', 'Vrs', 'Mit', 'Kar', 'Sim', 'Kan', 'Tul', 'Vrc', 'Dha', 'Mak', 'Kum', 'Mee',
] as const;

function placementsFromChart(chart: Kundali): { rashi: RashiIndex; grahas: Graha[] }[] {
  const bySign = new Map<RashiIndex, Graha[]>();
  for (const [graha, position] of Object.entries(chart.positions) as [Graha, { rashi: RashiIndex }][]) {
    const list = bySign.get(position.rashi) ?? [];
    list.push(graha);
    bySign.set(position.rashi, list);
  }
  return [...bySign.entries()].map(([rashi, grahas]) => ({ rashi, grahas }));
}

export function renderOptionsFor(chart: Kundali): ChartRenderOptions {
  return {
    placements: placementsFromChart(chart),
    lagnaRashi: chart.lagnaRashi,
    retrograde: (Object.keys(chart.positions) as Graha[])
      .filter((g) => chart.positions[g].retrograde),
  };
}

function label(
  grahas: Graha[], retrograde: Graha[] = [], abbr: Record<Graha, string> = GRAHA_ABBR,
): string[] {
  return grahas.map((g) => abbr[g] + (retrograde.includes(g) ? 'ᴿ' : ''));
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
}

/** Devanagari needs more vertical room than Latin: its matras sit above and
 *  below the baseline, so a line height tuned for "Su/Ju/Ve" makes
 *  "सू/गु/शु" collide. */
const DEVANAGARI = /[\u0900-\u097F]/;

/** Stack the graha abbreviations for one house around a point. */
function grahaText(x: number, y: number, items: string[], anchor = 'middle'): string {
  if (items.length === 0) return '';
  const lineHeight = items.some((i) => DEVANAGARI.test(i)) ? 17 : 13;
  const start = y - ((items.length - 1) * lineHeight) / 2;
  return items
    .map((text, i) =>
      `<text x="${x}" y="${start + i * lineHeight}" text-anchor="${anchor}" `
      + `class="k-graha">${escapeXml(text)}</text>`)
    .join('');
}

// ---------------------------------------------------------------------------
// North Indian
// ---------------------------------------------------------------------------

/**
 * House regions of the North Indian diamond chart. The first house is the top
 * centre diamond and the rest run anticlockwise, which is the convention every
 * North Indian almanac uses.
 */
const NORTH_HOUSE_ANCHORS: { house: BhavaNumber; x: number; y: number; sx: number; sy: number }[] = [
  { house: 1,  x: 200, y: 105, sx: 200, sy: 58  },
  { house: 2,  x: 100, y: 52,  sx: 100, sy: 22  },
  { house: 3,  x: 52,  y: 100, sx: 22,  sy: 100 },
  { house: 4,  x: 105, y: 200, sx: 58,  sy: 200 },
  { house: 5,  x: 52,  y: 300, sx: 22,  sy: 300 },
  { house: 6,  x: 100, y: 348, sx: 100, sy: 378 },
  { house: 7,  x: 200, y: 295, sx: 200, sy: 342 },
  { house: 8,  x: 300, y: 348, sx: 300, sy: 378 },
  { house: 9,  x: 348, y: 300, sx: 378, sy: 300 },
  { house: 10, x: 295, y: 200, sx: 342, sy: 200 },
  { house: 11, x: 348, y: 100, sx: 378, sy: 100 },
  { house: 12, x: 300, y: 52,  sx: 300, sy: 22  },
];

export function northIndianChart(options: ChartRenderOptions): string {
  const { lagnaRashi, placements = [], retrograde = [], grahaLabels = GRAHA_ABBR } = options;
  const bySign = new Map(placements.map((p) => [p.rashi, p.grahas]));

  const lines = [
    // Outer square.
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" class="k-frame"/>`,
    // Both diagonals.
    `<line x1="0" y1="0" x2="${SIZE}" y2="${SIZE}" class="k-line"/>`,
    `<line x1="${SIZE}" y1="0" x2="0" y2="${SIZE}" class="k-line"/>`,
    // Inner diamond joining the edge midpoints.
    `<polygon points="200,0 400,200 200,400 0,200" class="k-line" fill="none"/>`,
  ];

  const cells = NORTH_HOUSE_ANCHORS.map(({ house, x, y, sx, sy }) => {
    const rashi = ((lagnaRashi + house - 1) % 12) as RashiIndex;
    const grahas = bySign.get(rashi) ?? [];
    // The sign number, not the house number, is written in the corner — that is
    // what identifies the house in a North Indian chart, since houses are fixed.
    return `<text x="${sx}" y="${sy}" text-anchor="middle" class="k-sign">${rashi + 1}</text>`
      + grahaText(x, y, label(grahas, retrograde, grahaLabels));
  }).join('');

  return svgWrapper(lines.join('') + cells, options.title
    ?? 'North Indian style chart; house one is the upper centre diamond.');
}

// ---------------------------------------------------------------------------
// South Indian
// ---------------------------------------------------------------------------

/** Fixed grid positions of each sign, Mesha in the second cell of the top row. */
const SOUTH_SIGN_CELLS: Record<number, { col: number; row: number }> = {
  11: { col: 0, row: 0 }, 0: { col: 1, row: 0 }, 1: { col: 2, row: 0 }, 2: { col: 3, row: 0 },
  10: { col: 0, row: 1 },                                              3: { col: 3, row: 1 },
  9:  { col: 0, row: 2 },                                              4: { col: 3, row: 2 },
  8:  { col: 0, row: 3 }, 7: { col: 1, row: 3 }, 6: { col: 2, row: 3 }, 5: { col: 3, row: 3 },
};

export function southIndianChart(options: ChartRenderOptions): string {
  const {
    lagnaRashi, placements = [], retrograde = [],
    signLabels = SIGN_ABBR_SA, grahaLabels = GRAHA_ABBR,
  } = options;
  const bySign = new Map(placements.map((p) => [p.rashi, p.grahas]));
  const cell = SIZE / 4;

  const parts: string[] = [
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" class="k-frame"/>`,
  ];

  for (const [signKey, { col, row }] of Object.entries(SOUTH_SIGN_CELLS)) {
    const rashi = Number(signKey) as RashiIndex;
    const x = col * cell;
    const y = row * cell;
    const house = ((rashi - lagnaRashi + 12) % 12) + 1;
    const grahas = bySign.get(rashi) ?? [];

    parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" class="k-cell"/>`);
    parts.push(
      `<text x="${x + 6}" y="${y + 15}" class="k-sign k-sign-left">`
      + `${escapeXml(signLabels[rashi] ?? SIGN_ABBR_SA[rashi]!)}</text>`,
    );
    parts.push(`<text x="${x + cell - 6}" y="${y + 15}" text-anchor="end" class="k-house">${house}</text>`);
    parts.push(grahaText(x + cell / 2, y + cell / 2 + 6, label(grahas, retrograde, grahaLabels)));

    // The ascendant is marked with a corner diagonal, as South Indian charts
    // conventionally do. It goes in the BOTTOM-left corner rather than the top,
    // because the sign label occupies the top and a diagonal drawn there strikes
    // straight through it.
    if (rashi === lagnaRashi) {
      parts.push(
        `<line x1="${x}" y1="${y + cell}" x2="${x + cell * 0.34}" y2="${y + cell * 0.66}" `
        + `class="k-lagna"/>`,
      );
    }
  }

  return svgWrapper(parts.join(''), options.title
    ?? 'South Indian style chart; signs are fixed and the ascendant cell is marked.');
}

function svgWrapper(body: string, description: string): string {
  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" class="kundali" role="img" `
    + `aria-label="${escapeXml(description)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

/** Render whichever style the chart's settings ask for. */
export function renderChart(
  chart: Kundali,
  style?: 'NorthIndian' | 'SouthIndian',
  signLabels?: readonly string[],
  grahaLabels?: Record<Graha, string>,
): string {
  const options: ChartRenderOptions = {
    ...renderOptionsFor(chart),
    ...(signLabels ? { signLabels } : {}),
    ...(grahaLabels ? { grahaLabels } : {}),
  };
  const chosen = style ?? chart.settings.chartStyle;
  return chosen === 'SouthIndian' ? southIndianChart(options) : northIndianChart(options);
}

/** Render a divisional chart from precomputed sign placements. */
export function renderVarga(
  lagnaRashi: RashiIndex,
  grahaRashi: Record<Graha, RashiIndex>,
  style: 'NorthIndian' | 'SouthIndian',
  retrograde: Graha[] = [],
  signLabels?: readonly string[],
  grahaLabels?: Record<Graha, string>,
): string {
  const bySign = new Map<RashiIndex, Graha[]>();
  for (const [graha, rashi] of Object.entries(grahaRashi) as [Graha, RashiIndex][]) {
    const list = bySign.get(rashi) ?? [];
    list.push(graha);
    bySign.set(rashi, list);
  }
  const options: ChartRenderOptions = {
    lagnaRashi,
    placements: [...bySign.entries()].map(([rashi, grahas]) => ({ rashi, grahas })),
    retrograde,
    ...(signLabels ? { signLabels } : {}),
    ...(grahaLabels ? { grahaLabels } : {}),
  };
  return style === 'SouthIndian' ? southIndianChart(options) : northIndianChart(options);
}
