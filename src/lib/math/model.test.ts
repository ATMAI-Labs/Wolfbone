import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareFunctions,
  composeFunctions,
  createExample,
  DOCUMENT_LIMITS,
  MAX_DOCUMENT_BYTES,
  parseDocument,
  parseDocumentJson,
  validateFunction,
  type FiniteFunction,
  type FiniteSet,
  type MathDocument,
} from './model';

function compose(first: FiniteFunction, second: FiniteFunction, sets: FiniteSet[]): FiniteFunction {
  const result = composeFunctions(first, second, sets);
  if (!result.ok) assert.fail(result.errors.join('\n'));
  return result.value;
}

function identity(set: FiniteSet): FiniteFunction {
  return {
    id: `identity-${set.id}`,
    name: `id ${set.name}`,
    domainId: set.id,
    codomainId: set.id,
    mapping: Object.fromEntries(set.elements.map((element) => [element.id, element.id])),
  };
}

function rejected(input: unknown): string[] {
  const result = parseDocument(input);
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('Expected the document to be rejected.');
  assert.ok(result.errors.length > 0);
  return result.errors;
}

test('the example is valid, independent on each call, and has g ∘ f = h', () => {
  const document = createExample();
  assert.equal(parseDocument(document).ok, true);
  for (const fn of document.functions)
    assert.deepEqual(validateFunction(fn, document.sets), { valid: true, errors: [], missing: [] });
  const [f, g, h] = document.functions;
  const composite = compose(f, g, document.sets);
  assert.equal(composite.id, 'composite');
  assert.equal(composite.name, 'g ∘ f');
  assert.equal(composite.domainId, 'A');
  assert.equal(composite.codomainId, 'C');
  assert.deepEqual({ ...composite.mapping }, { a: 'sun', b: 'moon', c: 'sun' });
  const comparison = compareFunctions(composite, h, document.sets);
  assert.equal(comparison.kind, 'equal');
  assert.match(comparison.explanation, /all 3 inputs/);
  f.mapping.a = '2';
  assert.equal(createExample().functions[0].mapping.a, '1');
});

test('incomplete construction is importable, but cannot compose or establish equality', () => {
  const document = createExample();
  const [f, g] = document.functions;
  delete f.mapping.b;
  assert.deepEqual(validateFunction(f, document.sets), {
    valid: false,
    errors: [],
    missing: ['b'],
  });
  assert.equal(parseDocument(document).ok, true);
  assert.equal(composeFunctions(f, g, document.sets).ok, false);
  assert.equal(compareFunctions(f, f, document.sets).kind, 'incomplete');
});

test('unassigned inputs follow domain order, including names inherited by ordinary objects', () => {
  const sets: FiniteSet[] = [
    {
      id: 'A',
      name: 'A',
      elements: [
        { id: 'toString', label: 'toString' },
        { id: 'b', label: 'b' },
      ],
    },
    { id: 'B', name: 'B', elements: [{ id: '1', label: '1' }] },
  ];
  const fn: FiniteFunction = { id: 'f', name: 'f', domainId: 'A', codomainId: 'B', mapping: {} };
  assert.deepEqual(validateFunction(fn, sets).missing, ['toString', 'b']);
  fn.mapping = { toString: '1', b: '1' };
  assert.equal(validateFunction(fn, sets).valid, true);
});

test('unknown mapping inputs and outputs are errors, even when every input is assigned', () => {
  const {
    sets,
    functions: [f],
  } = createExample();
  f.mapping.a = 'outside';
  f.mapping.ghost = '1';
  const result = validateFunction(f, sets);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, []);
  assert.equal(result.errors.length, 2);
  assert.equal(compareFunctions(f, f, sets).kind, 'incomparable');
});

test('a second function must be total, including inputs outside the first function image', () => {
  const {
    sets,
    functions: [f, g],
  } = createExample();
  f.mapping = { a: '1', b: '1', c: '1' };
  delete g.mapping['2'];
  const result = composeFunctions(f, g, sets);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(' '), /second function has unassigned inputs: 2/);
});

test('a counterexample is the first differing input in domain order, not mapping insertion order', () => {
  const {
    sets,
    functions: [f, g, h],
  } = createExample();
  h.mapping = { c: 'moon', b: 'sun', a: 'moon' };
  const result = compareFunctions(compose(f, g, sets), h, sets);
  assert.equal(result.kind, 'different');
  assert.deepEqual(result.witness, { inputId: 'a', leftOutputId: 'sun', rightOutputId: 'moon' });
  sets[0].elements.reverse();
  assert.equal(compareFunctions(compose(f, g, sets), h, sets).witness?.inputId, 'c');
});

test('names and mapping insertion order do not change extensional equality', () => {
  const {
    sets,
    functions: [, , h],
  } = createExample();
  const renamed: FiniteFunction = {
    ...h,
    id: 'other',
    name: 'Another name',
    mapping: { c: 'sun', a: 'sun', b: 'moon' },
  };
  assert.equal(compareFunctions(h, renamed, sets).kind, 'equal');
});

test('same labels and cardinalities do not identify the middle set for composition', () => {
  const {
    sets,
    functions: [f, g],
  } = createExample();
  sets.push({ ...sets[1], id: 'B-copy', elements: [...sets[1].elements] });
  g.domainId = 'B-copy';
  assert.equal(validateFunction(g, sets).valid, true);
  const result = composeFunctions(f, g, sets);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(' '), /same set ID/);
});

test('comparison requires exact domain and codomain identities', () => {
  const {
    sets,
    functions: [, , h],
  } = createExample();
  sets.push({ ...sets[0], id: 'A-copy' }, { ...sets[2], id: 'C-copy' });
  assert.equal(compareFunctions(h, { ...h, domainId: 'A-copy' }, sets).kind, 'incomparable');
  assert.equal(compareFunctions(h, { ...h, codomainId: 'C-copy' }, sets).kind, 'incomparable');
});

test('left and right identities preserve every example function', () => {
  const { sets, functions } = createExample();
  for (const fn of functions) {
    const domain = sets.find((set) => set.id === fn.domainId)!;
    const codomain = sets.find((set) => set.id === fn.codomainId)!;
    assert.equal(compareFunctions(compose(identity(domain), fn, sets), fn, sets).kind, 'equal');
    assert.equal(compareFunctions(compose(fn, identity(codomain), sets), fn, sets).kind, 'equal');
  }
});

test('empty domains support the unique empty mapping, including composition and identities', () => {
  const empty: FiniteSet = { id: 'empty', name: 'Empty', elements: [] };
  const one: FiniteSet = { id: 'one', name: 'One', elements: [{ id: 'x', label: 'x' }] };
  const sets = [empty, one];
  const fn: FiniteFunction = {
    id: 'f',
    name: 'f',
    domainId: 'empty',
    codomainId: 'one',
    mapping: {},
  };
  assert.equal(validateFunction(fn, sets).valid, true);
  assert.equal(compareFunctions(compose(identity(empty), fn, sets), fn, sets).kind, 'equal');
  assert.equal(compareFunctions(compose(fn, identity(one), sets), fn, sets).kind, 'equal');
  const result = compareFunctions(identity(empty), identity(empty), sets);
  assert.equal(result.kind, 'equal');
  assert.match(result.explanation, /all 0 inputs/);
  const impossible: FiniteFunction = {
    id: 'back',
    name: 'back',
    domainId: 'one',
    codomainId: 'empty',
    mapping: {},
  };
  assert.equal(validateFunction(impossible, sets).valid, false);
  assert.deepEqual(validateFunction(impossible, sets).missing, ['x']);
});

test('composition is associative for all 64 triples of maps between four two-element sets', () => {
  const sets: FiniteSet[] = ['A', 'B', 'C', 'D'].map((id) => ({
    id,
    name: id,
    elements: [
      { id: '0', label: '0' },
      { id: '1', label: '1' },
    ],
  }));
  const maps = (name: string, domainId: string, codomainId: string): FiniteFunction[] =>
    Array.from({ length: 4 }, (_, index) => ({
      id: `${name}${index}`,
      name,
      domainId,
      codomainId,
      mapping: { '0': String(index & 1), '1': String((index >> 1) & 1) },
    }));
  let checked = 0;
  for (const f of maps('f', 'A', 'B')) {
    for (const g of maps('g', 'B', 'C')) {
      for (const h of maps('h', 'C', 'D')) {
        const left = compose(compose(f, g, sets), h, sets);
        const right = compose(f, compose(g, h, sets), sets);
        assert.equal(
          compareFunctions(left, right, sets).kind,
          'equal',
          `${f.id}, ${g.id}, ${h.id}`,
        );
        checked += 1;
      }
    }
  }
  assert.equal(checked, 64);
});

test('JSON round-trip preserves mathematical data and the parser detaches mutable input', () => {
  const original = createExample();
  const parsed = parseDocumentJson(JSON.stringify(original));
  if (!parsed.ok) assert.fail(parsed.errors.join(' '));
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.value)), original);
  original.sets[0].elements[0].label = 'Changed';
  original.functions[0].mapping.a = '2';
  assert.equal(parsed.value.sets[0].elements[0].label, 'a');
  assert.equal(parsed.value.functions[0].mapping.a, '1');
  assert.equal(Object.getPrototypeOf(parsed.value.functions[0].mapping), null);
});

test('set/function IDs are unique in their own namespace and element IDs are local to a set', () => {
  const setDuplicate = createExample();
  setDuplicate.sets.push(structuredClone(setDuplicate.sets[0]));
  assert.match(rejected(setDuplicate).join(' '), /duplicate ID A/);
  const functionDuplicate = createExample();
  functionDuplicate.functions.push(structuredClone(functionDuplicate.functions[0]));
  assert.match(rejected(functionDuplicate).join(' '), /duplicate ID f/);
  const elementDuplicate = createExample();
  elementDuplicate.sets[0].elements.push({ id: 'a', label: 'another a' });
  assert.match(rejected(elementDuplicate).join(' '), /duplicate ID a/);
  const localIds: MathDocument = {
    version: 1,
    title: 'Local IDs',
    sets: ['A', 'B'].map((id) => ({ id, name: id, elements: [{ id: 'x', label: 'x' }] })),
    functions: [{ id: 'A', name: 'f', domainId: 'A', codomainId: 'B', mapping: { x: 'x' } }],
  };
  assert.equal(parseDocument(localIds).ok, true);
});

test('missing set references and mapping references are rejected during import', () => {
  const missingSet = createExample();
  missingSet.functions[0].domainId = 'absent';
  missingSet.functions[0].codomainId = 'also absent';
  assert.equal(rejected(missingSet).filter((error) => /unknown .* set/.test(error)).length, 2);
  const invalidMapping = createExample();
  invalidMapping.functions[0].mapping = { a: 'outside', ghost: '1' };
  assert.match(rejected(invalidMapping).join(' '), /outside its domain/);
  assert.match(rejected(invalidMapping).join(' '), /outside its codomain/);
});

test('malformed shapes, extra fields, missing fields, versions, and non-string data are rejected', () => {
  const document = createExample();
  const malformed: unknown[] = [
    null,
    undefined,
    false,
    1,
    'document',
    [],
    {},
    { ...document, version: 2 },
    { ...document, version: '1' },
    { ...document, title: '' },
    { ...document, title: '   ' },
    { ...document, title: 3 },
    { ...document, extra: true },
    { ...document, sets: {} },
    { ...document, functions: null },
    { ...document, sets: [{ ...document.sets[0], elements: {} }] },
    { ...document, sets: [{ ...document.sets[0], elements: [{ id: 'a' }] }] },
    { ...document, functions: [{ ...document.functions[0], mapping: [] }] },
    { ...document, functions: [{ ...document.functions[0], mapping: { a: 1 } }] },
    { ...document, functions: [{ ...document.functions[0], mapping: { a: null } }] },
  ];
  for (const value of malformed) rejected(value);
});

test('collection counts and string lengths are bounded', () => {
  const document = createExample();
  rejected({ ...document, title: 'x'.repeat(DOCUMENT_LIMITS.stringLength + 1) });
  rejected({
    ...document,
    sets: Array.from({ length: DOCUMENT_LIMITS.sets + 1 }, (_, i) => ({
      id: `s${i}`,
      name: 'Set',
      elements: [],
    })),
  });
  rejected({
    ...document,
    sets: [
      {
        id: 'A',
        name: 'A',
        elements: Array.from({ length: 101 }, (_, i) => ({ id: `e${i}`, label: 'element' })),
      },
    ],
  });
  rejected({
    ...document,
    functions: Array.from({ length: 51 }, (_, i) => ({ ...document.functions[0], id: `f${i}` })),
  });
  rejected({
    ...document,
    functions: [
      {
        ...document.functions[0],
        mapping: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`e${i}`, '1'])),
      },
    ],
  });
  assert.equal(
    parseDocument({ version: 1, title: 'Empty workspace', sets: [], functions: [] }).ok,
    true,
  );
});

test('the JSON byte limit is applied before parsing and counts UTF-8 bytes', () => {
  assert.equal(parseDocumentJson('{ broken json').ok, false);
  assert.equal(parseDocumentJson(' '.repeat(MAX_DOCUMENT_BYTES) + '{}').ok, false);
  const multibyte = `"${'é'.repeat(MAX_DOCUMENT_BYTES / 2)}"`;
  assert.ok(multibyte.length < MAX_DOCUMENT_BYTES);
  const result = parseDocumentJson(multibyte);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(' '), /2 MiB/);
});

test('bounded object input also observes the full serialized byte limit', () => {
  const ids = Array.from(
    { length: 100 },
    (_, i) => `x${'😀'.repeat(58)}${String(i).padStart(3, '0')}`,
  );
  assert.equal(ids[0].length, 120);
  const mapping = Object.fromEntries(ids.map((id) => [id, id]));
  const document: MathDocument = {
    version: 1,
    title: 'Large finite object',
    sets: ['A', 'B'].map((id) => ({
      id,
      name: id,
      elements: ids.map((element) => ({ id: element, label: element })),
    })),
    functions: Array.from({ length: 50 }, (_, i) => ({
      id: `f${i}`,
      name: 'f',
      domainId: 'A',
      codomainId: 'B',
      mapping,
    })),
  };
  assert.match(rejected(document).join(' '), /2 MiB/);
});

test('prototype properties and dangerous identifiers cannot become imported mappings', () => {
  for (const dangerous of ['__proto__', 'constructor', 'prototype']) {
    const document = createExample();
    document.functions[0].mapping = JSON.parse(`{"${dangerous}":"1"}`);
    rejected(document);
    document.functions[0].mapping = { a: '1' };
    document.sets[0].elements[0].id = dangerous;
    rejected(document);
  }
  const ownPrototype = JSON.parse(
    '{"version":1,"title":"Bad","sets":[],"__proto__":{"polluted":true}}',
  );
  rejected(ownPrototype);
  assert.equal(Object.hasOwn(Object.prototype, 'polluted'), false);
  const inherited = createExample();
  inherited.functions[0].mapping = Object.create({ a: '1' });
  rejected(inherited);
});

test('getters and custom prototypes are rejected without executing user-supplied code', () => {
  let calls = 0;
  const document = createExample();
  Object.defineProperty(document, 'title', {
    enumerable: true,
    get() {
      calls += 1;
      throw new Error('Must not execute');
    },
  });
  rejected(document);
  assert.equal(calls, 0);
  const arrayAccessor = createExample();
  Object.defineProperty(arrayAccessor.sets, '0', {
    enumerable: true,
    get() {
      calls += 1;
      throw new Error('Must not execute');
    },
  });
  rejected(arrayAccessor);
  assert.equal(calls, 0);
  const customPrototype = Object.assign(Object.create({ inherited: true }), createExample());
  rejected(customPrototype);
  const withSerializer = {
    ...createExample(),
    toJSON() {
      calls += 1;
      return {};
    },
  };
  rejected(withSerializer);
  assert.equal(calls, 0);
});

test('symbol fields, sparse arrays, hidden properties and circular structures are rejected', () => {
  const symbol = { ...createExample(), [Symbol('hidden')]: true };
  rejected(symbol);
  const sparse = createExample();
  delete sparse.sets[1];
  rejected(sparse);
  const hidden = createExample();
  Object.defineProperty(hidden.functions[0].mapping, 'a', { value: '1', enumerable: false });
  rejected(hidden);
  const cyclic: Record<string, unknown> = { version: 1, title: 'Cycle', functions: [] };
  cyclic.sets = [cyclic];
  rejected(cyclic);
});

test('null-prototype records are safely normalized and hostile inspection errors stay contained', () => {
  const document = Object.assign(Object.create(null), createExample());
  document.functions[0].mapping = Object.assign(Object.create(null), { a: '1', b: '2', c: '1' });
  assert.equal(parseDocument(document).ok, true);
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('inspection failed');
      },
    },
  );
  assert.doesNotThrow(() => rejected(hostile));
});

test('a generated composition cannot silently exceed document naming limits', () => {
  const {
    sets,
    functions: [f, g],
  } = createExample();
  f.name = 'f'.repeat(120);
  g.name = 'g'.repeat(120);
  assert.equal(validateFunction(f, sets).valid, true);
  const result = composeFunctions(f, g, sets);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(' '), /name exceeds/);
});
