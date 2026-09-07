import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const saveKey = 'wolfbone.workspace.v1';
async function stored(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Saved in this browser' })).toBeVisible();
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
}
async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Follow the structure.' })).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
}
test('loads a real diagram without runtime errors and exposes an exact counterexample', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await open(page);
  await expect(page).toHaveTitle('Wolfbone — a mathematical workspace');
  await expect(page.locator('.react-flow__edge')).toHaveCount(8);
  await page.getByRole('button', { name: 'Compare with composition', exact: true }).click();
  await expect(page.getByTestId('comparison-result')).toContainText('Same on every input');
  await page.getByLabel('h output for a', { exact: true }).selectOption('moon');
  await expect(page.getByTestId('comparison-result')).toContainText('A difference, made visible');
  await expect(page.getByTestId('comparison-result')).toContainText(
    'For a, h gives moon. g ∘ f gives sun.',
  );
  await expect(
    page.getByRole('button', { name: 'Select function h: h(a) = moon; direct route' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Undo last change/ }).click();
  await expect(page.getByLabel('h output for a', { exact: true })).toHaveValue('sun');
  await expect(page.getByTestId('comparison-result')).toContainText('Same on every input');
  await page.getByRole('button', { name: /Redo change/ }).click();
  await expect(page.getByLabel('h output for a', { exact: true })).toHaveValue('moon');
  expect(errors).toEqual([]);
});
test('table edits, diagram labels, persistence and file round trips agree', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await page.getByLabel('Table f output for b', { exact: true }).selectOption('1');
  const changed = await stored(page);
  expect(changed.document.functions.find((f: { id: string }) => f.id === 'f').mapping.b).toBe('1');
  await page.getByRole('tab', { name: 'Diagram', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select function f: f(b) = 1', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Follow the structure.' })).toBeVisible();
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await expect(page.getByLabel('Table f output for b', { exact: true })).toHaveValue('1');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export workspace/ }).click();
  const download = await downloading;
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  const exported = JSON.parse(bytes.toString());
  expect(exported.document).toEqual(changed.document);
  await page.getByRole('button', { name: 'Restore example', exact: true }).click();
  await expect(page.getByLabel('Table f output for b', { exact: true })).toHaveValue('2');
  await page
    .getByLabel('Import workspace file', { exact: true })
    .setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByLabel('Table f output for b', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: /Undo last change/ }).click();
  await expect(page.getByLabel('Table f output for b', { exact: true })).toHaveValue('2');
});
test('moving and tracing a collection preserves mathematics and survives reload', async ({
  page,
}) => {
  await open(page);
  const before = await stored(page);
  const header = page.locator('.react-flow__node').first().locator('.function-collection__header');
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 30, box!.y + 30);
  await page.mouse.down();
  await page.mouse.move(box!.x + 70, box!.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await stored(page)).layout.A.y).not.toBe(before.layout.A.y);
  const moved = await stored(page);
  expect(moved.document).toEqual(before.document);
  await page.getByRole('button', { name: 'Trace a in collection A', exact: true }).click();
  await expect(page.locator('.canvas-footer')).toContainText('Following a from A');
  await expect(page.locator('.function-collection__row--traced')).toHaveCount(3);
  await page.getByRole('button', { name: 'Clear traced path' }).click();
  await expect(page.locator('.function-collection__row--traced')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Follow the structure.' })).toBeVisible();
  expect((await stored(page)).layout).toEqual(moved.layout);
  expect((await stored(page)).document).toEqual(before.document);
});
test('constructs a new collection and complete function using ordinary controls', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'New collection', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('Shapes');
  await page.getByLabel('Element labels').fill('dot, line');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await expect
    .poll(async () => {
      const node = await page
        .locator('.react-flow__node')
        .filter({ hasText: 'Shapes' })
        .boundingBox();
      const canvas = await page.locator('.function-canvas').boundingBox();
      return Boolean(
        node && canvas && node.x >= canvas.x && node.x + node.width <= canvas.x + canvas.width,
      );
    })
    .toBeTruthy();

  await page.getByRole('button', { name: 'New function', exact: true }).click();
  await page.getByLabel('Function name', { exact: true }).fill('choose');
  await page.getByLabel('Input collection (domain)').selectOption({ label: 'Shapes' });
  await page.getByLabel('Output collection (codomain)').selectOption({ label: 'C' });
  await page.getByRole('button', { name: 'Create function', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A construction in progress', exact: true }),
  ).toBeVisible();
  await page.getByLabel('choose output for dot', { exact: true }).selectOption('sun');
  await page.getByLabel('choose output for line', { exact: true }).selectOption('moon');
  await expect(
    page.getByRole('heading', { name: 'A complete function', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('First function').selectOption({ label: 'choose: Shapes → C' });
  await dialog.getByLabel('Then this function').selectOption({ label: 'g: B → C' });
  await expect(dialog.getByRole('button', { name: 'Show on canvas' })).toBeDisabled();
  await expect(dialog.getByRole('status')).toContainText('middle');
  await dialog.getByLabel('First function').selectOption({ label: 'f: A → B' });
  await expect(dialog.getByRole('button', { name: 'Show on canvas' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Show on canvas' }).click();
  await expect(page.getByLabel('Show', { exact: true })).toHaveValue('composite');
  await expect(
    page.getByText('Computed composition · inspect each input', { exact: true }),
  ).toBeVisible();
});
test('rejects invalid files without changing the current mathematics', async ({ page }) => {
  await open(page);
  const before = await stored(page);
  const invalid = structuredClone(before);
  invalid.document.functions[0].mapping.a = 'missing-output';
  await page.getByLabel('Import workspace file', { exact: true }).setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await expect(page.locator('[data-sonner-toast]')).toContainText('output');
  expect((await stored(page)).document).toEqual(before.document);
});
test('works at a narrow viewport with readable controls and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await page.getByLabel('Table h output for a', { exact: true }).selectOption('moon');
  await page.getByRole('button', { name: 'Compare with composition', exact: true }).click();
  await expect(page.getByTestId('comparison-result')).toContainText('A difference, made visible');
  await page.locator('.mobile-library summary').click();
  await page.getByRole('button', { name: 'Explore concepts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A small map of this workspace' })).toBeVisible();
  await page.getByRole('button', { name: 'Composition', exact: true }).click();
  await expect(page.getByText('Follow f first, then g.', { exact: false })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});
test('constructs a mapping with keyboard handles without dragging', async ({ page }) => {
  await open(page);
  await page.getByLabel('h output for a', { exact: true }).selectOption('');
  const source = page.getByRole('button', { name: 'Choose a in A as input for h', exact: true });
  await source.focus();
  await source.press('Enter');
  const target = page.getByRole('button', { name: 'Map to moon in C using h', exact: true });
  await target.focus();
  await target.press('Enter');
  await expect(page.getByLabel('h output for a', { exact: true })).toHaveValue('moon');
  await expect(
    page.getByRole('heading', { name: 'A complete function', exact: true }),
  ).toBeVisible();
  const node = page.locator('.react-flow__node').first();
  const before = await stored(page);
  await node.focus();
  await node.press('Enter');
  await node.press('ArrowRight');
  await expect.poll(async () => (await stored(page)).layout.A.x).not.toBe(before.layout.A.x);
  expect((await stored(page)).document).toEqual(before.document);
});
test('valid unusual identities render and connect without becoming CSS selectors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  const input = await stored(page);
  const setId = 'A["\\]';
  const elementId = 'a["\\]';
  input.document.sets[0].id = setId;
  input.document.sets[0].elements[0].id = elementId;
  for (const fn of input.document.functions) {
    if (fn.domainId === 'A') {
      fn.domainId = setId;
      fn.mapping[elementId] = fn.mapping.a;
      delete fn.mapping.a;
    }
    if (fn.codomainId === 'A') fn.codomainId = setId;
  }
  input.layout[setId] = input.layout.A;
  delete input.layout.A;
  await page.getByLabel('Import workspace file', { exact: true }).setInputFiles({
    name: 'identities.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(input)),
  });
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Choose a in A as input for f', exact: true })
    .press('Enter');
  await page.getByRole('button', { name: 'Map to 2 in B using f', exact: true }).press('Enter');
  await expect(page.getByLabel('f output for a', { exact: true })).toHaveValue('2');
  expect(errors).toEqual([]);
});

test('an unfinished composition has the same explicit unavailable state in both views', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'f: A → B Complete function', exact: true }).click();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('First function').selectOption('');
  await expect(dialog.getByLabel('First function')).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Show on canvas' })).toBeDisabled();
  await dialog.getByLabel('First function').selectOption('f');
  await dialog.getByRole('button', { name: 'Show on canvas' }).click();
  await page.getByLabel('f output for a', { exact: true }).selectOption('');
  await expect(page.locator('.composition-unavailable')).toContainText('Composition unavailable.');
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await expect(page.locator('.composition-unavailable')).toContainText('Composition unavailable.');
  await expect(page.locator('.function-table')).toHaveCount(0);
  await page.getByLabel('f output for a', { exact: true }).selectOption('1');
  await expect(page.locator('.composition-unavailable')).toHaveCount(0);
  await expect(page.locator('.function-table')).toHaveCount(1);
});

test('mapping labels stay unique when imported identifiers contain separators', async ({
  page,
}) => {
  await open(page);
  const document = {
    version: 1,
    title: 'Identity separation',
    sets: [
      {
        id: 'D',
        name: 'D',
        elements: [
          { id: 'c', label: 'first' },
          { id: 'b-c', label: 'second' },
        ],
      },
      { id: 'E', name: 'E', elements: [{ id: 'out', label: 'output' }] },
    ],
    functions: [
      {
        id: 'a-b',
        name: 'one',
        domainId: 'D',
        codomainId: 'E',
        mapping: { c: 'out', 'b-c': 'out' },
      },
      { id: 'a', name: 'two', domainId: 'D', codomainId: 'E', mapping: { c: 'out', 'b-c': 'out' } },
    ],
  };
  await page.getByLabel('Import workspace file', { exact: true }).setInputFiles({
    name: 'identities.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  const ids = await page
    .locator('.mapping-select select')
    .evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  const field = page.locator('.function-table').nth(1).locator('.mapping-row').nth(1);
  await field.locator('label').click();
  await expect(field.locator('select')).toBeFocused();
});

test('an unreadable browser save is preserved until an accepted edit', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{unreadable'), saveKey);
  await open(page);
  await expect(
    page.getByRole('status').filter({ hasText: 'Original browser save kept' }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), saveKey)).toBe('{unreadable');
  await page.getByLabel('h output for a', { exact: true }).selectOption('moon');
  const current = await stored(page);
  expect(current.document.functions.find((fn: { id: string }) => fn.id === 'h').mapping.a).toBe(
    'moon',
  );
  await expect(page.locator('.storage-alert')).toHaveCount(0);
});
