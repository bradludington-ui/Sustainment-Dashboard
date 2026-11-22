#!/usr/bin/env node
// npm run check: what must hold before every commit.
//  1. the built file is exactly what src/ builds
//  2. the tool list is well formed: known areas, statuses and icons, unique ids, every link https or empty
//  3. the page loads nothing from anywhere: no external script, stylesheet, image or font, and the CSP is in place
//  4. the scripts parse
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { assemble, OUT } from '../build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const fail = m => fails.push(m);

// 1
let built = '';
try { built = readFileSync(OUT, 'utf8'); } catch {}
if (built !== assemble()) fail('sustainment-dashboard.html is not what src/ builds (run npm run build)');

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
  for (const l of D.links || []) {
    if (!l.name) fail('a quick link has no name');
    if (typeof l.url !== 'string' || !okUrl(l.url)) fail('quick link "' + l.name + '": url must be an https:// link or ""');
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

if (fails.length) { console.error('CHECK FAILED\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('check passed: ' + (D.tools || []).length + ' tools, ' + (D.areas || []).length + ' areas, ' + (D.links || []).length + ' quick links');
