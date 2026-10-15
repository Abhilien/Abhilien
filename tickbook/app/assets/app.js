'use strict';
/* Tickbook — a tiny offline planner. Everything lives on this device. */

const KEY = 'tickbook';
const PALETTE = {
  ink:      ['#27467a', '#8fb4ff'],
  berry:    ['#a8324a', '#ff8fa3'],
  moss:     ['#2f6e45', '#86d9a2'],
  plum:     ['#5e3b94', '#c3a6ff'],
  rust:     ['#b5601a', '#ffb470'],
  teal:     ['#0f6f7c', '#7fd9e3'],
  rose:     ['#b0306f', '#ff9ccc'],
  graphite: ['#2a2a2a', '#e6e6e6'],
};
const FONTS = {
  caveat:  { name: 'Caveat',       css: "'Caveat', cursive",       scale: 1.22 },
  patrick: { name: 'Patrick Hand', css: "'Patrick Hand', cursive", scale: 1.02 },
  kalam:   { name: 'Kalam',        css: "'Kalam', cursive",        scale: 0.95 },
  plain:   { name: 'Plain',        css: 'system-ui, sans-serif',   scale: 0.92 },
};
const THEMES = { paper: 'Paper', kraft: 'Kraft', night: 'Night' };
const BAR_COLORS = { paper: '#fbf6e8', kraft: '#dcc6a0', night: '#1e2326' };
const CHEERS = ['nice one ✓', 'done & dusted', 'one less thing', 'ticked!', 'look at you go', 'that\'s accountability'];

const CHECK = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
  '<path class="box" d="M5 6.5C11 5.2 20 5.8 26.5 5.5C27 12 26.6 20 26.8 26.6C19 27.2 12 26.6 5.4 27C5 20 5.6 12 5 6.5Z"/>' +
  '<path class="tick" d="M9 16.5L14 22L28 5"/></svg>';

const $ = s => document.querySelector(s);
const main = $('#main');
const bridge = window.Android || null;

let db = load();
let path = [];          // ids from project down to the item being viewed
let sheetOpen = false;
let justDone = null;    // id to animate after render
let lastDeleted = null; // { list, index, node } for undo
let refocusQuick = false;

/* ---------------- storage ---------------- */
function load() {
  let raw = '';
  try { raw = bridge ? bridge.load() : localStorage.getItem(KEY); } catch (e) {}
  try {
    const d = JSON.parse(raw);
    if (d && Array.isArray(d.projects)) return normalize(d);
  } catch (e) {}
  return seed();
}
function normalize(d) {
  d.settings = Object.assign({ theme: 'paper', hideDone: false, font: 'caveat' }, d.settings || {});
  const fix = n => {
    n.children = Array.isArray(n.children) ? n.children : [];
    n.text = String(n.text || 'untitled');
    if (!n.id) n.id = uid();
    n.children.forEach(fix);
  };
  d.projects.forEach(fix);
  return d;
}
function save() {
  const s = JSON.stringify(db);
  try { bridge ? bridge.save(s) : localStorage.setItem(KEY, s); } catch (e) { toast('Could not save!'); }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function mk(text, extra) {
  return Object.assign({ id: uid(), text, done: false, created: Date.now(), children: [] }, extra || {});
}
function seed() {
  const today = isoDate(new Date());
  return {
    v: 1,
    settings: { theme: 'paper', hideDone: false, font: 'caveat' },
    projects: [
      mk('Start here ✎', { color: 'ink', font: 'caveat', children: [
        mk('Tap a line to open it — every task can hold more tasks'),
        mk('Tap the box to tick something off', { due: today }),
        mk('Something with steps inside', { children: [
          mk('Step one'),
          mk('Step two'),
          mk('You can only tick the parent when all of these are done'),
        ] }),
        mk('Tap ⋯ to rename, recolour, change the font, set a date or delete'),
      ] }),
      mk('Fitness', { color: 'moss', font: 'kalam', children: [
        mk('Morning run 5k', { due: today, time: '07:00' }),
        mk('Stretching routine'),
      ] }),
    ],
  };
}

/* ---------------- tree helpers ---------------- */
function resolve() {
  const chain = [];
  let list = db.projects;
  for (const id of path) {
    const n = list.find(x => x.id === id);
    if (!n) break;
    chain.push(n);
    list = n.children;
  }
  path = chain.map(n => n.id);
  return chain;
}
function styleFor(chain) {
  let color = 'ink', font = db.settings.font;
  for (const n of chain) {
    if (n.color && PALETTE[n.color]) color = n.color;
    if (n.font && FONTS[n.font]) font = n.font;
  }
  return { color, font };
}
function ink(key) { return PALETTE[key][db.settings.theme === 'night' ? 1 : 0]; }
function styleVars(st) {
  const f = FONTS[st.font];
  return `--ink:${ink(st.color)};--font:${f.css};--fs:${f.scale}`;
}
function stats(n) {
  let t = 0, d = 0;
  (function walk(list) { for (const c of list) { t++; if (c.done) d++; walk(c.children); } })(n.children);
  return { t, d };
}
function pending(n) { return n.children.filter(c => !c.done).length; }
function reopen(nodes) {
  let count = 0;
  for (const a of nodes) if (a.done) { a.done = false; delete a.doneAt; count++; }
  return count;
}
function visible(list) {
  const open = list.filter(n => !n.done), done = list.filter(n => n.done);
  return { items: db.settings.hideDone ? open : open.concat(done), hidden: db.settings.hideDone ? done.length : 0 };
}

/* ---------------- dates ---------------- */
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYLONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
}
function dueInfo(n) {
  if (!n.due) return null;
  const day = new Date(n.due + 'T00:00');
  if (isNaN(day)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((day - today) / 864e5);
  let label = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff === -1 ? 'yesterday'
    : diff > 1 && diff < 7 ? DAY[day.getDay()] : `${MON[day.getMonth()]} ${day.getDate()}`;
  if (n.time) label += ' ' + fmtTime(n.time);
  const at = new Date(n.due + 'T' + (n.time || '23:59'));
  const overdue = !n.done && at < now;
  return { label, diff, ts: at.getTime(), cls: overdue ? 'overdue' : (!n.done && diff === 0 ? 'today' : '') };
}
function fmtDone(ts) { const d = new Date(ts); return `${MON[d.getMonth()]} ${d.getDate()}`; }

/* ---------------- rendering ---------------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function metaBits(n, deep) {
  const bits = [];
  const k = n.children.length;
  if (deep) { const s = stats(n); if (s.t) bits.push(`<span class="kids">${s.d}/${s.t} done</span>`); }
  else if (k) bits.push(`<span class="kids">▸ ${k - pending(n)}/${k} inside</span>`);
  const di = dueInfo(n);
  if (di && !n.done) bits.push(`<span class="${di.cls}">${di.cls === 'overdue' ? '⚠ ' : '◷ '}${esc(di.label)}</span>`);
  if (n.done && n.doneAt) bits.push(`<span>✓ ${fmtDone(n.doneAt)}</span>`);
  if (n.note) bits.push('<span>✎ note</span>');
  return bits.join('');
}
function row(n, chain, isProject) {
  const st = styleFor(chain);
  const meta = metaBits(n, isProject);
  const cls = ['row', isProject && 'proj', n.done && 'done', !n.done && pending(n) && 'locked',
    n.children.length && 'has-kids', justDone === n.id && 'pop'].filter(Boolean).join(' ');
  let bar = '';
  if (isProject) {
    const s = stats(n);
    if (s.t) bar = `<div class="bar"><i style="width:${Math.round(s.d / s.t * 100)}%"></i></div>`;
  }
  return `<li class="${cls}" data-id="${n.id}" style="${styleVars(st)}">
    <button class="ck" data-act="toggle" aria-label="Tick">${CHECK}</button>
    <div class="body" data-act="open"><div class="t">${esc(n.text)}</div>${meta ? `<div class="meta">${meta}</div>` : ''}${bar}</div>
    <button class="more" data-act="edit" aria-label="Edit">⋯</button>
  </li>`;
}
function upcoming() {
  const out = [];
  (function walk(list, trail, chain) {
    for (const n of list) {
      const p = trail.concat(n.id), c = chain.concat(n);
      const di = !n.done && dueInfo(n);
      if (di && di.diff <= 7) out.push({ n, path: p, di, st: styleFor(c), where: chain[0] ? chain[0].text : '' });
      if (!n.done) walk(n.children, p, c);
    }
  })(db.projects, [], []);
  return out.sort((a, b) => a.di.ts - b.di.ts).slice(0, 8);
}
function homeView() {
  const now = new Date();
  const up = upcoming();
  const dueToday = up.filter(u => u.di.diff <= 0).length;
  let h = `<div class="hello"><div class="day">${DAYLONG[now.getDay()]}</div>
    <div class="sub">${MON[now.getMonth()]} ${now.getDate()} · ${dueToday ? `${dueToday} thing${dueToday > 1 ? 's' : ''} due today` : 'nothing due today'}</div></div>`;
  if (up.length) {
    h += '<h2 class="section">up next</h2><div class="upnext">' + up.map(u =>
      `<button class="due-item ${u.di.cls}" data-path="${u.path.join(',')}">
        <span class="dot" style="background:${ink(u.st.color)}"></span>
        <span class="dt">${esc(u.n.text)}</span><span class="when">${esc(u.di.label)}</span></button>`).join('') + '</div>';
  }
  h += '<h2 class="section">my projects</h2>';
  const v = visible(db.projects);
  if (!db.projects.length) h += '<div class="empty"><span class="big">a fresh page</span>start your first project below</div>';
  h += `<ul class="list projects">${v.items.map(n => row(n, [n], true)).join('')}</ul>`;
  if (v.hidden) h += `<button class="hidden-done" data-act="showDone">${v.hidden} finished project${v.hidden > 1 ? 's' : ''} hidden — show</button>`;
  h += '<button class="add-line" data-act="newProject">+ new project</button>';
  return h;
}
function nodeView(cur, chain) {
  const st = styleFor(chain);
  const s = stats(cur);
  const di = dueInfo(cur);
  const info = [];
  if (s.t) info.push(`${s.d} of ${s.t} done`);
  if (di && !cur.done) info.push(`<span class="${di.cls}">◷ ${esc(di.label)}</span>`);
  if (cur.done && cur.doneAt) info.push(`✓ finished ${fmtDone(cur.doneAt)}`);
  const left = pending(cur);
  if (!cur.done && left) info.push(`🔒 ${left} left before you can tick this`);
  let h = `<div class="head" style="${styleVars(st)}">
    <div class="row ${cur.done ? 'done' : ''} ${!cur.done && left ? 'locked' : ''} ${justDone === cur.id ? 'pop' : ''}">
      <button class="ck" data-act="toggleCur" aria-label="Tick">${CHECK}</button>
      <h1 data-act="editCur">${esc(cur.text)}</h1>
    </div>
    ${info.length ? `<div class="info">${info.map(i => `<span>${i}</span>`).join('')}</div>` : ''}
    ${cur.note ? `<p class="note">${esc(cur.note)}</p>` : ''}
    ${s.t ? `<div class="bar"><i style="width:${Math.round(s.d / s.t * 100)}%"></i></div>` : ''}
  </div>`;
  const v = visible(cur.children);
  if (!cur.children.length) h += '<div class="empty"><span class="big">nothing here yet</span>break it down into smaller steps ↓</div>';
  h += `<ul class="list tasks">${v.items.map(n => row(n, chain.concat(n), false)).join('')}</ul>`;
  if (v.hidden) h += `<button class="hidden-done" data-act="showDone">${v.hidden} done item${v.hidden > 1 ? 's' : ''} hidden — show</button>`;
  h += `<form class="quick" style="${styleVars(st)}" autocomplete="off">
    <span class="plus">+</span><input id="quick" enterkeyhint="done" placeholder="add a ${chain.length > 1 ? 'step' : 'task'}…" maxlength="300">
  </form>`;
  return h;
}
function crumbs(chain) {
  if (!chain.length) return '<span class="brand">Tickbook</span>';
  const parts = ['<button data-crumb="0">Projects</button>'];
  chain.slice(0, -1).forEach((n, i) => parts.push(`<button data-crumb="${i + 1}">${esc(n.text)}</button>`));
  return parts.join(' › ');
}
function render() {
  const chain = resolve();
  const cur = chain[chain.length - 1];
  document.body.dataset.theme = db.settings.theme;
  $('#back').style.visibility = chain.length ? 'visible' : 'hidden';
  $('#crumbs').innerHTML = crumbs(chain);
  main.innerHTML = cur ? nodeView(cur, chain) : homeView();
  justDone = null;
  if (refocusQuick && $('#quick')) $('#quick').focus();
  refocusQuick = false;
  try { bridge && bridge.setBarColor(BAR_COLORS[db.settings.theme], db.settings.theme === 'night'); } catch (e) {}
}
function go(newPath) { path = newPath; window.scrollTo(0, 0); render(); }

/* ---------------- actions ---------------- */
function currentList() { const c = resolve(); return c.length ? c[c.length - 1].children : db.projects; }
function toggle(n, ancestors, el) {
  if (n.done) {
    n.done = false; delete n.doneAt;
    const r = reopen(ancestors);
    save(); render();
    if (r) toast(`Reopened ${r} parent${r > 1 ? 's' : ''} too`);
    return;
  }
  const left = pending(n);
  if (left) {
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    toast(`Finish the ${left} thing${left > 1 ? 's' : ''} inside first`, 'open', () => go(ancestors.map(a => a.id).concat(n.id)));
    return;
  }
  n.done = true; n.doneAt = Date.now(); justDone = n.id;
  save(); render();
  const parent = ancestors[ancestors.length - 1];
  if (parent && !parent.done && pending(parent) === 0) toast(`Everything in “${parent.text}” is done — tick it off!`);
  else toast(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
}
function addTo(chain, text) {
  const cur = chain[chain.length - 1];
  if (cur) {
    cur.children.push(mk(text));
    const r = reopen(chain); // new work inside a finished item reopens it
    if (r) toast('New step added — reopened the parent');
  } else {
    const used = db.projects.map(p => p.color);
    const color = Object.keys(PALETTE).find(k => !used.includes(k)) || 'ink';
    db.projects.push(mk(text, { color, font: db.settings.font }));
  }
  save();
}
function remove(list, n) {
  const index = list.indexOf(n);
  if (index < 0) return;
  list.splice(index, 1);
  lastDeleted = { list, index, node: n };
  save(); render();
  toast(`Deleted “${n.text.slice(0, 30)}”`, 'undo', () => {
    if (!lastDeleted) return;
    lastDeleted.list.splice(Math.min(lastDeleted.index, lastDeleted.list.length), 0, lastDeleted.node);
    lastDeleted = null; save(); render();
  });
}

/* ---------------- sheet (editor + settings) ---------------- */
function openSheet(html, onReady) {
  const sh = $('#sheet');
  sh.innerHTML = '<div class="grab"></div>' + html;
  sh.hidden = false; $('#scrim').hidden = false; sheetOpen = true;
  $('#toast').hidden = true;
  sh.scrollTop = 0;
  onReady && onReady(sh);
}
function closeSheet() {
  $('#sheet').hidden = true; $('#scrim').hidden = true; sheetOpen = false;
  $('#sheet').innerHTML = '';
}
function swatchHtml(selected, allowSame) {
  let h = allowSame ? `<button class="sw same ${!selected ? 'on' : ''}" data-color="">same</button>` : '';
  for (const k in PALETTE) h += `<button class="sw ${selected === k ? 'on' : ''}" data-color="${k}" style="--c:${ink(k)}" aria-label="${k}"></button>`;
  return h;
}
function fontHtml(selected, allowSame) {
  let h = allowSame ? `<button class="chip ${!selected ? 'on' : ''}" data-font="">same</button>` : '';
  for (const k in FONTS) h += `<button class="chip ${selected === k ? 'on' : ''}" data-font="${k}" style="font-family:${FONTS[k].css};font-size:${20 * FONTS[k].scale}px">${FONTS[k].name}</button>`;
  return h;
}
function pick(sh, attr, onPick) {
  sh.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => {
    sh.querySelectorAll(`[data-${attr}]`).forEach(x => x.classList.remove('on'));
    b.classList.add('on'); onPick(b.dataset[attr] || null);
  }));
}
/* node: existing node or null (new project). list: the array it lives in. */
function editSheet(node, list, isProject) {
  const isNew = !node;
  const draft = node ? { text: node.text, note: node.note || '', due: node.due || '', time: node.time || '', color: node.color || null, font: node.font || null }
    : { text: '', note: '', due: '', time: '', color: Object.keys(PALETTE).find(k => !db.projects.some(p => p.color === k)) || 'ink', font: db.settings.font };
  const idx = node ? list.indexOf(node) : -1;
  openSheet(`
    <h2>${isNew ? 'New project' : isProject ? 'Edit project' : 'Edit task'}</h2>
    <input class="field" id="f-text" maxlength="300" placeholder="${isProject ? 'Project name' : 'What needs doing?'}" value="${esc(draft.text)}">
    <label class="lbl">Note</label>
    <textarea class="field" id="f-note" rows="2" maxlength="2000" placeholder="details, links, reminders…">${esc(draft.note)}</textarea>
    <label class="lbl">When (optional)</label>
    <div class="when-row"><input type="date" id="f-due" value="${esc(draft.due)}"><input type="time" id="f-time" value="${esc(draft.time)}"><button class="clear" id="f-clear">clear</button></div>
    <label class="lbl">Ink colour</label>
    <div class="swatches">${swatchHtml(draft.color, !isProject)}</div>
    <label class="lbl">Handwriting</label>
    <div class="chips">${fontHtml(draft.font, !isProject)}</div>
    <div class="actions">
      ${!isNew && idx > 0 ? '<button class="btn" id="f-up">↑ move up</button>' : ''}
      ${!isNew && idx < list.length - 1 ? '<button class="btn" id="f-down">↓ down</button>' : ''}
      ${!isNew ? '<button class="btn danger" id="f-del">delete</button>' : ''}
      <button class="btn main" id="f-save">${isNew ? 'create' : 'save'}</button>
    </div>`, sh => {
    const text = sh.querySelector('#f-text');
    if (isNew) setTimeout(() => text.focus(), 50);
    pick(sh, 'color', v => draft.color = v);
    pick(sh, 'font', v => draft.font = v);
    sh.querySelector('#f-clear').onclick = () => { sh.querySelector('#f-due').value = ''; sh.querySelector('#f-time').value = ''; };
    const commit = () => {
      const t = text.value.trim();
      if (!t) { text.focus(); text.classList.add('shake'); setTimeout(() => text.classList.remove('shake'), 400); return; }
      const target = node || mk(t);
      target.text = t;
      target.note = sh.querySelector('#f-note').value.trim();
      target.due = sh.querySelector('#f-due').value;
      target.time = target.due ? sh.querySelector('#f-time').value : '';
      target.color = draft.color; target.font = draft.font;
      if (isNew) db.projects.push(target);
      save(); closeSheet(); render();
    };
    sh.querySelector('#f-save').onclick = commit;
    text.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
    const move = d => { list.splice(idx, 1); list.splice(idx + d, 0, node); save(); closeSheet(); render(); };
    const up = sh.querySelector('#f-up'), down = sh.querySelector('#f-down'), del = sh.querySelector('#f-del');
    if (up) up.onclick = () => move(-1);
    if (down) down.onclick = () => move(1);
    if (del) del.onclick = () => {
      if (!del.classList.contains('armed')) {
        const s = stats(node);
        del.classList.add('armed');
        del.textContent = s.t ? `tap again — deletes ${s.t} inside too` : 'tap again to delete';
        return;
      }
      closeSheet();
      if (path.includes(node.id)) path = path.slice(0, path.indexOf(node.id));
      remove(list, node);
    };
  });
}
function countAll() {
  let t = 0, d = 0, today = 0;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  (function walk(list) {
    for (const n of list) { t++; if (n.done) { d++; if (n.doneAt >= start.getTime()) today++; } walk(n.children); }
  })(db.projects);
  return { t, d, today };
}
function settingsSheet() {
  const c = countAll();
  const S = db.settings;
  openSheet(`
    <h2>Settings</h2>
    <div class="stats"><div><b>${c.today}</b><span>ticked today</span></div><div><b>${c.d}</b><span>ticked ever</span></div><div><b>${c.t - c.d}</b><span>still open</span></div></div>
    <label class="lbl">Paper</label>
    <div class="chips">${Object.keys(THEMES).map(k => `<button class="chip ${S.theme === k ? 'on' : ''}" data-theme="${k}">${THEMES[k]}</button>`).join('')}</div>
    <label class="lbl">Default handwriting</label>
    <div class="chips">${fontHtml(S.font, false)}</div>
    <label class="lbl">List</label>
    <button class="toggle ${S.hideDone ? 'on' : ''}" id="s-hide" style="width:100%"><span>Hide finished items</span><span class="knob"></span></button>
    <label class="lbl">Backup</label>
    <p class="small">Your planner lives only on this phone — the app has no internet permission at all. Export a backup now and then, and before reinstalling.</p>
    <div class="actions" style="margin-top:8px">
      ${bridge ? '<button class="btn" id="s-share">share backup</button>' : ''}
      <button class="btn" id="s-copy">copy backup</button>
      <button class="btn" id="s-import">restore…</button>
    </div>
    <div id="s-imp" hidden>
      <label class="lbl">Paste a backup below (this replaces everything)</label>
      <textarea class="field" id="s-text" rows="4" placeholder='{"v":1,...}'></textarea>
      <div class="actions"><button class="btn main" id="s-do">restore</button></div>
    </div>
    <p class="small" style="margin-top:22px">Tickbook · v1.0 · offline, private, yours.</p>`, sh => {
    pick(sh, 'theme', v => { S.theme = v; save(); render(); settingsSheet(); });
    pick(sh, 'font', v => { S.font = v; save(); render(); });
    sh.querySelector('#s-hide').onclick = e => { S.hideDone = !S.hideDone; e.currentTarget.classList.toggle('on', S.hideDone); save(); render(); };
    const dump = () => JSON.stringify(db);
    const share = sh.querySelector('#s-share');
    if (share) share.onclick = () => bridge.share(dump());
    sh.querySelector('#s-copy').onclick = () => {
      try {
        if (bridge) bridge.copy(dump());
        else navigator.clipboard.writeText(dump());
        toast('Backup copied — paste it somewhere safe');
      } catch (e) { toast('Copy failed'); }
    };
    sh.querySelector('#s-import').onclick = () => { sh.querySelector('#s-imp').hidden = false; sh.querySelector('#s-text').focus(); };
    sh.querySelector('#s-do').onclick = () => {
      try {
        const d = JSON.parse(sh.querySelector('#s-text').value);
        if (!d || !Array.isArray(d.projects)) throw 0;
        db = normalize(d); path = []; save(); closeSheet(); render(); toast('Backup restored');
      } catch (e) { toast('That doesn\'t look like a Tickbook backup'); }
    };
  });
}

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg, actLabel, act) {
  const t = $('#toast'), b = $('#toastAct');
  $('#toastMsg').textContent = msg;
  b.hidden = !actLabel;
  b.textContent = actLabel || '';
  b.onclick = () => { t.hidden = true; act && act(); };
  t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, actLabel ? 4500 : 2400);
}

/* ---------------- events ---------------- */
main.addEventListener('click', e => {
  const due = e.target.closest('.due-item');
  if (due) return go(due.dataset.path.split(','));
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const act = a.dataset.act;
  const chain = resolve();
  const cur = chain[chain.length - 1];
  const list = currentList();
  const li = a.closest('li.row');
  const n = li && list.find(x => x.id === li.dataset.id);
  switch (act) {
    case 'toggle': if (n) toggle(n, chain, li); break;
    case 'open': if (n) go(path.concat(n.id)); break;
    case 'edit': if (n) editSheet(n, list, !cur); break;
    case 'toggleCur': toggle(cur, chain.slice(0, -1), a.closest('.row')); break;
    case 'editCur': {
      const parentList = chain.length > 1 ? chain[chain.length - 2].children : db.projects;
      editSheet(cur, parentList, chain.length === 1); break;
    }
    case 'newProject': editSheet(null, db.projects, true); break;
    case 'showDone': db.settings.hideDone = false; save(); render(); break;
  }
});
main.addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#quick');
  const text = input.value.trim();
  if (!text) return;
  addTo(resolve(), text);
  refocusQuick = true;
  render();
});
$('#crumbs').addEventListener('click', e => {
  const b = e.target.closest('[data-crumb]');
  if (b) go(path.slice(0, Number(b.dataset.crumb)));
});
$('#back').onclick = () => window.appBack();
$('#gear').onclick = settingsSheet;
$('#scrim').onclick = closeSheet;

/* Called by the Android back button. Returns true if handled. */
window.appBack = function () {
  if (sheetOpen) { closeSheet(); return true; }
  if (path.length) { go(path.slice(0, -1)); return true; }
  return false;
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.appBack(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });

render();
