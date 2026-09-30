/**
 * A minimal PDF writer.
 *
 * Written rather than installed. The app carries no runtime dependencies and
 * has a hard bundle budget, and the smallest usable PDF library is several
 * times the size of this entire application — for a document that needs text,
 * lines and rectangles, which is all a kundali report is. Drawing the chart as
 * vectors instead of a bitmap also keeps it sharp at any zoom and the file
 * under a hundred kilobytes.
 *
 * Uses the fourteen standard fonts, so nothing is embedded. That limits text to
 * WinAnsi, which is why the report is in Latin script: the Sanskrit names are
 * transliterated, as they already are throughout the app's English mode.
 */

const A4 = { width: 595.28, height: 841.89 };

export type FontName = 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique';

/**
 * Character widths for Helvetica, in thousandths of the point size.
 *
 * Only what the report actually prints: enough to centre a graha abbreviation
 * in a house and to right-align a column of degrees. Anything unlisted falls
 * back to the average, where being a few points out does not show.
 */
const WIDTHS: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556,
  '7': 556, '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584,
  '?': 556, '@': 1015, '[': 278, ']': 278, '_': 556, '°': 400, '·': 278,
  'i': 222, 'j': 222, 'l': 222, 'f': 278, 't': 278, 'r': 333, 'I': 278,
  'm': 833, 'w': 722, 'M': 833, 'W': 944,
};
const AVERAGE = 556;

/** Width of a string at a given size, in points. */
export function textWidth(text: string, size: number, bold = false): number {
  let total = 0;
  for (const ch of text) {
    const w = WIDTHS[ch] ?? (ch >= 'a' && ch <= 'z' ? 528 : AVERAGE);
    total += w;
  }
  // Helvetica-Bold runs a little wider; a flat factor is close enough for
  // layout and costs nothing next to a second width table.
  return (total / 1000) * size * (bold ? 1.05 : 1);
}

/**
 * WinAnsi's upper region is not Latin-1.
 *
 * It keeps the typographic punctuation in the 0x80-0x9f block that Latin-1
 * leaves as control codes, so an en dash, an em dash and curly quotes are all
 * printable - they just live at bytes their Unicode values do not suggest.
 * Mapping them was not optional: without it the dasha chain printed as
 * "Guru ? Shukra ? Shani", and the report title lost its dash too.
 */
const WIN_ANSI: Record<string, string> = {
  '€': '\x80', '‚': '\x82', 'ƒ': '\x83', '„': '\x84',
  '…': '\x85', '†': '\x86', '‡': '\x87', 'ˆ': '\x88',
  '‰': '\x89', 'Š': '\x8a', '‹': '\x8b', 'Œ': '\x8c',
  '‘': '\x91', '’': '\x92', '“': '\x93', '”': '\x94',
  '•': '\x95', '–': '\x96', '—': '\x97', '˜': '\x98',
  '™': '\x99', 'š': '\x9a', '›': '\x9b', 'œ': '\x9c',
  'ž': '\x9e', 'Ÿ': '\x9f',
};

/** PDF strings are parenthesised, so the delimiters have to be escaped. */
function escape(text: string): string {
  return text
    .replace(/[ŒœŠšŸžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]/g,
      (c) => WIN_ANSI[c]!)
    .replace(/[\\()]/g, (c) => `\\${c}`)
    // Everything still outside the encoding - Devanagari, a stray emoji - would
    // otherwise emit a byte that prints as some unrelated Latin glyph, which
    // reads as a data bug rather than as a missing character.
    .replace(/[^\x20-\x7e\x80-\x9f -ÿ]/g, '?');
}

/**
 * A document-information string, which is not encoded like page text.
 *
 * Page text is read through the font, so it is WinAnsi. The Info dictionary is
 * read by the viewer itself, which assumes PDFDocEncoding — a different layout
 * of the same upper bytes. An em dash written for the page came back as "S
 * with caron" in the window title. UTF-16BE with a byte-order mark is the
 * unambiguous form for these, and it takes Devanagari as a bonus, so a Hindi
 * name survives in the title even though the page body cannot show it.
 */
function textString(value: string): string {
  let hex = 'FEFF';
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code > 0xffff) {
      const v = code - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0');
      hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
    } else {
      hex += code.toString(16).padStart(4, '0');
    }
  }
  return `<${hex.toUpperCase()}>`;
}

/** One page being drawn. Operators accumulate into a content stream. */
export class Page {
  readonly ops: string[] = [];
  readonly width = A4.width;
  readonly height = A4.height;

  /** PDF's origin is bottom-left; every caller here thinks top-down. */
  private y(top: number): number { return this.height - top; }

  text(value: string, x: number, top: number, options: {
    size?: number; font?: FontName; align?: 'left' | 'center' | 'right'; grey?: number;
  } = {}): void {
    const size = options.size ?? 10;
    const font = options.font ?? 'Helvetica';
    const key = font === 'Helvetica-Bold' ? 'F2' : font === 'Helvetica-Oblique' ? 'F3' : 'F1';
    const width = textWidth(value, size, font === 'Helvetica-Bold');
    const dx = options.align === 'center' ? -width / 2 : options.align === 'right' ? -width : 0;
    const grey = options.grey ?? 0;
    this.ops.push(
      `q ${grey} g BT /${key} ${size} Tf 1 0 0 1 ${(x + dx).toFixed(2)} ${this.y(top).toFixed(2)} Tm `
      + `(${escape(value)}) Tj ET Q`,
    );
  }

  line(x1: number, top1: number, x2: number, top2: number, options: {
    width?: number; grey?: number;
  } = {}): void {
    this.ops.push(
      `q ${options.grey ?? 0} G ${(options.width ?? 0.5).toFixed(2)} w `
      + `${x1.toFixed(2)} ${this.y(top1).toFixed(2)} m ${x2.toFixed(2)} ${this.y(top2).toFixed(2)} l S Q`,
    );
  }

  rect(x: number, top: number, w: number, h: number, options: {
    fill?: [number, number, number]; stroke?: number; width?: number;
  } = {}): void {
    const parts = ['q'];
    if (options.fill) parts.push(`${options.fill.map((c) => c.toFixed(3)).join(' ')} rg`);
    if (options.stroke !== undefined) parts.push(`${options.stroke} G ${(options.width ?? 0.5).toFixed(2)} w`);
    parts.push(`${x.toFixed(2)} ${(this.y(top) - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    parts.push(options.fill && options.stroke !== undefined ? 'B' : options.fill ? 'f' : 'S');
    parts.push('Q');
    this.ops.push(parts.join(' '));
  }

  stream(): string { return this.ops.join('\n'); }
}

/**
 * Assemble pages into a PDF file.
 *
 * Plain uncompressed streams: a kundali report is a few thousand operators, so
 * the saving from deflating them would not pay for shipping a compressor.
 */
export function buildPdf(pages: Page[], meta: { title: string; author?: string }): Uint8Array {
  const objects: string[] = [];
  /** Objects are numbered from 1; the offset table is built after the body. */
  const add = (body: string): number => { objects.push(body); return objects.length; };

  const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const fontItalic = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');

  // The pages object needs its children's numbers, and they need its; reserve
  // the slot first and fill it in once the page objects exist.
  const pagesRef = add('');
  const pageRefs: number[] = [];

  for (const page of pages) {
    const stream = page.stream();
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageRefs.push(add(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] `
      + `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R /F3 ${fontItalic} 0 R >> >> `
      + `/Contents ${content} 0 R >>`,
    ));
  }

  objects[pagesRef - 1] = `<< /Type /Pages /Count ${pageRefs.length} `
    + `/Kids [${pageRefs.map((n) => `${n} 0 R`).join(' ')}] >>`;

  const info = add(`<< /Title ${textString(meta.title)} `
    + `/Author ${textString(meta.author ?? 'Aistro')} /Producer (Aistro) >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\n`
    + `startxref\n${xref}\n%%EOF\n`;

  // Latin-1, not UTF-8: escape() has already reduced the text to WinAnsi, and a
  // multi-byte encoding here would desynchronise every /Length and xref offset.
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

export { A4 };
