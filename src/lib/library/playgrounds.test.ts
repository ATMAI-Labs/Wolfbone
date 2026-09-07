import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareFunctions,
  composeFunctions,
  parseDocumentJson,
  validateFunction,
  type FiniteFunction,
  type MathDocument,
} from '../math/model';
import { getPlayground, PLAYGROUNDS, type Playground } from './playgrounds';

function playground(id: string): Playground {
  const value = getPlayground(id);
  assert.ok(value, `Missing playground ${id}`);
  return value;
}

function labelledRows(document: MathDocument, fn = document.functions[0]): [string, string][] {
  const domain = document.sets.find((set) => set.id === fn.domainId)!;
  const codomain = document.sets.find((set) => set.id === fn.codomainId)!;
  return domain.elements.map((input) => [
    input.label,
    codomain.elements.find((output) => output.id === fn.mapping[input.id])!.label,
  ]);
}

function compose(first: FiniteFunction, second: FiniteFunction, document: MathDocument) {
  const result = composeFunctions(first, second, document.sets);
  if (!result.ok) assert.fail(result.errors.join('\n'));
  return result.value;
}

function isInjective(fn: FiniteFunction) {
  return new Set(Object.values(fn.mapping)).size === Object.keys(fn.mapping).length;
}

function isSurjective(fn: FiniteFunction, document: MathDocument) {
  const reached = new Set(Object.values(fn.mapping));
  return document.sets
    .find((set) => set.id === fn.codomainId)!
    .elements.every((element) => reached.has(element.id));
}

test('all sixteen playgrounds are portable total finite documents with unique stable IDs', () => {
  assert.equal(PLAYGROUNDS.length, 16);
  assert.equal(new Set(PLAYGROUNDS.map((seed) => seed.id)).size, PLAYGROUNDS.length);
  for (const seed of PLAYGROUNDS) {
    assert.match(seed.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(seed.name && seed.summary && seed.context);
    assert.ok(seed.tryThis.length > 0 && seed.conceptIds.length > 0);
    const roundtrip = parseDocumentJson(JSON.stringify(seed.document));
    if (!roundtrip.ok) assert.fail(`${seed.id}: ${roundtrip.errors.join('\n')}`);
    assert.equal(JSON.stringify(roundtrip.value), JSON.stringify(seed.document));
    for (const fn of seed.document.functions)
      assert.deepEqual(validateFunction(fn, seed.document.sets), {
        valid: true,
        errors: [],
        missing: [],
      });
    if (seed.composition) {
      const first = seed.document.functions.find(
        (fn) => fn.id === seed.composition!.firstFunctionId,
      );
      const second = seed.document.functions.find(
        (fn) => fn.id === seed.composition!.secondFunctionId,
      );
      assert.ok(first && second, `${seed.id}: composition sources exist`);
      assert.equal(composeFunctions(first, second, seed.document.sets).ok, true);
    }
  }
});

test('opening and editing a playground cannot change any library seed', () => {
  const before = JSON.stringify(PLAYGROUNDS);
  const opened = playground('function-composition');
  opened.name = 'A different name';
  opened.tryThis.push('A new experiment');
  opened.conceptIds.push('another-concept');
  opened.document.sets[0].elements[0].label = 'changed';
  opened.document.functions[0].mapping['composition-a:0'] = 'composition-b:1';
  opened.composition!.firstFunctionId = 'changed';
  assert.equal(JSON.stringify(PLAYGROUNDS), before);
  assert.notDeepEqual(opened, playground('function-composition'));
  assert.ok(Object.isFrozen(PLAYGROUNDS));
  assert.ok(Object.isFrozen(PLAYGROUNDS[0].document.functions[0].mapping));
  assert.equal(getPlayground('not-a-playground'), undefined);
});

test('direct composition agrees initially and one edited output supplies a concrete counterexample', () => {
  const { document } = playground('function-composition');
  const [f, g, h] = document.functions;
  const composite = compose(f, g, document);
  assert.equal(compareFunctions(h, composite, document.sets).kind, 'equal');
  h.mapping['composition-a:0'] = 'composition-c:1';
  const comparison = compareFunctions(h, composite, document.sets);
  assert.equal(comparison.kind, 'different');
  assert.deepEqual(comparison.witness, {
    inputId: 'composition-a:0',
    leftOutputId: 'composition-c:1',
    rightOutputId: 'composition-c:0',
  });
});

test('identity and the stored inverse give the declared finite identities', () => {
  const identity = playground('identity').document;
  const [id] = identity.functions;
  assert.equal(compareFunctions(compose(id, id, identity), id, identity.sets).kind, 'equal');
  const bijection = playground('bijection-inverse').document;
  const [encode, decode, codeIdentity] = bijection.functions;
  assert.equal(isInjective(encode), true);
  assert.equal(isSurjective(encode, bijection), true);
  assert.equal(
    compareFunctions(compose(encode, decode, bijection), codeIdentity, bijection.sets).kind,
    'equal',
  );
  const coloursIdentity = compose(decode, encode, bijection);
  for (const [input, output] of Object.entries(coloursIdentity.mapping))
    assert.equal(input, output);
});

test('injection, surjection, and constant examples have their stated distinct properties', () => {
  const many = playground('many-to-one').document;
  assert.equal(isInjective(many.functions[0]), false);
  assert.equal(isSurjective(many.functions[0], many), true);
  const injection = playground('injection').document;
  assert.equal(isInjective(injection.functions[0]), true);
  assert.equal(isSurjective(injection.functions[0], injection), false);
  const constant = playground('constant-function').document;
  assert.equal(new Set(Object.values(constant.functions[0].mapping)).size, 1);
  assert.equal(isSurjective(constant.functions[0], constant), false);
  const before = playground('many-to-one');
  many.functions[0].mapping['people:2'] = 'teams:0';
  many.functions[0].mapping['people:3'] = 'teams:0';
  assert.equal(isSurjective(many.functions[0], many), false);
  assert.equal(isSurjective(before.document.functions[0], before.document), true);
});

test('parity uses nonnegative remainders for all seven declared integers', () => {
  const rows = labelledRows(playground('parity').document);
  assert.equal(rows.length, 7);
  for (const [input, output] of rows) {
    const integer = Number(input.replace('−', '-'));
    assert.equal(Number(output.slice(0, 1)), ((integer % 2) + 2) % 2);
  }
});

test('binary arithmetic explicitly covers all nine ordered pairs and the correct modular results', () => {
  for (const [id, operation] of [
    ['addition-mod3', (left: number, right: number) => left + right],
    ['multiplication-mod3', (left: number, right: number) => left * right],
  ] as const) {
    const rows = labelledRows(playground(id).document);
    assert.equal(rows.length, 9);
    const expectedPairs = new Set<string>();
    for (let left = 0; left < 3; left++)
      for (let right = 0; right < 3; right++) expectedPairs.add(`(${left}, ${right})`);
    assert.deepEqual(new Set(rows.map(([input]) => input)), expectedPairs);
    for (const [input, output] of rows) {
      const match = /^\((\d), (\d)\)$/.exec(input);
      assert.ok(match, 'Operands must remain visibly paired and ordered.');
      assert.equal(Number(output), operation(Number(match[1]), Number(match[2])) % 3);
    }
  }
});

test('Boolean examples implement complete classical truth tables and double negation', () => {
  const notDocument = playground('boolean-not').document;
  const [not, id] = notDocument.functions;
  assert.deepEqual(labelledRows(notDocument, not), [
    ['false', 'true'],
    ['true', 'false'],
  ]);
  assert.equal(
    compareFunctions(compose(not, not, notDocument), id, notDocument.sets).kind,
    'equal',
  );
  assert.deepEqual(labelledRows(playground('boolean-and').document), [
    ['(false, false)', 'false'],
    ['(false, true)', 'false'],
    ['(true, false)', 'false'],
    ['(true, true)', 'true'],
  ]);
});

test('the four-cycle squares to a half-turn and its fourth power is identity', () => {
  const { document } = playground('permutation');
  const [step, halfTurn, id] = document.functions;
  assert.equal(isInjective(step), true);
  assert.equal(isSurjective(step, document), true);
  const twice = compose(step, step, document);
  assert.equal(compareFunctions(twice, halfTurn, document.sets).kind, 'equal');
  const fourTimes = compose(twice, twice, document);
  assert.equal(compareFunctions(fourTimes, id, document.sets).kind, 'equal');
});

test('an empty domain has one complete empty assignment and is not onto a nonempty codomain', () => {
  const { document } = playground('empty-function');
  const [fn] = document.functions;
  assert.equal(document.sets[0].elements.length, 0);
  assert.deepEqual(fn.mapping, {});
  assert.deepEqual(validateFunction(fn, document.sets), { valid: true, errors: [], missing: [] });
  assert.equal(isInjective(fn), true);
  assert.equal(isSurjective(fn, document), false);
  const copy = { ...fn, id: 'another-empty-map', mapping: {} };
  assert.equal(compareFunctions(fn, copy, document.sets).kind, 'equal');
});

test('linear and square examples satisfy their rules on precisely the five listed inputs', () => {
  for (const [id, rule] of [
    ['linear-sample', (input: number) => 2 * input],
    ['square-sample', (input: number) => input * input],
  ] as const) {
    const example = playground(id);
    const rows = labelledRows(example.document);
    assert.equal(rows.length, 5);
    assert.deepEqual(
      rows.map(([input]) => input),
      ['−2', '−1', '0', '1', '2'],
    );
    for (const [input, output] of rows)
      assert.equal(Number(output.replace('−', '-')), rule(Number(input.replace('−', '-'))));
    assert.match(example.context, /five|restricted/);
  }
  assert.equal(isInjective(playground('linear-sample').document.functions[0]), true);
  assert.equal(isInjective(playground('square-sample').document.functions[0]), false);
});

test('die outcomes encode exactly even-event membership without assigning probabilities', () => {
  const example = playground('probability-die');
  const { document } = example;
  const [parity, isEven, event] = document.functions;
  assert.equal(
    compareFunctions(compose(parity, isEven, document), event, document.sets).kind,
    'equal',
  );
  const members = labelledRows(document, event)
    .filter(([, output]) => output === 'yes')
    .map(([input]) => input);
  assert.deepEqual(members, ['2', '4', '6']);
  assert.match(example.context, /No probability weights or fairness assumption/);
});
