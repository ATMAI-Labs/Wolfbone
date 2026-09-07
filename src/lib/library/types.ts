// SPDX-License-Identifier: MIT
/** The atlas is an editorial map. Its relationships are not proof certificates. */
export const AREAS = [
  {
    id: 'logic',
    name: 'Logic & proof',
    symbol: '⇒',
    description: 'Statements, reasoning, and what follows.',
  },
  {
    id: 'sets',
    name: 'Sets & functions',
    symbol: '→',
    description: 'Collections, relationships, and transformations.',
  },
  {
    id: 'arithmetic',
    name: 'Numbers & arithmetic',
    symbol: 'ℕ',
    description: 'Counting, number systems, and calculation.',
  },
  {
    id: 'algebra',
    name: 'Algebra',
    symbol: 'x',
    description: 'Expressions, equations, and general patterns.',
  },
  {
    id: 'geometry',
    name: 'Geometry',
    symbol: '△',
    description: 'Space, shape, size, and transformations.',
  },
  {
    id: 'trigonometry',
    name: 'Trigonometry',
    symbol: 'sin',
    description: 'Angles, circles, and periodic behaviour.',
  },
  {
    id: 'linear-algebra',
    name: 'Linear algebra',
    symbol: 'v',
    description: 'Vectors, spaces, and linear transformations.',
  },
  {
    id: 'calculus',
    name: 'Calculus & analysis',
    symbol: '∫',
    description: 'Limits, change, accumulation, and continuity.',
  },
  {
    id: 'probability',
    name: 'Probability',
    symbol: 'P',
    description: 'Possibilities, uncertainty, and expectation.',
  },
  {
    id: 'statistics',
    name: 'Statistics',
    symbol: 'μ',
    description: 'Describing data and reasoning from samples.',
  },
  {
    id: 'discrete',
    name: 'Discrete mathematics',
    symbol: '⋯',
    description: 'Counting structures, graphs, and algorithms.',
  },
  {
    id: 'structures',
    name: 'Mathematical structures',
    symbol: '∘',
    description: 'Operations, laws, and structure-preserving maps.',
  },
] as const;

export type AreaId = (typeof AREAS)[number]['id'];
export type Concept = {
  id: string;
  name: string;
  symbol: string;
  area: AreaId;
  kind: 'idea' | 'definition' | 'construction' | 'property' | 'theorem' | 'structure';
  summary: string;
  detail: string;
  example: string;
  context: string;
  /** Concepts used by this explanation, not a formal dependency claim. */
  uses: string[];
  /** Kind-of classification, distinct from explanatory dependencies. */
  specializes?: string[];
  /** Related topics; no implication or equivalence is asserted. */
  related: string[];
  /** Exact Mathlib module names, to resolve against the imported module index. */
  sourceModules: string[];
  playgroundId?: string;
};

export type RelationKind = 'uses' | 'specializes' | 'related';
export type ConceptRelation = { from: string; to: string; kind: RelationKind };

export type MathlibModule = {
  name: string;
  path: string;
  imports: string[];
};
