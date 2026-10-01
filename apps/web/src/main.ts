/**
 * Aistro — an offline-first Vedic astrology app.
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
  predict, houseMeaning,
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
  PredictionSpan, Prediction, PredictionFactor,
} from '@jyotish/engine';
import type { VargaCode, EventType, EventPrecision, LifeEvent } from '@jyotish/engine';
import type {
  RectificationResult, MuhurtaActivity, MuhurtaResult, MuhurtaWindow, GeoLocation,
} from '@jyotish/engine';
import { renderChart, renderVarga, SIGN_ABBR_SA } from './ui/chart.js';
import { buildShareText, shareText, shareChartImage } from './ui/share.js';
import { deliverReport } from './pdf/report.js';
import {
  ensurePlacesLoaded, placesLoaded, searchPlaces, searchState,
  loadState, allStates, formatPlace, type Place,
} from './data/places.js';
import {
  loadProfiles, saveProfile, deleteProfile, loadLast, saveLast, clearLast, type Profile,
} from './storage.js';
import { t, lang, setLang } from './i18n.js';

type Tab = 'chart' | 'dasha' | 'yogas' | 'predict' | 'transits' | 'panchang'
  | 'muhurta' | 'match' | 'rectify';

interface DraftEvent { type: EventType; date: string; precision: EventPrecision }

interface FormState {
    name: string;
    date: string;
    time: string;
    place: Place | null;
    accuracy: TimeAccuracy;
    manual: boolean;
    latitude: string;
    longitude: string;
    timezone: string;
    /**
     * The place name behind the coordinates, when there is one. A restored or
     * saved chart carries the name it was cast with, so reopening the app still
     * says "Sasaram, Bihar" rather than falling back to "24.949, 84.016".
     */
    placeLabel: string;
    query: string;
    /** State whose village shard is in use, when tier 1 did not have the place. */
    stateCode: string | null;
    stateLoading: boolean;
    stateCount: number | null;
}

/**
 * A blank form, and the single definition of what "new chart" means. Resetting
 * by listing fields at the call site is how the old reset came to miss five of
 * them; anything added here is cleared for free.
 */
const BLANK_FORM: FormState = {
  name: '',
  date: '1990-08-15',
  time: '10:30',
  place: null,
  accuracy: 'ToMinute',
  manual: false,
  latitude: '',
  longitude: '',
  timezone: 'Asia/Kolkata',
  placeLabel: '',
  query: '',
  stateCode: null,
  stateLoading: false,
  stateCount: null,
};

interface State {
  tab: Tab;
  chart: Kundali | null;
  warnings: { code: string; message: string }[];
  form: FormState;
  /** Saved chart awaiting a second tap to confirm its deletion. */
  confirmingDelete: string | null;
  predictionSpan: PredictionSpan;
  predictionDate: string;
  predictionResult: Prediction | null;
  /** A five-year scan blocks the thread, so the UI says so before it starts. */
  muhurtaRunning: boolean;
  /** 0-100 while a scan is running, so the wait is legible rather than a freeze. */
  muhurtaProgress: number;
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
  /** Transient confirmation after a share or copy. */
  toast: string | null;
}

const state: State = {
  tab: 'chart',
  chart: null,
  warnings: [],
  form: { ...BLANK_FORM },
  confirmingDelete: null,
  predictionSpan: 'Day',
  predictionDate: isoDay(new Date()),
  predictionResult: null,
  muhurtaRunning: false,
  muhurtaProgress: 0,
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
  toast: null,
};

/**
 * "4 yrs 8 mo" rather than "4.69 yrs". The decimal is the arithmetic; nobody
 * reads their dasha balance that way.
 */
function yearsAndMonths(years: number): string {
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  // 4.99 years is five years, not "4 yrs 12 mo".
  const y = months === 12 ? whole + 1 : whole;
  const m = months === 12 ? 0 : months;
  const parts = [
    y > 0 ? `${y} ${t('yearsShort')}` : '',
    m > 0 ? `${m} ${t('monthsShort')}` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : `< 1 ${t('monthsShort')}`;
}

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
      label: f.placeLabel || `${f.latitude}, ${f.longitude}`,
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
  saveLast(state.form.name, birth, state.tab);
}

// --- screens ----------------------------------------------------------------

function birthForm(): string {
  const f = state.form;
  const results = f.query && !f.place
    ? (f.stateCode
      // A chosen state means tier 1 already missed, so its villages lead.
      ? [...searchState(f.stateCode, f.query, 6), ...searchPlaces(f.query, 3)]
      : searchPlaces(f.query))
    : [];

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
        ${!placesLoaded() ? `<p class="muted">${t('loadingPlaces')}</p>` : ''}
        ${results.length ? `<div class="results">${results.map((p, i) =>
          `<button data-action="pick-place" data-index="${i}">${esc(p.name)}
            <span class="r-region">${esc(p.country === 'India' ? p.region : p.country)}</span></button>`).join('')}</div>` : ''}

        <label for="f-state">${t('notFoundPlace')}</label>
        <select id="f-state" data-field="stateCode">
          <option value="">${t('chooseState')}</option>
          ${allStates().map((st) => `<option value="${st.code}"${
            st.code === f.stateCode ? ' selected' : ''}>${esc(st.name)}</option>`).join('')}
        </select>
        ${f.stateLoading ? `<p class="muted">${t('loadingVillages')}</p>` : ''}
        ${f.stateCount !== null && !f.stateLoading
          ? (f.stateCount > 0
            ? `<p class="muted">${f.stateCount.toLocaleString()} ${t('villagesLoaded')}</p>`
            : `<div class="notice">${t('shardUnavailable')}</div>`)
          : ''}

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
  if (!state.chart) {
    const firstRun = state.profiles.length === 0;
    return `${firstRun ? `<div class="card welcome">
      <h3>${t('welcomeTitle')}</h3>
      <p class="muted">${t('welcomeBody')}</p>
      <p class="muted">${t('welcomeNoTime')}</p>
    </div>` : ''}${birthForm()}`;
  }
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
      <button class="ghost" data-action="share">${t('share')}</button>
      <button class="ghost" data-action="share-image">${t('shareImage')}</button>
      <button class="ghost" data-action="pdf">${t('downloadPdf')}</button>
      <button class="ghost" data-action="save">${t('saveProfile')}</button>
      <button class="ghost" data-action="reset">${t('newChart')}</button>
    </div>
    ${state.toast ? `<p class="muted" role="status">${esc(state.toast)}</p>` : ''}`;
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
      <strong>${grahaName(balance.lord)} — ${yearsAndMonths(balance.remainingYears)}</strong>
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


/**
 * Predictions for a chosen day, month or year.
 *
 * Every line here comes from a factor the engine produced, and each one is
 * labelled with the computation behind it. Nothing is written that a factor
 * does not entail — which is also why a quiet period is allowed to say so
 * instead of reaching for something to fill the space.
 */
function predictTab(): string {
  if (!state.chart) return `<h2>${t('predictTitle')}</h2><div class="card"><p>${t('castFirst')}</p></div>`;

  const spans: [PredictionSpan, string][] = [
    ['Day', t('spanDay')], ['Month', t('spanMonth')], ['Year', t('spanYear')],
  ];
  const result = state.predictionResult;

  const tenorWord = (tenor: number): string =>
    tenor > 0.35 ? t('tenorStrong')
      : tenor > 0.1 ? t('tenorSupportive')
      : tenor < -0.35 ? t('tenorDemanding')
      : tenor < -0.1 ? t('tenorTesting')
      : t('tenorMixed');

  const sourceLabel: Record<PredictionFactor['source'], string> = {
    Dasha: t('srcDasha'), Antardasha: t('srcAntardasha'), Gochar: t('srcGochar'),
    SadeSati: t('srcSadeSati'), Panchang: t('srcPanchang'),
    TaraBala: t('srcTaraBala'), ChandraBala: t('srcChandraBala'),
  };

  const body = !result ? '' : (result.quiet
    ? `<div class="card"><p>${t('predictQuiet')}</p></div>`
    : `<div class="card">
        <h3>${t('overallTenor')}: ${tenorWord(result.tenor)}</h3>
        <p class="muted">${localDate(result.from)}${result.span === 'Day' ? ''
          : ` \u2013 ${localDate(new Date(result.to.getTime() - 86400000))}`}</p>
        ${result.areas.length ? `<p>${t('areasTouched')}</p>
          <ul class="areas">${result.areas.map((a) => `<li>
            <span class="tag ${a.emphasis > 0 ? 'good' : ''}">${ordinal(a.house)}</span>
            ${esc(houseMeaning(a.house, lang()))}</li>`).join('')}</ul>`
          : `<p class="muted">${t('noAreas')}</p>`}
      </div>
      ${result.factors.map((f) => `<div class="card factor ${f.polarity.toLowerCase()}">
        <h3>${esc(f.subject)}</h3>
        <p class="muted">${esc(sourceLabel[f.source])} \u00b7 ${esc(t(`pol${f.polarity}`))}</p>
        <p>${esc(f.text)}</p>
      </div>`).join('')}
      <p class="muted">${t('predictFooter')}</p>`);

  return `
    <h2>${t('predictTitle')}</h2>
    <div class="card">
      <p class="muted">${t('predictIntro')}</p>

      <div class="seg">
        ${spans.map(([id, label]) => `<button data-action="pred-span" data-value="${id}"
          class="${state.predictionSpan === id ? 'active' : ''}">${label}</button>`).join('')}
      </div>

      <label for="pred-date">${state.predictionSpan === 'Day' ? t('whichDay')
        : state.predictionSpan === 'Month' ? t('whichMonth') : t('whichYear')}</label>
      <input id="pred-date" type="date" data-pred="date" value="${esc(state.predictionDate)}">

      <button class="primary" data-action="pred-run">${t('readPeriod')}</button>
    </div>
    ${body}`;
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
      <button class="primary" data-action="mu-run"${state.muhurtaRunning ? ' disabled' : ''}>${
        state.muhurtaRunning
          ? `${t('searching')} ${state.muhurtaProgress}%`
          : t('findTimes')}</button>
    </div>
    ${windows}`;
}

/**
 * The longest span a muhurta search will scan, in days.
 *
 * Five years. The limit is the device, not the astronomy: the cheap first pass
 * runs about 0.5ms a day and the full panchang only on the survivors, which
 * measured 986ms for 1,826 days here. A budget Android is several times slower,
 * which is why the search announces itself before it starts.
 */
const MAX_SCAN_DAYS = 1827;


/**
 * Scan for muhurta windows a slice at a time.
 *
 * Five years in one call blocks the main thread for about thirteen seconds in a
 * browser — not slow, frozen: the page cannot repaint, scroll or answer, and a
 * "Searching" label set just before it never appears. Slicing the range and
 * yielding between slices gives the browser its thread back often enough to
 * paint, which turns a hang into a progress bar.
 *
 * The slices are independent: a window's score depends only on its own day, so
 * scanning in parts and merging gives the same answer as scanning once.
 */
async function scanForWindows(from: Date, to: Date, location: GeoLocation): Promise<void> {
  // Big enough that the per-slice overhead is noise, small enough that the page
  // never stops answering for more than about a second and a half.
  const SLICE_DAYS = 180;
  const total = to.getTime() - from.getTime();
  const collected: MuhurtaWindow[] = [];
  let examined = 0;
  let activity: MuhurtaResult | null = null;

  try {
    for (let cursor = from.getTime(); cursor < to.getTime();) {
      const end = Math.min(cursor + SLICE_DAYS * 86400000, to.getTime());
      const slice = findMuhurtas(
        state.muhurtaActivity, new Date(cursor), new Date(end), location,
        { ...(state.chart ? { natal: state.chart } : {}), limit: 10 },
      );
      activity ??= slice;
      collected.push(...slice.windows);
      examined += slice.daysExamined;
      cursor = end;

      state.muhurtaProgress = Math.round(((cursor - from.getTime()) / total) * 100);
      // Write the percentage straight into the button rather than calling
      // render(): a full innerHTML rebuild of the app per slice doubled the
      // scan's wall time to no purpose, since one label is all that changed.
      const button = document.querySelector('[data-action="mu-run"]');
      if (button) button.textContent = `${t('searching')} ${state.muhurtaProgress}%`;
      // Hand the thread back so the browser can actually paint it.
      await new Promise((resolve) => { setTimeout(resolve, 0); });
    }

    const best = collected.sort((a, b) => b.score - a.score || a.start.getTime() - b.start.getTime())
      .slice(0, 10)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    state.muhurtaResult = activity
      ? { ...activity, windows: best, daysExamined: examined,
          summary: t('scanSummary').replace('{days}', String(examined)).replace('{found}', String(best.length)) }
      : null;
  } catch {
    state.muhurtaError = t('shareFailed');
  } finally {
    state.muhurtaRunning = false;
    state.muhurtaProgress = 0;
    render();
  }
}

/** Timezone to display muhurta windows in: the chart's, else the device's. */
function tz(): string {
  return state.chart?.birth.location.timezone
    ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// --- shell ------------------------------------------------------------------

const TABS: [Tab, string][] = [
  ['chart', 'tabChart'], ['dasha', 'tabDasha'], ['yogas', 'tabYogas'],
  ['predict', 'tabPredict'], ['transits', 'tabTransits'], ['panchang', 'tabPanchang'],
  ['muhurta', 'tabMuhurta'], ['match', 'tabMatch'], ['rectify', 'tabRectify'],
];

function render(): void {
  const body = state.tab === 'chart' ? chartTab()
    : state.tab === 'dasha' ? dashaTab()
    : state.tab === 'yogas' ? yogasTab()
    : state.tab === 'predict' ? predictTab()
    : state.tab === 'transits' ? transitsTab()
    : state.tab === 'panchang' ? panchangTab()
    : state.tab === 'muhurta' ? muhurtaTab()
    : state.tab === 'rectify' ? rectifyTab()
    : matchTab();

  const saved = state.profiles.length ? `
    <div class="chips">
      ${state.profiles.slice(0, 8).map((p) => (state.confirmingDelete === p.id
        ? `<span class="saved-chip confirming">
        <button class="ghost danger" data-action="delete-profile-confirm" data-id="${p.id}">
          ${t('confirmDeleteShort')}</button>
        <button class="ghost del" data-action="delete-profile-cancel"
                aria-label="${t('cancel')}">\u00d7</button>
      </span>`
        : `<span class="saved-chip">
        <button class="ghost" data-action="load-profile" data-id="${p.id}">${esc(p.name)}</button>
        <button class="ghost del" data-action="delete-profile" data-id="${p.id}"
                aria-label="${t('deleteChart')} ${esc(p.name)}">\u00d7</button>
      </span>`)).join('')}
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
        <p>${t('placesAttribution')}</p>
      </footer>
    </main>`;
}

// --- events -----------------------------------------------------------------

document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.dataset.action!;

  if (action !== 'share' && action !== 'share-image' && action !== 'pdf') state.toast = null;

  switch (action) {
    case 'tab':
      state.tab = target.dataset.tab as Tab;
      if (state.chart) saveLast(state.form.name, state.chart.birth, state.tab);
      break;
    case 'lang': {
      setLang(lang() === 'hi' ? 'en' : 'hi');
      // A reading already on screen was composed in the old language; recompute
      // it rather than leaving half the page in each.
      if (state.predictionResult && state.chart) {
        const when = new Date(`${state.predictionDate}T12:00:00`);
        state.predictionResult = predict(state.chart, when, state.predictionSpan, {
          location: state.chart.birth.location,
          lang: lang(),
        });
      }
      break;
    }
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
      const f = state.form;
      const results = f.stateCode
        ? [...searchState(f.stateCode, f.query, 6), ...searchPlaces(f.query, 3)]
        : searchPlaces(f.query);
      const picked = results[Number(target.dataset.index)];
      if (picked) {
        state.form.place = picked;
        state.form.query = formatPlace(picked);
        state.form.placeLabel = formatPlace(picked);
      }
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
      // "New chart" has to mean a new chart. Clearing the result but leaving the
      // name, the date, the time and the coordinates behind meant the next
      // person's chart was cast from the last person's details unless they
      // noticed and overwrote every field.
      state.chart = null;
      state.warnings = [];
      state.form = { ...BLANK_FORM };
      state.rectifyEvents = [];
      state.rectifyResult = null;
      state.rectifyError = null;
      state.muhurtaResult = null;
      state.muhurtaError = null;
      state.muhurtaOpenFactors = null;
      state.predictionResult = null;
      state.confirmingDelete = null;
      state.tab = 'chart';
      clearLast();
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
      state.form.placeLabel = b.location.label ?? '';
      state.form.accuracy = b.timeAccuracy ?? 'ToMinute';
      recompute();
      break;
    }
    case 'delete-profile': {
      // Deleting saved birth data is not undoable, so it asks first — but it
      // asks in the page. window.confirm is not available everywhere this runs:
      // a sandboxed host returns false from it without showing anything, which
      // silently turned every delete into a cancel and made the button look
      // broken. A confirmation the page draws itself always works.
      state.confirmingDelete = target.dataset.id!;
      break;
    }

    case 'delete-profile-confirm': {
      deleteProfile(target.dataset.id!);
      state.profiles = loadProfiles();
      state.confirmingDelete = null;
      break;
    }

    case 'delete-profile-cancel':
      state.confirmingDelete = null;
      break;

    case 'share': {
      if (!state.chart) break;
      const text = buildShareText(state.chart, state.form.name || undefined);
      void shareText(text, t('appName')).then((outcome) => {
        state.toast = outcome === 'copied' ? t('copied')
          : outcome === 'failed' ? t('shareFailed') : null;
        render();
      });
      break;
    }

    case 'share-image': {
      const svg = document.querySelector<SVGElement>('svg.kundali');
      if (!svg || !state.chart) break;
      const name = (state.form.name || 'aistro-kundali').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const birthTz = state.chart.birth.location.timezone;
      const caption = {
        title: state.form.name || t('appName'),
        subtitle: `${localDate(new Date(state.chart.utcISO), birthTz)} `
          + `${localTime(new Date(state.chart.utcISO), birthTz)} \u00b7 `
          + `${state.chart.birth.location.label ?? ''}`,
      };
      void shareChartImage(svg, `${name}.png`, t('appName'), caption).then((outcome) => {
        state.toast = outcome === 'downloaded' ? t('downloaded')
          : outcome === 'failed' ? t('shareFailed') : null;
        render();
      });
      break;
    }

    case 'pdf': {
      if (!state.chart) break;
      const file = (state.form.name || 'kundali').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      state.toast = t('pdfBuilding');
      render();
      void deliverReport(state.chart, {
        name: state.form.name,
        filename: `${file}.pdf`,
      }).then((outcome) => {
        state.toast = outcome.status === 'saved' ? t('pdfReady')
          : outcome.status === 'shared' ? null
          : outcome.status === 'cancelled' ? null
          // Naming the reason beats a bare failure: "declined", "too_large" and
          // "unavailable" each tell the reader something different about what
          // to try next, and tell us something when they report it.
          : `${t('pdfFailed')} (${outcome.reason})`;
        render();
      });
      break;
    }

    case 'pred-span':
      state.predictionSpan = target.dataset.value as PredictionSpan;
      state.predictionResult = null;
      break;

    case 'pred-run': {
      if (!state.chart) break;
      const when = new Date(`${state.predictionDate}T12:00:00`);
      if (Number.isNaN(when.getTime())) break;
      state.predictionResult = predict(state.chart, when, state.predictionSpan, {
        location: state.chart.birth.location,
        lang: lang(),
      });
      break;
    }

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
      // Scanning runs on the device. Measured, not guessed: the two-pass scan
      // covers five years in about a second on a laptop, so the cap is five
      // years and the UI says it is working rather than appearing to hang.
      if (to.getTime() - from.getTime() > MAX_SCAN_DAYS * 86400000) {
        state.muhurtaError = t('rangeTooLong');
        state.muhurtaResult = null;
        break;
      }
      const location = state.chart?.birth.location ?? {
        latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', label: 'New Delhi',
      };
      state.muhurtaError = null;
      state.muhurtaOpenFactors = null;
      state.muhurtaResult = null;
      state.muhurtaRunning = true;
      state.muhurtaProgress = 0;
      render();
      void scanForWindows(from, to, location);
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

  const pred = el.dataset.pred;
  if (pred === 'date') {
    state.predictionDate = el.value;
    state.predictionResult = null;
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

  if (field === 'stateCode') {
    const code = el.value || null;
    state.form.stateCode = code;
    state.form.stateCount = null;
    state.form.place = null;
    if (!code) { render(); return; }

    // Village shards run to hundreds of kilobytes, so the load is explicit and
    // its progress is shown rather than the UI simply hanging.
    state.form.stateLoading = true;
    render();
    void loadState(code).then((rows) => {
      state.form.stateLoading = false;
      state.form.stateCount = rows.length;
      render();
    });
    return;
  }

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

  // Typing a new coordinate means this is no longer the remembered place.
  if (field === 'latitude' || field === 'longitude') state.form.placeLabel = '';

  (state.form as unknown as Record<string, string>)[field] = el.value;
});

/**
 * Bring back the chart the viewer was last reading.
 *
 * Someone who casts their chart, closes the app and reopens it should not be
 * met with a blank form — on a phone that is the difference between a tool and a
 * toy. The birth data is replayed through the ordinary form fields so there is
 * exactly one code path that produces a chart.
 */
function restoreLast(): void {
  const last = loadLast();
  if (!last) return;
  const b = last.birth;
  state.form.name = last.name;
  state.form.date = `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
  state.form.time = `${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`;
  state.form.accuracy = b.timeAccuracy ?? 'ToMinute';
  // Coordinates rather than a place lookup: the place shards may not have
  // loaded yet, and the stored latitude and longitude are what was actually used.
  state.form.manual = true;
  state.form.latitude = String(b.location.latitude);
  state.form.longitude = String(b.location.longitude);
  state.form.timezone = b.location.timezone;
  state.form.placeLabel = b.location.label ?? '';
  state.form.query = b.location.label ?? '';
  if (TABS.some(([id]) => id === last.tab)) state.tab = last.tab as Tab;
  recompute();
}

setLang(lang());
restoreLast();
render();

// Tier 1 is precached by the service worker, so this normally resolves from
// cache; the form is usable with the diaspora list meanwhile.
void ensurePlacesLoaded().then(render);

// Register the offline worker only in a real deployment; a failure here must
// never stop the app rendering.
if ('serviceWorker' in navigator && import.meta.env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* offline is a bonus, not a requirement */ });
  });
}

export { ordinal };
