// SPDX-License-Identifier: MIT
import type { Concept, ConceptRelation } from './types';

/** Relationship identity includes its kind; sharing endpoints does not merge meanings. */
export function conceptRelationKey(relation: ConceptRelation): string {
  const pair =
    relation.kind === 'related'
      ? [relation.from, relation.to].sort()
      : [relation.from, relation.to];
  return JSON.stringify([relation.kind, ...pair]);
}

export function conceptRelations(concepts: Concept[]): ConceptRelation[] {
  const result: ConceptRelation[] = [];
  const seen = new Set<string>();
  for (const concept of concepts) {
    for (const kind of ['uses', 'specializes', 'related'] as const) {
      for (const target of concept[kind] ?? []) {
        const pair = kind === 'related' ? [concept.id, target].sort() : [concept.id, target];
        const key = conceptRelationKey({ from: pair[0], to: pair[1], kind });
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ from: pair[0], to: pair[1], kind });
      }
    }
  }
  return result;
}

/** All incident typed relationships, retaining original direction and classification. */
export function conceptConnections(concepts: Concept[], id: string): ConceptRelation[] {
  return conceptRelations(concepts).filter(
    (relation) => relation.from === id || relation.to === id,
  );
}

/** A bounded view reports omitted relationships, not merely omitted neighbour nodes. */
export function unshownConceptConnections(
  concepts: Concept[],
  id: string,
  shownRelations: readonly ConceptRelation[],
): ConceptRelation[] {
  const shown = new Set(shownRelations.map(conceptRelationKey));
  return conceptConnections(concepts, id).filter(
    (relation) => !shown.has(conceptRelationKey(relation)),
  );
}

export function searchConcepts(concepts: Concept[], query: string, area?: string): Concept[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return concepts.filter(
    (concept) =>
      (!area || concept.area === area) &&
      words.every((word) =>
        `${concept.name} ${concept.symbol} ${concept.summary} ${concept.detail} ${concept.example}`
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
}

/** A bounded neighbourhood is a view; the complete relation set remains unchanged. */
export function conceptNeighbourhood(concepts: Concept[], id: string) {
  const selected = concepts.find((concept) => concept.id === id);
  if (!selected) return { uses: [], usedBy: [], specializes: [], specializedBy: [], related: [] };
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  const resolve = (ids: string[]) => ids.flatMap((key) => (byId.has(key) ? [byId.get(key)!] : []));
  return {
    uses: resolve(selected.uses),
    usedBy: concepts.filter((concept) => concept.uses.includes(id)),
    specializes: resolve(selected.specializes ?? []),
    specializedBy: concepts.filter((concept) => concept.specializes?.includes(id)),
    related: concepts.filter(
      (concept) => selected.related.includes(concept.id) || concept.related.includes(id),
    ),
  };
}
