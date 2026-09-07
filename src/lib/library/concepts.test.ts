// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CONCEPTS } from './concepts';
import { PLAYGROUNDS } from './playgrounds';
import { AREAS, type Concept } from './types';

const byId = new Map(CONCEPTS.map((concept) => [concept.id, concept]));
function get(id: string): Concept {
  const concept = byId.get(id);
  assert.ok(concept, `Missing concept: ${id}`);
  return concept;
}

test('the atlas covers every declared area with inspectable original explanations', () => {
  assert.equal(byId.size, CONCEPTS.length, 'Concept identities must be unique.');
  const areaIds = new Set<string>(AREAS.map((area) => area.id));
  const kinds = new Set(['idea', 'definition', 'construction', 'property', 'theorem', 'structure']);
  for (const concept of CONCEPTS) {
    assert.match(concept.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(areaIds.has(concept.area), `${concept.id} has no declared area.`);
    assert.ok(kinds.has(concept.kind), `${concept.id} has an undeclared kind.`);
    for (const field of ['name', 'symbol', 'summary', 'detail', 'example', 'context'] as const) {
      assert.ok(concept[field].trim().length > 0, `${concept.id} needs ${field}.`);
      assert.doesNotMatch(concept[field], /\b(?:TODO|TBD|lorem ipsum)\b/i);
    }
    assert.ok(concept.summary.length <= 150, `${concept.id}: keep the map summary readable.`);
  }
  for (const area of AREAS) {
    assert.ok(
      CONCEPTS.filter((concept) => concept.area === area.id).length >= 6,
      `${area.name} needs a connected region of ideas, not one placeholder.`,
    );
  }
});

test('all labelled relationships resolve; kind-of links form no classification cycles', () => {
  for (const concept of CONCEPTS) {
    for (const kind of ['uses', 'specializes', 'related'] as const) {
      const targets = concept[kind] ?? [];
      assert.equal(
        new Set(targets).size,
        targets.length,
        `${concept.id} duplicates a ${kind} link.`,
      );
      for (const target of targets) {
        assert.ok(byId.has(target), `${concept.id} ${kind} missing ${target}.`);
        assert.notEqual(target, concept.id, `${concept.id} has a self-link.`);
      }
    }
  }
  // Explanatory uses/related links may be cyclic. Only kind-of classification
  // is constrained here; no universal prerequisite order is manufactured.
  function visit(id: string, ancestry: Set<string>) {
    assert.ok(!ancestry.has(id), `Classification cycle at ${id}.`);
    const next = new Set([...ancestry, id]);
    for (const parent of get(id).specializes ?? []) visit(parent, next);
  }
  for (const concept of CONCEPTS) visit(concept.id, new Set());
});

test('every concept is reachable through the relationship map without a prescribed curriculum', () => {
  const neighbours = new Map(CONCEPTS.map((concept) => [concept.id, new Set<string>()]));
  for (const concept of CONCEPTS) {
    for (const target of [...concept.uses, ...(concept.specializes ?? []), ...concept.related]) {
      neighbours.get(concept.id)!.add(target);
      neighbours.get(target)!.add(concept.id);
    }
  }
  const seen = new Set<string>();
  const frontier = ['context'];
  while (frontier.length) {
    const id = frontier.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    frontier.push(...neighbours.get(id)!);
  }
  assert.deepEqual(
    CONCEPTS.filter((concept) => !seen.has(concept.id)).map((concept) => concept.id),
    [],
    'A disconnected concept cannot be reached by exploring relationships.',
  );
});

test('source references resolve against the bundled revision and playground links agree in both directions', () => {
  const modules = JSON.parse(
    readFileSync(new URL('../../../data/mathlib/modules.json', import.meta.url), 'utf8'),
  ) as { name: string }[];
  const names = new Set(modules.map((module) => module.name));
  const playgrounds = new Map(PLAYGROUNDS.map((playground) => [playground.id, playground]));
  for (const concept of CONCEPTS) {
    assert.equal(new Set(concept.sourceModules).size, concept.sourceModules.length);
    for (const module of concept.sourceModules) {
      assert.ok(names.has(module), `${concept.id} links to absent pinned module ${module}.`);
    }
    if (concept.playgroundId) {
      const playground = playgrounds.get(concept.playgroundId);
      assert.ok(playground, `${concept.id} links to a missing playground.`);
      assert.ok(
        playground.conceptIds.includes(concept.id),
        `${concept.id} should remain discoverable from its playground.`,
      );
    }
  }
  for (const playground of PLAYGROUNDS) {
    for (const id of playground.conceptIds)
      assert.ok(byId.has(id), `${playground.id}: missing ${id}.`);
  }
});

test('the displayed gcd, mean, determinant, and Pythagorean examples agree with exact arithmetic', () => {
  // These checks read the published examples rather than checking unrelated
  // fixtures. They verify these finite calculations, not the general theorems.
  const gcdExample = get('greatest-common-divisor').example.match(/gcd\((\d+),(\d+)\) = (\d+)/);
  assert.ok(gcdExample, 'The gcd example needs a checkable numerical instance.');
  let a = Number(gcdExample[1]);
  let b = Number(gcdExample[2]);
  while (b !== 0) [a, b] = [b, a % b];
  assert.equal(a, Number(gcdExample[3]));

  const meanExample = get('mean').example.match(/\[([\d,]+)\] is (\d+)\/(\d+) = (\d+)/);
  assert.ok(meanExample, 'The mean example needs its observations and calculation.');
  const values = meanExample[1].split(',').map(Number);
  const total = values.reduce((sum, value) => sum + value, 0);
  assert.equal(total, Number(meanExample[2]));
  assert.equal(values.length, Number(meanExample[3]));
  assert.equal(total / values.length, Number(meanExample[4]));

  assert.match(get('determinant').example, /ad − bc/);
  const det = (matrix: number[][]) => matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  assert.equal(
    det([
      [1, 2],
      [2, 4],
    ]),
    0,
    'Dependent rows have determinant zero in this fixture.',
  );
  assert.equal(
    det([
      [2, 0],
      [0, 3],
    ]),
    6,
    'Independent coordinate scaling multiplies area.',
  );

  const triangle = get('pythagorean-theorem').example.match(
    /legs (\d+) and (\d+) has hypotenuse (\d+)/,
  );
  assert.ok(triangle, 'The geometric example needs declared legs and hypotenuse.');
  assert.equal(Number(triangle[1]) ** 2 + Number(triangle[2]) ** 2, Number(triangle[3]) ** 2);
});

test('the displayed zero-covariance example still demonstrates dependence', () => {
  const example = get('covariance').example;
  assert.match(example, /equally likely to be −1, 0, or 1/);
  assert.match(example, /Y=X²/);
  const xs = [-1, 0, 1];
  const ys = xs.map((x) => x * x);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  const covariance = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0) / xs.length;
  assert.equal(covariance, 0);
  const eventXZero = xs.filter((x) => x === 0).length;
  const eventYZero = ys.filter((y) => y === 0).length;
  const intersection = xs.filter((x, i) => x === 0 && ys[i] === 0).length;
  // Compare rational probabilities by cross multiplication to avoid rounding.
  assert.notEqual(intersection * xs.length, eventXZero * eventYZero);
});
