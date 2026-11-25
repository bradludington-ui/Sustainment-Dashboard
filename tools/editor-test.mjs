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
const b0 = await chromium.launch();
// every context starts with a name on file, as for someone who has edited before (the name prompt is tested on its own)
// The name is seeded from the page once it has loaded, never from an init script: in Chromium a file:// page that
// touches storage while it is still being created can be given a storage area of its own, and a reload then lands in
// another (the page's draft, pins and all vanished; ORBIT's pmo-save check met the same thing). seeded() wraps goto.
const seedWho = (pg, name) => pg.evaluate(n => { try { if (!localStorage.getItem('sdash.who')) localStorage.setItem('sdash.who', JSON.stringify(n)); } catch {} }, name);
const seeded = (pg, name) => { const go = pg.goto.bind(pg); pg.goto = async (...a) => { const r = await go(...a); if (name) await seedWho(pg, name); return r; }; return pg; };
const b = { newContext: async (o) => { const c = await b0.newContext(o); const np = c.newPage.bind(c); c.newPage = async () => seeded(await np(), 'Test Person'); return c; }, close: () => b0.close() }; const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
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
// reload before saving: nothing is lost. (settle() is only a margin: the vanishing drafts this once chased were the
// storage islands seedWho explains, not timing.)
const settle = pg => pg.waitForTimeout(400);
await settle(p); await p.reload();
const kept = (await rows()).includes('myPay (DFAS)') && (await rows()).includes('DTS');
ok(kept, 'unsaved edits survive a reload');
ok(/Unsaved/.test(await p.$eval('#maintBar', e => e.textContent)), 'bar says unsaved');
// Save (download fallback) and Save team copy
const [dm] = await Promise.all([p.waitForEvent('download'), p.click('[data-e="save"]')]);
await dm.saveAs(D + 'm2.html');
ok(/Saved/.test(await p.$eval('#maintBar', e => e.textContent)) && !/Unsaved/.test(await p.$eval('#maintBar', e => e.textContent)), 'bar says saved after Save');
const [dt] = await Promise.all([p.waitForEvent('download'), p.click('[data-e="saveTeam"]').then(() => p.click('[data-e="saveGo"]'))]);
await dt.saveAs(D + 't2.html');
const t2 = readFileSync(D + 't2.html', 'utf8'), m2 = readFileSync(D + 'm2.html', 'utf8');
{ const why = [/github/i.test(t2) && 'GitHub: …' + (t2.match(/.{50}github.{30}/i) || [''])[0], t2.includes('MAINT>') && 'a fence', /function openSettings/.test(t2) && 'the Settings panel'].filter(Boolean);
  ok(!why.length, 'saved team copy has no GitHub, no fence, no Settings panel' + (why.length ? ' (has ' + why.join('; ') + ')' : '')); }
ok(t2.includes('myPay (DFAS)') && m2.includes('myPay (DFAS)'), 'both saved files carry the new links');
// open the saved files fresh (new browser storage) and look
const ctx2 = await b.newContext(); const q = await ctx2.newPage(); q.on('pageerror', e => errs.push('saved: ' + e.message));
await q.goto('file://' + D + 't2.html');
const tr = await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
ok(tr.includes('DTS') && tr.includes('myPay (DFAS)'), 'saved team copy shows the new links');
ok(!(await q.$('#gear')) && !(await q.$('[data-e="saveTeam"]')) && !(await q.$('[data-e="import"]')) && !!(await q.$('[data-e="toggle"]')), 'saved team copy: Edit links for everyone, but no Settings, Save team copy or Import');
await q.click('.tabs [data-tab="s:af"]');
ok(JSON.stringify(await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))) === JSON.stringify(['myPay (DFAS)']), 'Air Force tab shows only Air Force links');
await q.click('.tabs [data-tab="files"]');
const fl = await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
ok(fl.includes('Tracker X') && !fl.includes('DTS'), 'Files tab shows files, not websites');
await q.click('.tabs [data-tab="web"]');
ok((await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('DTS'), 'Websites tab shows websites');
await q.click('.tabs [data-tab="all"]'); await q.fill('#q', 'pay'); await q.press('#q', 'Enter');
ok((await q.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).some(t => /myPay/.test(t)), 'search finds a link from Everything');
await q.fill('#q', 'orbit'); await q.press('#q', 'Enter');
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
await r.goto('file://' + D + 'fresh.html');
// a copy never saved is a new version: the bar says so and offers the import first
ok(/New copy \(v\d/.test(await r.$eval('#maintBar', e => e.textContent)) && !!(await r.$('.newver [data-e="import"]')), 'a fresh copy offers Import from last version, first');
ok(readFileSync(D + 'm2.html', 'utf8').includes('"version":"v'), 'a saved copy records the version that wrote it');
await r.setInputFiles('#impFile', D + 'm2.html');
await r.waitForSelector('#sdlg[open] [data-e="impReplace"]');
const ib = await r.$eval('#sdlg', d => d.textContent);
ok(/Written by\s*Sustainment Dashboard v\d/.test(ib) && /Holds\s*\d+ links, \d+ sections/.test(ib), 'the import box says which version wrote the file and what it holds');
await r.click('[data-e="impReplace"]');
ok((await r.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('DTS'), 'Replace with these carries the links into a new build');
ok(!/New copy/.test(await r.$eval('#maintBar', e => e.textContent)) && /Unsaved/.test(await r.$eval('#maintBar', e => e.textContent)), 'after importing, the bar says to save, not that the copy is new');
// merge: a link typed into the new copy first is kept, and the old file's links are added beside it
const ctx3b = await b.newContext(); const r2 = await ctx3b.newPage(); r2.on('pageerror', e => errs.push('merge: ' + e.message)); r2.on('dialog', d => d.accept());
await r2.goto('file://' + D + 'fresh.html'); await r2.click('[data-e="toggle"]');
await r2.click('[data-e="addLink"][data-s="trackers"]'); await r2.fill('#eName', 'Typed first'); await r2.fill('#eUrl', 'https://first.example.mil/'); await r2.click('[data-e="saveLink"]');
await r2.setInputFiles('#impFile', D + 'm2.html'); await r2.waitForSelector('#sdlg[open] [data-e="impMerge"]');
await r2.click('[data-e="impMerge"]');
const mn = await r2.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
ok(mn.includes('Typed first') && mn.includes('DTS') && mn.filter(x => x === 'ATR/BTR Tracker').length === 1, 'Add the ones I don’t have keeps what was typed, adds the rest, and repeats nothing');
ok((await r2.$$eval('#main .scard h3', a => a.map(x => x.textContent))).filter(x => x === 'Travel').length === 1, 'a section the old file had is added once');
// training: dated sessions split the Training tab into the schedule, upcoming and past
{
  const ctx4 = await b.newContext({ acceptDownloads: true }); const t = await ctx4.newPage(); t.on('pageerror', e => errs.push('training: ' + e.message)); t.on('dialog', d => d.accept());
  await t.addInitScript(() => { delete window.showSaveFilePicker; });   // as above: Save downloads, which the test can read
  copyFileSync(ROOT + 'maintainer/sustainment-dashboard-maintainer.html', D + 'tr.html');
  await t.goto('file://' + D + 'tr.html'); await t.click('[data-e="toggle"]');
  const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const add = async (name, url, date, note) => { await t.click('[data-e="addLink"][data-s="training"]'); await t.fill('#eName', name); await t.fill('#eUrl', url); if (note) await t.fill('#eNote', note); if (date) await t.fill('#eDate', date); await t.click('[data-e="saveLink"]'); };
  await add('Spend plan basics', 'https://x.sharepoint.com/sites/t/stream.aspx?id=1', iso(-40), 'Topic: building the spend plan');
  await add('CR cash needs', 'https://x.sharepoint.com/sites/t/b.pptx', iso(-5), 'Topic: CR cash windows');
  await add('FYDP drills', 'https://x.sharepoint.com/sites/t/c', iso(10), 'Topic: the five-year plan');
  await add('Today session', 'https://x.sharepoint.com/sites/t/d', iso(0), '');
  ok(await t.$eval('[data-e="editLink"][data-k="c:spend-plan-basics"]', () => true).catch(() => false), 'dated links are added');
  await t.click('[data-e="toggle"]');
  await t.click('.tabs [data-tab="s:training"]');
  const part = id => t.$$eval('#' + id + ' ~ * .cname, section:has(> header #' + id + ') .cname', a => a.map(x => x.textContent));
  ok(JSON.stringify(await part('sc-res')) === JSON.stringify(['Training schedule']), 'Training tab: the schedule under Schedule & resources');
  ok(JSON.stringify(await part('sc-up')) === JSON.stringify(['Today session', 'FYDP drills']), 'Training tab: upcoming, soonest first, today counted as upcoming');
  ok(JSON.stringify(await part('sc-past')) === JSON.stringify(['CR cash needs', 'Spend plan basics']), 'Training tab: past sessions, newest first');
  ok(await t.$eval('section:has(> header #sc-past) .lrow:first-child .ldate', e => /\d{4}$/.test(e.textContent)), 'a session shows its date');
  ok((await t.$$eval('section:has(> header #sc-past) .lrow .ctype', a => a.map(x => x.title))).includes('Recording'), 'a Stream link is guessed as a Recording');
  await t.click('.tabs [data-tab="all"]'); await t.fill('#q', 'cash windows'); await t.press('#q', 'Enter');
  ok((await t.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('CR cash needs'), 'search finds a session by its topic');
  await t.fill('#q', ''); await t.dispatchEvent('#q', 'input');
  await t.click('.tabs [data-tab="files"]');
  ok((await t.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('Spend plan basics'), 'a recording is listed under Files');
  // the date survives Save team copy, and a date that is not a day is refused
  const [dt] = await Promise.all([t.waitForEvent('download'), t.click('[data-e="saveTeam"]').then(() => t.click('[data-e="saveGo"]'))]);
  await dt.saveAs(D + 'tr-team.html');
  ok(readFileSync(D + 'tr-team.html', 'utf8').includes('"date":"' + iso(10) + '"'), 'the saved team copy carries the dates');
  await t.click('[data-e="toggle"]'); await t.click('.tabs [data-tab="all"]');
  await t.click('[data-e="addLink"][data-s="training"]'); await t.fill('#eName', 'Bad date');
  await t.evaluate(() => { const i = document.getElementById('eDate'); i.type = 'text'; i.value = '2026-02-30'; });
  await t.click('[data-e="saveLink"]');
  ok(/not a date/.test(await t.$eval('#eErr', e => e.textContent)), 'a date that is not a day is refused');
}
// the office hub: settings, report and suggest, the updated stamp, a downloaded copy, keywords, checking, Excel in and
// out, announcements and coming up, the glossary, Help
{
  const ctx5 = await b.newContext({ acceptDownloads: true }); const h = await ctx5.newPage();
  h.on('pageerror', e => errs.push('hub: ' + e.message)); h.on('dialog', d => d.accept());
  await h.addInitScript(() => { delete window.showSaveFilePicker; });
  copyFileSync(ROOT + 'maintainer/sustainment-dashboard-maintainer.html', D + 'hub.html');
  await h.goto('file://' + D + 'hub.html');
  const names = () => h.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
  const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  await h.click('[data-e="toggle"]');
  // office settings
  await h.click('.maint [data-e="office"] >> nth=-1'); await h.fill('#oMail', 'not an address'); await h.click('[data-e="saveOffice"]');
  ok(/not an email/.test(await h.$eval('#eErr', e => e.textContent)), 'a contact that is not an email address is refused');
  await h.fill('#oMail', 'office.box@example.mil'); await h.click('[data-e="saveOffice"]');
  // a link with keywords, checked today; another never checked
  await h.click('[data-e="addLink"][data-s="forms"]'); await h.fill('#eName', 'DD 448'); await h.fill('#eUrl', 'https://forms.example.mil/dd448.pdf'); await h.fill('#eKw', 'MIPR interdepartmental');
  await h.click('[data-e="saveLink"]');
  await h.click('[data-e="addLink"][data-s="websites"]'); await h.fill('#eName', 'Old site'); await h.fill('#eUrl', 'https://old.example.mil/'); await h.uncheck('#eChk'); await h.click('[data-e="saveLink"]');
  await h.click('[data-e="checkList"]');
  const due = await h.$$eval('#sdlg .lrow .cname', a => a.map(x => x.textContent));
  ok(due.includes('Old site') && !due.includes('DD 448'), 'Needs checking lists the unchecked link, not the one checked today');
  await h.click('#sdlg [data-e="markChecked"][data-k="c:old-site"]');
  ok(!(await h.$$eval('#sdlg .lrow .cname', a => a.map(x => x.textContent))).includes('Old site'), 'It works marks a link checked');
  await h.click('#sdlg footer [data-e="close"]');
  // paste from Excel: headings, a new section, a US date, an update, a bad row
  await h.click('[data-e="paste"]');
  await h.fill('#pIn', 'Name\tLink\tSection\tType\tNote\tDate\nTSP\thttps://www.tsp.gov/\tBenefits\t\tThrift Savings Plan\t\nSFCB board\thttps://x.sharepoint.com/b.pptx\tBriefings & slides\tPowerPoint\tNext board\t12/15/2026\nDD 448\thttps://forms.example.mil/dd448-v2.pdf\t\t\t\t\nBroken\tjavascript:alert(1)\tTrackers\t\t\t\n');
  await h.click('[data-e="pasteCheck"]');
  const chk = await h.$eval('#pOut', e => e.textContent);
  ok(/2 new links, 1 to update, new section: Benefits/.test(chk) && /row 5 \(Broken\)/.test(chk), 'Paste from Excel: checked first, with the bad row named');
  await h.click('[data-e="pasteAdd"]');
  ok((await names()).includes('TSP') && (await h.$$eval('#main .scard h3', a => a.map(x => x.textContent))).includes('Benefits'), 'pasted links are added, and their new section made');
  // export to Excel
  const [csvD] = await Promise.all([h.waitForEvent('download'), h.click('[data-e="export"]')]);
  await csvD.saveAs(D + 'links.csv'); const csv = readFileSync(D + 'links.csv', 'utf8'); if (process.env.SHOW_CSV) console.log(csv);
  ok(/^﻿Name,Link,Section,Type,Note,Date,Keywords,Last checked/.test(csv) && /DD 448,https:\/\/forms\.example\.mil\/dd448-v2\.pdf,Forms,PDF,,,MIPR interdepartmental,\r?\n/.test(csv), 'Export to Excel writes every link, the pasted update included (a new address clears its last-checked date)');
  ok(/SFCB board,[^\n]*,2026-12-15,/.test(csv), 'a pasted US date is stored as a date');
  // announcements: one showing, one already ended
  await h.click('.tabs [data-tab="all"]');
  await h.click('[data-e="addNews"]'); await h.fill('#nText', 'Closeout guidance is out'); await h.fill('#nUrl', 'https://x.sharepoint.com/closeout'); await h.click('[data-e="saveNews"]');
  await h.click('[data-e="addNews"]'); await h.fill('#nText', 'An old notice'); await h.fill('#nDate', iso(-20)); await h.fill('#nUntil', iso(-1)); await h.click('[data-e="saveNews"]');
  // glossary
  await h.click('.tabs [data-tab="gloss"]');
  await h.click('[data-e="addTerm"]'); await h.fill('#gTerm', 'ufr'); await h.fill('#gMean', 'dup'); await h.click('[data-e="saveTerm"]');
  ok(/already in the glossary/.test(await h.$eval('#eErr', e => e.textContent)), 'a term already in the glossary is refused');
  await h.fill('#gTerm', 'SFCB'); await h.fill('#gMean', 'The office’s funding board.'); await h.click('[data-e="saveTerm"]');
  // save the team copy, and open it as the team would
  await h.click('[data-e="toggle"]');
  const [td] = await Promise.all([h.waitForEvent('download'), h.click('[data-e="saveTeam"]').then(() => h.click('[data-e="saveGo"]'))]);
  const { mkdirSync } = await import('node:fs'); mkdirSync(D + 'Downloads', { recursive: true });
  await td.saveAs(D + 'hub-team.html'); copyFileSync(D + 'hub-team.html', D + 'Downloads/hub-team.html');
  const ctx6 = await b.newContext(); const t = await ctx6.newPage(); t.on('pageerror', e => errs.push('hub team: ' + e.message));
  await t.goto('file://' + D + 'hub-team.html');
  ok(/Links updated \d+ \w{3} \d{4}/.test(await t.$eval('#updStamp', e => e.textContent)), 'the team copy says when its links were updated');
  ok(!(await t.$eval('#staleNote', e => e.textContent)), 'no downloaded-copy note when opened from its own place');
  const sug = await t.$eval('#suggestSlot a', a => a.getAttribute('href'));
  ok(sug.startsWith('mailto:office.box@example.mil?subject=Suggestion'), 'Suggest a link emails the office contact');
  // a row's controls are drawn when it is reached: none before, all after hovering it, and on keyboard focus too
  ok(await t.$eval('.lrow:has(.cname:text-is("TSP")) .lmore', e => e.innerHTML === ''), 'a row’s Browser, Copy and Report are not drawn until the row is reached');
  await t.hover('.lrow:has(.cname:text-is("TSP"))');
  const rep = await t.$eval('a[aria-label="Report a broken link: TSP"]', a => decodeURIComponent(a.getAttribute('href')));
  ok(rep.startsWith('mailto:office.box@example.mil?') && rep.includes('“TSP”') && rep.includes('https://www.tsp.gov/'), 'the flag on a link emails a report naming it and its address');
  const newsTxt = await t.$eval('.news', e => e.textContent);
  ok(newsTxt.includes('Closeout guidance is out') && !newsTxt.includes('An old notice'), 'What’s new shows the announcement, not the ended one');
  ok(newsTxt.includes('SFCB board') || !(iso(30) >= '2026-12-15' && iso(0) <= '2026-12-15'), 'Coming up lists a dated link in the next 30 days');
  await t.focus('.lrow:has(.cname:text-is("DD 448")) .cname'); await t.keyboard.press('Tab');
  ok(/Copy the link to DD 448|Browser version of DD 448/.test(await t.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.textContent)), 'Tab from a link reaches its controls, drawn as the keyboard arrives');
  // search waits for a pause in typing, then answers; Enter answers at once
  await t.fill('#q', 'interdepartmental');
  await t.waitForFunction(() => /result/.test(document.getElementById('main').textContent));
  await t.fill('#q', 'interdepartmental'); await t.press('#q', 'Enter');
  ok((await t.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('DD 448'), 'search finds a link by a keyword it does not show');
  await t.fill('#q', 'funding board'); await t.press('#q', 'Enter');
  ok((await t.$$eval('#main .gt dt', a => a.map(x => x.textContent))).includes('SFCB'), 'search finds a glossary term by its meaning');
  await t.fill('#q', ''); await t.dispatchEvent('#q', 'input');
  await t.click('.tabs [data-tab="gloss"]');
  const terms = await t.$$eval('#main .gt dt', a => a.map(x => x.textContent));
  ok(terms.length >= 16 && terms.includes('PPBE') && terms.includes('SFCB'), 'the Glossary tab lists the starting terms and the added one');
  ok(JSON.stringify(terms) === JSON.stringify(terms.slice().sort((a, x) => a.localeCompare(x, undefined, { sensitivity: 'base' }))), 'the glossary is A to Z');
  // hovering a row shows its extra controls over the row and moves nothing (a version that widened the row rewrapped the
  // name, rebalanced the columns and made the cards jump under the pointer)
  const boxes = () => t.$$eval('.scard', a => a.map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.height)].join(','); }).join(' '));
  await t.click('.tabs [data-tab="all"]');
  const row = '.scard .lrow:has(a.cname) >> nth=0';   // a row with a link, so it has controls to show
  const nameW = () => t.$eval('.scard .lrow:has(a.cname) .lmain', e => Math.round(e.getBoundingClientRect().width));
  const before = await boxes(), w0 = await nameW(); await t.hover(row);
  ok(await t.$eval('.scard .lrow:has(a.cname) .lmore', e => getComputedStyle(e).opacity === '1') && (await boxes()) === before && (await nameW()) === w0, 'hovering a row shows its controls and moves nothing, not even its name');
  await t.click('.tabs [data-tab="gloss"]');
  await t.click('#helpBtn');
  ok(await t.$eval('#hdlg', d => d.open) && /office\.box@example\.mil/.test(await t.$eval('#hdlg', d => d.textContent)), 'Help opens, and names where reports go');
  await t.keyboard.press('Escape');
  ok(!(await t.$eval('#hdlg', d => d.open)), 'Esc closes Help');
  ok(!(await t.$('#gear')) && !(await t.$('[data-e="saveTeam"]')) && !(await t.$('[data-e="office"]')), 'the team copy has no Settings, Save team copy or Office settings');
  await t.goto('file://' + D + 'Downloads/hub-team.html');
  ok(/downloaded copy/.test(await t.$eval('#staleNote', e => e.textContent)), 'a copy opened from Downloads says it may be out of date');
}
// ---- shared editing (Brad, 23 Nov 2026: "anyone using to be able to update the links"). Everyone opens the team copy
// from Teams, edits, saves, and puts it back; two people working at once must both keep their work.
{
  const team0 = D + 'team0.html'; copyFileSync(ROOT + 'sustainment-dashboard.html', team0);
  const person = async (name) => {
    const c = await b0.newContext({ acceptDownloads: true }); const pg = await c.newPage();
    pg.on('pageerror', e => errs.push(name + ': ' + e.message)); pg.on('dialog', d => d.accept());
    await pg.addInitScript(() => { delete window.showSaveFilePicker; });   // no storage here: see seedWho
    return seeded(pg, name);
  };
  const save = async (pg, theirs, out) => {
    await pg.click('[data-e="save"]'); await pg.waitForSelector('#sdlg[open] [data-e="saveGo"]');
    if (theirs) { await pg.setInputFiles('#theirsFile', theirs); await pg.waitForFunction(() => /✓/.test(document.getElementById('theirsSay').textContent)); }
    const [d] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-e="saveGo"]')]);
    await d.saveAs(out);
    await pg.waitForSelector('#sdlg[open]'); await pg.click('#sdlg footer .btn.pri');   // "now put it back on Teams"
    return readFileSync(out, 'utf8');
  };
  const linksIn = html => JSON.parse(html.match(/<script id="catData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  // the name is asked once, before the first edit
  const n0 = await person(''); await n0.goto('file://' + team0);
  ok(/Anyone can add, change or delete links/.test(await n0.$eval('#maintBar', e => e.textContent)), 'everyone’s copy offers Edit links');
  await n0.click('[data-e="toggle"]'); await n0.waitForSelector('#sdlg[open] #wName');
  await n0.click('[data-e="whoCancel"]');
  ok(!(await n0.$('[data-e="addLink"]')), 'no name, no editing');
  await n0.click('[data-e="toggle"]'); await n0.fill('#wName', 'Pat Lee'); await n0.click('[data-e="whoOk"]');
  ok(!!(await n0.$('[data-e="addLink"]')) && /Editing as Pat Lee/.test(await n0.$eval('#maintBar', e => e.textContent)), 'with a name, editing opens and says who');
  // A and B open the same copy. A adds a link and changes one; saves.
  const A = await person('Alex Ames'); await A.goto('file://' + team0); await A.click('[data-e="toggle"]');
  await A.click('[data-e="addLink"][data-s="trackers"]'); await A.fill('#eName', 'From A'); await A.fill('#eUrl', 'https://a.example.mil/'); await A.click('[data-e="saveLink"]');
  await A.click('[data-e="editLink"][data-k="c:funds-control-tracker"]'); await A.fill('#eNote', 'A’s note'); await A.click('[data-e="saveLink"]');
  await A.click('[data-e="editLink"][data-k="c:execution-review-slides"]'); await A.fill('#eNote', 'A says monthly'); await A.click('[data-e="saveLink"]');
  const fileA = await save(A, null, D + 'fileA.html');
  // B opened the same copy before A saved: adds a link, deletes one, and changes the same link A changed, differently
  const B = await person('Blair Bell'); await B.goto('file://' + team0); await B.click('[data-e="toggle"]');
  await B.click('[data-e="addLink"][data-s="trackers"]'); await B.fill('#eName', 'From B'); await B.fill('#eUrl', 'https://b.example.mil/'); await B.click('[data-e="saveLink"]');
  await B.click('[data-e="delLink"][data-k="c:office-overview"]');
  await B.click('[data-e="editLink"][data-k="c:execution-review-slides"]'); await B.fill('#eNote', 'B says weekly'); await B.click('[data-e="saveLink"]');
  // B chooses A's saved file as the newest copy: nothing of A's is lost
  const fileB = await save(B, D + 'fileA.html', D + 'fileB.html');
  const cb = linksIn(fileB), nm = cb.items.map(x => x.name), note = n => (cb.items.find(x => x.name === n) || {}).note;
  ok(nm.includes('From A') && nm.includes('From B'), 'merge: both people’s new links are in the saved file');
  ok(note('Funds Control Tracker') === 'A’s note', 'merge: a change only A made is kept');
  ok(!nm.includes('Office overview'), 'merge: a link only B deleted is gone');
  ok(note('Execution Review Slides') === 'B says weekly', 'merge: where both changed one link, the person saving keeps theirs');
  const logW = cb.log.map(e => e.who + ': ' + e.what);
  ok(logW.some(x => /^Alex Ames: added link “From A”/.test(x)) && logW.some(x => /^Blair Bell: deleted link “Office overview”/.test(x)), 'the change log carries both people’s changes, by name');
  ok(cb.trash.some(x => x.kind === 'link' && x.rec.name === 'Office overview' && x.who === 'Blair Bell'), 'the deleted link is in Recently deleted, with who deleted it');
  // without choosing the newest copy, the last save would have lost A's work: show the merge is what saved it
  ok(!linksIn(readFileSync(team0, 'utf8')).items.some(x => x.name === 'From A'), '(the copy B opened did not have A’s link: the merge brought it)');
  // C opens B's file: the log and Recently deleted, and a restore
  const C = await person('Casey Cole'); await C.goto('file://' + D + 'fileB.html'); await C.click('[data-e="toggle"]');
  await C.click('[data-e="log"]');
  ok(/Blair Bell/.test(await C.$eval('#sdlg', e => e.textContent)) && /Alex Ames/.test(await C.$eval('#sdlg', e => e.textContent)), 'Change log shows who changed what');
  await C.click('#sdlg footer .btn.pri');
  await C.click('[data-e="trash"]'); await C.click('#sdlg [data-e="restore"]'); await C.click('#sdlg footer .btn.pri');
  ok((await C.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('Office overview'), 'anyone can restore a deleted link');
  // the team copy imports too: Casey replaces with an OLDER copy by mistake, and nothing is lost
  ok(!!(await C.$('.maint [data-e="import"]')), 'the team copy offers Import from another copy while editing');
  const logBefore = (await C.evaluate(() => CATALOG.log.length));
  await C.setInputFiles('#impFile', team0); await C.waitForSelector('#sdlg[open] [data-e="impReplace"]');
  ok(/Import from another copy/.test(await C.$eval('#sdlg', e => e.textContent)), 'the team copy’s import box says what it is');
  await C.click('[data-e="impReplace"]');
  const cn = await C.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
  const tr = await C.evaluate(() => CATALOG.trash.filter(x => x.kind === 'link').map(x => x.rec.name));
  ok(!cn.includes('From A') && tr.includes('From A') && tr.includes('From B'), 'Replace with an older copy: links it lacks go to Recently deleted');
  ok((await C.evaluate(() => CATALOG.log.length)) >= logBefore, 'Replace keeps the change log');
  await C.click('[data-e="trash"]'); await C.click('#sdlg li:has-text("From A") [data-e="restore"]'); await C.click('#sdlg footer .btn.pri');
  ok((await C.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('From A'), 'a link a Replace removed can be restored');
  await C.setInputFiles('#impFile', D + 'fileB.html'); await C.waitForSelector('#sdlg[open] [data-e="impMerge"]'); await C.click('[data-e="impMerge"]');
  const cm = await C.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
  ok(cm.includes('From B') && cm.filter(x => x === 'From A').length === 1, 'Add the ones I don’t have brings the rest back, once each');
  // D edits an old copy without saving, then opens the newer file: the edits are laid over it, nothing lost
  const Dp = await person('Dana Diaz'); await Dp.goto('file://' + team0); await Dp.click('[data-e="toggle"]');
  await Dp.click('[data-e="addLink"][data-s="trackers"]'); await Dp.fill('#eName', 'Draft D'); await Dp.fill('#eUrl', 'https://d.example.mil/'); await Dp.click('[data-e="saveLink"]');
  await settle(Dp); await Dp.goto('file://' + D + 'fileB.html');
  const dn = await Dp.$$eval('#main .lrow .cname', a => a.map(x => x.textContent));
  ok(dn.includes('Draft D') && dn.includes('From A') && dn.includes('From B') && /Unsaved/.test(await Dp.$eval('#maintBar', e => e.textContent)), 'unsaved edits from an older copy are laid over the newer file, and still unsaved');
  // TOOL LINKS (Brad, 23 Nov 2026): anyone sets the link to ORBIT, APEX and the rest, from the tools row while editing,
  // as a web address or a network path; it is kept in the file, merged like any link, and opens from the cards
  const E = await person('Eli Ford'); await E.goto('file://' + team0);
  ok(!(await E.$('[data-e="editTool"]')), 'tool links: no pencil until editing');
  ok(await E.$eval('.ttile.off', e => /APEX|ORBIT/.test(e.textContent)), 'tool links: a tool with no link shows as not set');
  await E.click('[data-e="toggle"]');
  await E.click('[data-e="editTool"][data-k="apex"]');
  await E.fill('#tUrl', 'javascript:alert(1)'); await E.click('[data-e="saveTool"]');
  ok(/cannot be opened/.test(await E.$eval('#tErr', e => e.textContent)), 'tool links: an address that cannot be opened is refused');
  await E.fill('#tUrl', '\\\\srv01\\Budget Share\\APEX.html');
  ok(await E.$eval('#tTry a', a => a.getAttribute('href')) === 'file://srv01/Budget%20Share/APEX.html', 'tool links: a network path is offered to try, as a file address');
  await E.click('[data-e="saveTool"]');
  await E.click('[data-e="editTool"][data-k="orbit"]'); await E.fill('#tUrl', 'https://orbit.example.mil/board.html'); await E.click('[data-e="saveTool"]');
  ok(await E.$eval('a.ttile[data-open="apex"]', a => a.getAttribute('href')) === 'file://srv01/Budget%20Share/APEX.html', 'tool links: the APEX tile opens the network path');
  const fileE = await save(E, null, D + 'fileE.html'), ce = linksIn(fileE);
  ok(JSON.stringify(ce.tools) === JSON.stringify([{ id: 'orbit', url: 'https://orbit.example.mil/board.html' }, { id: 'apex', url: '\\\\srv01\\Budget Share\\APEX.html' }]), 'tool links: kept in the saved file, as typed', JSON.stringify(ce.tools));
  ok(ce.log.some(x => /Eli Ford: changed the link to APEX|added the link to “APEX”/.test(x.who + ': ' + x.what)), 'tool links: the change log says who set the APEX link');
  // F opened the same copy before E saved and sets ORBIT differently; she chooses E's file as the newest: E's APEX stays
  const F = await person('Fran Gale'); await F.goto('file://' + team0); await F.click('[data-e="toggle"]');
  await F.click('[data-e="editTool"][data-k="orbit"]'); await F.fill('#tUrl', 'S:\\Budget\\ORBIT.html'); await F.click('[data-e="saveTool"]');
  const cf = linksIn(await save(F, D + 'fileE.html', D + 'fileF.html')), tl = Object.fromEntries(cf.tools.map(x => [x.id, x.url]));
  ok(tl.apex === '\\\\srv01\\Budget Share\\APEX.html' && tl.orbit === 'S:\\Budget\\ORBIT.html', 'tool links: merge keeps E’s APEX and F’s ORBIT', JSON.stringify(tl));
  // the saved file opened fresh: the cards open what was typed
  const G = await person('Gus Hale'); await G.goto('file://' + D + 'fileF.html'); await G.click('.tabs [data-tab="tools"]');
  ok(await G.$eval('a.btn.pri[data-open="orbit"]', a => a.getAttribute('href')) === 'file:///S:/Budget/ORBIT.html', 'tool links: the ORBIT card opens the drive path');
  ok(!/github/i.test(readFileSync(D + 'fileF.html', 'utf8')), 'tool links: the team copy still says nothing of GitHub');
}
// a long section shows 12 on Everything and a Show all button; its tab and search show every link
{
  const many = readFileSync(ROOT + 'sustainment-dashboard.html', 'utf8').replace(/(<script id="catData" type="application\/json">)([\s\S]*?)(<\/script>)/, (m, a, j, z) => {
    const c = JSON.parse(j); c.items = c.items.concat(Array.from({ length: 30 }, (_, i) => ({ name: 'Bulk ' + String(i).padStart(2, '0'), note: '', category: 'trackers', type: 'web', url: 'https://bulk.example.mil/' + i })));
    return a + JSON.stringify(c).replace(/</g, '\\u003c') + z; });
  writeFileSync(D + 'many.html', many);
  const ctx7 = await b.newContext(); const m = await ctx7.newPage(); m.on('pageerror', e => errs.push('many: ' + e.message));
  await m.goto('file://' + D + 'many.html');
  const card = '.scard:has(#sc-trackers)';
  ok((await m.$$eval(card + ' .lrow', a => a.length)) === 12 && /32 links/.test(await m.$eval(card + ' .sn', e => e.textContent)), 'Everything shows a long section’s first 12, and counts them all');
  await m.click(card + ' .smore');
  ok((await m.$$eval(card + ' .lrow', a => a.length)) === 32 && !(await m.$(card + ' .smore')), 'Show all shows every link in the section');
  await m.fill('#q', 'bulk'); await m.press('#q', 'Enter');
  ok((await m.$$eval('#main .lrow .cname', a => a.filter(x => /^Bulk/.test(x.textContent)).length)) === 30, 'search shows every match, uncapped');
}
console.log('page errors:', errs.length ? errs : 'none'); await b.close();
if (failed || errs.length) { console.error(failed + ' FAILING, ' + errs.length + ' page error(s)'); process.exit(1); }
console.log('ALL PASSED');
