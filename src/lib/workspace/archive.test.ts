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
  WORKSPACE_CONTENT_LIMITS,
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
  assert.equal(decodeArchive(JSON.stringify({ ...archive, version: 3 })).ok, false);
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

test('version 2 round trips editable arithmetic, pencil strokes, and independent positions', () => {
  const document = createExample();
  const arithmetic = [
    { id: 'sum', expression: '2 + 2' },
    { id: 'unfinished', expression: ' 2 + (' },
    { id: 'blank', expression: '' },
  ];
  const ink = [
    {
      id: 'sketch',
      points: [
        { x: -2.5, y: 10 },
        { x: 30, y: 45.25 },
      ],
    },
  ];
  const layout = { ...defaultPositions(document, arithmetic), sum: { x: -100, y: 225 } };
  const archive = archiveDocument(document, layout, { arithmetic, ink });
  assert.equal(archive.version, 2);
  const imported = decoded(JSON.stringify(archive));
  assert.deepEqual(imported, { ...archive, document: normalized(document) });
  assert.deepEqual(decoded(JSON.stringify(imported)), imported);
  imported.arithmetic![0].expression = '8 / 3';
  imported.ink![0].points[0].x = 500;
  assert.equal(arithmetic[0].expression, '2 + 2');
  assert.equal(ink[0].points[0].x, -2.5);
});

test('legacy archives stay version 1 and version 2 preserves absent versus empty content', () => {
  const document = createExample();
  const legacy = archiveDocument(document, {});
  assert.equal(decoded(JSON.stringify(legacy)).version, 1);
  assert.equal(decoded(JSON.stringify(document)).version, 1);
  for (const content of [{}, { arithmetic: [] }, { ink: [] }, { arithmetic: [], ink: [] }]) {
    const imported = decoded(JSON.stringify(archiveDocument(document, {}, content)));
    assert.equal(imported.version, 2);
    assert.equal(Object.hasOwn(imported, 'arithmetic'), Object.hasOwn(content, 'arithmetic'));
    assert.equal(Object.hasOwn(imported, 'ink'), Object.hasOwn(content, 'ink'));
  }
  for (const content of [{ arithmetic: [] }, { ink: [] }])
    assert.equal(decodeArchive(JSON.stringify({ ...legacy, ...content })).ok, false);
});

test('moving and overlapping arithmetic cards changes only layout and preserves source expressions', () => {
  const document = createExample();
  const arithmetic = [{ id: 'number-card', expression: '1 / 3 + ' }];
  const archive = archiveDocument(document, {}, { arithmetic });
  const before = decoded(JSON.stringify(archive));
  const after = decoded(
    JSON.stringify({
      ...before,
      layout: { ...before.layout, 'number-card': { x: -99999, y: 100000 } },
    }),
  );
  assert.deepEqual(before.document, after.document);
  assert.deepEqual(before.arithmetic, after.arithmetic);
  assert.notDeepEqual(before.layout, after.layout);
  assert.deepEqual(
    before.layout['number-card'],
    defaultPositions(document, arithmetic)['number-card'],
  );
});

test('arithmetic schema rejects tampered results, unsafe identities, and collisions', () => {
  const archive = archiveDocument(createExample(), {}, {});
  const invalid = [
    null,
    {},
    [null],
    [{ id: 'calc' }],
    [{ expression: '2+2' }],
    [{ id: 'calc', expression: 4 }],
    [{ id: 'calc', expression: '2+2', value: '4' }],
    [{ id: 'calc', expression: '2+2', numerator: '4', denominator: '1' }],
    [{ id: '', expression: '' }],
    [{ id: ' calc', expression: '' }],
    [{ id: '__proto__', expression: '' }],
    [{ id: 'constructor', expression: '' }],
    [{ id: 'prototype', expression: '' }],
    [{ id: 'x'.repeat(WORKSPACE_CONTENT_LIMITS.idLength + 1), expression: '' }],
    [{ id: 'A', expression: '' }],
    [{ id: 'f', expression: '' }],
    [
      { id: 'same', expression: '' },
      { id: 'same', expression: '2' },
    ],
    [JSON.parse('{"id":"calc","expression":"2","__proto__":{"polluted":true}}')],
  ];
  for (const arithmetic of invalid)
    assert.equal(decodeArchive(JSON.stringify({ ...archive, arithmetic })).ok, false);
  assert.equal(Object.hasOwn(Object.prototype, 'polluted'), false);
});

test('pencil schema rejects malformed strokes, nonfinite points, and cross-content collisions', () => {
  const archive = archiveDocument(
    createExample(),
    {},
    {
      arithmetic: [{ id: 'calc', expression: '' }],
    },
  );
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
  ];
  const invalid = [
    null,
    {},
    [null],
    [{ id: 'stroke' }],
    [{ points }],
    [{ id: 'stroke', points: [] }],
    [{ id: 'stroke', points: [points[0]] }],
    [{ id: 'stroke', points: [points[0], { x: 0 }] }],
    [{ id: 'stroke', points: [points[0], { x: Infinity, y: 0 }] }],
    [{ id: 'stroke', points: [points[0], { x: 0, y: NaN }] }],
    [{ id: 'stroke', points: [points[0], { x: '1', y: 0 }] }],
    [{ id: 'stroke', points: [points[0], { x: 0, y: 0, pressure: 1 }] }],
    [{ id: 'stroke', points: [points[0], { x: 100001, y: 0 }] }],
    [{ id: 'stroke', points: [points[0], { x: 0, y: -100001 }] }],
    [{ id: 'stroke', points, command: 'evaluate' }],
    [{ id: '__proto__', points }],
    [{ id: 'constructor', points }],
    [{ id: 'A', points }],
    [{ id: 'f', points }],
    [{ id: 'calc', points }],
    [
      { id: 'same', points },
      { id: 'same', points },
    ],
  ];
  for (const ink of invalid)
    assert.equal(decodeArchive(JSON.stringify({ ...archive, ink })).ok, false);
  const boundary = [
    {
      id: 'edge',
      points: [
        { x: -100000, y: 100000 },
        { x: 100000, y: -100000 },
      ],
    },
  ];
  assert.deepEqual(decoded(JSON.stringify({ ...archive, ink: boundary })).ink, boundary);
  const overflow = JSON.stringify({ ...archive, ink: boundary }).replace('-100000', '1e309');
  assert.equal(decodeArchive(overflow).ok, false);
  assert.equal(
    decodeArchive(
      JSON.stringify({
        ...archive,
        ink: boundary,
        layout: { edge: { x: 0, y: 0 } },
      }),
    ).ok,
    false,
  );
});

test('new content limits allow the boundary and reject excessive cards, text, strokes, and points', () => {
  const document = { version: 1 as const, title: 'Sketch and numbers', sets: [], functions: [] };
  const arithmetic = Array.from(
    { length: WORKSPACE_CONTENT_LIMITS.arithmeticCards },
    (_, index) => ({
      id: `calc-${index}`,
      expression: '2'.repeat(WORKSPACE_CONTENT_LIMITS.expressionLength),
    }),
  );
  assert.equal(
    decodeArchive(JSON.stringify(archiveDocument(document, {}, { arithmetic }))).ok,
    true,
  );
  assert.equal(
    decodeArchive(
      JSON.stringify(
        archiveDocument(
          document,
          {},
          {
            arithmetic: [...arithmetic, { id: 'extra', expression: '' }],
          },
        ),
      ),
    ).ok,
    false,
  );
  assert.equal(
    decodeArchive(
      JSON.stringify(
        archiveDocument(
          document,
          {},
          {
            arithmetic: [
              { id: 'long', expression: '2'.repeat(WORKSPACE_CONTENT_LIMITS.expressionLength + 1) },
            ],
          },
        ),
      ),
    ).ok,
    false,
  );
  const points = Array.from({ length: WORKSPACE_CONTENT_LIMITS.pointsPerStroke }, (_, index) => ({
    x: index,
    y: -index,
  }));
  assert.equal(
    decodeArchive(
      JSON.stringify(
        archiveDocument(
          document,
          {},
          {
            ink: [{ id: 'long-line', points }],
          },
        ),
      ),
    ).ok,
    true,
  );
  assert.equal(
    decodeArchive(
      JSON.stringify(
        archiveDocument(
          document,
          {},
          {
            ink: [{ id: 'too-long', points: [...points, { x: 0, y: 0 }] }],
          },
        ),
      ),
    ).ok,
    false,
  );
  const ink = Array.from({ length: WORKSPACE_CONTENT_LIMITS.inkStrokes }, (_, index) => ({
    id: `stroke-${index}`,
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  }));
  assert.equal(decodeArchive(JSON.stringify(archiveDocument(document, {}, { ink }))).ok, true);
  assert.equal(
    decodeArchive(
      JSON.stringify(
        archiveDocument(
          document,
          {},
          {
            ink: [...ink, { id: 'extra', points: ink[0].points }],
          },
        ),
      ),
    ).ok,
    false,
  );
  const oversized = archiveDocument(
    document,
    {},
    {
      ink: ink.map((stroke) => ({ ...stroke, points })),
    },
  );
  assert.equal(decodeArchive(JSON.stringify(oversized)).ok, false);
});
