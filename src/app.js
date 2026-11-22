'use strict';
// Sustainment Dashboard: draws the tool list (tools.js) and the catalog of links (catalog.js) as a page. Nothing here
// holds data; the page reads DASH and CATALOG and remembers, in this browser only, which tab was chosen, which links are
// pinned and what was opened lately.

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
  edit: glyph('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  trash: glyph('<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
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
  form:       { label: 'Form',       mark: 'F' },
  sharepoint: { label: 'SharePoint', mark: 'S' },
  teams:      { label: 'Teams',      mark: 'T' },
  folder:     { label: 'Folder',     mark: '▤' },
  web:        { label: 'Web',        mark: '◎' },
};

// ---- the catalog: read from the data block in the file (id="catData"), never from code, so a saved file carries its
// own links. normCatalog() is the one reading of a catalog, for this file and for one imported from another copy: it
// keeps what it can show and drops nothing silently (what it changed is listed in .fixed).
function normCatalog(raw) {
  const fixed = [], str = v => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim();
  const out = { categories: [], items: [] };
  const seen = new Set();
  for (const k of (raw && Array.isArray(raw.categories) ? raw.categories : [])) {
    const name = str(k && k.name); let id = str(k && k.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (!name) { fixed.push('a section with no name was left out'); continue; }
    if (!id) id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    while (seen.has(id)) id += '-2';
    seen.add(id);
    const sec = { id, name, blurb: str(k.blurb) };
    if (k.tab === true) { sec.tab = true; if (str(k.tabName)) sec.tabName = str(k.tabName).slice(0, 24); }
    out.categories.push(sec);
  }
  for (const c of (raw && Array.isArray(raw.items) ? raw.items : [])) {
    const name = str(c && c.name);
    if (!name) { fixed.push('a link with no name was left out'); continue; }
    const it = { name, note: str(c.note), category: str(c.category), type: str(c.type), url: str(c.url) };
    if (c.id) it.id = str(c.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (!TYPES[it.type]) { fixed.push('“' + name + '”: type “' + it.type + '” read as Web'); it.type = 'web'; }
    if (it.url && !linkOk(it.url)) { fixed.push('“' + name + '”: its link is not https:// and was set aside (' + it.url.slice(0, 80) + ')'); it.url = ''; }
    if (!seen.has(it.category)) fixed.push('“' + name + '”: section “' + it.category + '” does not exist; listed under Other');
    out.items.push(it);
  }
  out.fixed = fixed;
  return out;
}
function readCatalog() {
  try { const el = document.getElementById('catData'); return normCatalog(JSON.parse(el ? el.textContent : 'null') || {}); }
  catch (e) { const c = normCatalog({}); c.fixed.push('the catalog in this file could not be read (' + e.message + ')'); return c; }
}
let CATALOG = readCatalog();
// the maintainer copy's editor plugs in here (src/maint.js); the team copy has no MAINT_HOOKS, so every hook draws nothing
const HOOK = (name, ...a) => (typeof MAINT_HOOKS !== 'undefined' && typeof MAINT_HOOKS[name] === 'function') ? MAINT_HOOKS[name](...a) : '';
const editing = () => !!HOOK('editing');

// ---- state. The page is one view with tabs (layout D, chosen by Brad 22 Nov 2026): the welcome band with the search,
// tabs along its foot, then pinned tiles, the tools and the catalog as section cards.
//   tab: 'all' | 'tools' | 'files' | 'web' | 'forms' | 's:<section id>' (a section marked as a tab, e.g. Air Force, Navy)
const KIND = {   // the tabs that gather links by what they are, whatever section they sit in
  files: { label: 'Files',    types: ['excel', 'powerpoint', 'word', 'pdf', 'folder'] },
  web:   { label: 'Websites', types: ['web', 'sharepoint', 'teams'] },
  forms: { label: 'Forms',    types: ['form'] },
};
// each section's colour: the starting sections have their own; any other takes one from the palette by its id, so it
// keeps its colour when sections are reordered. White text clears 4.5:1 on every one.
const SEC_COLOR = { trackers: '#1d6f42', briefings: '#b7472a', forms: '#7a4a08', websites: '#055795', af: '#25394d', navy: '#1f3f73', reference: '#5d6878', sites: '#036c70' };
const SEC_PALETTE = ['#055795', '#1d6f42', '#7a4a08', '#8c1d3f', '#036c70', '#4b53bc', '#25394d', '#5d6878', '#b7472a'];
const secColor = id => SEC_COLOR[id] || SEC_PALETTE[[...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % SEC_PALETTE.length];
const S = {
  tab: String(store.get('tab', 'all')),
  status: store.get('status', 'all'),
  q: '',
};
const areas = () => DASH.areas || [];
const tools = () => (DASH.tools || []).slice();
const areaOf = t => areas().find(a => a.id === t.area);
const cats = () => CATALOG.categories || [];
const citems = () => (CATALOG.items || []).slice();
const catOf = c => cats().find(k => k.id === c.category);
const ckey = c => 'c:' + (c.id || String(c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
const tabSecs = () => cats().filter(k => k.tab);
const tabOk = v => v === 'all' || v === 'tools' || !!KIND[v] || (v.startsWith('s:') && tabSecs().some(k => 's:' + k.id === v));
if (!tabOk(S.tab)) S.tab = 'all';
if (S.status !== 'all' && !STATUS[S.status]) S.status = 'all';
const pins = () => { const p = store.get('pins', []); return Array.isArray(p) ? p : []; };
// the links the tab on screen covers
function tabLinks(tab) {
  const all = citems();
  if (KIND[tab]) return all.filter(c => KIND[tab].types.includes(c.type));
  if (tab.startsWith('s:')) return all.filter(c => c.category === tab.slice(2));
  if (tab === 'tools') return [];
  return all;
}

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
const byStatus = (a, b) => ((STATUS[a.status] || { order: 9 }).order - (STATUS[b.status] || { order: 9 }).order);

// ---- how a link opens. Office files open in the desktop app (ms-excel:ofe|u|<address>), never the browser preview;
// the browser hands the address to Office and stays where it is, so no new tab. Everything else opens in a new tab.
function hrefOf(c) {
  if (!linkOk(c.url)) return null;
  const T = TYPES[c.type] || TYPES.web, url = c.url.trim();
  return T.app ? { href: T.app + ':ofe|u|' + url, tab: false, web: url, app: T.appName } : { href: url, tab: true };
}
const aOpen = (c, k, cls, inner, extra) => {
  const h = hrefOf(c);
  return '<a class="' + cls + '" href="' + esc(h.href) + '"' + (h.tab ? ' target="_blank" rel="noopener noreferrer"' : '') + ' data-open="' + esc(k) + '"' + (extra || '') + '>' + inner + '</a>';
};
const typeTile = (c, size) => { const T = TYPES[c.type] || TYPES.web; return '<span class="ctype t-' + esc(TYPES[c.type] ? c.type : 'web') + (size ? ' ' + size : '') + '" title="' + esc(T.label) + '" aria-hidden="true">' + esc(T.mark) + '</span>'; };
const pinBtn = (c, k) => { const on = pins().includes(k); return '<button type="button" class="pin" data-pin="' + esc(k) + '" aria-pressed="' + on + '" title="' + (on ? 'Unpin' : 'Pin to the top') + '" aria-label="Pin ' + esc(c.name) + '">' + (on ? UI.pinOn : UI.pin) + '</button>'; };

// ---- the tools
function card(t) {
  const st = STATUS[t.status] || { label: t.status || 'Unknown', cls: 'st-planned' };
  const ok = linkOk(t.url);
  const color = AREA_COLOR[t.area] || 'var(--a-other)';
  const feats = (t.features || []).slice(0, 4).map(f => '<li>' + hl(f) + '</li>').join('');
  const open = ok
    ? '<a class="btn pri" href="' + esc(t.url.trim()) + '" target="_blank" rel="noopener noreferrer" data-open="' + esc(t.id) + '">' + UI.open + 'Open ' + esc(t.name) + '</a>'
      + '<button type="button" class="btn" data-copy="' + esc(t.id) + '">' + UI.copy + 'Copy link</button>'
    : '<span class="btn" aria-disabled="true" role="link" title="This tool’s Teams link has not been added to the tool list yet">'
      + (t.status === 'live' ? 'Link not set' : 'Not open yet') + '</span>';
  return '<article class="card' + (ok ? '' : ' off') + '" style="--area:' + color + '" aria-labelledby="t-' + esc(t.id) + '">'
    + '<div class="head"><span class="ico">' + iconOf(t) + '</span><div><h4 id="t-' + esc(t.id) + '">' + hl(t.name) + '</h4>'
    + (t.full ? '<p class="full">' + hl(t.full) + '</p>' : '') + '</div>'
    + '<span class="st ' + st.cls + '">' + esc(st.label) + '</span></div>'
    + '<p class="tag">' + hl(t.tagline) + '</p>'
    + (feats ? '<ul class="feat" aria-label="What is inside">' + feats + '</ul>' : '')
    + '<div class="acts">' + open + '</div></article>';
}
// the slim row on Everything: one line per tool, the whole tile opens it
function toolTile(t) {
  const st = STATUS[t.status] || { label: t.status, cls: 'st-planned' }, ok = linkOk(t.url);
  const inner = '<span class="ico sm">' + iconOf(t) + '</span><span class="tt"><b>' + hl(t.name) + ' <span class="st ' + st.cls + '">' + esc(st.label) + '</span></b>'
    + '<small>' + hl(t.full || t.tagline) + '</small></span>';
  return ok
    ? '<a class="ttile" style="--area:' + (AREA_COLOR[t.area] || 'var(--a-other)') + '" href="' + esc(t.url.trim()) + '" target="_blank" rel="noopener noreferrer" data-open="' + esc(t.id) + '">' + inner + '</a>'
    : '<div class="ttile off" style="--area:' + (AREA_COLOR[t.area] || 'var(--a-other)') + '" title="' + (t.status === 'live' ? 'This tool’s Teams link has not been set yet' : 'Not open yet') + '">' + inner + '</div>';
}
function toolsTab() {
  const chip = (v, l) => '<button type="button" class="chip" data-status="' + v + '" aria-pressed="' + (S.status === v) + '">' + esc(l) + '</button>';
  const vis = tools().filter(t => (S.status === 'all' || t.status === S.status) && matches(t, S.q)).sort(byStatus);
  let h = '<div class="bar" role="group" aria-label="Show tools by status"><span class="lbl">Show</span>' + chip('all', 'All')
    + Object.keys(STATUS).filter(k => tools().some(t => t.status === k)).map(k => chip(k, STATUS[k].label)).join('')
    + '<span class="shown" role="status">' + vis.length + ' of ' + tools().length + ' tools</span></div>';
  let any = false;
  for (const a of areas().concat([{ id: '', name: 'Other', blurb: '' }])) {
    const list = vis.filter(t => a.id ? t.area === a.id : !areaOf(t));
    if (!list.length) continue;
    any = true;
    h += '<section class="area"><header><h3><span class="sw" style="background:' + (AREA_COLOR[a.id] || 'var(--a-other)') + '"></span>' + esc(a.name) + '</h3>'
      + (a.blurb ? '<p>' + esc(a.blurb) + '</p>' : '') + '</header><div class="grid">' + list.map(card).join('') + '</div></section>';
  }
  return h + (any ? '' : '<div class="empty">No tool here.</div>');
}

// ---- the catalog: a section card holds its links, each a row whose name opens it
function lrow(c) {
  const k = ckey(c), h = hrefOf(c), T = TYPES[c.type] || TYPES.web;
  const name = h ? aOpen(c, k, 'cname', hl(c.name), ' title="' + esc(T.app ? 'Opens in ' + T.app + ' desktop app' : 'Opens in a new tab') + '"') : '<span class="cname nolink" title="Link not set yet">' + hl(c.name) + '</span>';
  const web = h && h.web ? '<a class="lweb" href="' + esc(h.web) + '" target="_blank" rel="noopener noreferrer" data-open="' + esc(k) + '" title="Open in the browser instead">Browser<span class="vh"> version of ' + esc(c.name) + ' (opens in a new tab)</span></a>' : '';
  return '<li class="lrow' + (h ? '' : ' off') + '">' + typeTile(c) + '<span class="lmain">' + name
    + '<small>' + (c.note ? hl(c.note) : esc(T.label)) + (h ? '' : ' · link not set') + '</small></span>'
    + '<span class="lacts">' + web + (h ? '<button type="button" class="lic" data-ccopy="' + esc(k) + '" title="Copy link" aria-label="Copy the link to ' + esc(c.name) + '">' + UI.copy + '</button>' : '')
    + HOOK('rowActs', c, k) + pinBtn(c, k) + '</span></li>';
}
function secCard(g, list) {
  const color = g.id ? secColor(g.id) : '#5d6878';
  return '<section class="scard" style="--sc:' + color + '" aria-labelledby="sc-' + esc(g.id || 'other') + '"><header><h3 id="sc-' + esc(g.id || 'other') + '">' + esc(g.name) + '</h3>'
    + '<span class="sn">' + list.length + ' link' + (list.length === 1 ? '' : 's') + '</span>' + (g.id ? HOOK('sectionActs', g) : '') + '</header>'
    + (g.blurb && (editing() || !list.length) ? '<p class="sblurb">' + esc(g.blurb) + '</p>' : '')
    + (list.length ? '<ul class="llist">' + list.map(lrow).join('') + '</ul>' : '<p class="sempty">No links in this section yet.</p>') + '</section>';
}
function catalogCards(links, opts = {}) {
  const ed = editing() && !S.q;
  const groups = cats().concat([{ id: '', name: 'Other', blurb: '' }]);
  let h = '', n = 0;
  for (const g of groups) {
    if (opts.only && g.id !== opts.only) continue;
    const list = links.filter(c => g.id ? c.category === g.id : !catOf(c)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!list.length && !(ed && g.id && !opts.byKind) && !(opts.only && g.id === opts.only)) continue;
    n++; h += secCard(g, list);
  }
  return n ? '<div class="mason">' + h + '</div>' : '';
}

// ---- the top of Everything: recently opened and the pinned tiles
function recentHtml() {
  const ids = store.get('recent', []);
  const list = (Array.isArray(ids) ? ids : []).map(id => {
    if (String(id).startsWith('c:')) {
      const c = citems().find(x => ckey(x) === id);
      return c && hrefOf(c) ? aOpen(c, id, 'rchip', esc(c.name)) : null;
    }
    const t = tools().find(x => x.id === id);
    return t && linkOk(t.url) ? '<a class="rchip" href="' + esc(t.url.trim()) + '" target="_blank" rel="noopener noreferrer" data-open="' + esc(id) + '">' + esc(t.name) + '</a>' : null;
  }).filter(Boolean).slice(0, 6);
  return list.length ? '<div class="recent"><span class="lbl">Recently opened</span>' + list.join('') + '</div>' : '';
}
function pinnedHtml() {
  const P = pins(), list = citems().filter(c => P.includes(ckey(c))).sort((a, b) => P.indexOf(ckey(a)) - P.indexOf(ckey(b)));
  if (!list.length) return '<h2 class="sh" id="pinned">' + UI.pinOn + 'Pinned</h2><p class="pinhint">Star a link (☆) to pin it here. Pins are kept in your browser.</p>';
  return '<h2 class="sh" id="pinned">' + UI.pinOn + 'Pinned<small>your favourites, in this browser</small></h2><ul class="fav">' + list.map(c => {
    const k = ckey(c), inner = typeTile(c, 'lg') + '<span>' + esc(c.name) + '</span>';
    return '<li>' + (hrefOf(c) ? aOpen(c, k, 'ftile', inner) : '<span class="ftile off" title="Link not set yet">' + inner + '</span>')
      + '<button type="button" class="funpin" data-pin="' + esc(k) + '" aria-pressed="true" aria-label="Unpin ' + esc(c.name) + '" title="Unpin">×</button></li>';
  }).join('') + '</ul>';
}

// ---- the welcome band and its tabs
function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function tabsHtml() {
  const t = (v, label, n) => '<button type="button" class="tab" data-tab="' + esc(v) + '" aria-pressed="' + (S.tab === v) + '">' + esc(label) + '<i>' + n + '</i></button>';
  return '<div class="tabs" role="group" aria-label="Show">' + t('all', 'Everything', tools().length + citems().length) + t('tools', 'Tools', tools().length)
    + Object.keys(KIND).map(k => t(k, KIND[k].label, tabLinks(k).length)).join('')
    + tabSecs().map(g => t('s:' + g.id, g.tabName || g.name.replace(/\s+employees$/i, ''), citems().filter(c => c.category === g.id).length)).join('') + '</div>';
}

function searchHtml() {
  const scope = S.tab === 'all' ? 'everything' : S.tab === 'tools' ? 'the tools' : 'this tab';
  const ts = (S.tab === 'all' || S.tab === 'tools') ? tools().filter(t => matches(t, S.q)).sort(byStatus) : [];
  const ls = tabLinks(S.tab).filter(c => cmatches(c, S.q));
  let h = '<p class="shown big" role="status">' + (ts.length + ls.length) + ' result' + (ts.length + ls.length === 1 ? '' : 's') + ' for “' + esc(S.q) + '” in ' + scope
    + (S.tab !== 'all' ? ' · <button type="button" class="lnk" data-tab="all">search everything</button>' : '') + '</p>';
  if (ts.length) h += '<h2 class="sh">Tools</h2><div class="trow">' + ts.map(toolTile).join('') + '</div>';
  if (ls.length) h += '<h2 class="sh">Links</h2>' + catalogCards(ls, { byKind: true });
  if (!ts.length && !ls.length) h += '<div class="empty">Nothing matches. Try fewer words, or clear the search (Esc).</div>';
  return h;
}

function mainHtml() {
  if (S.q) return searchHtml();
  if (S.tab === 'tools') return toolsTab();
  if (KIND[S.tab]) {
    const ls = tabLinks(S.tab);
    return '<h2 class="sh">' + esc(KIND[S.tab].label) + '<small>' + ls.length + ' link' + (ls.length === 1 ? '' : 's') + ', by section</small></h2>'
      + (catalogCards(ls, { byKind: true }) || '<div class="empty">No ' + esc(KIND[S.tab].label.toLowerCase()) + ' in the catalog yet.</div>');
  }
  if (S.tab.startsWith('s:')) return catalogCards(tabLinks(S.tab), { only: S.tab.slice(2) });
  // Everything
  const T = tools().slice().sort(byStatus);
  return recentHtml() + pinnedHtml()
    + '<h2 class="sh">Tools<small><button type="button" class="lnk" data-tab="tools">all tools ›</button></small></h2><div class="trow">' + T.map(toolTile).join('') + '</div>'
    + '<h2 class="sh">Catalog<small>' + cats().length + ' sections · ' + citems().length + ' links</small></h2>'
    + (catalogCards(citems()) || '<div class="empty">No links yet.</div>') + (editing() ? HOOK('catalogFoot') : '');
}

function draw() {
  if (!tabOk(S.tab)) S.tab = 'all';   // a section deleted, or no longer a tab, while it was open
  HOOK('drawBar');
  document.getElementById('heroTabs').innerHTML = tabsHtml();
  document.getElementById('pinCount').textContent = pins().filter(k => citems().some(c => ckey(c) === k)).length;
  document.getElementById('main').innerHTML = mainHtml() + '<footer class="foot">This page holds no data: it is a list of links. Pins and recently opened are kept in your browser only.' + HOOK('footNote') + '</footer>';
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
  (document.querySelector('.lrow [data-pin="' + CSS.escape(k) + '"]') || document.querySelector('[data-pin="' + CSS.escape(k) + '"]') || document.getElementById('q')).focus({ preventScroll: true });
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
    '<header class="top"><h1 class="brand">' + ICONS.hub() + '<span>' + esc(DASH.title) + '</span></h1>'
    + '<div class="tr"><a class="tpill" href="#pinned">' + UI.pinOn + 'Pinned <b id="pinCount"></b></a>'
    + (HAS_MAINT ? '<button type="button" class="gear" id="gear" aria-haspopup="dialog" title="Settings: latest versions">' + UI.gear + '<span>Settings</span></button>' : '') + '</div></header>'
    + (HAS_MAINT ? '<div class="maint" id="maintBar"></div>' : '')
    + '<div class="hero2"><h2>' + greet() + '. What do you need?</h2><p>Every tool, tracker, form and website the office uses, one search away.</p>'
    + '<div class="sbox" role="search">' + UI.search + '<label class="vh" for="q">Search the tools and the catalog</label>'
    + '<input id="q" type="search" placeholder="Search tools, trackers, forms and websites" autocomplete="off"><kbd>/</kbd></div>'
    + '<nav id="heroTabs" aria-label="Show"></nav></div>'
    + '<main id="main" tabindex="-1"></main>'
    + '<div class="toast" id="toast" role="status" hidden></div>'
    + (HAS_MAINT ? '<dialog class="sdlg" id="sdlg" aria-labelledby="sdlgT"></dialog>' : '');
  HOOK('init');
  const q = document.getElementById('q');
  q.addEventListener('input', () => { S.q = q.value.trim(); draw(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== q && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); q.focus(); }
    else if (e.key === 'Escape' && document.activeElement === q && q.value) { q.value = ''; S.q = ''; draw(); }
  });
  document.addEventListener('click', e => {
    if (HAS_MAINT && e.target.closest('#gear')) { openSettings(); return; }
    const tb = e.target.closest('[data-tab]');
    if (tb) {
      S.tab = tb.dataset.tab; store.set('tab', S.tab);
      if (tb.classList.contains('lnk') && S.q === '') window.scrollTo(0, 0);
      draw(); document.querySelector('.tabs [data-tab="' + CSS.escape(S.tab) + '"]')?.focus(); return;
    }
    const s = e.target.closest('[data-status]');
    if (s) { S.status = s.dataset.status; store.set('status', S.status); draw(); document.querySelector('[data-status="' + CSS.escape(S.status) + '"]')?.focus(); return; }
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
