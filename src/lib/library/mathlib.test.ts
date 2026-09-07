import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMathlibModule, getMathlibSummary, searchMathlib } from './mathlib';

test('bundled source summary identifies the pinned imported corpus and its scope', async () => {
  const summary = await getMathlibSummary();
  assert.equal(summary.revision, '71a80585ee495fc24472fd0eaffc89d94e4fd8d6');
  assert.equal(summary.declarationCount, 321329);
  assert.equal(summary.moduleCount, 8489);
  assert.equal(summary.licence, 'Apache-2.0');
  assert.equal(
    summary.areas.reduce((sum, area) => sum + area.declarationCount, 0),
    summary.declarationCount,
  );
  assert.match(summary.scope, /Metadata only/);
});

test('exact declaration search preserves its kind, module, and pinned source context', async () => {
  const result = await searchMathlib({ query: 'Function.comp_assoc' });
  const declaration = result.items[0];
  assert.equal(declaration.name, 'Function.comp_assoc');
  assert.equal(declaration.kind, 'theorem');
  assert.equal(declaration.module, 'Mathlib.Logic.Function.Defs');
  assert.equal(declaration.area, 'logic');
  assert.equal(
    declaration.sourceUrl,
    'https://github.com/leanprover-community/mathlib4/blob/71a80585ee495fc24472fd0eaffc89d94e4fd8d6/Mathlib/Logic/Function/Defs.lean',
  );
  assert.equal(
    declaration.documentationUrl,
    'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Logic/Function/Defs.html#Function.comp_assoc',
  );
});

test('module filter totals match the index and direct external imports retain their names', async () => {
  const module = await getMathlibModule('Mathlib.Logic.Function.Defs');
  assert.ok(module);
  const results = await searchMathlib({ module: module.name, limit: 100 });
  assert.equal(results.total, module.declarationCount);
  assert.ok(results.items.every((declaration) => declaration.module === module.name));
  assert.ok(module.imports.includes('Init'));
  assert.ok(module.imports.includes('Mathlib.Init'));
  assert.equal(
    await getMathlibModule('Init'),
    null,
    'external modules are not relabelled as imported Mathlib modules',
  );
  const root = await getMathlibModule('Mathlib');
  assert.ok(root?.sourceUrl.endsWith('/Mathlib.lean'));
});

test('area selection and pagination return bounded, stable results', async () => {
  const first = await searchMathlib({ query: 'mul_assoc', area: 'algebra', limit: 4 });
  const second = await searchMathlib({ query: 'mul_assoc', area: 'algebra', offset: 4, limit: 4 });
  assert.equal(first.items.length, 4);
  assert.equal(second.items.length, 4);
  assert.ok(first.items.every((item) => item.area === 'algebra'));
  assert.equal(first.total, second.total);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.name)).size, 8);
  assert.equal(
    (await searchMathlib({ query: 'mul_assoc', area: 'algebra', offset: first.total + 1 })).items
      .length,
    0,
  );
});

test('search normalizes whitespace and separators without treating input as a regular expression', async () => {
  const [symbolic, words] = await Promise.all([
    searchMathlib({ query: 'Function.comp_assoc' }),
    searchMathlib({ query: '  FUNCTION  COMP_ASSOC  ' }),
  ]);
  assert.deepEqual(symbolic, words);
  assert.equal((await searchMathlib({ query: '[] .* ^ $' })).total, 0);
});

test('unknown areas and modules cannot become filesystem paths; pagination is clamped', async () => {
  const result = await searchMathlib({ area: '../../private', limit: 1000000, offset: -10 });
  assert.equal(result.total, 0);
  assert.equal(result.limit, 100);
  assert.equal(result.offset, 0);
  assert.equal(await getMathlibModule('not.a.module'), null);
  assert.equal((await searchMathlib({ module: 'Init' })).total, 0);
  const clamped = await searchMathlib({ area: 'init', limit: 0, offset: Number.NaN });
  assert.equal(clamped.limit, 1);
  assert.equal(clamped.offset, 0);
});
