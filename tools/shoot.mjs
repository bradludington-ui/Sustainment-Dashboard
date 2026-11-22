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
// --catalog: a fuller catalog to look at (stand-in names and links), and the catalog view open
if (args.includes('--catalog')) html = html.replace(/items: \[[\s\S]*?\n  \],/, () => 'items: ' + JSON.stringify([
  ['ATR/BTR Tracker', 'Above- and below-threshold reprogramming actions.', 'trackers', 'excel'],
  ['Funds Control Tracker', 'Commitments, obligations and the control totals.', 'trackers', 'excel'],
  ['MIPR Log', 'Every MIPR sent and accepted.', 'trackers', 'excel'],
  ['Execution Review Slides', 'Monthly, for the execution review.', 'briefings', 'powerpoint'],
  ['SFCB Read-ahead', '', 'briefings', 'pdf'],
  ['FMR Volume 3', 'Budget execution: availability and use of funds.', 'reference', 'pdf'],
  ['Spend plan template', '', 'reference', 'word'],
  ['Sustainment team site', 'Calendars, rosters and the shared library.', 'sites', 'sharepoint'],
  ['Execution channel', '', 'sites', 'teams'],
].map(([name, note, category, type]) => ({ name, note, category, type, url: 'https://example.invalid/x' }))) + ',');
if (args.includes('--catalog')) html = html.replace("<script>", "<script>try{localStorage.setItem('sdash.view','\"cat\"');localStorage.setItem('sdash.pins','[\"c:execution-review-slides\"]')}catch(e){}");
const dir = mkdtempSync(join(tmpdir(), 'sdash-'));
const file = join(dir, 'page.html'); writeFileSync(file, html);
let exe;
try { exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined; } catch {}
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: +opt('--width', 1440), height: +opt('--height', 900) }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto(pathToFileURL(file).href);
await page.waitForSelector('#main .area, #main .empty');
if (args.includes('--settings')) { await page.click('#gear'); await page.waitForSelector('#sdlg[open]'); }
await page.screenshot({ path: out, fullPage: args.includes('--full') });
await browser.close();
if (errs.length) { console.error('page errors:\n' + errs.join('\n')); process.exit(1); }
console.log('wrote ' + out);
