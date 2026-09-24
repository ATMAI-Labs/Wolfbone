// SPDX-License-Identifier: MIT
import { parseDocument, type MathDocument } from '../math/model';

export type Positions = Record<string, { x: number; y: number }>;
/** Editable source text only; arithmetic results are derived rather than archived. */
export type ArithmeticCard = { id: string; expression: string };
/** Freehand geometry has no implied mathematical meaning or connection to nearby objects. */
export type InkStroke = { id: string; points: Array<{ x: number; y: number }> };
export type WorkspaceArchive = {
  format: 'wolfbone.workspace';
  version: 1 | 2;
  document: MathDocument;
  layout: Positions;
  arithmetic?: ArithmeticCard[];
  ink?: InkStroke[];
};
/** The active browser save key stays stable as the archive format evolves. */
export const STORAGE_KEY = 'wolfbone.workspace';
/** Older builds only know this key. Never write to it from a newer build. */
export const LEGACY_STORAGE_KEY = 'wolfbone.workspace.v1';
export const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024;
export const WORKSPACE_CONTENT_LIMITS = Object.freeze({
  arithmeticCards: 50,
  expressionLength: 512,
  inkStrokes: 100,
  pointsPerStroke: 2000,
  coordinate: 100000,
  idLength: 120,
});
const unsafeIds = new Set(['__proto__', 'constructor', 'prototype']);

export function defaultPositions(
  document: MathDocument,
  arithmetic: ArithmeticCard[] = [],
): Positions {
  return Object.fromEntries(
    [...document.sets, ...arithmetic].map((item, index) => [
      item.id,
      { x: (index % 5) * 340, y: 100 + Math.floor(index / 5) * 380 },
    ]),
  );
}
export function archiveDocument(
  document: MathDocument,
  layout: Positions,
  content?: Pick<WorkspaceArchive, 'arithmetic' | 'ink'>,
): WorkspaceArchive {
  return {
    format: 'wolfbone.workspace',
    version: content === undefined ? 1 : 2,
    document,
    layout,
    ...content,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function point(value: unknown): value is { x: number; y: number } {
  return (
    record(value) &&
    Object.keys(value).every((key) => key === 'x' || key === 'y') &&
    Object.hasOwn(value, 'x') &&
    Object.hasOwn(value, 'y') &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Math.abs(value.x) <= WORKSPACE_CONTENT_LIMITS.coordinate &&
    Math.abs(value.y) <= WORKSPACE_CONTENT_LIMITS.coordinate
  );
}

function validNewId(value: unknown, used: Set<string>): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= WORKSPACE_CONTENT_LIMITS.idLength &&
    value === value.trim() &&
    !unsafeIds.has(value) &&
    !used.has(value)
  );
}
export function decodeArchive(
  text: string,
): { ok: true; value: WorkspaceArchive } | { ok: false; errors: string[] } {
  if (typeof text !== 'string')
    return { ok: false, errors: ['A workspace import must contain JSON text.'] };
  if (new TextEncoder().encode(text).byteLength > MAX_ARCHIVE_BYTES)
    return { ok: false, errors: ['Choose a workspace smaller than 2 MB.'] };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errors: ['This file is not valid JSON. Your current workspace has been kept.'],
    };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, errors: ['A workspace must be a JSON object.'] };
  const envelope = raw as Record<string, unknown>;
  const isArchive = Object.hasOwn(envelope, 'format');
  if (
    isArchive &&
    (envelope.format !== 'wolfbone.workspace' || (envelope.version !== 1 && envelope.version !== 2))
  )
    return { ok: false, errors: ['This workspace format or version is not supported.'] };
  const allowedFields = ['format', 'version', 'document', 'layout'];
  if (envelope.version === 2) allowedFields.push('arithmetic', 'ink');
  if (isArchive && Object.keys(envelope).some((key) => !allowedFields.includes(key)))
    return { ok: false, errors: ['The workspace contains unknown top-level fields.'] };
  const parsed = parseDocument(isArchive ? envelope.document : raw);
  if (!parsed.ok) return parsed;
  const content: Pick<WorkspaceArchive, 'arithmetic' | 'ink'> = {};
  const usedIds = new Set([
    ...parsed.value.sets.map((set) => set.id),
    ...parsed.value.functions.map((fn) => fn.id),
  ]);
  if (isArchive && envelope.version === 2 && Object.hasOwn(envelope, 'arithmetic')) {
    if (
      !Array.isArray(envelope.arithmetic) ||
      envelope.arithmetic.length > WORKSPACE_CONTENT_LIMITS.arithmeticCards
    )
      return { ok: false, errors: ['A workspace can contain at most 50 arithmetic cards.'] };
    content.arithmetic = [];
    for (const entry of envelope.arithmetic) {
      if (
        !record(entry) ||
        Object.keys(entry).some((key) => key !== 'id' && key !== 'expression') ||
        !Object.hasOwn(entry, 'id') ||
        !Object.hasOwn(entry, 'expression') ||
        !validNewId(entry.id, usedIds) ||
        typeof entry.expression !== 'string' ||
        entry.expression.length > WORKSPACE_CONTENT_LIMITS.expressionLength
      )
        return {
          ok: false,
          errors: [
            'Each arithmetic card needs a unique, safe ID and an expression of at most 512 characters.',
          ],
        };
      usedIds.add(entry.id);
      content.arithmetic.push({ id: entry.id, expression: entry.expression });
    }
  }
  if (isArchive && envelope.version === 2 && Object.hasOwn(envelope, 'ink')) {
    if (!Array.isArray(envelope.ink) || envelope.ink.length > WORKSPACE_CONTENT_LIMITS.inkStrokes)
      return { ok: false, errors: ['A workspace can contain at most 100 pencil strokes.'] };
    content.ink = [];
    for (const entry of envelope.ink) {
      if (
        !record(entry) ||
        Object.keys(entry).some((key) => key !== 'id' && key !== 'points') ||
        !Object.hasOwn(entry, 'id') ||
        !Object.hasOwn(entry, 'points') ||
        !validNewId(entry.id, usedIds) ||
        !Array.isArray(entry.points) ||
        entry.points.length < 2 ||
        entry.points.length > WORKSPACE_CONTENT_LIMITS.pointsPerStroke ||
        !entry.points.every(point)
      )
        return {
          ok: false,
          errors: [
            'Each pencil stroke needs a unique, safe ID and 2 to 2000 finite points within the canvas range.',
          ],
        };
      usedIds.add(entry.id);
      content.ink.push({ id: entry.id, points: entry.points.map(({ x, y }) => ({ x, y })) });
    }
  }
  const layout = defaultPositions(parsed.value, content.arithmetic);
  if (isArchive) {
    if (!envelope.layout || typeof envelope.layout !== 'object' || Array.isArray(envelope.layout))
      return { ok: false, errors: ['The workspace layout must contain named positions.'] };
    for (const [id, value] of Object.entries(envelope.layout)) {
      if (!Object.hasOwn(layout, id) || !value || typeof value !== 'object' || Array.isArray(value))
        return {
          ok: false,
          errors: [
            'A layout position does not refer to a collection or arithmetic card in this workspace.',
          ],
        };
      if (!point(value))
        return {
          ok: false,
          errors: ['Layout coordinates must be finite and within the supported range.'],
        };
      layout[id] = { x: value.x, y: value.y };
    }
  }
  return {
    ok: true,
    value: archiveDocument(
      parsed.value,
      layout,
      isArchive && envelope.version === 2 ? content : undefined,
    ),
  };
}
