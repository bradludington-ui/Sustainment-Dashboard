#!/usr/bin/env node
// npm run a11y: Section 508 (WCAG 2.0 A and AA, which 36 CFR 1194 adopts) plus the 2.1/2.2 AA rules, measured with
// axe-core in Chromium on what the browser actually painted: every view of the team copy (filled with stand-in links,
// pins, a dated training, an announcement), the Help box, search results, and the maintainer copy while editing with a
// box open. Every finding names its rule and where it is. Exit 1 on any finding.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const D = mkdtempSync(join(tmpdir(), 'sdash-a11y-'));
const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
// the same page, with a fuller catalog so every kind of row, card and strip is on screen
function filled(file) {
  return readFileSync(join(ROOT, file), 'utf8').replace(/(<script id="catData" type="application\/json">)([\s\S]*?)(<\/script>)/, (m, a, j, b) => {
    const c = JSON.parse(j), u = 'https://example.invalid/x';
    c.meta.contact = 'office@example.invalid'; c.meta.updated = new Date().toISOString();
    c.items = c.items.map(x => ({ ...x, url: u })).concat([
      { name: 'Session one', note: 'Topic: one', category: 'training', type: 'video', url: u, date: iso(-9) },
      { name: 'Session two', note: 'Topic: two', category: 'training', type: 'teams', url: u, date: iso(5) },
      { name: 'myPay', note: 'LES', category: 'af', type: 'web', url: u, keywords: 'pay' },
      { name: 'MyNavy HR', note: '', category: 'navy', type: 'web', url: u },
      { name: 'DD 448', note: 'MIPR', category: 'forms', type: 'form', url: u },
      { name: 'Not linked yet', note: '', category: 'reference', type: 'word', url: '' }]);
    c.notices = [{ text: 'An announcement', date: iso(0), url: u }];
    return a + JSON.stringify(c).replace(/</g, '\\u003c') + b;
  });
}
const team = join(D, 'team.html'), maint = join(D, 'maint.html');
writeFileSync(team, filled('sustainment-dashboard.html')); writeFileSync(maint, filled('maintainer/sustainment-dashboard-maintainer.html'));
const b = await chromium.launch();
const found = new Map();   // rule|target -> finding, so one problem on every row is one line with a count
async function scan(page, where) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations
    .map(v => ({ id: v.id, help: v.help, impact: v.impact, nodes: v.nodes.map(n => n.target.join(' ') + (n.failureSummary ? ' :: ' + n.failureSummary.split('\n').slice(1, 2).join('').trim() : '')) })));
  for (const v of r) for (const n of v.nodes) {
    const k = v.id + '|' + n.replace(/:nth-child\(\d+\)/g, '');
    const f = found.get(k) || { rule: v.id, help: v.help, impact: v.impact, where: new Set(), node: n, count: 0 };
    f.where.add(where); f.count++; found.set(k, f);
  }
}
for (const [w, h] of [[1366, 768], [420, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(pathToFileURL(team).href);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sdash.pins', JSON.stringify(['c:training-schedule', 'c:mypay'])); localStorage.setItem('sdash.recent', JSON.stringify(['c:dd-448'])); });
  await p.reload();
  await scan(p, w + ' Everything');
  for (const tab of ['tools', 'files', 'web', 'forms', 's:af', 's:training', 'gloss']) { await p.click('.tabs [data-tab="' + tab + '"]'); await scan(p, w + ' ' + tab); }
  await p.click('.tabs [data-tab="all"]'); await p.fill('#q', 'pay'); await p.dispatchEvent('#q', 'input'); await scan(p, w + ' search');
  await p.fill('#q', ''); await p.dispatchEvent('#q', 'input');
  await p.click('#helpBtn'); await p.click('#hdlg summary'); await scan(p, w + ' Help'); await p.keyboard.press('Escape');
  await p.close();
}
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('dialog', d => d.accept());
  await p.goto(pathToFileURL(maint).href); await p.evaluate(() => localStorage.clear()); await p.reload();
  await scan(p, 'maintainer');
  await p.click('[data-e="toggle"]'); await scan(p, 'maintainer editing');
  await p.click('[data-e="addLink"][data-s="trackers"]'); await scan(p, 'link box'); await p.keyboard.press('Escape');
  await p.click('[data-e="paste"]'); await scan(p, 'paste box'); await p.keyboard.press('Escape');
  await p.click('[data-e="checkList"]'); await scan(p, 'needs checking'); await p.keyboard.press('Escape');
  await p.click('#gear'); await scan(p, 'settings'); await p.keyboard.press('Escape');
  await p.close();
}
await b.close();
if (!found.size) { console.log('a11y: no findings (WCAG 2.0/2.1/2.2 A and AA, axe-core), team copy at 1366 and 420 in every tab, and the maintainer copy while editing'); process.exit(0); }
for (const f of found.values()) console.log('[' + f.impact + '] ' + f.rule + ' — ' + f.help + '\n   ' + f.node.slice(0, 220) + '\n   seen in: ' + [...f.where].join(', ') + (f.count > 1 ? ' (' + f.count + '×)' : ''));
console.log(found.size + ' FINDING(S)'); process.exit(1);
