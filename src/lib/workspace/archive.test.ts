// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareFunctions,
  composeFunctions,
  createExample,
  parseDocument,
  type MathDocument,
} from '../math/model';
import {
  archiveDocument,
  decodeArchive,
  defaultPositions,
  MAX_ARCHIVE_BYTES,
  type WorkspaceArchive,
} from './archive';

function normalized(document: MathDocument): MathDocument {
  const result = parseDocument(document);
  if (!result.ok) assert.fail(result.errors.join(' '));
  return result.value;
}

function decoded(text: string): WorkspaceArchive {
  const result = decodeArchive(text);
  if (!result.ok) assert.fail(result.errors.join(' '));
  return result.value;
}

test('a workspace round trip retains every mapping and independent position', () => {
  const document = createExample();
  const positions = defaultPositions(document);
  positions[document.sets[0].id] = { x: -82.5, y: 905 };
  const archive = archiveDocument(document, positions);
  const result = decoded(JSON.stringify(archive));
  // Mapping prototypes are a parser implementation detail, not mathematical data.
  assert.deepEqual(result, { ...archive, document: normalized(document) });
  assert.deepEqual(decoded(JSON.stringify(result)), result);
  assert.deepEqual(document, createExample());
  assert.equal(Object.getPrototypeOf(result.document.functions[0].mapping), null);
});

test('a plain mathematical document imports without requiring a canvas format', () => {
  const document = createExample();
  const result = decoded(JSON.stringify(document));
  assert.deepEqual(result.document, normalized(document));
  assert.deepEqual(result.layout, defaultPositions(document));
});

test('empty mathematical documents and empty workspace layouts import safely', () => {
  const document: MathDocument = { version: 1, title: 'Empty workspace', sets: [], functions: [] };
  assert.deepEqual(decoded(JSON.stringify(document)), archiveDocument(document, {}));
  assert.deepEqual(
    decoded(JSON.stringify(archiveDocument(document, {}))),
    archiveDocument(document, {}),
  );
  assert.deepEqual(defaultPositions(document), {});
  assert.equal(
    decodeArchive(JSON.stringify(archiveDocument(document, { A: { x: 0, y: 0 } }))).ok,
    false,
  );
});

test('partial layouts fill missing positions without altering the mathematical document', () => {
  const document = createExample();
  const layout = { B: { x: -12.5, y: 4.25 } };
  const result = decoded(JSON.stringify(archiveDocument(document, layout)));
  assert.deepEqual(result.layout, { ...defaultPositions(document), ...layout });
  assert.deepEqual(result.document, normalized(document));
  result.layout.B.x = 10;
  result.document.functions[0].mapping.a = '2';
  assert.equal(layout.B.x, -12.5);
  assert.equal(document.functions[0].mapping.a, '1');
});

test('moving or overlapping collections preserves the document and its equality or counterexample', () => {
  for (const disagree of [false, true]) {
    const document = createExample();
    if (disagree) document.functions[2].mapping.c = 'moon';
    const layouts = [
      defaultPositions(document),
      { A: { x: -99999, y: 100000 }, B: { x: 0, y: 0 }, C: { x: 0, y: 0 } },
    ];
    const results = layouts.map((layout) => {
      const imported = decoded(JSON.stringify(archiveDocument(document, layout)));
      assert.deepEqual(imported.document, normalized(document));
      const [f, g, h] = imported.document.functions;
      const composite = composeFunctions(f, g, imported.document.sets);
      if (!composite.ok) assert.fail(composite.errors.join(' '));
      return compareFunctions(composite.value, h, imported.document.sets);
    });
    assert.deepEqual(results[0], results[1]);
    assert.equal(results[0].kind, disagree ? 'different' : 'equal');
    if (disagree)
      assert.deepEqual(results[0].witness, {
        inputId: 'c',
        leftOutputId: 'sun',
        rightOutputId: 'moon',
      });
  }
});

test('invalid and oversized archives are rejected', () => {
  assert.equal(decodeArchive('{').ok, false);
  assert.equal(decodeArchive(' '.repeat(MAX_ARCHIVE_BYTES + 1)).ok, false);
  assert.equal(decodeArchive(`"${'é'.repeat(MAX_ARCHIVE_BYTES / 2)}"`).ok, false);
  const archive = archiveDocument(createExample(), {});
  assert.equal(decodeArchive(JSON.stringify({ ...archive, version: 2 })).ok, false);
  assert.equal(decodeArchive(JSON.stringify({ ...archive, format: 'another-format' })).ok, false);
  assert.equal(
    decodeArchive(JSON.stringify({ ...archive, layout: { stranger: { x: 0, y: 0 } } })).ok,
    false,
  );
  assert.equal(decodeArchive(JSON.stringify({ ...archive, unknown: true })).ok, false);
});

test('layout positions require precisely two finite numeric coordinates within range', () => {
  const archive = archiveDocument(createExample(), {});
  const badPositions = [
    null,
    [],
    0,
    'position',
    {},
    { x: 0 },
    { y: 0 },
    { x: '0', y: 0 },
    { x: null, y: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 100001, y: 0 },
    { x: 0, y: -100001 },
    { x: Infinity, y: 0 },
    { x: 0, y: NaN },
  ];
  for (const position of badPositions) {
    assert.equal(decodeArchive(JSON.stringify({ ...archive, layout: { A: position } })).ok, false);
  }
  const boundary = { A: { x: -100000, y: 100000 } };
  assert.deepEqual(decoded(JSON.stringify({ ...archive, layout: boundary })).layout.A, boundary.A);
  const overflow = JSON.stringify({ ...archive, layout: { A: { x: 'OVERFLOW', y: 0 } } }).replace(
    '"OVERFLOW"',
    '1e309',
  );
  assert.equal(decodeArchive(overflow).ok, false);
});

test('missing envelope fields and non-object layouts are rejected', () => {
  const archive = archiveDocument(createExample(), {});
  const badLayouts = [null, [], 0, '', false];
  for (const layout of badLayouts)
    assert.equal(decodeArchive(JSON.stringify({ ...archive, layout })).ok, false);
  const { document: _document, ...noDocument } = archive;
  const { layout: _layout, ...noLayout } = archive;
  const { version: _version, ...noVersion } = archive;
  for (const value of [noDocument, noLayout, noVersion, null, [], 1, 'text']) {
    assert.equal(decodeArchive(JSON.stringify(value)).ok, false);
  }
});

test('unsafe layout and position keys are rejected without changing object prototypes', () => {
  const archive = archiveDocument(createExample(), {});
  const layouts = [
    JSON.parse('{"__proto__":{"polluted":true}}'),
    JSON.parse('{"constructor":{"x":0,"y":0}}'),
    { A: JSON.parse('{"x":0,"y":0,"__proto__":{"polluted":true}}') },
  ];
  for (const layout of layouts)
    assert.equal(decodeArchive(JSON.stringify({ ...archive, layout })).ok, false);
  assert.equal(Object.hasOwn(Object.prototype, 'polluted'), false);
});

test('non-text inputs are rejected before string conversion can execute caller code', () => {
  let conversions = 0;
  const value = {
    toString() {
      conversions += 1;
      throw new Error('Must not run');
    },
  };
  assert.equal(decodeArchive(value as unknown as string).ok, false);
  assert.equal(conversions, 0);
});
