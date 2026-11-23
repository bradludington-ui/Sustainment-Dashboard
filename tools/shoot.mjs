#!/usr/bin/env node
// npm run shoot -- out.png [--width N] [--height N] [--full] [--links] [--catalog] [--maint [--settings]]
// Photographs the built page in Chromium. --links fills every url with a stand-in so the cards show their Open buttons.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = resolve(args.find(a => a.endsWith('.png')) || 'shot.png');
let html = readFileSync(resolve(args.includes('--maint') ? 'maintainer/sustainment-dashboard-maintainer.html' : 'sustainment-dashboard.html'), 'utf8');
if (args.includes('--links')) html = html.replace(/url: ''/g, "url: 'https://example.invalid/tool'");
// --catalog: a fuller catalog to look at (stand-in names and links, never real ones), with eight pinned
const SAMPLE = [
  ['ATR/BTR Tracker','Reprogramming actions','trackers','excel'],['Funds Control Tracker','Commitments and obligations','trackers','excel'],['MIPR Log','Sent and accepted','trackers','excel'],['UFR List','By PMO, ranked','trackers','excel'],
  ['Execution Review Slides','Monthly','briefings','powerpoint'],['SFCB Read-ahead','Next board','briefings','pdf'],['FYDP Disconnect Charts','Spruill slides','briefings','powerpoint'],
  ['DD 448 MIPR','Fillable PDF','forms','form'],['DD 1556 Training','Request and authorization','forms','form'],['SF 182','External training','forms','form'],['Telework agreement','DD 2946','forms','form'],
  ['CCaR','Execution data','websites','web'],['DEAMS','Accounting','websites','web'],['Navy ERP','Navy accounting','websites','web'],['PIEE / WAWF','Invoices and receiving','websites','web'],
  ['myPay','LES and tax forms','af','web'],['MyBiz+','Personnel actions','af','web'],['myFSS','Force support','af','web'],['MyLearning','AF training','af','web'],
  ['MyNavy HR','Navy HR self-service','navy','web'],['TWMS','Total Workforce Mgmt','navy','web'],['Navy eLearning','Required training','navy','web'],
  ['DoD FMR Vol 3','Budget execution','reference','pdf'],['Spend plan template','Current year','reference','word'],
  ['Sustainment team site','Calendars and library','sites','sharepoint'],['Execution channel','Daily questions','sites','teams'],
].map(([name, note, category, type]) => ({ name, note, category, type, url: 'https://example.invalid/x' }));
if (args.includes('--catalog')) html = html.replace(/(<script id="catData" type="application\/json">)([\s\S]*?)(<\/script>)/, (m, a, j, b) => { const c = JSON.parse(j); c.items = SAMPLE; return a + JSON.stringify(c).replace(/</g, '\\u003c') + b; });
if (args.includes('--catalog')) html = html.replace('<script id="catData"', "<script>try{localStorage.setItem('sdash.pins',JSON.stringify(['c:atr-btr-tracker','c:funds-control-tracker','c:execution-review-slides','c:ccar','c:dd-448-mipr','c:mypay','c:mynavy-hr','c:sustainment-team-site']))}catch(e){}</script><script id=\"catData\"");
const dir = mkdtempSync(join(tmpdir(), 'sdash-'));
const file = join(dir, 'page.html'); writeFileSync(file, html);
let exe;
try { exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined; } catch {}
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: +opt('--width', 1440), height: +opt('--height', 900) }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto(pathToFileURL(file).href);
await page.waitForSelector('#main > *');
if (args.includes('--settings')) { await page.click('#gear'); await page.waitForSelector('#sdlg[open]'); }
await page.screenshot({ path: out, fullPage: args.includes('--full') });
await browser.close();
if (errs.length) { console.error('page errors:\n' + errs.join('\n')); process.exit(1); }
console.log('wrote ' + out);
