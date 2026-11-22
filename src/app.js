'use strict';
// Sustainment Dashboard: draws the tool list (tools.js) as a page. Nothing here holds data; the page reads DASH and
// remembers, in this browser only, which menu entry was chosen and which tools were opened lately.

const STATUS = {
  live:    { label: 'Live',           cls: 'st-live',    order: 0 },
  dev:     { label: 'In development', cls: 'st-dev',     order: 1 },
  planned: { label: 'Planned',        cls: 'st-planned', order: 2 },
};
const AREA_COLOR = { plan: 'var(--a-plan)', exec: 'var(--a-exec)', contracts: 'var(--a-contracts)' };

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// a link is offered only when it is https: anything else (a typo, a javascript: address) is "not set"
const linkOk = u => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u.trim());

// storage is a convenience: a private window or a blocked site refuses it, and the page works the same without it
const store = {
  get(k, d) { try { const v = localStorage.getItem('sdash.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sdash.' + k, JSON.stringify(v)); } catch {} },
};

// ---- the marks. ORBIT's and APEX's are their own logos; the hub's is the same family: a ring, a satellite, and tiles.
let _uid = 0;
function ringMark(inner, label) {
  const id = 'm' + (++_uid);
  return '<svg viewBox="0 0 100 100" role="img" aria-label="' + esc(label) + '"><mask id="' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">'
    + '<rect width="100" height="100" fill="#fff"/><circle cx="80.21" cy="26.4" r="16.3" fill="#000"/></mask>'
    + '<circle cx="50" cy="50" r="38.33" fill="none" stroke="currentColor" stroke-width="12" mask="url(#' + id + ')"/>'
    + inner + '<circle cx="80.21" cy="26.4" r="10.75" fill="var(--mark-accent, currentColor)"/></svg>';
}
const glyph = d => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICONS = {
  hub: () => ringMark('<rect x="35" y="35" width="13" height="13" rx="2.5" fill="currentColor"/><rect x="52" y="35" width="13" height="13" rx="2.5" fill="currentColor"/>'
    + '<rect x="35" y="52" width="13" height="13" rx="2.5" fill="currentColor"/><rect x="52" y="52" width="13" height="13" rx="2.5" fill="currentColor"/>', 'Sustainment Dashboard'),
  orbit: () => {
    const id = 'm' + (++_uid);
    return '<svg viewBox="0 0 100 100" role="img" aria-label="ORBIT"><mask id="' + id + '" maskUnits="userSpaceOnUse" x="1" y="1" width="98" height="98"><rect x="1" y="1" width="98" height="98" fill="#fff"/>'
      + '<circle cx="80.21" cy="26.4" r="16.3" fill="#000"/></mask><circle cx="50" cy="50" r="38.33" fill="none" stroke="currentColor" stroke-width="17.34" mask="url(#' + id + ')"/>'
      + '<circle cx="50" cy="50" r="8.32" fill="currentColor"/><circle cx="80.21" cy="26.4" r="10.75" fill="var(--mark-accent, currentColor)"/></svg>';
  },
  apex: () => {
    const a = 'm' + (++_uid), b = 'm' + (++_uid);
    return '<svg viewBox="0 0 100 100" role="img" aria-label="APEX"><mask id="' + a + '" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/><circle cx="82.31" cy="24.76" r="13.4" fill="#000"/></mask>'
      + '<clipPath id="' + b + '"><circle cx="50" cy="50" r="36.5"/></clipPath><circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" stroke-width="10" mask="url(#' + a + ')"/>'
      + '<path clip-path="url(#' + b + ')" fill="currentColor" fill-rule="evenodd" d="M25.8 32.36 L28.68 32 L29.98 35.96 L31.99 32.43 L34.01 36.61 L36.02 32.86 L38.04 37.04 L40.06 33.3 L42.07 37.33 L44.09 33.87 L46.1 37.47 L48.12 34.59 L51.36 38.12 L48.84 41.07 L46.97 39.2 L44.95 42.8 L42.94 40.5 L40.92 44.24 L38.9 41.79 L36.89 45.54 L34.87 43.09 L32.86 46.4 L31.13 44.38 L28.68 46.76 L30.12 50 L38.76 52.88 L48.12 51.44 L51.72 48.2 L49 56 L42 58.5 L37 63 L39.2 62.6 L39 65.6 L41.2 63.4 L42.4 66 L44 62.8 L48.4 62.4 L48 68 L42 70.5 L38.5 75 L40.7 74.4 L40.9 77.4 L42.7 75 L44.3 77.2 L45.1 74 L47.8 73.4 L46.5 84 L48 100 L81 100 L78 82 L73 66 L68 54 L65.04 45.68 L62.16 34.88 L57.12 27.32 L51 22.28 L46.68 23.5 L42.36 21.34 L35.88 22.35 L30.12 23.36 L25.8 27.1 L24.72 29.84 Z M50.64 26.53 L44.23 27.82 L45.24 30.13 L49.42 29.26 Z M29.83 25.95 L27.82 26.82 L28.25 27.97 L30.19 27.25 Z"/>'
      + '<circle cx="82.31" cy="24.76" r="8.6" fill="var(--mark-accent, currentColor)"/></svg>';
  },
  contract: () => glyph('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/><path d="m15.5 16.5 1.2 1.2 2.3-2.4"/>'),
  budget: () => glyph('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="M14 7.5h6M17 4.5v6" />'),
  chart: () => glyph('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'),
  doc: () => glyph('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  grid: () => glyph('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
};
const UI = {
  search: glyph('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  open: glyph('<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  copy: glyph('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>'),
};
const iconOf = t => (ICONS[t.icon] || ICONS.grid)();

// ---- state
const S = {
  view: store.get('view', 'all'),   // 'all' | an area id | 'links'
  status: store.get('status', 'all'),
  q: '',
};
const areas = () => DASH.areas || [];
const tools = () => (DASH.tools || []).slice();
const areaOf = t => areas().find(a => a.id === t.area);
if (S.view !== 'all' && S.view !== 'links' && !areas().some(a => a.id === S.view)) S.view = 'all';
if (S.status !== 'all' && !STATUS[S.status]) S.status = 'all';

function matches(t, q) {
  if (!q) return true;
  const hay = [t.name, t.full, t.tagline, (t.features || []).join(' '), (areaOf(t) || {}).name, (STATUS[t.status] || {}).label].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}
// the search words, marked where they appear in a piece of text (escaped first, so a mark never meets markup)
function hl(text) {
  const s = esc(text);
  const words = S.q.trim().split(/\s+/).filter(w => w.length > 1).map(w => esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return words.length ? s.replace(new RegExp('(' + words.join('|') + ')', 'gi'), '<mark>$1</mark>') : s;
}
function visible() {
  return tools().filter(t => (S.status === 'all' || t.status === S.status) && matches(t, S.q))
    .sort((a, b) => ((STATUS[a.status] || { order: 9 }).order - (STATUS[b.status] || { order: 9 }).order));
}

// ---- drawing
function card(t) {
  const st = STATUS[t.status] || { label: t.status || 'Unknown', cls: 'st-planned' };
  const ok = linkOk(t.url);
  const color = AREA_COLOR[t.area] || 'var(--a-other)';
  const feats = (t.features || []).slice(0, 4).map(f => '<li>' + hl(f) + '</li>').join('');
  const open = ok
    ? '<a class="btn pri" href="' + esc(t.url.trim()) + '" target="_blank" rel="noopener noreferrer" data-open="' + esc(t.id) + '">' + UI.open + 'Open ' + esc(t.name) + '</a>'
      + '<button type="button" class="btn" data-copy="' + esc(t.id) + '">' + UI.copy + 'Copy link</button>'
    : '<span class="btn" aria-disabled="true" role="link" title="This tool’s Teams link has not been added to the tool list yet">'
      + (t.status === 'live' ? 'Link not set' : 'Not open yet') + '</span>'
      + (t.status === 'live' ? '<span class="hint">Add its Teams link to the tool list.</span>' : '');
  return '<article class="card' + (ok ? '' : ' off') + '" style="--area:' + color + '" aria-labelledby="t-' + esc(t.id) + '">'
    + '<div class="head"><span class="ico">' + iconOf(t) + '</span><div><h4 id="t-' + esc(t.id) + '">' + hl(t.name) + '</h4>'
    + (t.full ? '<p class="full">' + hl(t.full) + '</p>' : '') + '</div>'
    + '<span class="st ' + st.cls + '">' + esc(st.label) + '</span></div>'
    + '<p class="tag">' + hl(t.tagline) + '</p>'
    + (feats ? '<ul class="feat" aria-label="What is inside">' + feats + '</ul>' : '')
    + '<div class="acts">' + open + '</div></article>';
}

function railHtml() {
  const all = tools();
  const btn = (v, label, n, dot) => '<button type="button" data-view="' + esc(v) + '" aria-pressed="' + (S.view === v) + '">'
    + (dot ? '<span class="dot" style="background:' + dot + '"></span>' : '') + esc(label)
    + (n == null ? '' : '<span class="n">' + n + '</span>') + '</button>';
  let h = '<h2>Tools</h2>' + btn('all', 'All tools', all.length);
  h += '<h2>Areas</h2>' + areas().map(a => btn(a.id, a.name, all.filter(t => t.area === a.id).length, AREA_COLOR[a.id] || 'var(--a-other)')).join('');
  const orphans = all.filter(t => !areaOf(t)).length;
  if (orphans) h += btn('other', 'Other', orphans, 'var(--a-other)');
  if ((DASH.links || []).length) h += '<h2>Elsewhere in Teams</h2>' + btn('links', 'Quick links', DASH.links.length);
  return h;
}

function heroHtml() {
  const all = tools();
  const n = k => all.filter(t => t.status === k).length;
  const stat = (v, l) => '<div class="stat"><b>' + v + '</b><span>' + esc(l) + '</span></div>';
  return '<div class="hero"><div><h2>' + esc(DASH.title) + '</h2><p>' + esc(DASH.subtitle) + '. Pick a tool to open it in a new tab.</p></div>'
    + '<div class="stats">' + stat(n('live'), 'live') + stat(n('dev'), 'in development') + (n('planned') ? stat(n('planned'), 'planned') : '') + '</div></div>';
}

function recentHtml() {
  const ids = store.get('recent', []);
  const list = ids.map(id => tools().find(t => t.id === id)).filter(t => t && linkOk(t.url)).slice(0, 5);
  if (!list.length) return '';
  return '<div class="recent"><span class="lbl">Recently opened</span>' + list.map(t =>
    '<a href="' + esc(t.url.trim()) + '" target="_blank" rel="noopener noreferrer" data-open="' + esc(t.id) + '">' + esc(t.name) + '</a>').join('') + '</div>';
}

function linksHtml() {
  const L = (DASH.links || []).filter(l => !S.q || [l.name, l.note].join(' ').toLowerCase().includes(S.q.toLowerCase()));
  if (!L.length) return '<div class="empty">No quick links match.</div>';
  return '<section class="area"><header><h3>Quick links</h3><p>Other dashboards in Teams.</p></header><div class="links">'
    + L.map(l => linkOk(l.url)
      ? '<a href="' + esc(l.url.trim()) + '" target="_blank" rel="noopener noreferrer"><b>' + hl(l.name) + '</b>' + (l.note ? '<span>' + hl(l.note) + '</span>' : '') + '</a>'
      : '<div class="nolink"><b>' + hl(l.name) + '</b><span>Link not set</span></div>').join('') + '</div></section>';
}

function mainHtml() {
  if (S.view === 'links') return linksHtml();
  const vis = visible();
  const chip = (v, l) => '<button type="button" class="chip" data-status="' + v + '" aria-pressed="' + (S.status === v) + '">' + esc(l) + '</button>';
  let h = '';
  if (S.view === 'all' && !S.q) h += heroHtml() + recentHtml();
  const inView = vis.filter(t => S.view === 'all' || (S.view === 'other' ? !areaOf(t) : t.area === S.view));
  h += '<div class="bar" role="group" aria-label="Show by status"><span class="lbl">Show</span>' + chip('all', 'All')
    + Object.keys(STATUS).filter(k => tools().some(t => t.status === k)).map(k => chip(k, STATUS[k].label)).join('')
    + '<span class="shown" role="status">' + inView.length + ' of ' + tools().length + ' tools' + (S.q ? ' matching “' + esc(S.q) + '”' : '') + '</span></div>';
  const groups = S.view === 'all' ? areas().concat([{ id: 'other', name: 'Other', blurb: '' }]) : [S.view === 'other' ? { id: 'other', name: 'Other', blurb: '' } : areas().find(a => a.id === S.view)];
  let any = false;
  for (const a of groups) {
    const list = inView.filter(t => a.id === 'other' ? !areaOf(t) : t.area === a.id);
    if (!list.length) continue;
    any = true;
    h += '<section class="area" aria-labelledby="a-' + esc(a.id) + '"><header><h3 id="a-' + esc(a.id) + '"><span class="sw" style="background:' + (AREA_COLOR[a.id] || 'var(--a-other)') + '"></span>'
      + esc(a.name) + '</h3>' + (a.blurb ? '<p>' + esc(a.blurb) + '</p>' : '') + '</header><div class="grid">' + list.map(card).join('') + '</div></section>';
  }
  if (!any) h += '<div class="empty">' + (S.q ? 'No tool matches “' + esc(S.q) + '”. Try fewer words, or clear the search (Esc).' : 'No tools here yet.') + '</div>';
  if (S.view === 'all' && !S.q && (DASH.links || []).length) h += linksHtml();
  return h;
}

function draw() {
  document.getElementById('rail').innerHTML = railHtml();
  document.getElementById('main').innerHTML = mainHtml() + '<footer class="foot">To add a tool or change a link, edit <code>src/tools.js</code> in the sustainment-dashboard repository and rebuild. This page holds no data.</footer>';
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2200);
}
function remember(id) {
  const ids = store.get('recent', []).filter(x => x !== id);
  ids.unshift(id); store.set('recent', ids.slice(0, 8));
}
async function copyLink(t) {
  const u = t.url.trim();
  try { await navigator.clipboard.writeText(u); toast('Link to ' + t.name + ' copied'); return; } catch {}
  // a browser that refuses the clipboard: put the link in a box the person can copy from
  window.prompt('Copy the link to ' + t.name + ':', u);
}

function boot() {
  document.getElementById('app').innerHTML =
    '<header class="top"><h1 class="brand">' + ICONS.hub() + '<span>' + esc(DASH.title) + '</span><span class="bs">' + esc(DASH.subtitle) + '</span></h1>'
    + '<div class="search" role="search">' + UI.search + '<label class="vh" for="q">Search the tools</label>'
    + '<input id="q" type="search" placeholder="Search tools" autocomplete="off"><kbd>/</kbd></div></header>'
    + '<div class="shell"><nav class="rail" id="rail" aria-label="Areas"></nav><main id="main" tabindex="-1"></main></div>'
    + '<div class="toast" id="toast" role="status" hidden></div>';
  const q = document.getElementById('q');
  q.addEventListener('input', () => { S.q = q.value.trim(); draw(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== q && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
    else if (e.key === 'Escape' && document.activeElement === q && q.value) { q.value = ''; S.q = ''; draw(); }
  });
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-view]');
    if (v) { S.view = v.dataset.view; store.set('view', S.view); draw(); document.querySelector('[data-view="' + CSS.escape(S.view) + '"]')?.focus(); return; }
    const s = e.target.closest('[data-status]');
    if (s) { S.status = s.dataset.status; store.set('status', S.status); draw(); document.querySelector('[data-status="' + CSS.escape(S.status) + '"]')?.focus(); return; }
    const c = e.target.closest('[data-copy]');
    if (c) { const t = tools().find(x => x.id === c.dataset.copy); if (t) copyLink(t); return; }
    const o = e.target.closest('[data-open]');
    if (o) remember(o.dataset.open);
  });
  // a link opened with the middle button counts as opened too
  document.addEventListener('auxclick', e => { const o = e.target.closest('[data-open]'); if (o) remember(o.dataset.open); });
  draw();
}
boot();
