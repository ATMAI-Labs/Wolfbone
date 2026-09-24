// SPDX-License-Identifier: MIT
import { LEGACY_STORAGE_KEY, STORAGE_KEY, type WorkspaceArchive } from './archive';
import { decodeImportableArchive } from './history';

type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type StoredWorkspace =
  | {
      kind: 'empty';
      currentRaw: string | null;
      /** An older tab can create a legacy save before this tab's first write. */
      legacy?: { key: string; raw: string | null };
    }
  | {
      kind: 'loaded';
      currentRaw: string;
      source: 'current';
      value: WorkspaceArchive;
    }
  | {
      kind: 'loaded';
      currentRaw: null;
      source: 'legacy';
      legacyRaw: string;
      legacyKey: string;
      value: WorkspaceArchive;
    }
  | {
      kind: 'blocked';
      currentRaw: string | null;
      protectedRaw: string | null;
      protectedKey: string;
      error: string;
    };

export function legacyStorageKey(currentKey: string): string | null {
  if (currentKey === STORAGE_KEY) return LEGACY_STORAGE_KEY;
  const examplePrefix = `${STORAGE_KEY}.example.`;
  return currentKey.startsWith(examplePrefix)
    ? `${LEGACY_STORAGE_KEY}${currentKey.slice(STORAGE_KEY.length)}`
    : null;
}

/** Prefer the current key. An unreadable save blocks fallback and automatic writes. */
export function readStoredWorkspace(
  storage: Pick<WorkspaceStorage, 'getItem'>,
  currentKey: string,
): StoredWorkspace {
  const currentRaw = storage.getItem(currentKey);
  if (currentRaw !== null) {
    const decoded = decodeImportableArchive(currentRaw);
    return decoded.ok
      ? { kind: 'loaded', currentRaw, source: 'current', value: decoded.value }
      : {
          kind: 'blocked',
          currentRaw,
          protectedRaw: currentRaw,
          protectedKey: currentKey,
          error: 'This browser save is unreadable or uses an unsupported workspace version.',
        };
  }

  const oldKey = legacyStorageKey(currentKey);
  if (oldKey === null) return { kind: 'empty', currentRaw: null };
  const legacyRaw = storage.getItem(oldKey);
  if (legacyRaw === null)
    return { kind: 'empty', currentRaw: null, legacy: { key: oldKey, raw: null } };
  const decoded = decodeImportableArchive(legacyRaw);
  return decoded.ok
    ? {
        kind: 'loaded',
        currentRaw: null,
        source: 'legacy',
        legacyRaw,
        legacyKey: oldKey,
        value: decoded.value,
      }
    : {
        kind: 'blocked',
        currentRaw: null,
        protectedRaw: legacyRaw,
        protectedKey: oldKey,
        error: 'The earlier browser save is unreadable or uses an unsupported workspace version.',
      };
}

/** Only an explicit import or reset may allow a blocked save to be replaced. */
export function allowExplicitReplacement(state: StoredWorkspace): StoredWorkspace {
  return state.kind === 'blocked' ? { kind: 'empty', currentRaw: state.currentRaw } : state;
}

/** Watch the legacy key until migration commits, then watch only the active key. */
export function observeExternalStorageChange(
  state: StoredWorkspace,
  currentKey: string,
  changedKey: string | null,
  newRaw: string | null,
): StoredWorkspace {
  if (changedKey === null) {
    // StorageEvent uses a null key for localStorage.clear(). Keep the last
    // observed bytes available for download, but never recreate the save.
    const watchedLegacy =
      state.kind === 'loaded' && state.source === 'legacy'
        ? { key: state.legacyKey, raw: state.legacyRaw }
        : state.kind === 'empty'
          ? state.legacy
          : state.kind === 'blocked' && state.protectedKey !== currentKey
            ? { key: state.protectedKey, raw: state.protectedRaw }
            : undefined;
    const protectedKey = state.currentRaw !== null ? currentKey : watchedLegacy?.key;
    const protectedRaw = state.currentRaw !== null ? state.currentRaw : watchedLegacy?.raw;
    if (protectedKey === undefined || protectedRaw == null) return state;
    return {
      kind: 'blocked',
      currentRaw: null,
      protectedRaw,
      protectedKey,
      error: 'Browser storage was cleared in another tab.',
    };
  }
  if (changedKey === currentKey) {
    if (newRaw === state.currentRaw) return state;
  } else if (state.kind === 'empty' && state.legacy) {
    if (changedKey !== state.legacy.key || newRaw === state.legacy.raw) return state;
  } else if (state.kind === 'loaded' && state.source === 'legacy') {
    if (changedKey !== state.legacyKey || newRaw === state.legacyRaw) return state;
  } else if (state.kind === 'blocked' && state.protectedKey !== currentKey) {
    if (changedKey !== state.protectedKey || newRaw === state.protectedRaw) return state;
  } else return state;
  return {
    kind: 'blocked',
    currentRaw: changedKey === currentKey ? newRaw : state.currentRaw,
    protectedRaw: newRaw,
    protectedKey: changedKey,
    error:
      newRaw === null
        ? 'Browser save was removed in another tab.'
        : 'This browser save changed in another tab.',
  };
}

export type StoreResult =
  | { ok: true; state: StoredWorkspace }
  | { ok: false; reason: 'blocked'; currentRaw: string | null }
  | {
      ok: false;
      reason: 'changed';
      currentRaw: string | null;
      protectedRaw: string | null;
      protectedKey: string;
    };

/** Compare the previously observed bytes before writing, so another tab's edits are kept. */
export function writeStoredWorkspace(
  storage: WorkspaceStorage,
  currentKey: string,
  archive: WorkspaceArchive,
  state: StoredWorkspace,
): StoreResult {
  if (state.kind === 'blocked')
    return { ok: false, reason: 'blocked', currentRaw: state.currentRaw };
  const actualRaw = storage.getItem(currentKey);
  if (actualRaw !== state.currentRaw)
    return {
      ok: false,
      reason: 'changed',
      currentRaw: actualRaw,
      protectedRaw: actualRaw,
      protectedKey: currentKey,
    };
  const watchedLegacy =
    state.kind === 'loaded' && state.source === 'legacy'
      ? { key: state.legacyKey, raw: state.legacyRaw }
      : state.kind === 'empty'
        ? state.legacy
        : undefined;
  if (watchedLegacy) {
    // An older tab may still edit this key while the first migration write waits.
    const actualLegacy = storage.getItem(watchedLegacy.key);
    if (actualLegacy !== watchedLegacy.raw)
      return {
        ok: false,
        reason: 'changed',
        currentRaw: actualRaw,
        protectedRaw: actualLegacy,
        protectedKey: watchedLegacy.key,
      };
  }
  const serialized = JSON.stringify(archive);
  storage.setItem(currentKey, serialized);
  return {
    ok: true,
    state: { kind: 'loaded', currentRaw: serialized, source: 'current', value: archive },
  };
}
