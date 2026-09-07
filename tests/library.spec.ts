import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { MathlibSearchResult, MathlibSummary } from '../src/lib/library/mathlib';
import type { WorkspaceArchive } from '../src/lib/workspace/archive';

const workspaceKey = 'wolfbone.workspace.v1';
const seedKey = (id: string) => `${workspaceKey}.example.${id}`;
const inspector = (page: Page) =>
  page.getByRole('complementary', { name: 'Concept and source inspector' });

async function saved(page: Page, key = workspaceKey): Promise<WorkspaceArchive> {
  await expect(page.getByRole('status').filter({ hasText: 'Saved in this browser' })).toBeVisible();
  const value = await page.evaluate((name) => localStorage.getItem(name), key);
  expect(value).not.toBeNull();
  return JSON.parse(value!);
}

async function openAtlas(page: Page) {
  await page.goto('/explore');
  await expect(
    page.getByRole('heading', { name: 'Where would you like to begin?', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('concept-map').locator('.react-flow__node')).toHaveCount(12);
}

async function chooseIdea(page: Page, name: string) {
  await page.getByRole('textbox', { name: 'Search mathematical ideas' }).fill(name);
  const row = page.locator('.atlas-concept-row').filter({
    has: page.getByText(name, { exact: true }),
  });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
}

function sourceResponse(page: Page, query: string, area = '', offset = 0) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === '/api/library' &&
      url.searchParams.get('q') === query &&
      url.searchParams.get('area') === area &&
      url.searchParams.get('offset') === String(offset)
    );
  });
}

test('the overview exposes twelve mathematical areas and actual imported corpus counts', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await request.get('/api/library?summary=true');
  expect(response.ok()).toBeTruthy();
  const summary: MathlibSummary = await response.json();
  const manifest = JSON.parse(await readFile('data/mathlib/manifest.json', 'utf8'));
  expect(summary.declarationCount).toBe(manifest.declarationCount);
  expect(summary.moduleCount).toBe(manifest.moduleCount);
  expect(summary.revision).toMatch(/^[0-9a-f]{40}$/);
  expect(summary.declarationCount).toBeGreaterThan(300_000);
  expect(summary.moduleCount).toBeGreaterThan(8_000);

  await openAtlas(page);
  await expect(page.locator('.atlas-sidebar nav button')).toHaveCount(12);
  for (const name of [
    'Logic & proof',
    'Sets & functions',
    'Numbers & arithmetic',
    'Algebra',
    'Geometry',
    'Trigonometry',
    'Linear algebra',
    'Calculus & analysis',
    'Probability',
    'Statistics',
    'Discrete mathematics',
    'Mathematical structures',
  ]) {
    await expect(
      page.getByTestId('concept-map').getByRole('button', { name: `Explore ${name}`, exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator('.atlas-side-bottom')).toContainText(
    `${summary.declarationCount.toLocaleString('en')} declarations`,
  );
  await expect(page.locator('.atlas-side-bottom')).toContainText(
    `${summary.moduleCount.toLocaleString('en')} modules`,
  );
  await expect(page.locator('.atlas-map-caption')).toContainText(
    'These positions do not imply a hierarchy.',
  );
  expect(errors).toEqual([]);
});

test('search, anchoring, typed relationship traversal and browser history agree', async ({
  page,
}) => {
  await openAtlas(page);
  await chooseIdea(page, 'Function');
  await expect(page).toHaveURL(/\/explore\?concept=function$/);
  await expect(inspector(page)).toContainText('Different inputs may share an output');
  await expect(inspector(page)).toContainText('Functions here are total.');
  await expect(page.locator('.atlas-node--selected')).toContainText('Your anchor');
  const uses = inspector(page)
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: /^Uses these ideas/ }),
    });
  await expect(uses).toContainText('Ideas used by this explanation.');
  await uses.getByRole('button', { name: 'Set', exact: true }).click();
  await expect(page).toHaveURL(/concept=set$/);
  await expect(inspector(page).getByRole('heading', { name: 'Set', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/concept=function$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Function', exact: true }),
  ).toBeVisible();

  const usedBy = inspector(page)
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: /^Used by these ideas/ }),
    });
  await usedBy.getByRole('button', { name: 'Function composition', exact: true }).click();
  await expect(page).toHaveURL(/concept=composition$/);
  await expect(inspector(page)).toContainText(
    'The rightmost function in the notation is applied first.',
  );
  await expect(inspector(page)).toContainText(
    'Matching labels alone do not establish compatibility.',
  );
  await expect(
    inspector(page).getByRole('link', { name: 'Two routes, one result', exact: true }),
  ).toHaveAttribute('href', '/?example=function-composition');

  await chooseIdea(page, 'Injective function');
  const classification = inspector(page)
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: /^Is a kind of/ }),
    });
  await expect(classification).toContainText('Classification, not a derivation.');
  await classification.getByRole('button', { name: 'Function', exact: true }).click();
  await expect(page).toHaveURL(/concept=function$/);
});

test('the map exposes distinct relationship perspectives with readable, clickable cards', async ({
  page,
}) => {
  await openAtlas(page);
  const controls = await page.locator('.atlas-map-controls').boundingBox();
  expect(controls).not.toBeNull();
  await expect
    .poll(async () => {
      const boxes = await page.locator('.atlas-node').evaluateAll((nodes) =>
        nodes.map((node) => {
          const { x, y, width, height } = node.getBoundingClientRect();
          return { x, y, width, height };
        }),
      );
      return boxes.every(
        (box) =>
          box.x + box.width <= controls!.x ||
          box.x >= controls!.x + controls!.width ||
          box.y + box.height <= controls!.y ||
          box.y >= controls!.y + controls!.height,
      );
    })
    .toBeTruthy();
  await chooseIdea(page, 'Function');
  await expect(page.locator('.react-flow__edge-text').first()).toHaveText('used by');
  await page.getByLabel('Connections', { exact: true }).selectOption('specializes');
  await expect(page.locator('.react-flow__edge-text').first()).toHaveText('is a kind of');
  await page.getByRole('button', { name: 'Explore Injective function', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Injective function', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.locator('.atlas-node--selected')).toContainText('Injective function');
  await page.getByLabel('Connections', { exact: true }).selectOption('related');
  await expect(page.locator('.react-flow__edge-text').first()).toHaveText('related to');
  expect(
    await page
      .locator('.react-flow__edge-path')
      .evaluateAll((edges) => edges.every((edge) => !edge.getAttribute('marker-end'))),
  ).toBeTruthy();
  await expect(inspector(page)).toContainText('Is a kind of');
});

test('an area filters the concept index and a map export preserves typed relationships', async ({
  page,
}) => {
  await openAtlas(page);
  await page.getByRole('button', { name: 'Explore Logic & proof', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Logic & proof' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Index', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const rows = page.locator('.atlas-concept-row');
  expect(await rows.count()).toBeGreaterThan(10);
  for (const metadata of await rows.locator('small').allTextContents())
    expect(metadata).toMatch(/^Logic & proof · /);
  await page
    .getByRole('textbox', { name: 'Search mathematical ideas' })
    .fill('unfindable-idea-12345');
  await expect(page.getByRole('heading', { name: 'No matching ideas yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  expect(await rows.count()).toBeGreaterThan(100);

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export map', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('wolfbone-foundations.atlas.json');
  const path = await download.path();
  expect(path).not.toBeNull();
  const data = JSON.parse(await readFile(path!, 'utf8'));
  expect(data.format).toBe('wolfbone.atlas');
  expect(data.version).toBe(1);
  expect(data.licence).toBe('MIT');
  expect(data.contentStatus).toContain('not proof certificates');
  expect(data.areas).toHaveLength(12);
  expect(data.concepts.length).toBeGreaterThan(100);
  const ids = new Set(data.concepts.map((concept: { id: string }) => concept.id));
  expect(ids.size).toBe(data.concepts.length);
  expect(data.relations).toContainEqual({ from: 'function', to: 'set', kind: 'uses' });
  expect(data.relations).toContainEqual({ from: 'injection', to: 'function', kind: 'specializes' });
  expect(data.relations).toContainEqual({ from: 'composition', to: 'function', kind: 'related' });
  for (const relation of data.relations) {
    expect(['uses', 'specializes', 'related']).toContain(relation.kind);
    expect(ids.has(relation.from)).toBeTruthy();
    expect(ids.has(relation.to)).toBeTruthy();
    expect(relation.from).not.toBe(relation.to);
  }
  await expect(page.locator('.atlas-main-footer')).toContainText(
    `${data.concepts.length} explained ideas · ${data.relations.length} typed connections`,
  );
  expect(data.sourceSnapshot.revision).toMatch(/^[0-9a-f]{40}$/);
  expect(data.sourceSnapshot.declarationCount).toBeGreaterThan(300_000);
});

test('local mathlib search leads to a declaration, pinned source and navigable module imports', async ({
  page,
  request,
}) => {
  const api = await request.get('/api/library?q=Function.comp_assoc');
  expect(api.ok()).toBeTruthy();
  const result: MathlibSearchResult = await api.json();
  expect(result.items[0]).toMatchObject({
    name: 'Function.comp_assoc',
    kind: 'theorem',
    module: 'Mathlib.Logic.Function.Defs',
  });
  await openAtlas(page);
  await page.getByRole('tab', { name: 'Mathlib', exact: true }).click();
  const searched = sourceResponse(page, 'Function.comp_assoc');
  await page.getByRole('textbox', { name: 'Search imported mathlib' }).fill('Function.comp_assoc');
  expect((await searched).ok()).toBeTruthy();
  const row = page.locator('.atlas-source-row').filter({
    has: page.getByRole('link', { name: 'Function.comp_assoc', exact: true }),
  });
  await expect(row).toHaveCount(1);
  await expect(row.locator('.atlas-kind')).toHaveText('theorem');
  await expect(row.getByRole('link', { name: 'Function.comp_assoc', exact: true })).toHaveAttribute(
    'href',
    result.items[0].documentationUrl,
  );
  await row.getByRole('button', { name: 'Mathlib.Logic.Function.Defs', exact: true }).click();
  await expect(
    inspector(page).getByRole('heading', { name: 'Mathlib.Logic.Function.Defs' }),
  ).toBeVisible();
  await expect(inspector(page)).toContainText(
    'Module imports. These are not theorem-to-theorem proof dependencies.',
  );
  await expect(
    inspector(page).getByRole('link', { name: 'Read the pinned source' }),
  ).toHaveAttribute('href', result.items[0].sourceUrl);
  await expect(
    inspector(page).getByRole('link', { name: 'Read module documentation' }),
  ).toHaveAttribute(
    'href',
    'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Logic/Function/Defs.html',
  );
  await inspector(page).getByRole('button', { name: 'Mathlib.Init', exact: true }).click();
  await expect(
    inspector(page).getByRole('heading', { name: 'Mathlib.Init', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.atlas-source-note')).toContainText(
    'Wolfbone has not rechecked them.',
  );
});

test('source area filtering and pagination change the actual locally returned declarations', async ({
  page,
}) => {
  await openAtlas(page);
  await page.getByRole('tab', { name: 'Mathlib', exact: true }).click();
  const filtered = sourceResponse(page, '', 'logic');
  await page.getByLabel('Source area', { exact: true }).selectOption('logic');
  const firstPage: MathlibSearchResult = await (await filtered).json();
  expect(firstPage.total).toBeGreaterThan(firstPage.limit);
  expect(firstPage.items.every((item) => item.area === 'logic')).toBeTruthy();
  await expect(page.locator('.atlas-source-row')).toHaveCount(firstPage.limit);
  await expect(page.locator('.atlas-source-row').first()).toContainText(firstPage.items[0].name);
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  const firstNames = await page.locator('.atlas-source-row > div > a').allTextContents();

  const paginated = sourceResponse(page, '', 'logic', firstPage.limit);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const secondPage: MathlibSearchResult = await (await paginated).json();
  expect(secondPage.offset).toBe(firstPage.limit);
  expect(secondPage.items.every((item) => item.area === 'logic')).toBeTruthy();
  await expect(page.locator('.atlas-source-row').first()).toContainText(secondPage.items[0].name);
  const secondNames = await page.locator('.atlas-source-row > div > a').allTextContents();
  expect(secondNames.filter((name) => firstNames.includes(name))).toEqual([]);
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeEnabled();
  const previous = sourceResponse(page, '', 'logic');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await previous;
  await expect(page.locator('.atlas-source-row').first()).toContainText(firstPage.items[0].name);

  const emptySearch = sourceResponse(page, 'absent-declaration-12345', 'logic');
  await page
    .getByRole('textbox', { name: 'Search imported mathlib' })
    .fill('absent-declaration-12345');
  await emptySearch;
  await expect(page.getByRole('heading', { name: 'No matching declarations.' })).toBeVisible();
});

test('opening, editing, restoring and undoing an example preserves the personal workspace and other seeds', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Follow the structure.' })).toBeVisible();
  await page.getByLabel('h output for a', { exact: true }).selectOption('moon');
  const personal = await saved(page);
  expect(personal.document.functions.find((fn) => fn.id === 'h')!.mapping.a).toBe('moon');

  await page.getByRole('link', { name: 'Explore mathematics', exact: true }).first().click();
  await page.getByRole('button', { name: /Ready-to-edit examples/ }).click();
  await expect(page.locator('.atlas-example-list article')).toHaveCount(16);
  const parity = page.locator('.atlas-example-list article').filter({
    has: page.getByRole('heading', { name: 'Keep only the remainder', exact: true }),
  });
  await parity.getByRole('link', { name: 'Open this construction', exact: true }).click();
  await expect(page).toHaveURL(/\/\?example=parity$/);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect(page.locator('.react-flow__edge')).toHaveCount(7);
  const assignment = page.getByLabel('remainder mod 2 output for −3', { exact: true });
  await expect(assignment).toHaveValue('parity-outputs:1');
  await assignment.selectOption('parity-outputs:0');
  const edited = await saved(page, seedKey('parity'));
  expect(edited.document.functions[0].mapping['parity-inputs:0']).toBe('parity-outputs:0');
  expect(await saved(page)).toEqual(personal);
  await page.reload();
  await expect(assignment).toHaveValue('parity-outputs:0');
  const workspaceLibrary = page.getByRole('complementary', { name: 'Workspace library' });
  await workspaceLibrary.getByText('About this starting example', { exact: true }).click();
  await expect(
    workspaceLibrary.getByText(
      'These notes describe the starting example. Your edits can change its properties.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Restore example', exact: true }).click();
  await expect(assignment).toHaveValue('parity-outputs:1');
  await page.getByRole('button', { name: /Undo last change/ }).click();
  await expect(assignment).toHaveValue('parity-outputs:0');
  expect((await saved(page, seedKey('parity'))).document).toEqual(edited.document);

  await page.goto('/?example=boolean-not');
  await expect(page.getByRole('heading', { name: 'Follow the structure.' })).toBeVisible();
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await expect(page.getByLabel('Table not output for false', { exact: true })).toHaveValue(
    'truth-values:1',
  );
  await expect(page.getByLabel('Table not output for true', { exact: true })).toHaveValue(
    'truth-values:0',
  );
  await saved(page, seedKey('boolean-not'));
  expect((await saved(page, seedKey('parity'))).document).toEqual(edited.document);

  await page.goto('/explore');
  await page.getByRole('link', { name: 'Your workspace', exact: true }).click();
  await expect(page.getByLabel('h output for a', { exact: true })).toHaveValue('moon');
  expect(await saved(page)).toEqual(personal);
});

test('empty, self-composing and binary-operation seeds render their distinct finite structures', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?example=empty-function');
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'A complete function', exact: true }),
  ).toBeVisible();
  expect((await saved(page, seedKey('empty-function'))).document.functions[0].mapping).toEqual({});

  await page.goto('/?example=boolean-not');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await page.getByRole('button', { name: 'Compare with composition', exact: true }).click();
  await expect(page.getByTestId('comparison-result')).toContainText('Same on every input');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('First function')).toHaveValue('boolean-not-op');
  await expect(dialog.getByLabel('Then this function')).toHaveValue('boolean-not-op');
  await dialog.getByRole('button', { name: 'Show on canvas', exact: true }).click();
  await expect(page.getByLabel('Show', { exact: true })).toHaveValue('composite');
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);

  await page.goto('/?example=addition-mod3');
  await expect(page.locator('.react-flow__edge')).toHaveCount(9);
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  await expect(page.getByLabel('Table add mod 3 output for (2, 2)', { exact: true })).toHaveValue(
    'addition-outputs:1',
  );
  await expect(page.locator('.function-table .mapping-row')).toHaveCount(9);
  expect(errors).toEqual([]);
});

test('the atlas remains searchable and traversable by keyboard at a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openAtlas(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  const search = page.getByRole('textbox', { name: 'Search mathematical ideas' });
  await search.scrollIntoViewIfNeeded();
  await search.focus();
  await search.fill('Function');
  const row = page
    .locator('.atlas-concept-row')
    .filter({ has: page.getByText('Function', { exact: true }) });
  await row.focus();
  await row.press('Enter');
  const heading = inspector(page).getByRole('heading', { name: 'Function', exact: true });
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toBeInViewport();
  const uses = inspector(page)
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: /^Uses these ideas/ }),
    });
  const set = uses.getByRole('button', { name: 'Set', exact: true });
  await set.focus();
  await set.press('Enter');
  await expect(page).toHaveURL(/concept=set$/);
  const setHeading = inspector(page).getByRole('heading', { name: 'Set', exact: true });
  await setHeading.scrollIntoViewIfNeeded();
  await expect(setHeading).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test('unknown examples and modules return a not-found response instead of another construction', async ({
  page,
  request,
}) => {
  const response = await page.goto('/?example=not-a-real-example');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Follow the structure.' })).toHaveCount(0);
  const missing = await request.get('/api/library?module=Mathlib.NoSuchModule');
  expect(missing.status()).toBe(404);
  expect(await missing.json()).toEqual({ error: 'Module not found.' });
});
