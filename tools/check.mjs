#!/usr/bin/env node
// npm run check: what must hold before every commit.
//  1. the built file is exactly what src/ builds
//  2. the tool list is well formed: known areas, statuses and icons, unique ids, every link https or empty
//  3. the page loads nothing from anywhere: no external script, stylesheet, image or font, and the CSP is in place
//  4. the scripts parse
//  5. the team copy carries no GitHub address and no source list; the maintainer copy's source list is well formed
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { assemble, OUT, OUT_MAINT, FENCE_A, FENCE_B, catalogJson } from '../build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const fail = m => fails.push(m);

// 1
let built = '';
try { built = readFileSync(OUT, 'utf8'); } catch {}
if (built !== assemble()) fail('sustainment-dashboard.html is not what src/ builds (run npm run build)');
let builtM = '';
try { builtM = readFileSync(OUT_MAINT, 'utf8'); } catch {}
if (builtM !== assemble({ maintainer: true })) fail('maintainer/sustainment-dashboard-maintainer.html is not what src/ builds (run npm run build)');

// 2
const ctx = {};
try { vm.runInNewContext(readFileSync(join(ROOT, 'src/tools.js'), 'utf8') + '\n;this.DASH = DASH;', ctx); } catch (e) { fail('src/tools.js does not run: ' + e.message); }
const D = ctx.DASH;
if (D) {
  const STATUS = ['live', 'dev', 'planned'];
  const ICONS = ['orbit', 'apex', 'contract', 'budget', 'chart', 'doc', 'grid'];
  const areas = new Set();
  for (const a of D.areas || []) {
    if (!a.id || !a.name) fail('an area has no id or name: ' + JSON.stringify(a));
    if (areas.has(a.id)) fail('area id used twice: ' + a.id);
    areas.add(a.id);
  }
  const ids = new Set();
  const okUrl = u => u === '' || /^https:\/\/[^\s"'<>]+$/i.test(String(u).trim());
  for (const t of D.tools || []) {
    const who = 'tool ' + JSON.stringify(t.id || t.name || '?');
    if (!/^[a-z0-9-]+$/.test(t.id || '')) fail(who + ': id must be lower case letters, digits and hyphens');
    if (ids.has(t.id)) fail(who + ': id used twice');
    ids.add(t.id);
    if (!t.name) fail(who + ': no name');
    if (!t.tagline) fail(who + ': no tagline');
    if (!areas.has(t.area)) fail(who + ': area "' + t.area + '" is not in areas (' + [...areas].join(', ') + ')');
    if (!STATUS.includes(t.status)) fail(who + ': status "' + t.status + '" is not one of ' + STATUS.join(', '));
    if (!ICONS.includes(t.icon)) fail(who + ': icon "' + t.icon + '" is not one of ' + ICONS.join(', '));
    if (typeof t.url !== 'string' || !okUrl(t.url)) fail(who + ': url must be an https:// link, or "" until there is one');
    if ((t.features || []).length > 4) fail(who + ': at most four features (the card shows four)');
  }
  if (D.links) fail('src/tools.js still has `links`: links belong in src/catalog.js');
}

// 2b. the catalog
const cx = {};
try { vm.runInNewContext(readFileSync(join(ROOT, 'src/catalog.js'), 'utf8') + '\n;this.CATALOG = CATALOG;', cx); } catch (e) { fail('src/catalog.js does not run: ' + e.message); }
const C = cx.CATALOG;
if (C) {
  const TYPES = ['excel', 'powerpoint', 'word', 'pdf', 'form', 'video', 'sharepoint', 'teams', 'folder', 'web'];
  const okUrl = u => u === '' || /^https:\/\/[^\s"'<>]+$/i.test(String(u).trim());
  const cids = new Set();
  for (const k of C.categories || []) {
    if (!/^[a-z0-9-]+$/.test(k.id || '') || !k.name) fail('catalog category needs an id (lower case, digits, hyphens) and a name: ' + JSON.stringify(k));
    if (cids.has(k.id)) fail('catalog category id used twice: ' + k.id);
    if (k.tab !== undefined && typeof k.tab !== 'boolean') fail('catalog section ' + k.id + ': tab must be true or false');
    if (k.tabName !== undefined && (typeof k.tabName !== 'string' || k.tabName.length > 24)) fail('catalog section ' + k.id + ': tabName must be text of at most 24 characters');
    cids.add(k.id);
  }
  const keys = new Set();
  const terms = new Set();
  for (const g of C.glossary || []) {
    if (!g.term || !g.meaning) fail('a glossary entry needs a term and a meaning: ' + JSON.stringify(g).slice(0, 80));
    if (terms.has(String(g.term).toLowerCase())) fail('glossary term listed twice: ' + g.term);
    terms.add(String(g.term).toLowerCase());
    if (g.url !== undefined && !okUrl(g.url)) fail('glossary ' + g.term + ': url must be https://');
  }
  for (const n of C.notices || []) if (!n.text || !/^\d{4}-\d{2}-\d{2}$/.test(n.date || '')) fail('an announcement needs text and a date: ' + JSON.stringify(n).slice(0, 80));
  if (C.meta && C.meta.contact && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(C.meta.contact)) fail('meta.contact is not an email address');
  for (const c of C.items || []) {
    const who = 'catalog link ' + JSON.stringify(c.name || '?');
    if (!c.name) fail(who + ': no name');
    const key = c.id || String(c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (c.id && !/^[a-z0-9-]+$/.test(c.id)) fail(who + ': id must be lower case letters, digits and hyphens');
    if (keys.has(key)) fail(who + ': the same name (or id) is used twice; pins could not tell them apart');
    keys.add(key);
    if (!cids.has(c.category)) fail(who + ': category "' + c.category + '" is not in categories (' + [...cids].join(', ') + ')');
    if (!TYPES.includes(c.type)) fail(who + ': type "' + c.type + '" is not one of ' + TYPES.join(', '));
    if (typeof c.url !== 'string' || !okUrl(c.url)) fail(who + ': url must be an https:// link, or "" until there is one');
    if (c.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) fail(who + ': date must be YYYY-MM-DD');
  }
}

// 3
if (!/<meta http-equiv="Content-Security-Policy" content="default-src 'none';/.test(built)) fail('the Content-Security-Policy is missing or changed');
for (const re of [/<script[^>]{0,400}\bsrc\s*=/i, /<link[^>]{0,400}rel="?stylesheet/i, /<img[^>]{0,400}\bsrc\s*=\s*"?https?:/i, /@import/i, /url\(\s*['"]?https?:/i])
  if (re.test(built)) fail('the page references something outside itself: ' + re);

// 4
for (const m of built.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  try { new vm.Script(m[1]); } catch (e) { fail('a script does not parse: ' + e.message); }
}

// 5
if (built.includes(FENCE_A) || built.includes(FENCE_B)) fail('a maintainer fence survived into the team copy');
const fa = builtM.split(FENCE_A).length - 1, fb = builtM.split(FENCE_B).length - 1;
if (fa !== fb || fa < 2) fail('the maintainer copy has ' + fa + ' fence openings and ' + fb + ' closings (expected the same number, at least 2)');
for (const [nm, html] of [['team copy', built], ['maintainer copy', builtM]]) {
  const m = /<script id="catData" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) { fail('the ' + nm + ' has no catalog block'); continue; }
  try { JSON.parse(m[1]); } catch (e) { fail('the ' + nm + '’s catalog block is not JSON: ' + e.message); }
  if (m[1] !== catalogJson()) fail('the ' + nm + '’s catalog block is not src/catalog.js');
}
if (/github/i.test(built)) fail('the team copy (sustainment-dashboard.html) mentions GitHub: download links belong in src/sources.js, which only the maintainer copy carries');
if (/\bSOURCES\b|(sources|maint)\.js =====|function openSettings|function settingsHtml/.test(built)) fail('the team copy carries the source list or the Settings panel');
for (const m of builtM.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  try { new vm.Script(m[1]); } catch (e) { fail('a maintainer script does not parse: ' + e.message); }
}
const sx = {};
try { vm.runInNewContext(readFileSync(join(ROOT, 'src/sources.js'), 'utf8') + '\n;this.SOURCES = SOURCES;', sx); } catch (e) { fail('src/sources.js does not run: ' + e.message); }
if (sx.SOURCES && D) {
  const known = new Set(['hub', ...(D.tools || []).map(t => t.id)]);
  for (const [k, v] of Object.entries(sx.SOURCES)) {
    if (!known.has(k)) fail('src/sources.js: "' + k + '" is no tool id in tools.js (nor "hub")');
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v.repo || '')) fail('src/sources.js: ' + k + '.repo must be owner/name');
    if (!v.path || /\.\.|^\//.test(v.path) || !/^[A-Za-z0-9_./-]+$/.test(v.path)) fail('src/sources.js: ' + k + '.path must be a file path from the repository root');
    if (v.branch && !/^[A-Za-z0-9_./-]+$/.test(v.branch)) fail('src/sources.js: ' + k + '.branch is not a branch name');
  }
}

if (fails.length) { console.error('CHECK FAILED\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('check passed: ' + (D.tools || []).length + ' tools, ' + (D.areas || []).length + ' areas, ' + ((C && C.items) || []).length + ' catalog links; '
  + Object.keys(sx.SOURCES || {}).length + ' sources in the maintainer copy, none in the team copy');
