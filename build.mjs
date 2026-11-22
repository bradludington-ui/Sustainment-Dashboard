#!/usr/bin/env node
// Builds the Sustainment Dashboard: one self-contained file, sustainment-dashboard.html, from src/.
//
//   node build.mjs           write sustainment-dashboard.html and maintainer/sustainment-dashboard-maintainer.html
//   node build.mjs --check   exit 1 if either committed file is not exactly what src/ builds
//
// TWO COPIES. sustainment-dashboard.html is the team's, uploaded to Teams. The maintainer copy is the same page with
// src/sources.js and src/maint.js added: a Settings gear and the GitHub download links. The links are left OUT of the team copy, never
// hidden in it, because anything in a file can be read with View Source. tools/check.mjs fails if one gets in.
//
// src/shell.html has three markers: /*@CSS@*/ takes src/style.css, /*@JS@*/ takes src/tools.js, src/catalog.js then src/app.js, and
// /*@FAVICON@*/ takes the hub's mark as a data: address. Nothing else is changed. One file, because it is opened from
// Teams by downloading it: a page that needed a second file beside it would open broken.
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
export const OUT = join(HERE, 'sustainment-dashboard.html');
export const OUT_MAINT = join(HERE, 'maintainer', 'sustainment-dashboard-maintainer.html');
const JS_FILES = ['tools.js', 'sources.js', 'maint.js', 'app.js'];
// fenced: in the maintainer copy only. The team copy is the maintainer copy with every fence cut out (teamOf), and the
// maintainer page's own Save team copy cuts the same fences the same way, so the two can never drift apart.
const FENCED = new Set(['sources.js', 'maint.js']);
export const FENCE_A = '/*@' + 'MAINT>*/', FENCE_B = '/*<' + 'MAINT@*/';
const TITLE_M = '<title>Sustainment Dashboard (maintainer)</title>', TITLE_T = '<title>Sustainment Dashboard</title>';
export function teamOf(html) {
  let out = '', i = 0, j;
  while ((j = html.indexOf(FENCE_A, i)) >= 0) {
    const k = html.indexOf(FENCE_B, j);
    if (k < 0) throw new Error('a maintainer fence is opened and never closed');
    out += html.slice(i, j); i = k + FENCE_B.length;
  }
  return (out + html.slice(i)).replace(TITLE_M, TITLE_T);
}
// the catalog a fresh build starts with, as the data block the page reads (every < escaped, so a link or note holding
// "</script>" can never end the block early)
export function catalogJson() {
  const ctx = {};
  vm.runInNewContext(readFileSync(join(SRC, 'catalog.js'), 'utf8') + '\n;this.CATALOG = CATALOG;', ctx);
  return JSON.stringify(ctx.CATALOG).replace(/</g, '\\u003c');
}

// ring, satellite and four tiles, colours baked (a favicon has no page colour to inherit). Every character a URL or the
// HTML parser would read differently is percent-encoded.
const FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><mask id="f"><rect width="100" height="100" fill="#fff"/><circle cx="80.21" cy="26.4" r="16.3" fill="#000"/></mask>'
  + '<circle cx="50" cy="50" r="38.33" fill="none" stroke="#25394d" stroke-width="13" mask="url(#f)"/>'
  + '<g fill="#25394d"><rect x="34" y="34" width="14" height="14" rx="3"/><rect x="52" y="34" width="14" height="14" rx="3"/><rect x="34" y="52" width="14" height="14" rx="3"/><rect x="52" y="52" width="14" height="14" rx="3"/></g>'
  + '<circle cx="80.21" cy="26.4" r="10.75" fill="#055795"/></svg>';
const favicon = () => 'data:image/svg+xml,' + FAVICON_SVG.replace(/[%#<>"'&\s]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));

export function assemble({ maintainer = false } = {}) {
  if (!maintainer) return teamOf(assemble({ maintainer: true }));
  const shell = readFileSync(join(SRC, 'shell.html'), 'utf8');
  for (const m of ['/*@CSS@*/', '/*@JS@*/', '/*@FAVICON@*/', '/*@CATALOG@*/']) if (!shell.includes(m)) throw new Error('shell.html has lost its ' + m + ' marker');
  const css = readFileSync(join(SRC, 'style.css'), 'utf8').replace(/\s*$/, '');
  const js = JS_FILES.map(f => {
    const code = readFileSync(join(SRC, f), 'utf8');
    if (/<\/script/i.test(code)) throw new Error(f + ' contains a closing script tag; write it as <\\/script in a string');
    const body = '// ===== ' + f + ' =====\n' + code.replace(/\s*$/, '\n');
    if (code.includes(FENCE_A) || code.includes(FENCE_B)) throw new Error(f + ' contains a fence marker; build it from pieces');
    return FENCED.has(f) ? FENCE_A + '\n' + body + FENCE_B + '\n' : body;
  }).join('\n').replace(/\s*$/, '');
  // function replacements, so a "$&" in the sources is never read as a replacement pattern
  const page = shell.replace(TITLE_T, TITLE_M);
  return page.replace('/*@CATALOG@*/', () => catalogJson()).replace('/*@FAVICON@*/', () => favicon()).replace('/*@CSS@*/', () => css).replace('/*@JS@*/', () => js);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outs = [[OUT, assemble()], [OUT_MAINT, assemble({ maintainer: true })]];
  const rel = f => f.slice(HERE.length + 1);
  if (process.argv.includes('--check')) {
    let bad = 0;
    for (const [f, html] of outs) {
      let have = '';
      try { have = readFileSync(f, 'utf8'); } catch {}
      if (have !== html) { console.error(rel(f) + ' is not what src/ builds. Run: npm run build'); bad = 1; }
      else console.log(rel(f) + ' is current (' + html.length.toLocaleString() + ' characters)');
    }
    if (bad) process.exit(1);
  } else {
    mkdirSync(dirname(OUT_MAINT), { recursive: true });
    for (const [f, html] of outs) { writeFileSync(f + '.tmp', html); renameSync(f + '.tmp', f); console.log('wrote ' + rel(f) + ' (' + html.length.toLocaleString() + ' characters)'); }
  }
}
