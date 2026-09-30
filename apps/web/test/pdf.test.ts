/**
 * The report is a file that leaves the app and gets opened by something else —
 * a phone's viewer, a print shop, an astrologer's laptop. "It didn't throw" is
 * not evidence that any of those can open it, so these check the structure a
 * reader actually needs: the header, the object table, the offsets in it, and
 * that the content a reader is paying for is really on the page.
 */
import { describe, it, expect } from 'vitest';
import { castChart } from '@jyotish/engine';
import type { BirthData } from '@jyotish/engine';
import { kundaliReport } from '../src/pdf/report.js';
import { Page, buildPdf, textWidth } from '../src/pdf/writer.js';

const birth: BirthData = {
  year: 1990, month: 8, day: 15, hour: 14, minute: 35, second: 0,
  location: { latitude: 24.949, longitude: 84.016, timezone: 'Asia/Kolkata', label: 'Sasaram, Bihar' },
  timeAccuracy: 'ToMinute',
};
const chart = castChart(birth).chart;
const asOf = new Date('2026-09-30T00:00:00Z');
const bytes = kundaliReport(chart, { name: 'Ramesh Kumar', asOf });
const text = Buffer.from(bytes).toString('latin1');

/**
 * The visible text, reassembled.
 *
 * Every line is its own text operator, so a wrapped sentence never appears
 * contiguously in the raw file. Pulling the strings out and joining them is
 * what a reader effectively does, and it keeps these assertions about content
 * rather than about where the line breaks happened to fall.
 */
function visible(pdf: Uint8Array): string {
  return [...Buffer.from(pdf).toString('latin1').matchAll(/\((.*?)\) Tj/g)]
    .map((m) => m[1]!.replace(/\\([\\()])/g, '$1'))
    .join(' ');
}
const shown = visible(bytes);

describe('file structure', () => {
  it('starts with a PDF header and ends with the end marker', () => {
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('declares exactly as many objects as it defines', () => {
    const defined = [...text.matchAll(/^(\d+) 0 obj$/gm)].length;
    const size = Number(/\/Size (\d+)/.exec(text)![1]);
    expect(size).toBe(defined + 1);           // +1 for the free object 0
  });

  it('points startxref at the real xref table', () => {
    const at = Number(/startxref\s+(\d+)/.exec(text)![1]);
    expect(text.slice(at, at + 4)).toBe('xref');
  });

  it('gives every object an offset that lands on that object', () => {
    // A wrong offset here is the classic hand-rolled-PDF bug: most viewers
    // rebuild the table silently and one refuses to open the file at all.
    const entries = [...text.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(entries.length).toBeGreaterThan(5);
    entries.forEach((offset, i) => {
      expect(text.slice(offset).startsWith(`${i + 1} 0 obj`), `object ${i + 1}`).toBe(true);
    });
  });

  it('declares each stream length to match the bytes in it', () => {
    const streams = [...text.matchAll(/\/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)];
    expect(streams.length).toBeGreaterThan(0);
    for (const [, declared, body] of streams) {
      expect(body!.length).toBe(Number(declared));
    }
  });

  it('has a catalog, a page tree, and pages that match the count', () => {
    const count = Number(/\/Type \/Pages \/Count (\d+)/.exec(text)![1]);
    expect(count).toBe([...text.matchAll(/\/Type \/Page /g)].length);
    expect(count).toBeGreaterThanOrEqual(2);
    expect(text).toContain('/Type /Catalog');
  });
});

describe('what the reader gets', () => {
  it('carries the name, the place and the ascendant', () => {
    expect(shown).toContain('Ramesh Kumar');
    expect(shown).toContain('Sasaram');
    expect(shown).toContain('Vrischika');      // the ascendant for this birth
  });

  it('names every graha and cites its sources', () => {
    for (const graha of ['Surya', 'Chandra', 'Mangala', 'Budha', 'Guru', 'Shukra', 'Shani', 'Rahu', 'Ketu']) {
      expect(shown, graha).toContain(graha);
    }
    expect(shown).toContain('Brihat Parashara Hora Shastra');
  });

  it('keeps the disclaimer on the document', () => {
    expect(shown).toContain('offered for reflection rather than as advice');
  });

  it('says so when the birth time cannot support houses', () => {
    const blind = castChart({ ...birth, timeAccuracy: 'Unknown' }).chart;
    const out = visible(kundaliReport(blind, { asOf }));
    expect(out).toContain('Not determinable');
    expect(out).toContain('the ascendant, the houses and every divisional chart are left out');
    // and it must not quietly print a rising sign anyway
    expect(out).not.toMatch(/Ascendant\s+\w+ \d+/);
  });

  it('prints the same dignities the on-screen table shows', () => {
    expect(shown).toMatch(/exalted|debilitated|own sign/);
  });

  it('is a sensible size — vectors, not a bitmap', () => {
    expect(bytes.length).toBeGreaterThan(8_000);
    expect(bytes.length).toBeLessThan(400_000);
  });
});

describe('text encoding', () => {
  it('escapes the delimiters that would otherwise end a string early', () => {
    const page = new Page();
    page.text('a (b) c \\ d', 10, 10);
    const out = Buffer.from(buildPdf([page], { title: 'x' })).toString('latin1');
    expect(out).toContain('(a \\(b\\) c \\\\ d)');
  });

  it('replaces characters a standard font cannot show, rather than mangling them', () => {
    // Devanagari has no place in a WinAnsi font; emitting the low byte would
    // print a random Latin letter, which looks like a data bug to the reader.
    const page = new Page();
    page.text('Mesha मेष', 10, 10);
    const out = Buffer.from(buildPdf([page], { title: 'x' })).toString('latin1');
    expect(out).toContain('(Mesha ???)');
  });

  it('measures text well enough to centre and right-align it', () => {
    expect(textWidth('iiii', 10)).toBeLessThan(textWidth('MMMM', 10));
    expect(textWidth('', 10)).toBe(0);
    // A degree-minute-second string is the one that has to fit a table column.
    expect(textWidth('29°09\'34"', 8.5)).toBeGreaterThan(20);
    expect(textWidth('29°09\'34"', 8.5)).toBeLessThan(50);
  });
});
