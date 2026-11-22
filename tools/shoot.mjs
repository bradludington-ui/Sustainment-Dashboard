#!/usr/bin/env node
// npm run shoot -- out.png [--width N] [--height N] [--full] [--links]
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
let html = readFileSync(resolve('sustainment-dashboard.html'), 'utf8');
if (args.includes('--links')) html = html.replace(/url: ''/g, "url: 'https://example.invalid/tool'");
const dir = mkdtempSync(join(tmpdir(), 'sdash-'));
const file = join(dir, 'page.html'); writeFileSync(file, html);
let exe;
try { exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined; } catch {}
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: +opt('--width', 1440), height: +opt('--height', 900) }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto(pathToFileURL(file).href);
await page.waitForSelector('.card');
await page.screenshot({ path: out, fullPage: args.includes('--full') });
await browser.close();
if (errs.length) { console.error('page errors:\n' + errs.join('\n')); process.exit(1); }
console.log('wrote ' + out);
