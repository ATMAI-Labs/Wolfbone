import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { WorkspaceArchive } from '../src/lib/workspace/archive';

const saveKey = 'wolfbone.workspace';

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Make room for a thought.' })).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
}

async function saved(page: Page): Promise<WorkspaceArchive> {
  await expect(page.getByRole('status').filter({ hasText: 'Saved in this browser' })).toBeVisible();
  const value = await page.evaluate((key) => localStorage.getItem(key), saveKey);
  expect(value).not.toBeNull();
  return JSON.parse(value!);
}

async function importArchive(page: Page, archive: object) {
  await page.getByLabel('Import workspace file', { exact: true }).setInputFiles({
    name: 'workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive)),
  });
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Workspace imported.' }).first(),
  ).toBeVisible();
}

async function dispatchCanvasDrop(page: Page, type: string, value: string) {
  await page.locator('.function-canvas').evaluate(
    (canvas, payload) => {
      const box = canvas.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData(payload.type, payload.value);
      const options = {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
      };
      canvas.dispatchEvent(new DragEvent('dragover', options));
      canvas.dispatchEvent(new DragEvent('drop', options));
    },
    { type, value },
  );
}

test('arithmetic results are exact, saved as source, and one typing burst undoes together', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('Math to add to canvas').fill('2 + 2');
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  const expression = page.getByRole('textbox', { name: 'Expression on canvas' });
  await expect(expression).toHaveValue('2 + 2');
  await expect(page.locator('.arithmetic-card__result output')).toHaveText('4');
  const added = await saved(page);
  expect(added.version).toBe(2);
  expect(added.arithmetic).toHaveLength(1);
  expect(added.arithmetic![0]).toEqual({ id: expect.any(String), expression: '2 + 2' });
  expect(added.document.functions).toHaveLength(3);

  await expression.fill('');
  await expression.pressSequentially('1/3');
  await expect(page.locator('.arithmetic-card__result output')).toHaveText('1/3');
  await page.getByRole('button', { name: /Undo last change/ }).click();
  await expect(expression).toHaveValue('2 + 2');
  await page.getByRole('button', { name: /Redo change/ }).click();
  await expect(expression).toHaveValue('1/3');
  await expect.poll(async () => (await saved(page)).arithmetic?.[0].expression).toBe('1/3');
  await page.reload();
  await expect(expression).toHaveValue('1/3');
  expect((await saved(page)).arithmetic![0].expression).toBe('1/3');
});

test('Undo shortcuts inside an expression use workspace history', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'New expression', exact: true }).click();
  const expression = page.getByRole('textbox', { name: 'Expression on canvas' });
  await expect(expression).toBeFocused();
  await expression.pressSequentially('1234');
  await expression.press('ControlOrMeta+z');
  await expect(expression).toHaveValue('');
  await expression.press('ControlOrMeta+z');
  await expect(page.locator('.arithmetic-card')).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).arithmetic?.length ?? 0).toBe(0);
});

test('a rapid Redo survives reload before the normal save delay', async ({ page }) => {
  await open(page);
  await page.getByLabel('Math to add to canvas').fill('2 + 2');
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  await expect.poll(async () => (await saved(page)).arithmetic?.[0].expression).toBe('2 + 2');
  const expression = page.getByRole('textbox', { name: 'Expression on canvas' });
  await expression.fill('1/3');
  await page.getByRole('button', { name: /Undo last change/ }).click();
  await expect(expression).toHaveValue('2 + 2');
  await page.getByRole('button', { name: /Redo change/ }).click();
  await expect(expression).toHaveValue('1/3');
  await page.reload();
  await expect(expression).toHaveValue('1/3');
});

test('a card edit survives immediate navigation to the library and back', async ({ page }) => {
  await open(page);
  await page.getByLabel('Math to add to canvas').fill('2 + 2');
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  await expect.poll(async () => (await saved(page)).arithmetic?.[0].expression).toBe('2 + 2');
  const expression = page.getByRole('textbox', { name: 'Expression on canvas' });
  await expression.fill('9 + 1');
  await page.getByRole('link', { name: 'Explore mathematics', exact: true }).first().click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.getByRole('link', { name: 'Your workspace', exact: true }).click();
  await expect(expression).toHaveValue('9 + 1');
  expect((await saved(page)).arithmetic?.[0].expression).toBe('9 + 1');
});

test('dragging a tray numeral places a card and moving it changes only layout', async ({
  page,
}) => {
  await open(page);
  const before = await saved(page);
  await page
    .getByRole('button', { name: 'Add number 7 to canvas' })
    .dragTo(page.locator('.function-canvas'), { targetPosition: { x: 250, y: 220 } });
  await expect(page.locator('.arithmetic-card')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Expression on canvas' })).toHaveValue('7');
  const dropped = await saved(page);
  const id = dropped.arithmetic![0].id;
  expect(dropped.layout[id]).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  expect(dropped.document).toEqual(before.document);

  const header = page.locator('.arithmetic-card__header');
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 40, box!.y + 20);
  await page.mouse.down();
  await page.mouse.move(box!.x + 95, box!.y + 70, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await saved(page)).layout[id].x).not.toBe(dropped.layout[id].x);
  expect((await saved(page)).document).toEqual(before.document);
  await page.getByRole('button', { name: /Undo last change/ }).click();
  await expect.poll(async () => (await saved(page)).layout[id]).toEqual(dropped.layout[id]);
});

test('Pencil strokes stay separate from mathematics across undo, redo, and clear', async ({
  page,
}) => {
  await open(page);
  const before = await saved(page);
  await page.getByRole('button', { name: 'Pencil', exact: true }).click();
  const box = await page.locator('.function-canvas__ink').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 70, box!.y + 90);
  await page.mouse.down();
  await page.mouse.move(box!.x + 120, box!.y + 120, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await saved(page)).ink?.length).toBe(1);
  expect((await saved(page)).document).toEqual(before.document);
  await page.getByRole('button', { name: /Undo last change/ }).click();
  await expect.poll(async () => (await saved(page)).ink?.length ?? 0).toBe(0);
  await page.getByRole('button', { name: /Redo change/ }).click();
  await expect.poll(async () => (await saved(page)).ink?.length).toBe(1);
  await page.getByRole('button', { name: 'Clear ink' }).click();
  await expect.poll(async () => (await saved(page)).ink?.length ?? 0).toBe(0);
  expect((await saved(page)).document).toEqual(before.document);
});

test('version 2 cards and ink round-trip while version 1 remains importable', async ({ page }) => {
  await open(page);
  const initial = await saved(page);
  await page.getByLabel('Math to add to canvas').fill('1/3');
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  await page.getByRole('button', { name: 'Pencil', exact: true }).click();
  const box = await page.locator('.function-canvas__ink').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 70, box!.y + 90);
  await page.mouse.down();
  await page.mouse.move(box!.x + 120, box!.y + 120, { steps: 5 });
  await page.mouse.up();
  const version2 = await saved(page);
  expect(version2.version).toBe(2);
  expect(version2.ink).toHaveLength(1);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export workspace/ }).click();
  const download = await downloading;
  const bytes = await readFile((await download.path())!);
  const exported = JSON.parse(bytes.toString()) as WorkspaceArchive;
  expect(exported.arithmetic).toEqual(version2.arithmetic);
  expect(exported.ink).toEqual(version2.ink);

  const version1 = {
    format: 'wolfbone.workspace',
    version: 1,
    document: initial.document,
    layout: initial.layout,
  };
  await importArchive(page, version1);
  await expect(page.locator('.arithmetic-card')).toHaveCount(0);
  expect((await saved(page)).document).toEqual(initial.document);
  await importArchive(page, exported);
  await expect(page.getByRole('textbox', { name: 'Expression on canvas' })).toHaveValue('1/3');
  expect((await saved(page)).arithmetic).toEqual(exported.arithmetic);
  expect((await saved(page)).ink).toEqual(exported.ink);
});

test('an earlier browser save opens safely and later edits use the new storage key', async ({
  page,
}) => {
  await open(page);
  const current = await saved(page);
  const legacy = JSON.stringify({
    format: 'wolfbone.workspace',
    version: 1,
    document: current.document,
    layout: current.layout,
  });
  await page.evaluate((bytes) => {
    localStorage.removeItem('wolfbone.workspace');
    localStorage.setItem('wolfbone.workspace.v1', bytes);
  }, legacy);
  await page.reload();
  await expect(page.getByLabel('h output for a', { exact: true })).toHaveValue('sun');
  await page.getByLabel('h output for a', { exact: true }).selectOption('moon');
  await expect
    .poll(async () => (await saved(page)).document.functions.find((fn) => fn.id === 'h')?.mapping.a)
    .toBe('moon');
  expect(await page.evaluate(() => localStorage.getItem('wolfbone.workspace.v1'))).toBe(legacy);
});

test('a newer browser save keeps its bytes until an explicit restore', async ({ page }) => {
  await open(page);
  const current = await saved(page);
  const future = JSON.stringify({ ...current, version: 999 });
  await page.evaluate((bytes) => localStorage.setItem('wolfbone.workspace', bytes), future);
  await page.reload();
  await expect(page.locator('.storage-alert')).toContainText('unsupported workspace version');
  await expect(
    page.getByRole('status').filter({ hasText: 'Original browser save kept' }),
  ).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original browser save' }).click();
  const download = await downloading;
  expect((await readFile((await download.path())!)).toString()).toBe(future);
  await page.getByLabel('h output for a', { exact: true }).selectOption('moon');
  expect(await page.evaluate(() => localStorage.getItem('wolfbone.workspace'))).toBe(future);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Restore example', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('wolfbone.workspace'))).toBe(future);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Restore example', exact: true }).click();
  await expect(page.locator('.storage-alert')).toHaveCount(0);
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('wolfbone.workspace')))
    .not.toBe(future);
});

test('clearing browser storage in another tab warns before the current workspace is lost', async ({
  page,
}) => {
  await open(page);
  const current = await saved(page);
  const otherTab = await page.context().newPage();
  await otherTab.goto('/');
  await expect(otherTab.getByRole('heading', { name: 'Make room for a thought.' })).toBeVisible();
  await otherTab.evaluate(() => localStorage.clear());
  await expect(page.locator('.storage-alert')).toContainText('cleared in another tab');
  await expect(page.getByRole('status').filter({ hasText: 'Autosave paused' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wolfbone.workspace'))).toBeNull();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export workspace/ }).click();
  const download = await downloading;
  expect(JSON.parse((await readFile((await download.path())!)).toString())).toEqual(current);
  await otherTab.close();
});

test('returning from Table to Diagram does not refocus a previously focused card', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('Math to add to canvas').fill('8');
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  const expression = page.getByRole('textbox', { name: 'Expression on canvas' });
  await expect(expression).toBeFocused();
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await page.getByRole('tab', { name: 'Diagram', exact: true }).click();
  await expect(expression).not.toBeFocused();
  await expect(page.locator('.inspector-label')).toContainText('On your canvas');
  await page.getByRole('button', { name: 'h: A → C Complete function', exact: true }).click();
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await page.getByRole('tab', { name: 'Diagram', exact: true }).click();
  await expect(expression).not.toBeFocused();
  await expect(page.locator('.inspector-label')).not.toContainText('On your canvas');
});

test('adding a collection after a card fits the new structure and selects it', async ({ page }) => {
  await open(page);
  await page.getByLabel('Math to add to canvas').fill('8');
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  await page.getByRole('button', { name: 'New collection', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('Shapes');
  await page.getByLabel('Element labels').fill('dot, line');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  await expect(page.locator('.inspector-title')).toContainText('Shapes');
  await expect(page.getByRole('textbox', { name: 'Expression on canvas' })).not.toBeFocused();
  await expect
    .poll(async () =>
      page.locator('.react-flow__viewport').evaluate((viewport) => {
        return new DOMMatrixReadOnly(getComputedStyle(viewport).transform).a;
      }),
    )
    .toBeLessThan(0.99);
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
});

test('plain-text drops and drops while drawing do not create expressions', async ({ page }) => {
  await open(page);
  const before = await saved(page);
  await dispatchCanvasDrop(page, 'text/plain', 'https://example.com/some page');
  await expect(page.locator('.arithmetic-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pencil', exact: true }).click();
  await dispatchCanvasDrop(page, 'application/x-wolfbone-expression', '7');
  await expect(page.locator('.arithmetic-card')).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
});

test('a rejected tray add at the card limit preserves the selected function', async ({ page }) => {
  await open(page);
  const current = await saved(page);
  current.version = 2;
  current.arithmetic = Array.from({ length: 50 }, (_, index) => ({
    id: `arithmetic-test-${index}`,
    expression: `${index}`,
  }));
  current.ink = [];
  for (let index = 0; index < 50; index += 1)
    current.layout[`arithmetic-test-${index}`] = {
      x: (index % 5) * 320,
      y: 700 + Math.floor(index / 5) * 330,
    };
  await importArchive(page, current);
  await expect(page.locator('.arithmetic-card')).toHaveCount(50);
  await page.getByRole('button', { name: 'h: A → C Complete function', exact: true }).click();
  const before = await saved(page);
  await dispatchCanvasDrop(page, 'application/x-wolfbone-expression', '7');
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'up to 50 expressions' }).first(),
  ).toBeVisible();
  await expect(page.locator('.arithmetic-card')).toHaveCount(50);
  await expect(page.locator('.inspector-label')).not.toContainText('On your canvas');
  expect(await saved(page)).toEqual(before);
});
