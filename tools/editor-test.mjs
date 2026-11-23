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
  await t.click('.tabs [data-tab="all"]'); await t.fill('#q', 'cash windows'); await t.dispatchEvent('#q', 'input');
  ok((await t.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('CR cash needs'), 'search finds a session by its topic');
  await t.fill('#q', ''); await t.dispatchEvent('#q', 'input');
  await t.click('.tabs [data-tab="files"]');
  ok((await t.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('Spend plan basics'), 'a recording is listed under Files');
  // the date survives Save team copy, and a date that is not a day is refused
  const [dt] = await Promise.all([t.waitForEvent('download'), t.click('[data-e="saveTeam"]')]);
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
  const [td] = await Promise.all([h.waitForEvent('download'), h.click('[data-e="saveTeam"]')]);
  const { mkdirSync } = await import('node:fs'); mkdirSync(D + 'Downloads', { recursive: true });
  await td.saveAs(D + 'hub-team.html'); copyFileSync(D + 'hub-team.html', D + 'Downloads/hub-team.html');
  const ctx6 = await b.newContext(); const t = await ctx6.newPage(); t.on('pageerror', e => errs.push('hub team: ' + e.message));
  await t.goto('file://' + D + 'hub-team.html');
  ok(/Links updated \d+ \w{3} \d{4}/.test(await t.$eval('#updStamp', e => e.textContent)), 'the team copy says when its links were updated');
  ok(!(await t.$eval('#staleNote', e => e.textContent)), 'no downloaded-copy note when opened from its own place');
  const sug = await t.$eval('#suggestSlot a', a => a.getAttribute('href'));
  ok(sug.startsWith('mailto:office.box@example.mil?subject=Suggestion'), 'Suggest a link emails the office contact');
  const rep = await t.$eval('a[aria-label="Report a broken link: TSP"]', a => decodeURIComponent(a.getAttribute('href')));
  ok(rep.startsWith('mailto:office.box@example.mil?') && rep.includes('“TSP”') && rep.includes('https://www.tsp.gov/'), 'the flag on a link emails a report naming it and its address');
  const newsTxt = await t.$eval('.news', e => e.textContent);
  ok(newsTxt.includes('Closeout guidance is out') && !newsTxt.includes('An old notice'), 'What’s new shows the announcement, not the ended one');
  ok(newsTxt.includes('SFCB board') || !(iso(30) >= '2026-12-15' && iso(0) <= '2026-12-15'), 'Coming up lists a dated link in the next 30 days');
  await t.fill('#q', 'interdepartmental'); await t.dispatchEvent('#q', 'input');
  ok((await t.$$eval('#main .lrow .cname', a => a.map(x => x.textContent))).includes('DD 448'), 'search finds a link by a keyword it does not show');
  await t.fill('#q', 'funding board'); await t.dispatchEvent('#q', 'input');
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
  ok(!(await t.$('[data-e]')) && !(await t.$('.maint')), 'the team copy still has no editor');
  await t.goto('file://' + D + 'Downloads/hub-team.html');
  ok(/downloaded copy/.test(await t.$eval('#staleNote', e => e.textContent)), 'a copy opened from Downloads says it may be out of date');
}
console.log('page errors:', errs.length ? errs : 'none'); await b.close();
if (failed || errs.length) { console.error(failed + ' FAILING, ' + errs.length + ' page error(s)'); process.exit(1); }
console.log('ALL PASSED');
