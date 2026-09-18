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
} from '@jyotish/engine';
import type {
  BirthData, Kundali, Graha, RashiIndex, TimeAccuracy, ChartStyle,
} from '@jyotish/engine';
import type { VargaCode } from '@jyotish/engine';
import { renderChart, renderVarga, SIGN_ABBR_SA } from './ui/chart.js';
import { searchPlaces, formatPlace, type Place } from './data/places.js';
import { loadProfiles, saveProfile, deleteProfile, type Profile } from './storage.js';
import { t, lang, setLang } from './i18n.js';

type Tab = 'chart' | 'dasha' | 'yogas' | 'panchang' | 'match';

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
};

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

// --- shell ------------------------------------------------------------------

const TABS: [Tab, string][] = [
  ['chart', 'tabChart'], ['dasha', 'tabDasha'], ['yogas', 'tabYogas'],
  ['panchang', 'tabPanchang'], ['match', 'tabMatch'],
];

function render(): void {
  const body = state.tab === 'chart' ? chartTab()
    : state.tab === 'dasha' ? dashaTab()
    : state.tab === 'yogas' ? yogasTab()
    : state.tab === 'panchang' ? panchangTab()
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
    default:
      return;
  }
  render();
});

document.addEventListener('input', (event) => {
  const el = event.target as HTMLInputElement | HTMLSelectElement;
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
