import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Concept } from './types';
import {
  conceptConnections,
  conceptNeighbourhood,
  conceptRelationKey,
  conceptRelations,
  unshownConceptConnections,
} from './relations';

function concept(id: string, links: Partial<Concept> = {}): Concept {
  return {
    id,
    name: id,
    symbol: id,
    area: 'sets',
    kind: 'definition',
    summary: 'A test concept.',
    detail: 'A test concept.',
    example: 'A test concept.',
    context: 'Relationship fixtures only.',
    uses: [],
    related: [],
    sourceModules: [],
    ...links,
  };
}

test('classification can be traversed from the narrower or broader concept', () => {
  const concepts = [concept('function'), concept('injection', { specializes: ['function'] })];
  assert.deepEqual(
    conceptNeighbourhood(concepts, 'injection').specializes.map((c) => c.id),
    ['function'],
  );
  assert.deepEqual(
    conceptNeighbourhood(concepts, 'function').specializedBy.map((c) => c.id),
    ['injection'],
  );
  assert.deepEqual(conceptConnections(concepts, 'function'), [
    { from: 'injection', to: 'function', kind: 'specializes' },
  ]);
});

test('sharing endpoints preserves explanatory, classification, and related connections', () => {
  const concepts = [
    concept('function', { related: ['injection'] }),
    concept('injection', { uses: ['function'], specializes: ['function'], related: ['function'] }),
  ];
  const all = conceptConnections(concepts, 'injection');
  assert.equal(all.length, 3);
  assert.deepEqual(new Set(all.map((r) => r.kind)), new Set(['uses', 'specializes', 'related']));
  const remaining = unshownConceptConnections(concepts, 'injection', [
    { from: 'injection', to: 'function', kind: 'uses' },
  ]);
  assert.equal(
    remaining.length,
    2,
    'an already visible neighbour still has two unshown relationship kinds',
  );
  assert.deepEqual(new Set(remaining.map((r) => r.kind)), new Set(['specializes', 'related']));
});

test('related connections are symmetric and deduplicated while directed uses remain distinct', () => {
  const concepts = [
    concept('a', { uses: ['b'], related: ['b'] }),
    concept('b', { uses: ['a'], related: ['a'] }),
  ];
  const relationships = conceptRelations(concepts);
  assert.equal(relationships.length, 3);
  assert.equal(relationships.filter((r) => r.kind === 'uses').length, 2);
  assert.equal(relationships.filter((r) => r.kind === 'related').length, 1);
  assert.equal(
    unshownConceptConnections(concepts, 'a', [{ from: 'b', to: 'a', kind: 'related' }]).length,
    2,
  );
  assert.deepEqual(
    conceptNeighbourhood(concepts, 'a').usedBy.map((c) => c.id),
    ['b'],
  );
});

test('a bounded view leaves the complete source relationships unchanged', () => {
  const concepts = [
    concept('anchor'),
    ...Array.from({ length: 7 }, (_, i) =>
      concept(`child-${i}`, { uses: ['anchor'], specializes: ['anchor'] }),
    ),
  ];
  const before = JSON.stringify(concepts);
  const connections = conceptConnections(concepts, 'anchor');
  const view = connections.slice(0, 4);
  assert.equal(unshownConceptConnections(concepts, 'anchor', view).length, 10);
  assert.equal(conceptConnections(concepts, 'anchor').length, 14);
  assert.equal(JSON.stringify(concepts), before);
  assert.equal(view.length, 4);
});

test('relationship keys preserve endpoint boundaries and unknown anchors are empty', () => {
  assert.notEqual(
    conceptRelationKey({ from: 'a:b', to: 'c', kind: 'uses' }),
    conceptRelationKey({ from: 'a', to: 'b:c', kind: 'uses' }),
  );
  assert.deepEqual(conceptNeighbourhood([concept('a')], 'missing'), {
    uses: [],
    usedBy: [],
    specializes: [],
    specializedBy: [],
    related: [],
  });
});
