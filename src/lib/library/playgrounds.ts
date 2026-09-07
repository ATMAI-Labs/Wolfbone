import type { FiniteFunction, FiniteSet, MathDocument } from '../math/model';

export type Playground = {
  id: string;
  name: string;
  summary: string;
  /** The interpretation and finite scope of the original example. */
  context: string;
  tryThis: string[];
  conceptIds: string[];
  document: MathDocument;
  /** The first function is applied first; either ID may be the same. */
  composition?: { firstFunctionId: string; secondFunctionId: string };
};

function collection(id: string, name: string, labels: string[]): FiniteSet {
  return { id, name, elements: labels.map((label, index) => ({ id: `${id}:${index}`, label })) };
}

function mapping(
  id: string,
  name: string,
  domain: FiniteSet,
  codomain: FiniteSet,
  outputIndices: number[],
): FiniteFunction {
  if (outputIndices.length !== domain.elements.length)
    throw new Error(`The seed ${id} must assign every declared input.`);
  return {
    id,
    name,
    domainId: domain.id,
    codomainId: codomain.id,
    mapping: Object.fromEntries(
      domain.elements.map((input, index) => {
        const output = codomain.elements[outputIndices[index]];
        if (!output) throw new Error(`The seed ${id} contains an undeclared output.`);
        return [input.id, output.id];
      }),
    ),
  };
}

function document(title: string, sets: FiniteSet[], functions: FiniteFunction[]): MathDocument {
  return { version: 1, title, sets, functions };
}

function freezeSeed<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeSeed(child);
    Object.freeze(value);
  }
  return value;
}

const compositionA = collection('composition-a', 'A · inputs', ['a', 'b', 'c']);
const compositionB = collection('composition-b', 'B · middle', ['1', '2']);
const compositionC = collection('composition-c', 'C · outputs', ['sun', 'moon']);
const identitySet = collection('identity-set', 'A · three elements', ['a', 'b', 'c']);
const people = collection('people', 'People', ['Ari', 'Bo', 'Cam', 'Dee']);
const teams = collection('teams', 'Teams', ['North', 'South']);
const letters = collection('injection-letters', 'Letters', ['a', 'b', 'c']);
const numbers = collection('injection-numbers', 'Numbers', ['1', '2', '3', '4']);
const codes = collection('bijection-codes', 'Codes', ['A', 'B', 'C']);
const colours = collection('bijection-colours', 'Colour names', ['red', 'green', 'blue']);
const parityInputs = collection('parity-inputs', 'Integers · −3 to 3', [
  '−3',
  '−2',
  '−1',
  '0',
  '1',
  '2',
  '3',
]);
const parityOutputs = collection('parity-outputs', 'Remainders modulo 2', ['0 · even', '1 · odd']);
const residueLabels = ['0', '1', '2'];
const pairLabels = residueLabels.flatMap((left) =>
  residueLabels.map((right) => `(${left}, ${right})`),
);
const additionPairs = collection('addition-pairs', 'Ordered pairs · modulo 3', pairLabels);
const additionOutputs = collection('addition-outputs', 'Remainders modulo 3', residueLabels);
const multiplicationPairs = collection(
  'multiplication-pairs',
  'Ordered pairs · modulo 3',
  pairLabels,
);
const multiplicationOutputs = collection(
  'multiplication-outputs',
  'Remainders modulo 3',
  residueLabels,
);
const truthValues = collection('truth-values', 'Truth values', ['false', 'true']);
const booleanPairs = collection('boolean-pairs', 'Ordered pairs of truth values', [
  '(false, false)',
  '(false, true)',
  '(true, false)',
  '(true, true)',
]);
const andOutputs = collection('and-outputs', 'Truth values', ['false', 'true']);
const positions = collection('permutation-positions', 'Four positions', ['1', '2', '3', '4']);
const constantInputs = collection('constant-inputs', 'Inputs', ['a', 'b', 'c']);
const constantOutputs = collection('constant-outputs', 'Outputs', ['0', '1']);
const emptyInputs = collection('empty-inputs', 'Empty collection', []);
const emptyOutputs = collection('empty-outputs', 'Available outputs', ['a', 'b']);
const linearInputs = collection('linear-inputs', 'Five integer inputs', [
  '−2',
  '−1',
  '0',
  '1',
  '2',
]);
const linearOutputs = collection('linear-outputs', 'Their doubles', ['−4', '−2', '0', '2', '4']);
const squareInputs = collection('square-inputs', 'Five integer inputs', [
  '−2',
  '−1',
  '0',
  '1',
  '2',
]);
const squareOutputs = collection('square-outputs', 'Their squares', ['0', '1', '4']);
const dieOutcomes = collection('die-outcomes', 'Possible die outcomes', [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
]);
const dieParity = collection('die-parity', 'Parity of the outcome', ['odd', 'even']);
const eventMembership = collection('die-event-membership', 'Is the outcome even?', ['no', 'yes']);

/** Original finite examples. Source maps link their concepts to further mathematical reading. */
export const PLAYGROUNDS: readonly Playground[] = freezeSeed([
  {
    id: 'function-composition',
    name: 'Two routes, one result',
    summary: 'Follow f, then g, and compare that journey with a direct function h.',
    context:
      'Three explicitly listed finite sets. Composition uses the same middle set, and equality checks every input.',
    tryThis: [
      'Compare h with g after f.',
      'Change one output of h and inspect the exact counterexample.',
    ],
    conceptIds: ['finite-set', 'function', 'composition'],
    document: document(
      'Two routes, one result',
      [compositionA, compositionB, compositionC],
      [
        mapping('composition-f', 'f', compositionA, compositionB, [0, 1, 0]),
        mapping('composition-g', 'g', compositionB, compositionC, [0, 1]),
        mapping('composition-h', 'h', compositionA, compositionC, [0, 1, 0]),
      ],
    ),
    composition: { firstFunctionId: 'composition-f', secondFunctionId: 'composition-g' },
  },
  {
    id: 'identity',
    name: 'Leave every element unchanged',
    summary: 'The identity function returns each input itself.',
    context:
      'The domain and codomain are the very same three-element set. This is function identity, not an identity element of an operation.',
    tryThis: [
      'Trace an element through id.',
      'Compose id with itself and compare the result with id.',
    ],
    conceptIds: ['function', 'identity'],
    document: document(
      'The identity function',
      [identitySet],
      [mapping('identity-id', 'id', identitySet, identitySet, [0, 1, 2])],
    ),
    composition: { firstFunctionId: 'identity-id', secondFunctionId: 'identity-id' },
  },
  {
    id: 'many-to-one',
    name: 'Several inputs can meet',
    summary: 'Four people are assigned to two teams. Every team is reached.',
    context:
      'This assignment is surjective because every declared output is used. It is not injective because distinct people share a team.',
    tryThis: [
      'Trace the people assigned to North.',
      'Move everyone to North; South is then an unused output.',
    ],
    conceptIds: ['function', 'injection', 'surjection'],
    document: document(
      'A many-to-one assignment',
      [people, teams],
      [mapping('team-assignment', 'team', people, teams, [0, 0, 1, 1])],
    ),
  },
  {
    id: 'injection',
    name: 'Distinct inputs, distinct outputs',
    summary: 'Three letters use three different numbers, leaving one number unused.',
    context:
      'This finite function is injective but not surjective onto the declared four-number codomain. Both the assignments and the codomain matter.',
    tryThis: [
      'Find the unused output.',
      'Assign two letters to the same number to break injectivity.',
    ],
    conceptIds: ['function', 'injection', 'surjection'],
    document: document(
      'An injection with room to spare',
      [letters, numbers],
      [mapping('injection-f', 'f', letters, numbers, [0, 1, 2])],
    ),
  },
  {
    id: 'bijection-inverse',
    name: 'Go there and back',
    summary:
      'A one-to-one correspondence pairs codes with colour names, and its inverse returns each code.',
    context:
      'The inverse is explicitly stored as a separate finite function. Composing it after the original gives the identity on the code set.',
    tryThis: [
      'Compare id with decode after encode.',
      'Change encode while keeping decode fixed, then inspect the disagreement.',
    ],
    conceptIds: ['bijection', 'inverse-function', 'identity', 'composition'],
    document: document(
      'A bijection and its inverse',
      [codes, colours],
      [
        mapping('bijection-encode', 'encode', codes, colours, [1, 2, 0]),
        mapping('bijection-decode', 'decode', colours, codes, [2, 0, 1]),
        mapping('bijection-id', 'id', codes, codes, [0, 1, 2]),
      ],
    ),
    composition: { firstFunctionId: 'bijection-encode', secondFunctionId: 'bijection-decode' },
  },
  {
    id: 'parity',
    name: 'Keep only the remainder',
    summary: 'Classify seven integers by their remainder on division by two.',
    context:
      'A finite restriction to integers −3 through 3. Remainders are chosen from 0 and 1, including for negative inputs.',
    tryThis: [
      'See which different integers share a remainder.',
      'Change a mapping and describe how it departs from the original parity rule.',
    ],
    conceptIds: ['function', 'modular-arithmetic'],
    document: document(
      'Parity on seven integers',
      [parityInputs, parityOutputs],
      [
        mapping(
          'parity-mod2',
          'remainder mod 2',
          parityInputs,
          parityOutputs,
          [1, 0, 1, 0, 1, 0, 1],
        ),
      ],
    ),
  },
  {
    id: 'addition-mod3',
    name: 'Addition that wraps around',
    summary: 'Each ordered pair of remainders becomes their sum modulo three.',
    context:
      'All nine inputs of {0, 1, 2} × {0, 1, 2} are explicitly listed. The pair is one input to the function; its two entries are the operands of the binary operation.',
    tryThis: [
      'Inspect (2, 2): the result is 1 modulo 3.',
      'Compare swapped input pairs, such as (1, 2) and (2, 1).',
    ],
    conceptIds: ['addition', 'modular-arithmetic', 'function'],
    document: document(
      'Addition modulo three',
      [additionPairs, additionOutputs],
      [
        mapping(
          'addition-mod3-op',
          'add mod 3',
          additionPairs,
          additionOutputs,
          [0, 1, 2, 1, 2, 0, 2, 0, 1],
        ),
      ],
    ),
  },
  {
    id: 'multiplication-mod3',
    name: 'Multiply within three remainders',
    summary: 'Explore the complete multiplication table for remainders modulo three.',
    context:
      'All nine ordered pairs over {0, 1, 2} are present. Each output is the product reduced to its remainder 0, 1, or 2.',
    tryThis: ['Trace every pair containing 0.', 'Inspect (2, 2): four has remainder 1 modulo 3.'],
    conceptIds: ['multiplication', 'modular-arithmetic', 'function'],
    document: document(
      'Multiplication modulo three',
      [multiplicationPairs, multiplicationOutputs],
      [
        mapping(
          'multiplication-mod3-op',
          'multiply mod 3',
          multiplicationPairs,
          multiplicationOutputs,
          [0, 0, 0, 0, 1, 2, 0, 2, 1],
        ),
      ],
    ),
  },
  {
    id: 'boolean-not',
    name: 'Negate, then negate again',
    summary: 'Negation swaps false and true. Applying it twice returns the starting value.',
    context:
      'Classical two-valued Boolean logic. This complete truth table has exactly two possible inputs.',
    tryThis: ['Compose not with not.', 'Compare the result with id on both truth values.'],
    conceptIds: ['boolean-logic', 'negation', 'composition', 'identity'],
    document: document(
      'Boolean negation',
      [truthValues],
      [
        mapping('boolean-not-op', 'not', truthValues, truthValues, [1, 0]),
        mapping('boolean-not-id', 'id', truthValues, truthValues, [0, 1]),
      ],
    ),
    composition: { firstFunctionId: 'boolean-not-op', secondFunctionId: 'boolean-not-op' },
  },
  {
    id: 'boolean-and',
    name: 'Both statements must be true',
    summary: 'Conjunction turns four pairs of truth values into one truth value.',
    context:
      'Classical two-valued Boolean logic. Ordered pairs list all four possible combinations; and returns true only for (true, true).',
    tryThis: [
      'Find the sole input pair that produces true.',
      'Compare the rows for (false, true) and (true, false).',
    ],
    conceptIds: ['boolean-logic', 'conjunction', 'function'],
    document: document(
      'Boolean conjunction',
      [booleanPairs, andOutputs],
      [mapping('boolean-and-op', 'and', booleanPairs, andOutputs, [0, 0, 0, 1])],
    ),
  },
  {
    id: 'permutation',
    name: 'Rotate four positions',
    summary: 'One step moves each position to the next; composing two steps matches a half-turn.',
    context:
      'A permutation is a bijection from a set to itself. Here the four positions cycle 1 → 2 → 3 → 4 → 1.',
    tryThis: [
      'Compare half-turn with step after step.',
      'Keep composing steps until each position returns to itself.',
    ],
    conceptIds: ['permutation', 'bijection', 'composition'],
    document: document(
      'A four-cycle permutation',
      [positions],
      [
        mapping('permutation-step', 'step', positions, positions, [1, 2, 3, 0]),
        mapping('permutation-half-turn', 'half-turn', positions, positions, [2, 3, 0, 1]),
        mapping('permutation-id', 'id', positions, positions, [0, 1, 2, 3]),
      ],
    ),
    composition: { firstFunctionId: 'permutation-step', secondFunctionId: 'permutation-step' },
  },
  {
    id: 'constant-function',
    name: 'Different inputs, one fixed answer',
    summary: 'Every input is sent to the same chosen output.',
    context:
      'A constant function from three elements to {0, 1}. Its image is the singleton {0}, although its declared codomain has two elements.',
    tryThis: [
      'Trace all three inputs to 0.',
      'Change one output to 1; the edited function is no longer constant.',
    ],
    conceptIds: ['constant-function', 'function', 'surjection'],
    document: document(
      'A constant function',
      [constantInputs, constantOutputs],
      [mapping('constant-zero', 'constant 0', constantInputs, constantOutputs, [0, 0, 0])],
    ),
  },
  {
    id: 'empty-function',
    name: 'A function with no inputs',
    summary: 'An empty domain needs no arrows to assign every input.',
    context:
      'There is exactly one function from the empty set to this chosen codomain. It is total because there are no unassigned inputs; it is not surjective onto this nonempty codomain.',
    tryThis: [
      'Inspect why the function is complete with zero assignments.',
      'Create another function from this empty domain; it also needs no assignments.',
    ],
    conceptIds: ['empty-set', 'finite-set', 'function', 'injection', 'surjection'],
    document: document(
      'The empty-domain function',
      [emptyInputs, emptyOutputs],
      [mapping('empty-map', 'empty map', emptyInputs, emptyOutputs, [])],
    ),
  },
  {
    id: 'linear-sample',
    name: 'Double five chosen integers',
    summary: 'Explore a finite restriction of the rule f(x) = 2x.',
    context:
      'Only the five listed integers are in this document. These samples illustrate a linear rule; they do not define or verify a function on every real number.',
    tryThis: [
      'Match each input with its double.',
      'Edit one output and identify the input where the original rule stops matching.',
    ],
    conceptIds: ['linear-function', 'function'],
    document: document(
      'Five samples of f(x) = 2x',
      [linearInputs, linearOutputs],
      [
        mapping(
          'linear-double',
          'double · finite restriction',
          linearInputs,
          linearOutputs,
          [0, 1, 2, 3, 4],
        ),
      ],
    ),
  },
  {
    id: 'square-sample',
    name: 'Opposite inputs, equal squares',
    summary: 'Five integers reveal the symmetry of squaring around zero.',
    context:
      'The function is restricted to {−2, −1, 0, 1, 2}. Its finite outputs are {0, 1, 4}; this document makes no claim about an unrestricted real function.',
    tryThis: [
      'Compare the outputs of −2 and 2.',
      'Identify the pairs of distinct inputs that share an output.',
    ],
    conceptIds: ['square-function', 'function', 'injection'],
    document: document(
      'Five samples of f(x) = x²',
      [squareInputs, squareOutputs],
      [
        mapping(
          'square-rule',
          'square · finite restriction',
          squareInputs,
          squareOutputs,
          [2, 1, 0, 1, 2],
        ),
      ],
    ),
  },
  {
    id: 'probability-die',
    name: 'From outcomes to an event',
    summary: 'Classify six die outcomes, then ask whether the result is even.',
    context:
      'This is a finite sample space and event classification. No probability weights or fairness assumption are encoded; counting outcomes alone does not assign probabilities.',
    tryThis: [
      'Compare direct event membership with parity followed by is even.',
      'List the outcomes in the even event: 2, 4, and 6.',
    ],
    conceptIds: ['sample-space', 'probability', 'function', 'composition'],
    document: document(
      'Die outcomes and an event',
      [dieOutcomes, dieParity, eventMembership],
      [
        mapping('die-classify', 'parity', dieOutcomes, dieParity, [0, 1, 0, 1, 0, 1]),
        mapping('die-is-even', 'is even', dieParity, eventMembership, [0, 1]),
        mapping('die-event', 'even event', dieOutcomes, eventMembership, [0, 1, 0, 1, 0, 1]),
      ],
    ),
    composition: { firstFunctionId: 'die-classify', secondFunctionId: 'die-is-even' },
  },
]);

/** Open an independent editable copy; the preconfigured library remains unchanged. */
export function getPlayground(id: string): Playground | undefined {
  const seed = PLAYGROUNDS.find((playground) => playground.id === id);
  return seed ? structuredClone(seed) : undefined;
}
