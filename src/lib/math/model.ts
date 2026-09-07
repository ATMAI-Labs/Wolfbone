/** Finite sets and total functions, independent of any renderer or proof service. */
export type FiniteSet = {
  id: string;
  name: string;
  elements: { id: string; label: string }[];
};

export type FiniteFunction = {
  id: string;
  name: string;
  domainId: string;
  codomainId: string;
  mapping: Record<string, string>;
};

export type MathDocument = {
  version: 1;
  title: string;
  sets: FiniteSet[];
  functions: FiniteFunction[];
};

export type FunctionValidation = {
  /** True exactly when the function is well-formed and defined at every input. */
  valid: boolean;
  errors: string[];
  /** Unassigned input IDs, in the domain's declared element order. */
  missing: string[];
};

export type CompositionResult =
  { ok: true; value: FiniteFunction } | { ok: false; errors: string[] };

export type ComparisonResult = {
  kind: 'equal' | 'different' | 'incomparable' | 'incomplete';
  explanation: string;
  witness?: { inputId: string; leftOutputId: string; rightOutputId: string };
};

export type DocumentResult = { ok: true; value: MathDocument } | { ok: false; errors: string[] };

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_LIMITS = Object.freeze({
  sets: 20,
  elementsPerSet: 100,
  functions: 50,
  stringLength: 120,
  bytes: MAX_DOCUMENT_BYTES,
});

const forbiddenIds = new Set(['__proto__', 'constructor', 'prototype']);
const hasOwn = (value: object, key: PropertyKey) => Object.hasOwn(value, key);

/** Inspect descriptors so importing an object never invokes its getters. */
function record(
  value: unknown,
  label: string,
  errors: string[],
  allowedKeys?: readonly string[],
): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return undefined;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    errors.push(`${label} must contain plain data, without an inherited custom prototype.`);
    return undefined;
  }
  const keys = Reflect.ownKeys(value);
  const maximum = allowedKeys?.length ?? DOCUMENT_LIMITS.elementsPerSet;
  if (keys.length > maximum) {
    errors.push(`${label} has too many fields (maximum ${maximum}).`);
    return undefined;
  }
  const result: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    if (typeof key !== 'string' || forbiddenIds.has(key)) {
      errors.push(`${label} contains an unsupported property name.`);
      continue;
    }
    if (allowedKeys && !allowedKeys.includes(key)) {
      errors.push(`${label} contains an unknown field: ${key}.`);
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      errors.push(`${label}.${key} must be an ordinary, enumerable data field.`);
      continue;
    }
    result[key] = descriptor.value;
  }
  return result;
}

function list(
  value: unknown,
  limit: number,
  label: string,
  errors: string[],
): unknown[] | undefined {
  if (!Array.isArray(value) || value.length > limit) {
    errors.push(`${label} must be an array with at most ${limit} entries.`);
    return undefined;
  }
  if (
    Object.getPrototypeOf(value) !== Array.prototype ||
    Reflect.ownKeys(value).length !== value.length + 1
  ) {
    errors.push(`${label} must be an ordinary array without extra fields or holes.`);
    return undefined;
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      errors.push(`${label}[${index}] must be an ordinary data entry.`);
      return undefined;
    }
    result.push(descriptor.value);
  }
  return result;
}

function text(
  value: unknown,
  label: string,
  errors: string[],
  identifier = false,
): string | undefined {
  if (typeof value !== 'string' || !value.trim() || value.length > DOCUMENT_LIMITS.stringLength) {
    errors.push(
      `${label} must contain 1–${DOCUMENT_LIMITS.stringLength} characters and cannot be blank.`,
    );
    return undefined;
  }
  if (identifier && (value !== value.trim() || forbiddenIds.has(value))) {
    errors.push(`${label} must be a supported ID without surrounding whitespace.`);
    return undefined;
  }
  return value;
}

function uniqueIds(values: { id: string }[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) errors.push(`${label} contains the duplicate ID ${value.id}.`);
    seen.add(value.id);
  }
}

function readSets(value: unknown, errors: string[]): FiniteSet[] {
  const entries = list(value, DOCUMENT_LIMITS.sets, 'Sets', errors) ?? [];
  const sets: FiniteSet[] = [];
  for (const [index, entry] of entries.entries()) {
    const label = `Set ${index + 1}`;
    const data = record(entry, label, errors, ['id', 'name', 'elements']);
    if (!data) continue;
    const id = text(data.id, `${label} ID`, errors, true);
    const name = text(data.name, `${label} name`, errors);
    const elements: FiniteSet['elements'] = [];
    const rawElements =
      list(data.elements, DOCUMENT_LIMITS.elementsPerSet, `${label} elements`, errors) ?? [];
    for (const [elementIndex, rawElement] of rawElements.entries()) {
      const elementLabel = `${label}, element ${elementIndex + 1}`;
      const element = record(rawElement, elementLabel, errors, ['id', 'label']);
      if (!element) continue;
      const elementId = text(element.id, `${elementLabel} ID`, errors, true);
      const displayLabel = text(element.label, `${elementLabel} label`, errors);
      if (elementId !== undefined && displayLabel !== undefined)
        elements.push({ id: elementId, label: displayLabel });
    }
    uniqueIds(elements, `${label} elements`, errors);
    if (id !== undefined && name !== undefined) sets.push({ id, name, elements });
  }
  uniqueIds(sets, 'Sets', errors);
  return sets;
}

function readFunction(value: unknown, label: string, errors: string[]): FiniteFunction | undefined {
  const data = record(value, label, errors, ['id', 'name', 'domainId', 'codomainId', 'mapping']);
  if (!data) return undefined;
  const id = text(data.id, `${label} ID`, errors, true);
  const name = text(data.name, `${label} name`, errors);
  const domainId = text(data.domainId, `${label} domain ID`, errors, true);
  const codomainId = text(data.codomainId, `${label} codomain ID`, errors, true);
  const rawMapping = record(data.mapping, `${label} mapping`, errors);
  const mapping: Record<string, string> = Object.create(null);
  if (rawMapping) {
    for (const [rawInput, rawOutput] of Object.entries(rawMapping)) {
      const input = text(rawInput, `${label} input ID`, errors, true);
      const output = text(rawOutput, `${label} output ID for ${rawInput}`, errors, true);
      if (input !== undefined && output !== undefined) mapping[input] = output;
    }
  }
  if (
    id === undefined ||
    name === undefined ||
    domainId === undefined ||
    codomainId === undefined ||
    !rawMapping
  )
    return undefined;
  return { id, name, domainId, codomainId, mapping };
}

function checkReferences(fn: FiniteFunction, sets: FiniteSet[]): FunctionValidation {
  const errors: string[] = [];
  const domain = sets.find((set) => set.id === fn.domainId);
  const codomain = sets.find((set) => set.id === fn.codomainId);
  if (!domain) errors.push(`${fn.name} refers to an unknown domain set: ${fn.domainId}.`);
  if (!codomain) errors.push(`${fn.name} refers to an unknown codomain set: ${fn.codomainId}.`);
  const inputs = new Set(domain?.elements.map((element) => element.id));
  const outputs = new Set(codomain?.elements.map((element) => element.id));
  for (const [input, output] of Object.entries(fn.mapping)) {
    if (domain && !inputs.has(input))
      errors.push(`${fn.name} assigns an input outside its domain: ${input}.`);
    if (codomain && !outputs.has(output))
      errors.push(`${fn.name} assigns ${input} to an output outside its codomain: ${output}.`);
  }
  const missing =
    domain?.elements
      .filter((element) => !hasOwn(fn.mapping, element.id))
      .map((element) => element.id) ?? [];
  return { valid: errors.length === 0 && missing.length === 0, errors, missing };
}

function inspectFunction(fn: FiniteFunction, sets: FiniteSet[]) {
  const errors: string[] = [];
  const normalizedSets = readSets(sets, errors);
  const normalizedFunction = readFunction(fn, 'Function', errors);
  const references = normalizedFunction
    ? checkReferences(normalizedFunction, normalizedSets)
    : { valid: false, errors: [], missing: [] };
  errors.push(...references.errors);
  return {
    fn: normalizedFunction,
    sets: normalizedSets,
    valid: errors.length === 0 && references.valid,
    errors,
    missing: references.missing,
  };
}

export function validateFunction(fn: FiniteFunction, sets: FiniteSet[]): FunctionValidation {
  const { valid, errors, missing } = inspectFunction(fn, sets);
  return { valid, errors, missing };
}

/** The first function is applied first: composeFunctions(f, g) constructs g ∘ f. */
export function composeFunctions(
  first: FiniteFunction,
  second: FiniteFunction,
  sets: FiniteSet[],
): CompositionResult {
  const left = inspectFunction(first, sets);
  const right = inspectFunction(second, sets);
  const errors = [...left.errors, ...right.errors];
  if (left.missing.length)
    errors.push(`The first function has unassigned inputs: ${left.missing.join(', ')}.`);
  if (right.missing.length)
    errors.push(`The second function has unassigned inputs: ${right.missing.join(', ')}.`);
  if (left.fn && right.fn && left.fn.codomainId !== right.fn.domainId) {
    errors.push(
      'Composition requires the first codomain and the second domain to be the same set ID.',
    );
  }
  if (errors.length || !left.fn || !right.fn) return { ok: false, errors };
  const name = `${right.fn.name} ∘ ${left.fn.name}`;
  if (name.length > DOCUMENT_LIMITS.stringLength) {
    return {
      ok: false,
      errors: [
        'The composed name exceeds the document length limit; shorten the function names first.',
      ],
    };
  }
  const mapping: Record<string, string> = Object.create(null);
  const domain = left.sets.find((set) => set.id === left.fn?.domainId)!;
  for (const input of domain.elements)
    mapping[input.id] = right.fn.mapping[left.fn.mapping[input.id]];
  return {
    ok: true,
    value: {
      id: 'composite',
      name,
      domainId: left.fn.domainId,
      codomainId: right.fn.codomainId,
      mapping,
    },
  };
}

/** Exhaustive equality of these finite functions; no external proof backend is involved. */
export function compareFunctions(
  left: FiniteFunction,
  right: FiniteFunction,
  sets: FiniteSet[],
): ComparisonResult {
  const leftCheck = inspectFunction(left, sets);
  const rightCheck = inspectFunction(right, sets);
  const errors = [...leftCheck.errors, ...rightCheck.errors];
  if (errors.length || !leftCheck.fn || !rightCheck.fn) {
    return {
      kind: 'incomparable',
      explanation: `The function data must be corrected before comparison. ${errors.join(' ')}`,
    };
  }
  const a = leftCheck.fn;
  const b = rightCheck.fn;
  if (a.domainId !== b.domainId || a.codomainId !== b.codomainId) {
    return {
      kind: 'incomparable',
      explanation:
        'These functions have different domain or codomain set IDs. Equal labels or equal set sizes do not identify the sets.',
    };
  }
  if (leftCheck.missing.length || rightCheck.missing.length) {
    const missing = [
      ...(leftCheck.missing.length ? [`${a.name}: ${leftCheck.missing.join(', ')}`] : []),
      ...(rightCheck.missing.length ? [`${b.name}: ${rightCheck.missing.join(', ')}`] : []),
    ];
    return {
      kind: 'incomplete',
      explanation: `Assign every input before comparing the finite functions. Unassigned inputs — ${missing.join('; ')}.`,
    };
  }
  const domain = leftCheck.sets.find((set) => set.id === a.domainId)!;
  for (const input of domain.elements) {
    if (a.mapping[input.id] !== b.mapping[input.id]) {
      const witness = {
        inputId: input.id,
        leftOutputId: a.mapping[input.id],
        rightOutputId: b.mapping[input.id],
      };
      return {
        kind: 'different',
        witness,
        explanation: `At input ${input.label} (${input.id}), ${a.name} gives ${witness.leftOutputId} and ${b.name} gives ${witness.rightOutputId}. This input is a counterexample to their equality.`,
      };
    }
  }
  return {
    kind: 'equal',
    explanation: `Exhaustively checked all ${domain.elements.length} inputs of the finite set ${domain.name}. Every input has the same output, and the domain and codomain set IDs agree. These finite functions are equal.`,
  };
}

/** Imports plain data, preserving incomplete mappings while rejecting invalid references. */
export function parseDocument(input: unknown): DocumentResult {
  try {
    const errors: string[] = [];
    const data = record(input, 'Document', errors, ['version', 'title', 'sets', 'functions']);
    if (!data) return { ok: false, errors };
    if (data.version !== 1) errors.push('Document version must be 1.');
    const title = text(data.title, 'Document title', errors);
    const sets = readSets(data.sets, errors);
    const rawFunctions = list(data.functions, DOCUMENT_LIMITS.functions, 'Functions', errors) ?? [];
    const functions: FiniteFunction[] = [];
    for (const [index, rawFunction] of rawFunctions.entries()) {
      const fn = readFunction(rawFunction, `Function ${index + 1}`, errors);
      if (fn) functions.push(fn);
    }
    uniqueIds(functions, 'Functions', errors);
    for (const fn of functions) errors.push(...checkReferences(fn, sets).errors);
    if (errors.length || title === undefined) return { ok: false, errors };
    const value: MathDocument = { version: 1, title, sets, functions };
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_DOCUMENT_BYTES) {
      return { ok: false, errors: ['The document exceeds the 2 MiB size limit.'] };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, errors: ['The document could not be read as plain data.'] };
  }
}

/** Use at a text/file boundary to enforce the byte limit before JSON parsing. */
export function parseDocumentJson(input: string): DocumentResult {
  if (typeof input !== 'string') return { ok: false, errors: ['The JSON document must be text.'] };
  if (new TextEncoder().encode(input).byteLength > MAX_DOCUMENT_BYTES) {
    return { ok: false, errors: ['The JSON document exceeds the 2 MiB size limit.'] };
  }
  try {
    return parseDocument(JSON.parse(input));
  } catch {
    return { ok: false, errors: ['The document is not valid JSON.'] };
  }
}

export function createExample(): MathDocument {
  return {
    version: 1,
    title: 'A finite-function workspace',
    sets: [
      {
        id: 'A',
        name: 'A',
        elements: [
          { id: 'a', label: 'a' },
          { id: 'b', label: 'b' },
          { id: 'c', label: 'c' },
        ],
      },
      {
        id: 'B',
        name: 'B',
        elements: [
          { id: '1', label: '1' },
          { id: '2', label: '2' },
        ],
      },
      {
        id: 'C',
        name: 'C',
        elements: [
          { id: 'sun', label: 'sun' },
          { id: 'moon', label: 'moon' },
        ],
      },
    ],
    functions: [
      { id: 'f', name: 'f', domainId: 'A', codomainId: 'B', mapping: { a: '1', b: '2', c: '1' } },
      { id: 'g', name: 'g', domainId: 'B', codomainId: 'C', mapping: { '1': 'sun', '2': 'moon' } },
      {
        id: 'h',
        name: 'h',
        domainId: 'A',
        codomainId: 'C',
        mapping: { a: 'sun', b: 'moon', c: 'sun' },
      },
    ],
  };
}
