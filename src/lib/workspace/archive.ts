// SPDX-License-Identifier: MIT
import { parseDocument, type MathDocument } from '../math/model';

export type Positions = Record<string, { x: number; y: number }>;
export type WorkspaceArchive = {
  format: 'wolfbone.workspace';
  version: 1;
  document: MathDocument;
  layout: Positions;
};
export const STORAGE_KEY = 'wolfbone.workspace.v1';
export const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024;
export function defaultPositions(document: MathDocument): Positions {
  return Object.fromEntries(
    document.sets.map((set, index) => [
      set.id,
      { x: (index % 5) * 340, y: 100 + Math.floor(index / 5) * 380 },
    ]),
  );
}
export function archiveDocument(document: MathDocument, layout: Positions): WorkspaceArchive {
  return { format: 'wolfbone.workspace', version: 1, document, layout };
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
  if (isArchive && (envelope.format !== 'wolfbone.workspace' || envelope.version !== 1))
    return { ok: false, errors: ['This workspace format or version is not supported.'] };
  if (
    isArchive &&
    Object.keys(envelope).some((key) => !['format', 'version', 'document', 'layout'].includes(key))
  )
    return { ok: false, errors: ['The workspace contains unknown top-level fields.'] };
  const parsed = parseDocument(isArchive ? envelope.document : raw);
  if (!parsed.ok) return parsed;
  const layout = defaultPositions(parsed.value);
  if (isArchive) {
    if (!envelope.layout || typeof envelope.layout !== 'object' || Array.isArray(envelope.layout))
      return { ok: false, errors: ['The workspace layout must contain named positions.'] };
    for (const [id, value] of Object.entries(envelope.layout)) {
      if (!Object.hasOwn(layout, id) || !value || typeof value !== 'object' || Array.isArray(value))
        return {
          ok: false,
          errors: ['A layout position does not refer to a collection in this workspace.'],
        };
      const position = value as Record<string, unknown>;
      if (
        Object.keys(position).some((key) => key !== 'x' && key !== 'y') ||
        !Object.hasOwn(position, 'x') ||
        !Object.hasOwn(position, 'y') ||
        typeof position.x !== 'number' ||
        typeof position.y !== 'number' ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        Math.abs(position.x) > 100000 ||
        Math.abs(position.y) > 100000
      )
        return {
          ok: false,
          errors: ['Layout coordinates must be finite and within the supported range.'],
        };
      layout[id] = { x: position.x, y: position.y };
    }
  }
  return { ok: true, value: archiveDocument(parsed.value, layout) };
}
