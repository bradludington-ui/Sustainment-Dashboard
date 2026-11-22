#!/usr/bin/env node
// Builds the Sustainment Dashboard: one self-contained file, sustainment-dashboard.html, from src/.
//
//   node build.mjs           write sustainment-dashboard.html
//   node build.mjs --check   exit 1 if the committed file is not exactly what src/ builds
//
// src/shell.html has three markers: /*@CSS@*/ takes src/style.css, /*@JS@*/ takes src/tools.js then src/app.js, and
// /*@FAVICON@*/ takes the hub's mark as a data: address. Nothing else is changed. One file, because it is opened from
// Teams by downloading it: a page that needed a second file beside it would open broken.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
export const OUT = join(HERE, 'sustainment-dashboard.html');
const JS_FILES = ['tools.js', 'app.js'];

// ring, satellite and four tiles, colours baked (a favicon has no page colour to inherit). Every character a URL or the
// HTML parser would read differently is percent-encoded.
const FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><mask id="f"><rect width="100" height="100" fill="#fff"/><circle cx="80.21" cy="26.4" r="16.3" fill="#000"/></mask>'
  + '<circle cx="50" cy="50" r="38.33" fill="none" stroke="#25394d" stroke-width="13" mask="url(#f)"/>'
  + '<g fill="#25394d"><rect x="34" y="34" width="14" height="14" rx="3"/><rect x="52" y="34" width="14" height="14" rx="3"/><rect x="34" y="52" width="14" height="14" rx="3"/><rect x="52" y="52" width="14" height="14" rx="3"/></g>'
  + '<circle cx="80.21" cy="26.4" r="10.75" fill="#055795"/></svg>';
const favicon = () => 'data:image/svg+xml,' + FAVICON_SVG.replace(/[%#<>"'&\s]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));

export function assemble() {
  const shell = readFileSync(join(SRC, 'shell.html'), 'utf8');
  for (const m of ['/*@CSS@*/', '/*@JS@*/', '/*@FAVICON@*/']) if (!shell.includes(m)) throw new Error('shell.html has lost its ' + m + ' marker');
  const css = readFileSync(join(SRC, 'style.css'), 'utf8').replace(/\s*$/, '');
  const js = JS_FILES.map(f => {
    const code = readFileSync(join(SRC, f), 'utf8');
    if (/<\/script/i.test(code)) throw new Error(f + ' contains a closing script tag; write it as <\\/script in a string');
    return '// ===== ' + f + ' =====\n' + code.replace(/\s*$/, '\n');
  }).join('\n').replace(/\s*$/, '');
  // function replacements, so a "$&" in the sources is never read as a replacement pattern
  return shell.replace('/*@FAVICON@*/', () => favicon()).replace('/*@CSS@*/', () => css).replace('/*@JS@*/', () => js);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const html = assemble();
  if (process.argv.includes('--check')) {
    let have = '';
    try { have = readFileSync(OUT, 'utf8'); } catch {}
    if (have !== html) { console.error('sustainment-dashboard.html is not what src/ builds. Run: npm run build'); process.exit(1); }
    console.log('sustainment-dashboard.html is current (' + html.length.toLocaleString() + ' characters)');
  } else {
    writeFileSync(OUT + '.tmp', html); renameSync(OUT + '.tmp', OUT);
    console.log('wrote sustainment-dashboard.html (' + html.length.toLocaleString() + ' characters)');
  }
}
