/**
 * Kundali — an offline-first Vedic astrology app.
 *
 * Everything runs on the device. There is no server, no account and no network
 * call: the engine computes the chart locally in a few milliseconds, which keeps
 * the app usable on a train with no signal and keeps birth data off anyone
 * else's machine.
 *
 * Rendered with plain DOM rather than a framework. The whole audience question
 * here is whether this works on a four-year-old Android phone on a 2G
 * connection, and a framework would cost more bytes than this file.
 */
import './styles.css';
import {
  castChart, evaluateRules, mahadashas, dashaBalance, dashaChainAt,
  computePanchang, gunaMilan, buildAllVargas, allConditions, formatDMS,
  RASHI_NAMES_SA, RASHI_NAMES_HI, GRAHA_NAMES_SA, GRAHA_NAMES_HI,
  NAKSHATRA_NAMES_SA, NAKSHATRA_NAMES_HI, GRAHA_ABBR, GRAHA_ABBR_HI,
  GRAHAS, VARGAS, ordinal,
  transitReport, sadeSatiStatus, dhaiyaPeriods,
  rectify, EVENT_SIGNATURES,
  findMuhurtas, ACTIVITY_RULES,
} from '@jyotish/engine';
import type {
  BirthData, Kundali, Graha, RashiIndex, TimeAccuracy, ChartStyle,
} from '@jyotish/engine';
import type { VargaCode, EventType, EventPrecision, LifeEvent } from '@jyotish/engine';
import type { RectificationResult, MuhurtaActivity, MuhurtaResult } from '@jyotish/engine';
import { renderChart, renderVarga, SIGN_ABBR_SA } from './ui/chart.js';
import { searchPlaces, formatPlace, type Place } from './data/places.js';
import { loadProfiles, saveProfile, deleteProfile, type Profile } from './storage.js';
import { t, lang, setLang } from './i18n.js';

type Tab = 'chart' | 'dasha' | 'yogas' | 'transits' | 'panchang'
  | 'muhurta' | 'match' | 'rectify';

interface DraftEvent { type: EventType; date: string; precision: EventPrecision }

interface State {
  tab: Tab;
  chart: Kundali | null;
  warnings: { code: string; message: string }[];
  form: {
    name: string;
    date: string;
    time: string;
    place: Place | null;
    accuracy: TimeAccuracy;
    manual: boolean;
    latitude: string;
    longitude: string;
    timezone: string;
    query: string;
  };
  chartStyle: ChartStyle;
  varga: VargaCode;
  profiles: Profile[];
  matchA: string;
  matchB: string;
  rectifyEvents: DraftEvent[];
  rectifyWindow: number;
  rectifyResult: RectificationResult | null;
  rectifyError: string | null;
  muhurtaActivity: MuhurtaActivity;
  muhurtaFrom: string;
  muhurtaTo: string;
  muhurtaResult: MuhurtaResult | null;
  muhurtaError: string | null;
  muhurtaOpenFactors: number | null;
}

const state: State = {
  tab: 'chart',
  chart: null,
  warnings: [],
  form: {
    name: '',
    date: '1990-08-15',
    time: '10:30',
    place: null,
    accuracy: 'ToMinute',
    manual: false,
    latitude: '',
    longitude: '',
    timezone: 'Asia/Kolkata',
    query: '',
  },
  chartStyle: 'NorthIndian',
  varga: 'D9',
  profiles: loadProfiles(),
  matchA: '',
  matchB: '',
  rectifyEvents: [],
  rectifyWindow: 30,
  rectifyResult: null,
  rectifyError: null,
  muhurtaActivity: 'Marriage',
  muhurtaFrom: isoDay(new Date()),
  muhurtaTo: isoDay(new Date(Date.now() + 60 * 86400000)),
  muhurtaResult: null,
  muhurtaError: null,
  muhurtaOpenFactors: null,
};

/** `YYYY-MM-DD` in the viewer's own zone, which is what a date input expects. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- localised name helpers -------------------------------------------------

const rashi = (i: RashiIndex) => (lang() === 'hi' ? RASHI_NAMES_HI : RASHI_NAMES_SA)[i]!;
/** Short sign labels for the South Indian grid. Devanagari is already compact,
 *  so Hindi uses the full name where Latin needs an abbreviation. */
const signLabels = () => (lang() === 'hi' ? RASHI_NAMES_HI : SIGN_ABBR_SA);
const grahaLabels = () => (lang() === 'hi' ? GRAHA_ABBR_HI : GRAHA_ABBR);
const grahaName = (g: Graha) => (lang() === 'hi' ? GRAHA_NAMES_HI : GRAHA_NAMES_SA)[g];
const nakshatra = (i: number) => (lang() === 'hi' ? NAKSHATRA_NAMES_HI : NAKSHATRA_NAMES_SA)[i]!;

const esc = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]!));

function localTime(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat(lang() === 'hi' ? 'hi-IN' : 'en-IN', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(d);
}

function localDate(d: Date, timezone = 'Asia/Kolkata'): string {
  return new Intl.DateTimeFormat(lang() === 'hi' ? 'hi-IN' : 'en-IN', {
    timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric',
  }).format(d);
}

// --- chart construction -----------------------------------------------------

function buildBirthData(): BirthData | null {
  const f = state.form;
  const [year, month, day] = f.date.split('-').map(Number);
  const [hour, minute] = f.time.split(':').map(Number);
  if (!year || !month || !day) return null;

  const location = f.manual
    ? {
      latitude: Number(f.latitude),
      longitude: Number(f.longitude),
      timezone: f.timezone,
      label: `${f.latitude}, ${f.longitude}`,
    }
    : f.place && {
      latitude: f.place.latitude,
      longitude: f.place.longitude,
      timezone: f.place.timezone,
      label: formatPlace(f.place),
    };

  if (!location || Number.isNaN(location.latitude) || Number.isNaN(location.longitude)) return null;

  return {
    year, month, day,
    hour: hour ?? 0, minute: minute ?? 0, second: 0,
    location,
    timeAccuracy: f.accuracy,
  };
}

function recompute(): void {
  const birth = buildBirthData();
  if (!birth) { state.chart = null; return; }
  const result = castChart(birth, { chartStyle: state.chartStyle });
  state.chart = result.chart;
  state.warnings = result.warnings;
}

// --- screens ----------------------------------------------------------------

function birthForm(): string {
  const f = state.form;
  const results = f.query && !f.place ? searchPlaces(f.query) : [];

  const accuracyOptions: [TimeAccuracy, string][] = [
    ['Exact', t('accuracyExact')],
    ['ToMinute', t('accuracyToMinute')],
    ['ToFiveMin', t('accuracyToFiveMin')],
    ['ToFifteenMin', t('accuracyToFifteenMin')],
    ['ToHour', t('accuracyToHour')],
    ['ToPartOfDay', t('accuracyToPartOfDay')],
    ['Unknown', t('accuracyUnknown')],
  ];

  return `
    <div class="card">
      <h3>${t('birthDetails')}</h3>
      <label for="f-name">${t('name')}</label>
      <input id="f-name" data-field="name" value="${esc(f.name)}" placeholder="${t('namePlaceholder')}">

      <div class="row">
        <div>
          <label for="f-date">${t('dateOfBirth')}</label>
          <input id="f-date" type="date" data-field="date" value="${esc(f.date)}">
        </div>
        <div>
          <label for="f-time">${t('timeOfBirth')}</label>
          <input id="f-time" type="time" data-field="time" value="${esc(f.time)}">
        </div>
      </div>

      <label for="f-accuracy">${t('timeAccuracy')}</label>
      <select id="f-accuracy" data-field="accuracy">
        ${accuracyOptions.map(([value, text]) =>
          `<option value="${value}"${f.accuracy === value ? ' selected' : ''}>${text}</option>`).join('')}
      </select>

      <label for="f-place">${t('placeOfBirth')}</label>
      ${f.manual ? `
        <div class="row">
          <div><label for="f-lat">${t('latitude')}</label>
            <input id="f-lat" data-field="latitude" inputmode="decimal" value="${esc(f.latitude)}" placeholder="28.6139"></div>
          <div><label for="f-lon">${t('longitude')}</label>
            <input id="f-lon" data-field="longitude" inputmode="decimal" value="${esc(f.longitude)}" placeholder="77.2090"></div>
        </div>
        <label for="f-tz">${t('timezone')}</label>
        <input id="f-tz" data-field="timezone" value="${esc(f.timezone)}" placeholder="Asia/Kolkata">
        <div class="chips"><button class="ghost" data-action="manual-off">&larr; ${t('searchPlace')}</button></div>
      ` : `
        <input id="f-place" data-field="query" value="${esc(f.place ? formatPlace(f.place) : f.query)}"
               placeholder="${t('searchPlace')}" autocomplete="off">
        ${results.length ? `<div class="results">${results.map((p, i) =>
          `<button data-action="pick-place" data-index="${i}">${esc(p.name)}
            <span class="r-region">${esc(p.country === 'India' ? p.region : p.country)}</span></button>`).join('')}</div>` : ''}
        <div class="chips"><button class="ghost" data-action="manual-on">${t('manualCoords')}</button></div>
      `}

      <button class="primary" data-action="calculate">${t('calculate')}</button>
    </div>
  `;
}

function warningsBlock(): string {
  if (state.warnings.length === 0) return '';
  return `<div class="notice">
    <h3>${t('warningsTitle')}</h3>
    <ul>${state.warnings.map((w) => `<li>${esc(w.message)}</li>`).join('')}</ul>
  </div>`;
}

function chartTab(): string {
  if (!state.chart) return birthForm();
  const chart = state.chart;
  const conditions = allConditions(chart);
  const vargas = buildAllVargas(chart);
  const tz = chart.birth.location.timezone;
  const showHouses = chart.birth.timeAccuracy !== 'Unknown';

  const summary = `
    <div class="card">
      <div class="row">
        <div><div class="muted">${t('lagna')}</div>
          <strong>${showHouses ? `${rashi(chart.lagnaRashi)} ${formatDMS(chart.lagna % 30, 0)}` : '—'}</strong></div>
        <div><div class="muted">${t('moonSign')}</div>
          <strong>${rashi(chart.positions.Moon.rashi)}</strong></div>
        <div><div class="muted">${t('nakshatra')}</div>
          <strong>${nakshatra(chart.positions.Moon.nakshatra)} ${chart.positions.Moon.pada}</strong></div>
      </div>
      <p class="muted" style="margin-top:10px">
        ${esc(chart.birth.location.label ?? '')} &middot;
        ${localDate(new Date(chart.utcISO), tz)} ${localTime(new Date(chart.utcISO), tz)} &middot;
        ${t('ayanamsa')} ${formatDMS(chart.ayanamsa, 0)} (${chart.settings.ayanamsa})
      </p>
    </div>`;

  const styleToggle = `
    <div class="chips">
      <button class="ghost" data-action="style" data-value="NorthIndian"
        aria-pressed="${state.chartStyle === 'NorthIndian'}">${t('north')}</button>
      <button class="ghost" data-action="style" data-value="SouthIndian"
        aria-pressed="${state.chartStyle === 'SouthIndian'}">${t('south')}</button>
    </div>`;

  const vargaOptions = (Object.keys(VARGAS) as VargaCode[])
    .map((code) => `<option value="${code}"${state.varga === code ? ' selected' : ''}>
      ${code} &middot; ${VARGAS[code].sanskrit}</option>`).join('');

  const divisional = showHouses ? `
    <h2>${t('divisional')}</h2>
    <div class="card">
      <select data-field="varga" style="margin-bottom:12px">${vargaOptions}</select>
      <p class="muted">${esc(VARGAS[state.varga].signifies)}</p>
      ${renderVarga(
        vargas[state.varga].lagnaRashi,
        vargas[state.varga].grahaRashi,
        state.chartStyle === 'SouthIndian' ? 'SouthIndian' : 'NorthIndian',
        GRAHAS.filter((g) => chart.positions[g].retrograde),
        signLabels(),
        grahaLabels(),
      )}
    </div>` : '';

  const rows = GRAHAS.map((g) => {
    const p = chart.positions[g];
    const c = conditions[g];
    return `<tr>
      <td><strong>${grahaName(g)}</strong>${p.retrograde ? ' <span class="tag">R</span>' : ''}</td>
      <td class="num">${formatDMS(p.degreeInRashi, 0)}</td>
      <td>${rashi(p.rashi)}</td>
      <td>${nakshatra(p.nakshatra)} ${p.pada}</td>
      <td class="num">${showHouses ? chart.grahaBhava[g] : '—'}</td>
      <td>${c.exalted ? '↑' : c.debilitated ? '↓' : c.ownSign ? '•' : ''}${c.combust ? ' ☼' : ''}</td>
    </tr>`;
  }).join('');

  return `
    ${warningsBlock()}
    ${summary}
    ${styleToggle}
    <div class="card">${renderChart(
      chart,
      state.chartStyle === 'SouthIndian' ? 'SouthIndian' : 'NorthIndian',
      signLabels(),
      grahaLabels(),
    )}</div>
    <div class="card scroll-x">
      <table>
        <thead><tr>
          <th>${t('graha')}</th><th>${t('position')}</th><th>${t('rashi')}</th>
          <th>${t('nakshatra')}</th><th>${t('house')}</th><th>${t('dignity')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted" style="margin-top:8px">↑ exalted &middot; ↓ debilitated &middot; • own sign &middot; ☼ combust &middot; R retrograde</p>
    </div>
    ${divisional}
    <div class="chips">
      <button class="ghost" data-action="save">${t('saveProfile')}</button>
      <button class="ghost" data-action="reset">${t('newChart')}</button>
    </div>`;
}

function dashaTab(): string {
  if (!state.chart) return `<p class="muted">${t('needTwoCharts')}</p>`;
  const chart = state.chart;
  const now = new Date();
  const balance = dashaBalance(chart);
  const periods = mahadashas(chart, { spanYears: 120 });
  const chain = dashaChainAt(chart, now);

  const running = chain.length
    ? `<div class="card">
        <h3>${t('running')}</h3>
        <p class="score">${chain.map((p) => grahaName(p.lord)).join(' › ')}</p>
        ${chain.map((p) => `<div class="period">
          <span class="lord">${grahaName(p.lord)}</span>
          <span class="span">${localDate(p.start)} – ${localDate(p.end)}</span>
        </div>`).join('')}
      </div>`
    : '';

  return `
    <div class="card">
      <div class="muted">${t('balanceAtBirth')}</div>
      <strong>${grahaName(balance.lord)} — ${balance.remainingYears.toFixed(2)} yrs</strong>
      <p class="muted">${nakshatra(chart.positions.Moon.nakshatra)} ${t('pada')} ${chart.positions.Moon.pada}</p>
    </div>
    ${running}
    <h2>${t('mahadasha')}</h2>
    <div class="card">
      ${periods.map((p) => {
        const isNow = now >= p.start && now < p.end;
        return `<div class="period${isNow ? ' now' : ''}">
          <span class="lord">${grahaName(p.lord)}</span>
          <span class="span">${localDate(p.start)} – ${localDate(p.end)}</span>
          <span class="muted" style="margin-left:auto">${p.years.toFixed(1)}y</span>
        </div>`;
      }).join('')}
    </div>`;
}

function yogasTab(): string {
  if (!state.chart) return `<p class="muted">${t('noFindings')}</p>`;
  const analysis = evaluateRules(state.chart);
  if (analysis.findings.length === 0) return `<div class="card"><p>${t('noFindings')}</p></div>`;

  const render = (f: (typeof analysis.findings)[number]) => {
    const cls = f.cancelled ? 'cancelled' : f.polarity === 'Favourable' ? 'favourable'
      : f.polarity === 'Difficult' ? 'difficult' : '';
    const tag = f.cancelled
      ? `<span class="tag">${t('cancelledLabel')}</span>`
      : f.polarity === 'Favourable' ? `<span class="tag good">${f.polarity}</span>`
      : f.polarity === 'Difficult' ? `<span class="tag bad">${f.polarity}</span>`
      : `<span class="tag">${f.polarity}</span>`;

    const applied = (f.cancellations ?? []).filter((x) => x.present);

    return `<div class="finding ${cls}">
      <h3>${esc(lang() === 'hi' && f.nameHi ? f.nameHi : f.name)} ${tag}</h3>
      ${f.detail ? `<p>${esc(f.detail)}</p>` : ''}
      <p class="muted"><b>${t('whatTextsSay')}:</b> ${esc(f.classicalEffect)}</p>
      ${applied.length ? `<div class="notice" style="margin:8px 0 0">
        ${applied.map((x) => `<div>${esc(x.description)}</div>`).join('')}</div>` : ''}
      <div class="cite"><b>${t('source')}:</b> ${esc(f.citation.work)}${f.citation.locus ? `, ${esc(f.citation.locus)}` : ''}</div>
      ${f.citation.contested ? `<div class="cite"><b>${t('contested')}:</b> ${esc(f.citation.contested)}</div>` : ''}
    </div>`;
  };

  return `
    <h2>${t('active')} (${analysis.active.length})</h2>
    <div class="card">${analysis.active.map(render).join('') || `<p class="muted">${t('noFindings')}</p>`}</div>
    ${analysis.cancelled.length ? `
      <h2>${t('cancelledLabel')} (${analysis.cancelled.length})</h2>
      <div class="card">${analysis.cancelled.map(render).join('')}</div>` : ''}`;
}

function panchangTab(): string {
  const location = state.chart?.birth.location
    ?? { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', label: 'New Delhi' };
  const p = computePanchang(new Date(), location);
  const tz = location.timezone;
  const time = (d: Date | null) => (d ? localTime(d, tz) : '—');
  const window = (w: { start: Date; end: Date } | null) =>
    (w ? `${time(w.start)} – ${time(w.end)}` : '—');

  return `
    <div class="card">
      <h3>${t('today')} &middot; ${esc(location.label ?? '')}</h3>
      <table>
        <tr><th>${t('vara')}</th><td>${lang() === 'hi' ? p.vara.nameHi : p.vara.name}</td></tr>
        <tr><th>${t('tithi')}</th><td>${p.tithi.paksha} ${p.tithi.name}
          <span class="muted">(${t('endsAt')} ${time(p.tithi.endsAt)})</span></td></tr>
        <tr><th>${t('nakshatra')}</th><td>${nakshatra(p.nakshatra.index)}
          <span class="muted">(${t('endsAt')} ${time(p.nakshatra.endsAt)})</span></td></tr>
        <tr><th>${t('yoga')}</th><td>${p.yoga.name}
          <span class="muted">(${t('endsAt')} ${time(p.yoga.endsAt)})</span></td></tr>
        <tr><th>${t('karana')}</th><td>${p.karana.name}
          <span class="muted">(${t('endsAt')} ${time(p.karana.endsAt)})</span></td></tr>
        <tr><th>${t('sunrise')}</th><td>${time(p.sunrise)}</td></tr>
        <tr><th>${t('sunset')}</th><td>${time(p.sunset)}</td></tr>
      </table>
    </div>
    <div class="card">
      <table>
        <tr><th>${t('rahuKaal')}</th><td class="num">${window(p.rahuKaal)}</td></tr>
        <tr><th>${t('gulika')}</th><td class="num">${window(p.gulikaKaal)}</td></tr>
        <tr><th>${t('yamaganda')}</th><td class="num">${window(p.yamaganda)}</td></tr>
        <tr><th>${t('abhijit')}</th><td class="num">${window(p.abhijitMuhurta)}</td></tr>
      </table>
    </div>
    ${p.choghadiya.length ? `<h2>${t('choghadiya')}</h2><div class="card"><table>
      ${p.choghadiya.map((c) => `<tr><th>${c.name}</th><td class="num">${window(c)}</td></tr>`).join('')}
    </table></div>` : ''}`;
}

function matchTab(): string {
  const profiles = state.profiles;
  if (profiles.length < 2) return `<div class="card"><p>${t('needTwoCharts')}</p></div>`;

  const options = (selected: string) => profiles
    .map((p) => `<option value="${p.id}"${p.id === selected ? ' selected' : ''}>${esc(p.name)}</option>`)
    .join('');

  const a = profiles.find((p) => p.id === state.matchA) ?? profiles[0]!;
  const b = profiles.find((p) => p.id === state.matchB) ?? profiles[1]!;

  const chartA = castChart(a.birth).chart;
  const chartB = castChart(b.birth).chart;
  const result = gunaMilan(chartA, chartB);

  return `
    <div class="card">
      <div class="row">
        <div><label for="m-a">${t('groom')}</label>
          <select id="m-a" data-field="matchA">${options(a.id)}</select></div>
        <div><label for="m-b">${t('bride')}</label>
          <select id="m-b" data-field="matchB">${options(b.id)}</select></div>
      </div>
    </div>
    <div class="card">
      <div class="score">${result.total}<small> / 36</small></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(result.total / 36) * 100}%"></div></div>
      <p style="margin-top:12px">${esc(result.verdict)}</p>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>${t('koota')}</th><th>${t('points')}</th></tr></thead>
        <tbody>
          ${result.kootas.map((k) => `<tr>
            <td><strong>${lang() === 'hi' ? k.nameHi : k.name}</strong>
              ${k.faultCancelled ? `<span class="tag">${t('cancelledLabel')}</span>` : ''}
              <div class="muted">${esc(k.reason)}</div></td>
            <td class="num"><strong>${k.points}</strong> / ${k.maximum}</td>
          </tr>`).join('')}
          <tr><td><strong>${t('totalScore')}</strong></td>
              <td class="num"><strong>${result.total} / 36</strong></td></tr>
        </tbody>
      </table>
    </div>`;
}


function transitsTab(): string {
  if (!state.chart) return birthForm();
  const chart = state.chart;
  const now = new Date();
  const transits = transitReport(chart, now);
  const status = sadeSatiStatus(chart, now);
  const dhaiya = dhaiyaPeriods(
    chart, new Date(chart.utcISO),
    new Date(new Date(chart.utcISO).getTime() + 100 * 365.25 * 86400000),
  );

  const phaseLabel: Record<string, string> = {
    Rising: t('phaseRising'), Peak: t('phasePeak'), Setting: t('phaseSetting'),
  };

  // Compact symbols rather than words: "NOT FAVOURABLE" does not fit a column
  // on a 360px screen, and wrapping it pushes the table past the viewport.
  const rows = transits.map((tr) => {
    const mark = tr.obstructedBy ? '\u2298' : tr.favourable ? '\u2713' : '';
    const title = tr.obstructedBy
      ? `${t('blocked')} \u2014 ${grahaName(tr.obstructedBy)}`
      : tr.favourable ? t('favourable') : t('neutralTransit');
    return `<tr>
      <td><strong>${grahaName(tr.graha)}</strong>${tr.retrograde ? ' <span class="tag">R</span>' : ''}</td>
      <td>${rashi(tr.rashi)}</td>
      <td class="num">${ordinal(tr.houseFromMoon)}</td>
      <td class="num">${tr.bindus === null ? '\u2014' : `${tr.bindus}/8`}</td>
      <td class="verdict" title="${esc(title)}" aria-label="${esc(title)}">${mark}</td>
    </tr>`;
  }).join('');

  // Sade Sati is where this app most has to resist alarming people, so the
  // universality note from the engine is shown in full rather than trimmed.
  const sadeSatiCard = `
    <h2>${t('sadeSati')}</h2>
    <div class="card">
      <h3>${status.active
        ? `${t('sadeSatiRunning')} \u00b7 ${phaseLabel[status.phase ?? 'Peak']}`
        : t('sadeSatiNotRunning')}</h3>
      ${status.period ? `
        <div class="bar-track" style="margin:10px 0 14px">
          <div class="bar-fill" style="width:${Math.round(
            ((now.getTime() - status.period.start.getTime())
              / (status.period.end.getTime() - status.period.start.getTime())) * 100)}%"></div>
        </div>
        ${status.period.phases.map((ph) => {
          const running = now >= ph.start && now < ph.end;
          return `<div class="period${running ? ' now' : ''}">
            <span class="lord">${phaseLabel[ph.phase]}</span>
            <span class="span">${rashi(ph.sign)} \u00b7 ${localDate(ph.start)} \u2013 ${localDate(ph.end)}</span>
          </div>`;
        }).join('')}` : ''}
      <p class="muted" style="margin-top:12px">${esc(status.summary)}</p>
    </div>

    <h2>${t('allPeriods')}</h2>
    <div class="card">
      ${status.all.map((p) => {
        const running = now >= p.start && now < p.end;
        // The search runs a hundred years from birth, so the final period is
        // often cut off by that horizon. Showing its clipped length as though
        // it were a real 1.6-year Sade Sati would be simply wrong.
        return `<div class="period${running ? ' now' : ''}">
          <span class="span">${localDate(p.start)} \u2013 ${
            p.truncated ? '\u2026' : localDate(p.end)}</span>
          <span class="muted" style="margin-left:auto">${
            p.truncated ? t('continuesBeyond') : `${p.years.toFixed(1)}y`}</span>
        </div>`;
      }).join('')}
    </div>

    ${dhaiya.length ? `<h2>${t('dhaiya')}</h2><div class="card">
      ${dhaiya.map((d) => `<div class="period">
        <span class="lord">${d.kind === 'KantakaShani' ? t('kantakaShani') : t('ashtamaShani')}</span>
        <span class="span">${rashi(d.sign)} \u00b7 ${localDate(d.start)} \u2013 ${
          d.truncated ? '\u2026' : localDate(d.end)}</span>
      </div>`).join('')}
    </div>` : ''}`;

  return `
    <h2>${t('transitsToday')}</h2>
    <div class="card scroll-x">
      <table>
        <thead><tr>
          <th>${t('graha')}</th><th>${t('rashi')}</th>
          <th>${t('fromMoon')}</th><th>${t('bindusLabel')}</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted" style="margin-top:8px">
        \u2713 ${t('favourable')} \u00b7 \u2298 ${t('blocked')} \u00b7 ${t('bindusLabel')} ${t('outOfEight')}
      </p>
    </div>
    ${sadeSatiCard}`;
}

function rectifyTab(): string {
  if (!state.chart) return birthForm();

  const types = Object.keys(EVENT_SIGNATURES) as EventType[];
  const precisions: [EventPrecision, string][] = [
    ['Day', t('precisionDay')], ['Month', t('precisionMonth')], ['Year', t('precisionYear')],
  ];

  // Two lines per event: four controls side by side truncate the date to "1:"
  // and the precision to "Tc" at phone width.
  const eventRows = state.rectifyEvents.map((ev, i) => `
    <div class="event-row">
      <select data-rect="type" data-index="${i}" aria-label="${t('eventType')}">
        ${types.map((ty) =>
          `<option value="${ty}"${ty === ev.type ? ' selected' : ''}>${esc(EVENT_SIGNATURES[ty].label)}</option>`).join('')}
      </select>
      <div class="row">
        <input type="date" data-rect="date" data-index="${i}"
               value="${esc(ev.date)}" aria-label="${t('eventDate')}">
        <select data-rect="precision" data-index="${i}" aria-label="${t('eventPrecision')}">
          ${precisions.map(([v, label]) =>
            `<option value="${v}"${v === ev.precision ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
        <button class="ghost remove" data-action="rect-remove" data-index="${i}"
                aria-label="${t('removeEvent')}">\u00d7</button>
      </div>
    </div>`).join('');

  const result = state.rectifyResult;
  const resultCard = result ? `
    <div class="card">
      <div class="muted">${t('bestFit')}</div>
      <div class="score">${String(result.best.hour).padStart(2, '0')}:${String(result.best.minute).padStart(2, '0')}</div>
      <p class="muted">${rashi(result.best.lagnaRashi)} ${result.best.lagnaDegree.toFixed(1)}\u00b0</p>
      <table style="margin-top:10px">
        <tr><th>${t('confidence')}</th><td>${result.confidence}</td></tr>
        <tr><th>${t('ascendantConfidence')}</th><td>${result.lagnaConfidence} \u00b7 ${rashi(result.lagnaConsensus[0]!.rashi)}</td></tr>
        <tr><th>${t('stability')}</th><td class="num">\u00b1${Math.round(result.stabilityMinutes)} min</td></tr>
      </table>
      <p style="margin-top:12px">${esc(result.verdict)}</p>
      <button class="ghost" data-action="rect-apply" style="margin-top:10px">${t('applyTime')}</button>
    </div>

    <h2>${t('shortlist')}</h2>
    <div class="card">
      ${result.candidates.slice(0, 8).map((c) => `<div class="period${
        c.hour === result.best.hour && c.minute === result.best.minute ? ' now' : ''}">
        <span class="lord">${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}</span>
        <span class="span">${rashi(c.lagnaRashi)} ${c.lagnaDegree.toFixed(1)}\u00b0</span>
        <span class="muted" style="margin-left:auto">${c.score.toFixed(1)}</span>
      </div>`).join('')}
    </div>` : '';

  return `
    <h2>${t('rectifyTitle')}</h2>
    <div class="card">
      <p class="muted">${t('rectifyIntro')}</p>
      ${eventRows}
      <div class="chips">
        <button class="ghost" data-action="rect-add">+ ${t('addEvent')}</button>
      </div>

      <label for="rect-window">${t('searchWindow')} \u00b1${state.rectifyWindow} ${t('minutesEitherWay')}</label>
      <input id="rect-window" type="range" min="10" max="120" step="5"
             value="${state.rectifyWindow}" data-rect="window">

      ${state.rectifyError ? `<div class="notice">${esc(state.rectifyError)}</div>` : ''}
      <button class="primary" data-action="rect-run">${t('runRectify')}</button>
    </div>
    ${resultCard}`;
}


function muhurtaTab(): string {
  const activities = Object.keys(ACTIVITY_RULES) as MuhurtaActivity[];
  const result = state.muhurtaResult;
  const rule = ACTIVITY_RULES[state.muhurtaActivity];

  const gradeLabel: Record<string, string> = {
    Excellent: t('gradeExcellent'), Good: t('gradeGood'), Acceptable: t('gradeAcceptable'),
  };

  const windows = result ? (result.windows.length === 0
    ? `<div class="card"><p>${t('noWindows')}</p><p class="muted">${esc(result.summary)}</p></div>`
    : `${result.windows.map((w, i) => {
      const open = state.muhurtaOpenFactors === i;
      return `<div class="card">
        <h3>${localDate(w.start)} \u00b7 ${localTime(w.start, tz())} \u2013 ${localTime(w.end, tz())}
          <span class="tag ${w.grade === 'Excellent' ? 'good' : ''}">${gradeLabel[w.grade]}</span></h3>
        <p class="muted">${esc(w.name)} \u00b7 ${esc(w.day.weekday)} \u00b7
          ${esc(w.day.nakshatra)} \u00b7 ${esc(w.day.yoga)} yoga \u00b7 ${t('dayScore')} ${w.day.score}/100</p>
        <div class="bar-track"><div class="bar-fill" style="width:${w.score}%"></div></div>
        <button class="ghost" data-action="mu-factors" data-index="${i}"
                style="margin-top:10px">${t('showFactors')}</button>
        ${open ? `<table style="margin-top:10px">
          ${w.day.factors.map((f) => `<tr>
            <td class="verdict">${f.ok ? '\u2713' : '\u2298'}</td>
            <th>${esc(f.name)}</th>
            <td>${esc(f.detail)}</td>
          </tr>`).join('')}
        </table>` : ''}
      </div>`;
    }).join('')}
    <p class="muted">${esc(result.summary)}</p>`) : '';

  return `
    <h2>${t('muhurtaTitle')}</h2>
    <div class="card">
      <p class="muted">${t('muhurtaIntro')}</p>

      <label for="mu-activity">${t('activity')}</label>
      <select id="mu-activity" data-mu="activity">
        ${activities.map((a) => `<option value="${a}"${a === state.muhurtaActivity ? ' selected' : ''}>${
          esc(lang() === 'hi' ? ACTIVITY_RULES[a].labelHi : ACTIVITY_RULES[a].label)}</option>`).join('')}
      </select>

      <div class="row">
        <div><label for="mu-from">${t('fromDate')}</label>
          <input id="mu-from" type="date" data-mu="from" value="${esc(state.muhurtaFrom)}"></div>
        <div><label for="mu-to">${t('toDate')}</label>
          <input id="mu-to" type="date" data-mu="to" value="${esc(state.muhurtaTo)}"></div>
      </div>

      ${rule.caution ? `<div class="notice"><h3>\u26a0</h3><p>${esc(rule.caution)}</p></div>` : ''}
      ${state.muhurtaError ? `<div class="notice">${esc(state.muhurtaError)}</div>` : ''}
      <button class="primary" data-action="mu-run">${t('findTimes')}</button>
    </div>
    ${windows}`;
}

/** Timezone to display muhurta windows in: the chart's, else the device's. */
function tz(): string {
  return state.chart?.birth.location.timezone
    ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// --- shell ------------------------------------------------------------------

const TABS: [Tab, string][] = [
  ['chart', 'tabChart'], ['dasha', 'tabDasha'], ['yogas', 'tabYogas'],
  ['transits', 'tabTransits'], ['panchang', 'tabPanchang'],
  ['muhurta', 'tabMuhurta'], ['match', 'tabMatch'], ['rectify', 'tabRectify'],
];

function render(): void {
  const body = state.tab === 'chart' ? chartTab()
    : state.tab === 'dasha' ? dashaTab()
    : state.tab === 'yogas' ? yogasTab()
    : state.tab === 'transits' ? transitsTab()
    : state.tab === 'panchang' ? panchangTab()
    : state.tab === 'muhurta' ? muhurtaTab()
    : state.tab === 'rectify' ? rectifyTab()
    : matchTab();

  const saved = state.profiles.length ? `
    <div class="chips">
      ${state.profiles.slice(0, 6).map((p) =>
        `<button class="ghost" data-action="load-profile" data-id="${p.id}">${esc(p.name)}</button>`).join('')}
    </div>` : '';

  document.getElementById('app')!.innerHTML = `
    <header>
      <div class="bar">
        <h1>${t('appName')}</h1>
        <span class="sub">${t('tagline')}</span>
        <button class="ghost" data-action="lang">${lang() === 'hi' ? 'EN' : 'हिं'}</button>
      </div>
      <nav role="tablist">
        ${TABS.map(([id, key]) =>
          `<button role="tab" data-action="tab" data-tab="${id}"
            aria-selected="${state.tab === id}">${t(key)}</button>`).join('')}
      </nav>
    </header>
    <main class="wrap">
      ${state.tab === 'chart' && state.chart ? saved : ''}
      ${body}
      <footer>
        <p><strong>${t('disclaimerTitle')}</strong></p>
        <p>${t('disclaimer')}</p>
      </footer>
    </main>`;
}

// --- events -----------------------------------------------------------------

document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.dataset.action!;

  switch (action) {
    case 'tab':
      state.tab = target.dataset.tab as Tab;
      break;
    case 'lang':
      setLang(lang() === 'hi' ? 'en' : 'hi');
      break;
    case 'style':
      state.chartStyle = target.dataset.value as ChartStyle;
      break;
    case 'manual-on':
      state.form.manual = true;
      break;
    case 'manual-off':
      state.form.manual = false;
      break;
    case 'pick-place': {
      const results = searchPlaces(state.form.query);
      const picked = results[Number(target.dataset.index)];
      if (picked) { state.form.place = picked; state.form.query = formatPlace(picked); }
      break;
    }
    case 'calculate':
      recompute();
      break;
    case 'save': {
      if (!state.chart) break;
      saveProfile(state.form.name || t('appName'), state.chart.birth);
      state.profiles = loadProfiles();
      break;
    }
    case 'reset':
      state.chart = null;
      state.warnings = [];
      state.form.place = null;
      state.form.query = '';
      break;
    case 'load-profile': {
      const profile = state.profiles.find((p) => p.id === target.dataset.id);
      if (!profile) break;
      const b = profile.birth;
      state.form.name = profile.name;
      state.form.date = `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
      state.form.time = `${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`;
      state.form.manual = true;
      state.form.latitude = String(b.location.latitude);
      state.form.longitude = String(b.location.longitude);
      state.form.timezone = b.location.timezone;
      state.form.accuracy = b.timeAccuracy ?? 'ToMinute';
      recompute();
      break;
    }
    case 'delete-profile':
      deleteProfile(target.dataset.id!);
      state.profiles = loadProfiles();
      break;

    case 'rect-add': {
      // Seed a new row at a plausible adult date so the picker does not open
      // on today, which is almost never the answer.
      const seedYear = (state.chart?.birth.year ?? 1990) + 25;
      state.rectifyEvents.push({ type: 'Marriage', date: `${seedYear}-01-01`, precision: 'Day' });
      state.rectifyResult = null;
      break;
    }

    case 'rect-remove':
      state.rectifyEvents.splice(Number(target.dataset.index), 1);
      state.rectifyResult = null;
      break;

    case 'rect-run': {
      if (!state.chart) break;
      const events: LifeEvent[] = state.rectifyEvents
        .filter((e) => e.date)
        .map((e) => ({ type: e.type, date: new Date(e.date), precision: e.precision }));

      if (events.length < 3) {
        state.rectifyError = t('needMoreEvents');
        state.rectifyResult = null;
        break;
      }
      try {
        state.rectifyError = null;
        state.rectifyResult = rectify(state.chart.birth, events, {
          windowMinutes: state.rectifyWindow,
        });
      } catch (error) {
        state.rectifyError = error instanceof Error ? error.message : String(error);
        state.rectifyResult = null;
      }
      break;
    }

    case 'mu-factors': {
      const index = Number(target.dataset.index);
      state.muhurtaOpenFactors = state.muhurtaOpenFactors === index ? null : index;
      break;
    }

    case 'mu-run': {
      const from = new Date(state.muhurtaFrom);
      const to = new Date(state.muhurtaTo);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
        state.muhurtaError = `${t('fromDate')} / ${t('toDate')}`;
        state.muhurtaResult = null;
        break;
      }
      // Scanning runs on the device, so the range is capped to keep a budget
      // phone responsive rather than locking the UI for several seconds.
      if (to.getTime() - from.getTime() > 183 * 86400000) {
        state.muhurtaError = t('rangeTooLong');
        state.muhurtaResult = null;
        break;
      }
      const location = state.chart?.birth.location ?? {
        latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', label: 'New Delhi',
      };
      state.muhurtaError = null;
      state.muhurtaOpenFactors = null;
      state.muhurtaResult = findMuhurtas(state.muhurtaActivity, from, to, location, {
        ...(state.chart ? { natal: state.chart } : {}),
        limit: 10,
      });
      break;
    }

    case 'rect-apply': {
      const best = state.rectifyResult?.best;
      if (!best) break;
      state.form.time = `${String(best.hour).padStart(2, '0')}:${String(best.minute).padStart(2, '0')}`;
      // A rectified time is an inference, so the chart is marked as such rather
      // than silently promoted to an exact birth time.
      state.form.accuracy = 'ToFiveMin';
      recompute();
      state.tab = 'chart';
      break;
    }
    default:
      return;
  }
  render();
});

document.addEventListener('input', (event) => {
  const el = event.target as HTMLInputElement | HTMLSelectElement;

  // Rectification rows are index-addressed, since the list is rebuilt on every
  // render and element identity does not survive.
  const mu = el.dataset.mu;
  if (mu) {
    if (mu === 'activity') state.muhurtaActivity = el.value as MuhurtaActivity;
    else if (mu === 'from') state.muhurtaFrom = el.value;
    else if (mu === 'to') state.muhurtaTo = el.value;
    state.muhurtaResult = null;
    if (mu === 'activity') render();   // the caution banner depends on it
    return;
  }

  const rect = el.dataset.rect;
  if (rect) {
    if (rect === 'window') {
      state.rectifyWindow = Number(el.value);
      render();
      return;
    }
    const row = state.rectifyEvents[Number(el.dataset.index)];
    if (!row) return;
    if (rect === 'type') row.type = el.value as EventType;
    else if (rect === 'date') row.date = el.value;
    else if (rect === 'precision') row.precision = el.value as EventPrecision;
    state.rectifyResult = null;
    // Deliberately no re-render: rebuilding the list mid-edit would close the
    // date picker and drop focus.
    return;
  }

  const field = el.dataset.field;
  if (!field) return;

  if (field === 'varga') { state.varga = el.value as VargaCode; render(); return; }
  if (field === 'matchA') { state.matchA = el.value; render(); return; }
  if (field === 'matchB') { state.matchB = el.value; render(); return; }

  if (field === 'query') {
    state.form.query = el.value;
    state.form.place = null;
    // Re-render for the result list, then restore focus and caret, which a full
    // innerHTML swap would otherwise drop mid-typing.
    const caret = el instanceof HTMLInputElement ? el.selectionStart : null;
    render();
    const again = document.getElementById('f-place') as HTMLInputElement | null;
    if (again) { again.focus(); if (caret !== null) again.setSelectionRange(caret, caret); }
    return;
  }

  (state.form as unknown as Record<string, string>)[field] = el.value;
});

setLang(lang());
render();

// Register the offline worker only in a real deployment; a failure here must
// never stop the app rendering.
if ('serviceWorker' in navigator && import.meta.env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline is a bonus, not a requirement */ });
  });
}

export { ordinal };
