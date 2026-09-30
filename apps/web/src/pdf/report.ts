/**
 * The kundali report.
 *
 * What an Indian family actually does with a chart is print it, keep it, and
 * hand it to an astrologer or to the other side of a marriage negotiation. So
 * the document has to stand on its own: every position it claims, the chart
 * drawn properly, and each interpretation attributed to the text it comes from,
 * because an astrologer reading this will want to check it rather than trust it.
 *
 * In Latin script only — see the note in writer.ts. English is also the right
 * default for a document that gets forwarded and printed.
 */
import {
  formatDMS, GRAHAS, GRAHA_ABBR, RASHI_NAMES_SA, NAKSHATRA_NAMES_SA, GRAHA_NAMES_SA,
  dashaChainAt, mahadashas, evaluateRules, allConditions,
} from '@jyotish/engine';
import type { Kundali, RashiIndex } from '@jyotish/engine';
import { Page, buildPdf, textWidth, A4 } from './writer.js';

const MARGIN = 48;
const CONTENT = A4.width - MARGIN * 2;
const INK = 0;
const SOFT = 0.42;
const FAINT = 0.72;

/** A cursor down the page that starts a new one before it runs off the bottom. */
class Flow {
  pages: Page[] = [];
  page!: Page;
  y = 0;

  constructor(private readonly header: (page: Page, first: boolean) => number) {
    this.newPage(true);
  }

  newPage(first = false): void {
    this.page = new Page();
    this.pages.push(this.page);
    this.y = this.header(this.page, first);
  }

  /** Reserve vertical space, moving to a new page if this block will not fit. */
  need(height: number): void {
    if (this.y + height > A4.height - MARGIN - 24) this.newPage();
  }
}

function heading(flow: Flow, text: string): void {
  flow.need(34);
  flow.y += 10;
  flow.page.text(text.toUpperCase(), MARGIN, flow.y, { size: 8.5, font: 'Helvetica-Bold', grey: SOFT });
  flow.y += 6;
  flow.page.line(MARGIN, flow.y, A4.width - MARGIN, flow.y, { grey: FAINT });
  flow.y += 14;
}

/**
 * The North Indian chart: a fixed diamond where the houses stay put and the
 * signs move. House 1 is the top centre diamond, and the rest run anticlockwise.
 */
function drawNorthIndian(page: Page, chart: Kundali, x: number, top: number, size: number): void {
  const s = size;
  page.rect(x, top, s, s, { stroke: INK, width: 0.8 });
  page.line(x, top, x + s, top + s, { width: 0.5 });
  page.line(x + s, top, x, top + s, { width: 0.5 });
  page.line(x + s / 2, top, x + s, top + s / 2, { width: 0.5 });
  page.line(x + s, top + s / 2, x + s / 2, top + s, { width: 0.5 });
  page.line(x + s / 2, top + s, x, top + s / 2, { width: 0.5 });
  page.line(x, top + s / 2, x + s / 2, top, { width: 0.5 });

  // Centre of each house, as fractions of the square, in house order.
  const centres: [number, number][] = [
    [0.50, 0.25], [0.26, 0.12], [0.12, 0.26], [0.25, 0.50], [0.12, 0.74], [0.26, 0.88],
    [0.50, 0.75], [0.74, 0.88], [0.88, 0.74], [0.75, 0.50], [0.88, 0.26], [0.74, 0.12],
  ];

  const usable = chart.birth.timeAccuracy !== 'Unknown';
  for (let house = 1; house <= 12; house += 1) {
    const [fx, fy] = centres[house - 1]!;
    const cx = x + fx * s;
    const cy = top + fy * s;
    const rashi = ((chart.lagnaRashi + house - 1) % 12) as RashiIndex;

    page.text(String(rashi + 1), cx - 18, cy - 8, { size: 6.5, grey: SOFT });
    if (!usable) continue;

    const here = GRAHAS.filter((g) => chart.grahaBhava[g] === house);
    here.forEach((graha, i) => {
      const label = GRAHA_ABBR[graha] + (chart.positions[graha]!.retrograde ? '·' : '');
      page.text(label, cx, cy + i * 8, { size: 7.5, align: 'center', font: 'Helvetica-Bold' });
    });
  }
}

/** Space kept between columns, so a right-aligned cell cannot touch the next. */
const GUTTER = 12;

/** A table with fixed columns; returns the new y. */
function table(
  flow: Flow,
  columns: { label: string; width: number; align?: 'left' | 'right' }[],
  rows: string[][],
): void {
  const head = () => {
    let x = MARGIN;
    for (const col of columns) {
      flow.page.text(col.label.toUpperCase(), col.align === 'right' ? x + col.width - GUTTER : x, flow.y,
        { size: 6.5, grey: SOFT, align: col.align ?? 'left' });
      x += col.width;
    }
    flow.y += 4;
    flow.page.line(MARGIN, flow.y, A4.width - MARGIN, flow.y, { grey: FAINT });
    flow.y += 11;
  };

  flow.need(40);
  head();

  for (const row of rows) {
    if (flow.y + 14 > A4.height - MARGIN - 24) { flow.newPage(); head(); }
    let x = MARGIN;
    row.forEach((cell, i) => {
      const col = columns[i]!;
      flow.page.text(cell, col.align === 'right' ? x + col.width - GUTTER : x, flow.y,
        { size: 8.5, align: col.align ?? 'left' });
      x += col.width;
    });
    flow.y += 13;
    flow.page.line(MARGIN, flow.y - 4, A4.width - MARGIN, flow.y - 4, { grey: 0.88 });
  }
}

/** Break a paragraph to the content width. */
function paragraph(flow: Flow, text: string, size = 8.5, grey = INK, indent = 0): void {
  const width = CONTENT - indent;
  const words = text.split(' ');
  let line = '';
  const flush = () => {
    if (!line) return;
    if (flow.y + 12 > A4.height - MARGIN - 24) flow.newPage();
    flow.page.text(line, MARGIN + indent, flow.y, { size, grey });
    flow.y += size + 3.5;
    line = '';
  };
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size) > width) { flush(); line = word; } else { line = next; }
  }
  flush();
}

export interface ReportOptions {
  name?: string;
  /** Defaults to now; injectable so the output is reproducible in a test. */
  asOf?: Date;
}

export function kundaliReport(chart: Kundali, options: ReportOptions = {}): Uint8Array {
  const asOf = options.asOf ?? new Date();
  const name = (options.name ?? '').trim();
  const tz = chart.birth.location.timezone;
  const when = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz, day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(chart.utcISO));
  const place = chart.birth.location.label ?? `${chart.birth.location.latitude}, ${chart.birth.location.longitude}`;
  const usable = chart.birth.timeAccuracy !== 'Unknown';

  const flow = new Flow((page, first) => {
    page.text('AISTRO', MARGIN, MARGIN, { size: 8, font: 'Helvetica-Bold', grey: SOFT });
    page.text(name || 'Kundali', A4.width - MARGIN, MARGIN, { size: 8, align: 'right', grey: SOFT });
    page.line(MARGIN, MARGIN + 8, A4.width - MARGIN, MARGIN + 8, { grey: FAINT });
    if (!first) return MARGIN + 30;

    let y = MARGIN + 34;
    page.text(name || 'Birth chart', MARGIN, y, { size: 20, font: 'Helvetica-Bold' });
    y += 20;
    page.text(`${when}  ·  ${place}`, MARGIN, y, { size: 9.5, grey: SOFT });
    y += 13;
    page.text(`Sidereal, ${formatDMS(chart.ayanamsa, 0)} ${chart.settings.ayanamsa} ayanamsa`,
      MARGIN, y, { size: 9.5, grey: SOFT });
    return y + 10;
  });

  // --- the chart, with the headline placements beside it ---------------------
  heading(flow, 'Rasi chart');
  const size = 232;
  drawNorthIndian(flow.page, chart, MARGIN, flow.y, size);

  const sideX = MARGIN + size + 26;
  let sy = flow.y + 6;
  const fact = (label: string, value: string) => {
    flow.page.text(label.toUpperCase(), sideX, sy, { size: 6.5, grey: SOFT });
    sy += 11;
    flow.page.text(value, sideX, sy, { size: 11, font: 'Helvetica-Bold' });
    sy += 20;
  };
  fact('Ascendant', usable
    ? `${RASHI_NAMES_SA[chart.lagnaRashi]} ${formatDMS(chart.lagna % 30, 0)}`
    : 'Not determinable');
  if (usable) fact('Lagna nakshatra', `${NAKSHATRA_NAMES_SA[chart.lagnaNakshatra]} ${chart.lagnaPada}`);
  const moon = chart.positions.Moon!;
  fact('Moon sign', RASHI_NAMES_SA[moon.rashi]!);
  fact('Janma nakshatra', `${NAKSHATRA_NAMES_SA[moon.nakshatra]} ${moon.pada}`);
  fact('Sun sign', RASHI_NAMES_SA[chart.positions.Sun!.rashi]!);

  flow.y += size + 6;

  if (!usable) {
    paragraph(flow,
      'The birth time was given as unknown, so the ascendant, the houses and every divisional '
      + 'chart are left out: they cannot be determined without it. The graha positions by sign '
      + 'are shown, and the Moon may be as much as thirteen degrees out across a full day.',
      8.5, SOFT);
  }

  // --- positions -------------------------------------------------------------
  heading(flow, 'Graha positions');
  const conditions = allConditions(chart);
  table(flow,
    [
      { label: 'Graha', width: 62 },
      { label: 'Longitude', width: 74, align: 'right' },
      { label: 'Rasi', width: 72 },
      { label: 'Nakshatra', width: 104 },
      { label: 'Pada', width: 36, align: 'right' },
      { label: 'Bhava', width: 44, align: 'right' },
      { label: 'Condition', width: 107 },
    ],
    GRAHAS.map((graha) => {
      const p = chart.positions[graha]!;
      const c = conditions[graha];
      const flags = [
        c.exalted ? 'exalted' : c.debilitated ? 'debilitated' : c.ownSign ? 'own sign' : '',
        p.retrograde ? 'R' : '',
        c.combust ? 'combust' : '',
      ].filter(Boolean).join(', ');
      return [
        GRAHA_NAMES_SA[graha],
        formatDMS(p.degreeInRashi, 0),
        RASHI_NAMES_SA[p.rashi]!,
        NAKSHATRA_NAMES_SA[p.nakshatra]!,
        String(p.pada),
        usable ? String(chart.grahaBhava[graha]) : '—',
        flags,
      ];
    }),
  );

  // --- dashas ----------------------------------------------------------------
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const chain = dashaChainAt(chart, asOf, { depth: 3 });
  heading(flow, 'Vimshottari dasha');
  if (chain.length) {
    paragraph(flow,
      `Running on ${iso(asOf)}: `
      + chain.map((c) => GRAHA_NAMES_SA[c.lord]).join(' – ')
      + `. The ${GRAHA_NAMES_SA[chain[0]!.lord]} mahadasha runs ${iso(chain[0]!.start)} to ${iso(chain[0]!.end)}.`);
    flow.y += 4;
  }
  const periods = mahadashas(chart);
  table(flow,
    [
      { label: 'Mahadasha', width: 120 },
      { label: 'From', width: 120 },
      { label: 'To', width: 120 },
      { label: 'Years', width: 80, align: 'right' },
    ],
    periods.map((p) => [
      GRAHA_NAMES_SA[p.lord],
      iso(p.start),
      iso(p.end),
      ((p.end.getTime() - p.start.getTime()) / (365.2425 * 86400000)).toFixed(1),
    ]),
  );

  // --- findings --------------------------------------------------------------
  const analysis = evaluateRules(chart);
  heading(flow, 'Yogas and doshas');
  if (!analysis.active.length && !analysis.cancelled.length) {
    paragraph(flow, 'No yoga or dosha in the rule set applies to this chart.', 8.5, SOFT);
  }
  for (const finding of analysis.active) {
    flow.need(36);
    flow.page.text(finding.name, MARGIN, flow.y, { size: 9.5, font: 'Helvetica-Bold' });
    flow.y += 12;
    paragraph(flow, finding.classicalEffect, 8.5);
    const cite = finding.citation.locus
      ? `${finding.citation.work}, ${finding.citation.locus}`
      : finding.citation.work;
    paragraph(flow, cite, 7.5, SOFT);
    if (finding.citation.contested) {
      paragraph(flow, `Practitioners differ: ${finding.citation.contested}`, 7.5, SOFT);
    }
    flow.y += 5;
  }
  if (analysis.cancelled.length) {
    flow.y += 4;
    paragraph(flow,
      'Cancelled, and listed so the omission is visible rather than silent: '
      + analysis.cancelled.map((f) => f.name).join(', ') + '.', 7.5, SOFT);
  }

  // --- the honest footer, on every page --------------------------------------
  flow.pages.forEach((page, i) => {
    const y = A4.height - MARGIN + 6;
    page.line(MARGIN, y - 12, A4.width - MARGIN, y - 12, { grey: FAINT });
    page.text(
      'Positions are astronomy and are exact. Interpretations are what classical texts say, '
      + 'offered for reflection rather than as advice.',
      MARGIN, y, { size: 6.8, grey: SOFT });
    page.text(`${i + 1} / ${flow.pages.length}`, A4.width - MARGIN, y, { size: 6.8, align: 'right', grey: SOFT });
  });

  return buildPdf(flow.pages, { title: name ? `Kundali — ${name}` : 'Kundali', author: 'Aistro' });
}

/**
 * Hand the report to the viewer.
 *
 * Share first: on a phone this puts the PDF straight into WhatsApp, which is
 * how a kundali actually travels between families. Falling back to a download
 * for desktop, where there is no share sheet.
 */
export async function deliverReport(
  chart: Kundali, options: ReportOptions & { filename?: string } = {},
): Promise<'shared' | 'downloaded' | 'failed'> {
  let bytes: Uint8Array;
  try {
    bytes = kundaliReport(chart, options);
  } catch {
    return 'failed';
  }

  const filename = options.filename ?? 'kundali.pdf';
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: options.name || 'Kundali' });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'shared';
    }
  }

  // Some hosts sandbox the page and make an ordinary download link inert — the
  // claude.ai artifact viewer does, which is where this app gets demonstrated.
  // Such a host offers a mediated save instead. Absent everywhere else, so this
  // costs a nullish check on a normal deployment.
  const mediated = await hostSave();
  if (mediated) {
    try {
      await mediated({ filename, data: blob });
      return 'downloaded';
    } catch (error) {
      // The viewer declining is an answer, not a failure to report as one.
      const code = (error as { code?: string } | null)?.code;
      if (code === 'declined' || code === 'rate_limited') return 'shared';
      // Anything else: fall through and try the ordinary link.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can cancel the download on some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}

/** The host's mediated save, when the page is running inside one that has it. */
type HostSave = (request: { filename: string; data: Blob }) => Promise<unknown>;

async function hostSave(): Promise<HostSave | null> {
  const host = (globalThis as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  if (typeof host?.use !== 'function') return null;
  try {
    const downloads = await host.use('downloads') as { save?: HostSave } | null;
    return typeof downloads?.save === 'function' ? downloads.save.bind(downloads) : null;
  } catch {
    return null;
  }
}
