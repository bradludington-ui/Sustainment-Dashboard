'use strict';
// Sustainment Dashboard: draws the tool list (tools.js) and the catalog of links (catalog.js) as a page. Nothing here
// holds data; the page reads DASH and CATALOG and remembers, in this browser only, which menu entry was chosen, which
// links are pinned and what was opened lately.

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
  download: glyph('<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>'),
  gear: glyph('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  pin: glyph('<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  pinOn: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  copy: glyph('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>'),
};
const iconOf = t => (ICONS[t.icon] || ICONS.grid)();

// ---- the catalog's file types. Office files open in their desktop app through Office's own link form
// (ms-excel:ofe|u|<https address>), which also keeps them out of the browser's preview; "Browser" is the web version.
const TYPES = {
  excel:      { label: 'Excel',      mark: 'X',   app: 'ms-excel',      appName: 'Excel' },
  powerpoint: { label: 'PowerPoint', mark: 'P',   app: 'ms-powerpoint', appName: 'PowerPoint' },
  word:       { label: 'Word',       mark: 'W',   app: 'ms-word',       appName: 'Word' },
  pdf:        { label: 'PDF',        mark: 'PDF' },
  sharepoint: { label: 'SharePoint', mark: 'S' },
  teams:      { label: 'Teams',      mark: 'T' },
  folder:     { label: 'Folder',     mark: '▤' },
  web:        { label: 'Web',        mark: '◎' },
};

// ---- state
const S = {
  view: String(store.get('view', 'all')),   // 'all' | an area id | 'other' | 'cat' | 'cat:<category id>'
  status: store.get('status', 'all'),
  ctype: store.get('ctype', 'all'),
  q: '',
};
const areas = () => DASH.areas || [];
const tools = () => (DASH.tools || []).slice();
const areaOf = t => areas().find(a => a.id === t.area);
const cats = () => (typeof CATALOG !== 'undefined' && CATALOG.categories) || [];
const citems = () => ((typeof CATALOG !== 'undefined' && CATALOG.items) || []).slice();
const catOf = c => cats().find(k => k.id === c.category);
const ckey = c => 'c:' + (c.id || String(c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
const viewOk = v => v === 'all' || v === 'other' || v === 'cat' || areas().some(a => a.id === v) || (v.startsWith('cat:') && cats().some(k => 'cat:' + k.id === v));
if (!viewOk(S.view)) S.view = 'all';
if (S.status !== 'all' && !STATUS[S.status]) S.status = 'all';
if (S.ctype !== 'all' && !TYPES[S.ctype]) S.ctype = 'all';
const pins = () => { const p = store.get('pins', []); return Array.isArray(p) ? p : []; };

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
function cmatches(c, q) {
  if (!q) return true;
  const hay = [c.name, c.note, (catOf(c) || {}).name, (TYPES[c.type] || {}).label].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
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
  h += '<h2>Catalog</h2>' + btn('cat', 'All links', citems().length)
    + cats().map(k => btn('cat:' + k.id, k.name, citems().filter(c => c.category === k.id).length)).join('');
  return h;
}

function heroHtml() {
  const all = tools();
  const n = k => all.filter(t => t.status === k).length;
  const stat = (v, l) => '<div class="stat"><b>' + v + '</b><span>' + esc(l) + '</span></div>';
  return '<div class="hero"><div><h2>' + esc(DASH.title) + '</h2><p>' + esc(DASH.subtitle) + '. Pick a tool to open it in a new tab.</p></div>'
    + '<div class="stats">' + stat(n('live'), 'live') + stat(n('dev'), 'in development') + (n('planned') ? stat(n('planned'), 'planned') : '')
    + '<button type="button" class="stat go" data-view="cat"><b>' + citems().length + '</b><span>links in the catalog ›</span></button></div></div>';
}

function recentHtml() {
  const ids = store.get('recent', []);
  const list = (Array.isArray(ids) ? ids : []).map(id => {
    if (String(id).startsWith('c:')) {
      const c = citems().find(x => ckey(x) === id);
      if (!c || !linkOk(c.url)) return null;
      const T = TYPES[c.type] || {};
      return T.app ? { id, name: c.name, href: T.app + ':ofe|u|' + c.url.trim(), tab: false } : { id, name: c.name, href: c.url.trim(), tab: true };
    }
    const t = tools().find(x => x.id === id);
    return t && linkOk(t.url) ? { id, name: t.name, href: t.url.trim(), tab: true } : null;
  }).filter(Boolean).slice(0, 6);
  if (!list.length) return '';
  return '<div class="recent"><span class="lbl">Recently opened</span>' + list.map(r =>
    '<a href="' + esc(r.href) + '"' + (r.tab ? ' target="_blank" rel="noopener noreferrer"' : '') + ' data-open="' + esc(r.id) + '">' + esc(r.name) + '</a>').join('') + '</div>';
}

// ---- the catalog rows
function crow(c) {
  const T = TYPES[c.type] || TYPES.web, ok = linkOk(c.url), k = ckey(c), pinned = pins().includes(k);
  const url = ok ? c.url.trim() : '';
  const tab = ' target="_blank" rel="noopener noreferrer"';
  let name, acts;
  if (!ok) {
    name = '<span class="cname">' + hl(c.name) + '</span>';
    acts = '<span class="btn sm" aria-disabled="true" role="link" title="This link has not been added to the catalog yet">Link not set</span>';
  } else if (T.app) {
    // the desktop app: no new tab (the browser hands the address to Office and stays where it is)
    const app = T.app + ':ofe|u|' + url;
    name = '<a class="cname" href="' + esc(app) + '" data-open="' + esc(k) + '">' + hl(c.name) + '</a>';
    acts = '<a class="btn sm pri" href="' + esc(app) + '" data-open="' + esc(k) + '">Open in ' + esc(T.appName) + '</a>'
      + '<a class="btn sm" href="' + esc(url) + '"' + tab + ' data-open="' + esc(k) + '">Browser<span class="vh"> (opens in a new tab)</span></a>';
  } else {
    name = '<a class="cname" href="' + esc(url) + '"' + tab + ' data-open="' + esc(k) + '">' + hl(c.name) + '</a>';
    acts = '<a class="btn sm pri" href="' + esc(url) + '"' + tab + ' data-open="' + esc(k) + '">' + UI.open + 'Open<span class="vh"> (opens in a new tab)</span></a>';
  }
  if (ok) acts += '<button type="button" class="btn sm ico-only" data-ccopy="' + esc(k) + '" title="Copy link" aria-label="Copy the link to ' + esc(c.name) + '">' + UI.copy + '</button>';
  acts += '<button type="button" class="btn sm ico-only pin" data-pin="' + esc(k) + '" aria-pressed="' + pinned + '" title="' + (pinned ? 'Unpin' : 'Pin to the top') + '" aria-label="Pin ' + esc(c.name) + '">' + (pinned ? UI.pinOn : UI.pin) + '</button>';
  return '<li class="crow' + (ok ? '' : ' off') + '"><span class="ctype t-' + esc(TYPES[c.type] ? c.type : 'web') + '" title="' + esc(T.label) + '" aria-hidden="true">' + esc(T.mark) + '</span>'
    + '<div class="cmain">' + name + '<span class="cmeta"><span class="vh">' + esc(T.label) + '. </span>' + (c.note ? hl(c.note) : '') + '</span></div>'
    + '<span class="ctag">' + esc(T.label) + '</span><div class="cacts">' + acts + '</div></li>';
}
function clist(list) { return '<ul class="clist">' + list.map(crow).join('') + '</ul>'; }
function pinnedHtml() {
  const P = pins(), list = citems().filter(c => P.includes(ckey(c))).sort((a, b) => P.indexOf(ckey(a)) - P.indexOf(ckey(b)));
  if (!list.length) return '';
  return '<section class="area"><header><h3>' + UI.pinOn + 'Pinned links</h3><p>Pinned in this browser. Pin or unpin any link in the catalog.</p></header>' + clist(list) + '</section>';
}
function catalogHtml() {
  const one = S.view.startsWith('cat:') ? S.view.slice(4) : '';
  const all = citems().filter(c => !one || c.category === one);
  const vis = all.filter(c => (S.ctype === 'all' || c.type === S.ctype) && cmatches(c, S.q));
  const chip = (v, l) => '<button type="button" class="chip" data-ctype="' + v + '" aria-pressed="' + (S.ctype === v) + '">' + esc(l) + '</button>';
  const present = Object.keys(TYPES).filter(k => all.some(c => c.type === k));
  let h = '<div class="hero slim"><div><h2>Catalog</h2><p>Links to the trackers, briefings and references used around the office. Office files open in their desktop app.</p></div>'
    + '<div class="stats"><div class="stat"><b>' + citems().length + '</b><span>links</span></div><div class="stat"><b>' + cats().length + '</b><span>categories</span></div></div></div>';
  if (!one && !S.q) h += pinnedHtml();
  h += '<div class="bar" role="group" aria-label="Show by type"><span class="lbl">Type</span>' + chip('all', 'All') + present.map(k => chip(k, TYPES[k].label)).join('')
    + '<span class="shown" role="status">' + vis.length + ' of ' + all.length + ' links' + (S.q ? ' matching “' + esc(S.q) + '”' : '') + '</span></div>';
  const groups = one ? cats().filter(k => k.id === one) : cats().concat([{ id: '', name: 'Other', blurb: '' }]);
  let any = false;
  for (const g of groups) {
    const list = vis.filter(c => g.id ? c.category === g.id : !catOf(c)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!list.length) continue;
    any = true;
    h += '<section class="area"><header><h3>' + esc(g.name) + ' <span class="hn">' + list.length + '</span></h3>' + (g.blurb ? '<p>' + esc(g.blurb) + '</p>' : '') + '</header>' + clist(list) + '</section>';
  }
  if (!any) h += '<div class="empty">' + (S.q ? 'No link matches “' + esc(S.q) + '”. Try fewer words, or clear the search (Esc).' : 'No links here yet. Add them to src/catalog.js.') + '</div>';
  return h;
}

function mainHtml() {
  if (S.view === 'cat' || S.view.startsWith('cat:')) return catalogHtml();
  const vis = visible();
  const chip = (v, l) => '<button type="button" class="chip" data-status="' + v + '" aria-pressed="' + (S.status === v) + '">' + esc(l) + '</button>';
  let h = '';
  if (S.view === 'all' && !S.q) h += heroHtml() + recentHtml() + pinnedHtml();
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
  // a search from the home view looks through the catalog too
  const cm = S.view === 'all' && S.q ? citems().filter(c => cmatches(c, S.q)) : [];
  if (!any && !cm.length) h += '<div class="empty">' + (S.q ? 'Nothing matches “' + esc(S.q) + '”. Try fewer words, or clear the search (Esc).' : 'No tools here yet.') + '</div>';
  if (cm.length) h += '<section class="area"><header><h3>From the catalog <span class="hn">' + cm.length + '</span></h3></header>' + clist(cm) + '</section>';
  return h;
}

function draw() {
  document.getElementById('rail').innerHTML = railHtml();
  document.getElementById('main').innerHTML = mainHtml() + '<footer class="foot">To add a tool or change a link, edit <code>src/tools.js</code>; to add a link, <code>src/catalog.js</code>. Then rebuild. This page holds no data.</footer>';
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
async function copyCat(k) {
  const c = citems().find(x => ckey(x) === k);
  if (c && linkOk(c.url)) return copyLink({ name: c.name, url: c.url });
}
function togglePin(k) {
  const P = pins(), i = P.indexOf(k);
  if (i >= 0) P.splice(i, 1); else P.push(k);
  store.set('pins', P); draw();
  document.querySelector('[data-pin="' + CSS.escape(k) + '"]')?.focus();
  toast(i >= 0 ? 'Unpinned' : 'Pinned to the top');
}
async function copyLink(t) {
  const u = t.url.trim();
  try { await navigator.clipboard.writeText(u); toast('Link to ' + t.name + ' copied'); return; } catch {}
  // a browser that refuses the clipboard: put the link in a box the person can copy from
  window.prompt('Copy the link to ' + t.name + ':', u);
}


// the maintainer copy adds src/maint.js (the Settings panel); the team copy has none of it, so this is false there
const HAS_MAINT = typeof openSettings === 'function';

function boot() {
  document.getElementById('app').innerHTML =
    '<header class="top"><h1 class="brand">' + ICONS.hub() + '<span>' + esc(DASH.title) + '</span><span class="bs">' + esc(DASH.subtitle) + '</span></h1>'
    + '<div class="search" role="search">' + UI.search + '<label class="vh" for="q">Search the tools and the catalog</label>'
    + '<input id="q" type="search" placeholder="Search tools and links" autocomplete="off"><kbd>/</kbd></div>'
    + (HAS_MAINT ? '<button type="button" class="gear" id="gear" aria-haspopup="dialog" title="Settings: latest versions">' + UI.gear + '<span>Settings</span></button>' : '')
    + '</header>' + (HAS_MAINT ? '<div class="maint" role="note">Maintainer copy: keep this file to yourself. The team opens sustainment-dashboard.html.</div>' : '')
    + '<div class="shell"><nav class="rail" id="rail" aria-label="Tools and catalog"></nav><main id="main" tabindex="-1"></main></div>'
    + '<div class="toast" id="toast" role="status" hidden></div>'
    + (HAS_MAINT ? '<dialog class="sdlg" id="sdlg" aria-labelledby="sdlgT"></dialog>' : '');
  const q = document.getElementById('q');
  q.addEventListener('input', () => { S.q = q.value.trim(); draw(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== q && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
    else if (e.key === 'Escape' && document.activeElement === q && q.value) { q.value = ''; S.q = ''; draw(); }
  });
  document.addEventListener('click', e => {
    if (HAS_MAINT && e.target.closest('#gear')) { openSettings(); return; }
    const v = e.target.closest('[data-view]');
    if (v) { S.view = v.dataset.view; store.set('view', S.view); draw(); document.querySelector('[data-view="' + CSS.escape(S.view) + '"]')?.focus(); return; }
    const s = e.target.closest('[data-status]');
    if (s) { S.status = s.dataset.status; store.set('status', S.status); draw(); document.querySelector('[data-status="' + CSS.escape(S.status) + '"]')?.focus(); return; }
    const ct = e.target.closest('[data-ctype]');
    if (ct) { S.ctype = ct.dataset.ctype; store.set('ctype', S.ctype); draw(); document.querySelector('[data-ctype="' + CSS.escape(S.ctype) + '"]')?.focus(); return; }
    const pn = e.target.closest('[data-pin]');
    if (pn) { togglePin(pn.dataset.pin); return; }
    const cc = e.target.closest('[data-ccopy]');
    if (cc) { copyCat(cc.dataset.ccopy); return; }
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
