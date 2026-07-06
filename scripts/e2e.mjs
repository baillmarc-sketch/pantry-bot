import { chromium } from 'playwright';

const base = process.env.BASE ?? 'http://localhost:3100';
const shoot = process.env.SHOOT === '1';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: shoot ? 3 : 1,
  isMobile: true,
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
};
const snap = async (name) => {
  if (shoot) await page.screenshot({ path: `/tmp/mise-${name}.png`, fullPage: true });
};

// 1. Home loads with recipes
await page.goto(`${base}/`, { waitUntil: 'load' });
await page.waitForSelector('.recipe');
ok(await page.getByText('What should we cook?').isVisible(), 'home renders');
const recipeCount = await page.locator('.recipe').count();
ok(recipeCount >= 1, `home shows ${recipeCount} recipe card(s)`);
await snap('home');

// 2. Scan -> sample receipt -> Confirm
await page.goto(`${base}/scan`, { waitUntil: 'load' });
await snap('scan');
await page.getByRole('button', { name: 'Use a sample receipt' }).click();
await page.waitForURL('**/scan/confirm');
await page.waitForSelector('.confirm-row');
const rows = await page.locator('.confirm-row').count();
ok(rows === 5, `confirm shows ${rows} parsed rows (expected 5)`);
await snap('confirm');

// 3. Drop one row, add the rest
await page.locator('.confirm-row').first().getByRole('button', { name: 'Drop' }).click();
const addBtn = page.getByRole('button', { name: /Add \d+ items? to pantry/ });
const addLabel = (await addBtn.textContent())?.trim();
ok(/Add 4 items/.test(addLabel ?? ''), `add button reflects kept count: "${addLabel}"`);
await addBtn.click();

// 4. Lands on inventory with items
await page.waitForURL('**/inventory');
await page.waitForSelector('.inv-item');
const invCount = await page.locator('.inv-item').count();
ok(invCount >= 1, `inventory shows ${invCount} item(s)`);
await snap('inventory');

// 5. "Use 1" mutates and persists (event-sourced)
const firstQtyBefore = await page.locator('.inv-item .detail').first().textContent();
await page.locator('.inv-item').first().getByRole('button', { name: /Use one/ }).click();
await page.waitForTimeout(150);
const firstQtyAfter = await page.locator('.inv-item .detail').first().textContent();
ok(firstQtyBefore !== firstQtyAfter, `Use 1 changed first row (“${firstQtyBefore?.trim()}” -> “${firstQtyAfter?.trim()}”)`);

// reload -> persisted in localStorage
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.inv-item');
const afterReload = await page.locator('.inv-item .detail').first().textContent();
ok(afterReload === firstQtyAfter, 'change persisted across reload (localStorage)');

// 6. Cook from Home deducts
await page.goto(`${base}/`, { waitUntil: 'load' });
await page.waitForSelector('.recipe');
await page.locator('.recipe').first().getByRole('button', { name: 'Cooked this' }).click();
await page.waitForTimeout(150);
ok(await page.getByText(/Cooked /).first().isVisible(), 'cooking shows confirmation message');

// 7. Likes: both scanned items present, categorized, searchable
await page.goto(`${base}/likes`, { waitUntil: 'load' });
await page.waitForSelector('.inv-item');
const likeCount = await page.locator('.inv-item').count();
ok(likeCount >= 2, `likes shows ${likeCount} saved item(s)`);
ok(await page.getByText('Porto-Muíños').first().isVisible(), 'razor clams (brand) shows on likes');
ok(await page.getByText(/Tinned fish|tinned fish/).first().isVisible(), 'tinned fish category present');
await snap('likes');

// search narrows to the dill pickle crackers
await page.getByLabel('Search things we like').fill('dill');
await page.waitForTimeout(150);
const dillRows = await page.locator('.inv-item').count();
ok(dillRows === 1, `search "dill" narrows to ${dillRows} row (expected 1)`);
ok(await page.getByText(/Dill Pickle/).first().isVisible(), 'dill pickle crackers matched by tag');
await snap('likes-search');

// 8. Saved recipes: the porcini sugo lives on the Cook screen
await page.goto(`${base}/`, { waitUntil: 'load' });
await page.waitForSelector('.recipe');
ok(
  await page.getByText('Your recipes').first().isVisible(),
  'Home has a "Your recipes" section',
);
ok(
  await page.getByText('Porcini Umami Sugo with Chicken Meatballs').first().isVisible(),
  'seeded porcini sugo shows on Cook screen',
);
ok((await page.locator('.badge').count()) >= 1, 'saved recipe carries a "Yours" badge');
await snap('home-recipes');

// add a new recipe via the form
const yourBefore = await page.locator('article.recipe').count();
await page.getByRole('link', { name: '+ Add a recipe' }).click();
await page.waitForURL('**/recipes/new');
await page.getByLabel('Title').fill('Test Miso Noodles');
await page.getByLabel('Ingredients — one per line').fill('rice noodles\nmiso\nscallion');
await page.getByRole('button', { name: 'Save to Cook screen' }).click();
await page.waitForURL(/\/$|\/$/);
await page.waitForSelector('.recipe');
await page.waitForTimeout(150);
const yourAfter = await page.locator('article.recipe').count();
ok(yourAfter === yourBefore + 1, `saving added a card (${yourBefore} -> ${yourAfter})`);
ok(
  await page.getByText('Test Miso Noodles').first().isVisible(),
  'new saved recipe appears on Cook screen',
);
// persists across reload
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.recipe');
ok(
  await page.getByText('Test Miso Noodles').first().isVisible(),
  'saved recipe persists across reload',
);

// 9. Bar: cocktails ranked shakeable-first; bottles add + track
await page.goto(`${base}/bar`, { waitUntil: 'load' });
await page.waitForSelector('.recipe');
ok(await page.getByText('The bar').first().isVisible(), 'Bar screen renders');
ok(
  await page.getByText('Hugo Spritz').first().isVisible(),
  "Anna's Hugo Spritz is in the bar",
);
ok(
  (await page.getByText('Shakeable now').count()) >= 1,
  'at least one cocktail is shakeable now',
);
ok(
  await page.getByText('Need to buy:').first().isVisible(),
  'a non-shakeable cocktail flags missing bottles (e.g. Negroni)',
);
await snap('bar-cocktails');

// Bottles tab: starter bar present, and add a bottle
await page.getByRole('tab', { name: 'Bottles' }).click();
await page.waitForSelector('.inv-item');
ok(await page.getByText('Blanco tequila').first().isVisible(), 'starter bar shows Blanco tequila');
const bottlesBefore = await page.locator('.inv-item').count();
await page.getByRole('button', { name: '+ Add a bottle' }).click();
await page.getByLabel('Bottle').fill('Rye whiskey');
await page.getByRole('button', { name: 'Add bottle' }).click();
await page.waitForTimeout(150);
const bottlesAfter = await page.locator('.inv-item').count();
ok(bottlesAfter === bottlesBefore + 1, `adding a bottle added a row (${bottlesBefore} -> ${bottlesAfter})`);
ok(await page.getByText('Rye whiskey').first().isVisible(), 'new bottle appears in the bar');
await snap('bar-bottles');

// Kitchen Pantry must NOT list bar bottles
await page.goto(`${base}/inventory`, { waitUntil: 'load' });
await page.waitForSelector('.inv-item');
ok(
  (await page.getByText('Blanco tequila').count()) === 0,
  'bar bottles do not leak into the kitchen Pantry',
);

await browser.close();
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
