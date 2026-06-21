import { chromium } from 'playwright';

const base = process.env.BASE ?? 'http://localhost:3100';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14-ish
  deviceScaleFactor: 3,
  isMobile: true,
  ignoreHTTPSErrors: true, // sandbox proxy uses a custom CA
});
const page = await ctx.newPage();

for (const [path, file] of [
  ['/', 'home'],
  ['/inventory', 'inventory'],
]) {
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/mise-${file}.png`, fullPage: true });
  console.log('shot', file);
}

await browser.close();
