#!/usr/bin/env node
// npm run test: the page driven in Chromium, end to end. The catalog editor (add, change, delete, undo, sections, a
// section as a tab), a reload before saving, Save and Save team copy (as downloads), the saved team copy opened fresh
// (its links, its tabs, search, pins, no editor), markup in a name drawn as text, and Import links from a copy.
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const D = mkdtempSync(join(tmpdir(), 'sdash-test-')) + '/';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
let failed = 0;
copyFileSync(ROOT + 'maintainer/sustainment-dashboard-maintainer.html', D + 'm.html');
const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
const ok = (c, m) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
// no file-writing API, so Save falls back to a download we can read
await p.addInitScript(() => { delete window.showSaveFilePicker; });
await p.goto('file://' + D + 'm.html');
const rows = () => p.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
await p.click('[data-e="toggle"]');
ok(await p.$('[data-e="addSection"]'), 'Edit catalog shows Add a section');
ok((await p.$$eval('#main .scard h3', a => a.map(x => x.textContent))).includes('Air Force employees'), 'empty Air Force section shows while editing');
// add a link to Air Force employees, Excel guessed from the address
await p.click('[data-e="addLink"][data-s="af"]');
await p.fill('#eName', 'myPay'); await p.fill('#eUrl', 'https://mypay.dfas.mil/'); await p.fill('#eNote', 'Leave and earnings statements');
await p.click('[data-e="saveLink"]');
ok((await rows()).includes('myPay'), 'link added');
await p.click('[data-e="addLink"][data-s="trackers"]');
await p.fill('#eName', 'Tracker X'); await p.fill('#eUrl', 'https://x.sharepoint.com/:x:/r/sites/a/T.xlsx');
ok(await p.$eval('#eType', e => e.value) === 'excel', 'type guessed as Excel from the pasted link');
await p.click('[data-e="saveLink"]');
// refusals
await p.click('[data-e="addLink"][data-s="trackers"]'); await p.fill('#eName', 'Bad'); await p.fill('#eUrl', 'javascript:alert(1)'); await p.click('[data-e="saveLink"]');
ok(/https/.test(await p.$eval('#eErr', e => e.textContent)), 'a non-https link is refused');
await p.fill('#eName', 'mypay'); await p.fill('#eUrl', ''); await p.click('[data-e="saveLink"]');
ok(/already has that name/.test(await p.$eval('#eErr', e => e.textContent)), 'a repeated name is refused');
await p.click('#sdlg [data-e="close"] >> nth=0');
// pin, then rename: the pin follows
await p.click('[data-pin="c:mypay"]');
await p.click('[data-e="editLink"][data-k="c:mypay"]'); await p.fill('#eName', 'myPay (DFAS)'); await p.click('[data-e="saveLink"]');
ok((await p.$$eval('[aria-pressed=true][data-pin]', a => a.map(x => x.dataset.pin))).includes('c:mypay'), 'renamed link keeps its pin');
// delete and undo
await p.click('[data-e="delLink"][data-k="c:funds-control-tracker"]');
ok(!(await rows()).includes('Funds Control Tracker'), 'link deleted');
await p.click('[data-e="undo"]');
ok((await rows()).includes('Funds Control Tracker'), 'undo puts it back');
// sections: add, rename, move, delete with its links
await p.click('[data-e="addSection"]'); await p.fill('#sName', 'Travel'); await p.check('#sTab'); await p.click('[data-e="saveSection"]');
ok(!!(await p.$('.tabs [data-tab="s:travel"]')), 'a section marked as a tab gets a tab');
ok((await p.$$eval('#main .scard h3', a => a.map(x => x.textContent))).includes('Travel'), 'section added');
await p.click('[data-e="addLink"][data-s="travel"]'); await p.fill('#eName', 'DTS'); await p.fill('#eUrl', 'https://dtsproweb.defensetravel.osd.mil/'); await p.click('[data-e="saveLink"]');
await p.click('[data-e="mv"][data-s="travel"][data-d="-1"]');
const order = await p.$$eval('#main .scard h3', a => a.map(x => x.textContent));
ok(order.indexOf('Travel') < order.indexOf('Sites & dashboards'), 'section moved up');
// reload before saving: nothing is lost
await p.reload();
ok((await rows()).includes('myPay (DFAS)') && (await rows()).includes('DTS'), 'unsaved edits survive a reload');
ok(/Unsaved/.test(await p.$eval('#maintBar', e => e.textContent)), 'bar says unsaved');
// Save (download fallback) and Save team copy
const [dm] = await Promise.all([p.waitForEvent('download'), p.click('[data-e="save"]')]);
await dm.saveAs(D + 'm2.html');
ok(/Saved/.test(await p.$eval('#maintBar', e => e.textContent)) && !/Unsaved/.test(await p.$eval('#maintBar', e => e.textContent)), 'bar says saved after Save');
const [dt] = await Promise.all([p.waitForEvent('download'), p.click('[data-e="saveTeam"]')]);
await dt.saveAs(D + 't2.html');
const t2 = readFileSync(D + 't2.html', 'utf8'), m2 = readFileSync(D + 'm2.html', 'utf8');
ok(!/github/i.test(t2) && !t2.includes('MAINT>') && !/function openSettings/.test(t2), 'saved team copy has no GitHub, no fence, no editor');
ok(t2.includes('myPay (DFAS)') && m2.includes('myPay (DFAS)'), 'both saved files carry the new links');
// open the saved files fresh (new browser storage) and look
const ctx2 = await b.newContext(); const q = await ctx2.newPage(); q.on('pageerror', e => errs.push('saved: ' + e.message));
await q.goto('file://' + D + 't2.html');
const tr = await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
ok(tr.includes('DTS') && tr.includes('myPay (DFAS)'), 'saved team copy shows the new links');
ok(!(await q.$('#maintBar')) && !(await q.$('[data-e]')), 'saved team copy has no maintainer bar or edit buttons');
await q.click('.tabs [data-tab="s:af"]');
ok(JSON.stringify(await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))) === JSON.stringify(['myPay (DFAS)']), 'Air Force tab shows only Air Force links');
await q.click('.tabs [data-tab="files"]');
const fl = await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
ok(fl.includes('Tracker X') && !fl.includes('DTS'), 'Files tab shows files, not websites');
await q.click('.tabs [data-tab="web"]');
ok((await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('DTS'), 'Websites tab shows websites');
await q.click('.tabs [data-tab="all"]'); await q.fill('#q', 'pay'); await q.dispatchEvent('#q', 'input');
ok((await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).some(t => /myPay/.test(t)), 'search finds a link from Everything');
await q.fill('#q', 'orbit'); await q.dispatchEvent('#q', 'input');
ok((await q.$$eval('#main .ttile b', a => a.map(x => x.textContent))).some(t => /ORBIT/.test(t)), 'search finds a tool');
await q.fill('#q', ''); await q.dispatchEvent('#q', 'input');
await q.click('.lrow [data-pin="c:dts"]');
ok((await q.$$eval('.fav .ftile span', a => a.map(x => x.textContent))).includes('DTS'), 'starring a link makes a pinned tile');
await q.click('.fav [data-pin="c:dts"]');
ok(!(await q.$('.fav')), 'the × on a tile unpins it');
await q.goto('file://' + D + 'm2.html');
ok(/Saved/.test(await q.$eval('#maintBar', e => e.textContent)), 'saved maintainer copy opens as saved');
// a hostile link name is drawn as text
await q.click('[data-e="toggle"]'); await q.click('[data-e="addLink"][data-s="trackers"]');
await q.fill('#eName', '<img src=x onerror=alert(9)>"quote'); await q.click('[data-e="saveLink"]');
ok((await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('<img src=x onerror=alert(9)>"quote') && !(await q.$('#main img')), 'markup in a name is shown as text');
// import links from a copy into a fresh build
const ctx3 = await b.newContext(); const r = await ctx3.newPage(); r.on('pageerror', e => errs.push('import: ' + e.message)); r.on('dialog', d => d.accept());
copyFileSync(ROOT + 'maintainer/sustainment-dashboard-maintainer.html', D + 'fresh.html');
await r.goto('file://' + D + 'fresh.html'); await r.click('[data-e="toggle"]');
await r.setInputFiles('#impFile', D + 'm2.html');
await r.waitForTimeout(300);
ok((await r.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('DTS'), 'Import links from a copy carries the links into a new build');
console.log('page errors:', errs.length ? errs : 'none'); await b.close();
if (failed || errs.length) { console.error(failed + ' FAILING, ' + errs.length + ' page error(s)'); process.exit(1); }
console.log('ALL PASSED');
