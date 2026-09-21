/**
 * Sharing a kundali.
 *
 * In India a birth chart is something people send to relatives, astrologers and
 * prospective in-laws, usually over WhatsApp. An app that can compute a chart
 * but not get it out of the app is missing the step that matters socially.
 *
 * Two forms: plain text, which pastes anywhere and survives every messaging
 * app, and a PNG of the diagram for when a picture is wanted.
 */
import {
  formatDMS, GRAHAS, RASHI_NAMES_SA, NAKSHATRA_NAMES_SA, GRAHA_NAMES_SA,
  dashaChainAt, evaluateRules,
} from '@jyotish/engine';
import type { Kundali } from '@jyotish/engine';

/** A compact, readable chart summary that pastes into any chat. */
export function buildShareText(chart: Kundali, name?: string): string {
  const tz = chart.birth.location.timezone;
  const when = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(chart.utcISO));

  const lines: string[] = [];
  lines.push(name ? `Kundali — ${name}` : 'Kundali');
  lines.push(`${when} · ${chart.birth.location.label ?? ''}`);
  lines.push('');

  const usable = chart.birth.timeAccuracy !== 'Unknown';
  if (usable) {
    lines.push(`Lagna  ${RASHI_NAMES_SA[chart.lagnaRashi]} ${formatDMS(chart.lagna % 30, 0)}`
      + `  (${NAKSHATRA_NAMES_SA[chart.lagnaNakshatra]} ${chart.lagnaPada})`);
  } else {
    lines.push('Lagna  not determinable — birth time unknown');
  }
  const moon = chart.positions.Moon;
  lines.push(`Moon   ${RASHI_NAMES_SA[moon.rashi]}`
    + `  (${NAKSHATRA_NAMES_SA[moon.nakshatra]} ${moon.pada})`);
  lines.push('');

  for (const graha of GRAHAS) {
    const p = chart.positions[graha];
    lines.push(
      `${GRAHA_NAMES_SA[graha].padEnd(8)} ${formatDMS(p.degreeInRashi, 0).padStart(10)} `
      + `${RASHI_NAMES_SA[p.rashi]!.padEnd(10)} ${usable ? `H${chart.grahaBhava[graha]}` : ''}`
      + `${p.retrograde ? ' R' : ''}`,
    );
  }

  const chain = dashaChainAt(chart, new Date(), { depth: 3 });
  if (chain.length >= 2) {
    lines.push('');
    lines.push(`Dasha  ${chain.map((c) => GRAHA_NAMES_SA[c.lord]).join(' – ')}`);
  }

  const analysis = evaluateRules(chart);
  if (analysis.active.length > 0) {
    lines.push('');
    lines.push(`Yogas  ${analysis.active.slice(0, 5).map((f) => f.name).join(', ')}`);
  }

  lines.push('');
  lines.push(`Ayanamsa ${formatDMS(chart.ayanamsa, 0)} (${chart.settings.ayanamsa}).`);
  lines.push('Positions are astronomy and are exact. Interpretations are what classical');
  lines.push('texts say, offered for reflection rather than as advice.');

  return lines.join('\n');
}

/**
 * Share text, falling back through the platform's options.
 *
 * `navigator.share` is the native sheet on Android and is what users expect;
 * the clipboard is the fallback everywhere else. Both can fail (a share can be
 * cancelled, the clipboard needs permission), so the caller is told which
 * happened rather than being left guessing.
 */
export async function shareText(text: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (error) {
      // AbortError means the user dismissed the sheet, which is not a failure
      // to report or to work around.
      if (error instanceof Error && error.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * Rasterise the chart diagram to a PNG.
 *
 * The on-screen SVG is styled with CSS custom properties, which do not resolve
 * once the markup is detached and loaded as an image — the export would come
 * out blank. So the computed values are read from the live document and baked
 * in as a literal stylesheet inside the exported copy.
 */
export interface PngCaption { title: string; subtitle: string }

export async function chartToPng(
  svg: SVGElement, caption?: PngCaption, scale = 2,
): Promise<Blob | null> {
  const styles = getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  const clone = svg.cloneNode(true) as SVGElement;
  const size = 400;
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));

  const baked = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  baked.textContent = `
    .k-frame { fill: ${value('--surface', '#fff')}; stroke: ${value('--ink', '#241d14')}; stroke-width: 2; }
    .k-cell  { fill: none; stroke: ${value('--line', '#ded2bd')}; stroke-width: 1.5; }
    .k-line  { stroke: ${value('--ink', '#241d14')}; stroke-width: 1.5; fill: none; }
    .k-lagna { stroke: ${value('--accent', '#9a3412')}; stroke-width: 2.5; }
    .k-sign  { font-size: 12px; fill: ${value('--muted', '#8a7a63')}; font-weight: 600;
               font-family: system-ui, sans-serif; }
    .k-sign-left { text-anchor: start; }
    .k-house { font-size: 11px; fill: ${value('--muted', '#8a7a63')}; font-family: system-ui, sans-serif; }
    .k-graha { font-size: 13px; fill: ${value('--ink', '#241d14')}; font-weight: 600;
               font-family: system-ui, sans-serif; }
  `;
  clone.insertBefore(baked, clone.firstChild);

  const source = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

  // A shared image lands in a chat with no surrounding context, so the name and
  // birth details are drawn onto it rather than left to the accompanying text.
  const header = caption ? 74 : 0;
  const pad = caption ? 16 : 0;

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = (size + pad * 2) * scale;
      canvas.height = (size + header + pad * 2) * scale;
      const context = canvas.getContext('2d');
      if (!context) { resolve(null); return; }
      context.scale(scale, scale);

      context.fillStyle = value('--surface', '#ffffff');
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (caption) {
        context.fillStyle = value('--ink', '#241d14');
        context.font = '600 21px system-ui, sans-serif';
        context.textBaseline = 'top';
        context.fillText(caption.title, pad, pad + 2);
        context.fillStyle = value('--muted', '#8a7a63');
        context.font = '14px system-ui, sans-serif';
        context.fillText(caption.subtitle, pad, pad + 32);
      }

      context.drawImage(image, pad, pad + header, size, size);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** Share the diagram as a file where supported, else download it. */
export async function shareChartImage(
  svg: SVGElement, filename: string, title: string, caption?: PngCaption,
): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await chartToPng(svg, caption);
  if (!blob) return 'failed';

  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoke on the next tick so the download has taken the reference.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
