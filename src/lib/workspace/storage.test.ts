// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { createExample } from '../math/model';
import { archiveDocument, LEGACY_STORAGE_KEY, STORAGE_KEY, type WorkspaceArchive } from './archive';
import {
  allowExplicitReplacement,
  legacyStorageKey,
  observeExternalStorageChange,
  readStoredWorkspace,
  writeStoredWorkspace,
} from './storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial));
  const writes: Array<[string, string]> = [];
  return {
    entries,
    writes,
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writes.push([key, value]);
      entries.set(key, value);
    },
  };
}

function legacyArchive(): WorkspaceArchive {
  return archiveDocument(createExample(), {});
}

function canvasArchive(): WorkspaceArchive {
  return archiveDocument(
    createExample(),
    {},
    {
      arithmetic: [{ id: 'calc', expression: '1 / 3' }],
      ink: [
        {
          id: 'line',
          points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ],
        },
      ],
    },
  );
}

test('legacy version 1 and 2 saves migrate to the new key without changing old bytes', () => {
  for (const archive of [legacyArchive(), canvasArchive()]) {
    const oldRaw = JSON.stringify(archive);
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: oldRaw });
    const loaded = readStoredWorkspace(storage, STORAGE_KEY);
    assert.equal(loaded.kind, 'loaded');
    if (loaded.kind !== 'loaded') continue;
    assert.equal(loaded.source, 'legacy');
    assert.equal(loaded.value.version, archive.version);
    assert.deepEqual(loaded.value.arithmetic, archive.arithmetic);
    assert.deepEqual(loaded.value.ink, archive.ink);
    const result = writeStoredWorkspace(storage, STORAGE_KEY, loaded.value, loaded);
    assert.equal(result.ok, true);
    assert.deepEqual(
      storage.writes.map(([key]) => key),
      [STORAGE_KEY],
    );
    assert.equal(storage.getItem(LEGACY_STORAGE_KEY), oldRaw);
    assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)!).version, archive.version);
  }
});

test('example keys migrate independently and the new save wins over a legacy save', () => {
  const exampleKey = `${STORAGE_KEY}.example.function-composition`;
  const legacyExampleKey = `${LEGACY_STORAGE_KEY}.example.function-composition`;
  assert.equal(legacyStorageKey(exampleKey), legacyExampleKey);
  assert.equal(legacyStorageKey(STORAGE_KEY), LEGACY_STORAGE_KEY);
  assert.equal(legacyStorageKey('some.other.key'), null);
  const oldRaw = JSON.stringify(legacyArchive());
  const newRaw = JSON.stringify(canvasArchive());
  const storage = memoryStorage({
    [legacyExampleKey]: oldRaw,
    [exampleKey]: newRaw,
    [LEGACY_STORAGE_KEY]: oldRaw,
  });
  const loaded = readStoredWorkspace(storage, exampleKey);
  assert.equal(loaded.kind, 'loaded');
  if (loaded.kind !== 'loaded') return;
  assert.equal(loaded.source, 'current');
  assert.deepEqual(loaded.value.arithmetic, canvasArchive().arithmetic);
  assert.equal(readStoredWorkspace(storage, STORAGE_KEY).kind, 'loaded');
  const result = writeStoredWorkspace(storage, exampleKey, loaded.value, loaded);
  assert.equal(result.ok, true);
  assert.deepEqual(
    storage.writes.map(([key]) => key),
    [exampleKey],
  );
  assert.equal(storage.getItem(legacyExampleKey), oldRaw);
});

test('newer or corrupt current saves block automatic writes even when a valid legacy save exists', () => {
  const oldRaw = JSON.stringify(legacyArchive());
  const unsupported = JSON.stringify({ ...canvasArchive(), version: 3, later: true });
  for (const currentRaw of [unsupported, '{unreadable', '']) {
    const storage = memoryStorage({
      [STORAGE_KEY]: currentRaw,
      [LEGACY_STORAGE_KEY]: oldRaw,
    });
    const loaded = readStoredWorkspace(storage, STORAGE_KEY);
    assert.equal(loaded.kind, 'blocked');
    if (loaded.kind === 'blocked') {
      assert.equal(loaded.protectedRaw, currentRaw);
      assert.equal(loaded.protectedKey, STORAGE_KEY);
    }
    const result = writeStoredWorkspace(storage, STORAGE_KEY, canvasArchive(), loaded);
    assert.deepEqual(result, { ok: false, reason: 'blocked', currentRaw });
    assert.deepEqual(storage.writes, []);
    assert.equal(storage.getItem(STORAGE_KEY), currentRaw);
    assert.equal(storage.getItem(LEGACY_STORAGE_KEY), oldRaw);
  }
});

test('a corrupt legacy save is preserved and needs an explicit replacement', () => {
  const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: '{bad' });
  const loaded = readStoredWorkspace(storage, STORAGE_KEY);
  assert.equal(loaded.kind, 'blocked');
  if (loaded.kind === 'blocked') {
    assert.equal(loaded.protectedRaw, '{bad');
    assert.equal(loaded.protectedKey, LEGACY_STORAGE_KEY);
  }
  assert.equal(writeStoredWorkspace(storage, STORAGE_KEY, canvasArchive(), loaded).ok, false);
  const replacement = writeStoredWorkspace(
    storage,
    STORAGE_KEY,
    canvasArchive(),
    allowExplicitReplacement(loaded),
  );
  assert.equal(replacement.ok, true);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), '{bad');
  assert.deepEqual(
    storage.writes.map(([key]) => key),
    [STORAGE_KEY],
  );
});

test('a save observed from another tab is not overwritten by a stale editor', () => {
  const firstRaw = JSON.stringify(legacyArchive());
  const otherTabRaw = JSON.stringify(canvasArchive());
  const storage = memoryStorage({ [STORAGE_KEY]: firstRaw });
  const loaded = readStoredWorkspace(storage, STORAGE_KEY);
  assert.equal(loaded.kind, 'loaded');
  storage.entries.set(STORAGE_KEY, otherTabRaw);
  const result = writeStoredWorkspace(storage, STORAGE_KEY, legacyArchive(), loaded);
  assert.deepEqual(result, {
    ok: false,
    reason: 'changed',
    currentRaw: otherTabRaw,
    protectedRaw: otherTabRaw,
    protectedKey: STORAGE_KEY,
  });
  assert.deepEqual(storage.writes, []);
  assert.equal(storage.getItem(STORAGE_KEY), otherTabRaw);
});

test('a newer legacy save arriving before migration blocks the new-key write', () => {
  const oldRaw = JSON.stringify(legacyArchive());
  const newerRaw = JSON.stringify(canvasArchive());
  const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: oldRaw });
  const loaded = readStoredWorkspace(storage, STORAGE_KEY);
  assert.equal(loaded.kind, 'loaded');
  storage.entries.set(LEGACY_STORAGE_KEY, newerRaw);
  const result = writeStoredWorkspace(storage, STORAGE_KEY, canvasArchive(), loaded);
  assert.deepEqual(result, {
    ok: false,
    reason: 'changed',
    currentRaw: null,
    protectedRaw: newerRaw,
    protectedKey: LEGACY_STORAGE_KEY,
  });
  assert.deepEqual(storage.writes, []);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), newerRaw);
});

test('legacy storage events protect exact new bytes until migration commits', () => {
  const oldRaw = JSON.stringify(legacyArchive());
  const newerRaw = JSON.stringify(canvasArchive());
  const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: oldRaw });
  const loaded = readStoredWorkspace(storage, STORAGE_KEY);
  assert.equal(loaded.kind, 'loaded');
  assert.equal(
    observeExternalStorageChange(loaded, STORAGE_KEY, LEGACY_STORAGE_KEY, oldRaw),
    loaded,
  );
  const blocked = observeExternalStorageChange(loaded, STORAGE_KEY, LEGACY_STORAGE_KEY, newerRaw);
  assert.equal(blocked.kind, 'blocked');
  if (blocked.kind === 'blocked') {
    assert.equal(blocked.protectedRaw, newerRaw);
    assert.equal(blocked.protectedKey, LEGACY_STORAGE_KEY);
    assert.equal(blocked.currentRaw, null);
  }
  const latestRaw = '{newer-but-unreadable';
  const updated = observeExternalStorageChange(blocked, STORAGE_KEY, LEGACY_STORAGE_KEY, latestRaw);
  assert.equal(updated.kind, 'blocked');
  if (updated.kind === 'blocked') assert.equal(updated.protectedRaw, latestRaw);
  assert.equal(writeStoredWorkspace(storage, STORAGE_KEY, canvasArchive(), blocked).ok, false);

  const migrated = writeStoredWorkspace(storage, STORAGE_KEY, legacyArchive(), loaded);
  assert.equal(migrated.ok, true);
  if (migrated.ok)
    assert.equal(
      observeExternalStorageChange(migrated.state, STORAGE_KEY, LEGACY_STORAGE_KEY, newerRaw),
      migrated.state,
    );
});

test('a legacy save created after an initially empty read is not hidden by the first new-key write', () => {
  const storage = memoryStorage();
  const empty = readStoredWorkspace(storage, STORAGE_KEY);
  assert.equal(empty.kind, 'empty');
  const newLegacyRaw = JSON.stringify(canvasArchive());
  storage.entries.set(LEGACY_STORAGE_KEY, newLegacyRaw);
  assert.deepEqual(writeStoredWorkspace(storage, STORAGE_KEY, legacyArchive(), empty), {
    ok: false,
    reason: 'changed',
    currentRaw: null,
    protectedRaw: newLegacyRaw,
    protectedKey: LEGACY_STORAGE_KEY,
  });
  const observed = observeExternalStorageChange(
    empty,
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    newLegacyRaw,
  );
  assert.equal(observed.kind, 'blocked');
  if (observed.kind === 'blocked') assert.equal(observed.protectedRaw, newLegacyRaw);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('clearing browser storage pauses autosave for an active save and retains its observed bytes', () => {
  const currentRaw = JSON.stringify(canvasArchive());
  const storage = memoryStorage({ [STORAGE_KEY]: currentRaw });
  const loaded = readStoredWorkspace(storage, STORAGE_KEY);
  const cleared = observeExternalStorageChange(loaded, STORAGE_KEY, null, null);
  assert.equal(cleared.kind, 'blocked');
  if (cleared.kind === 'blocked') {
    assert.equal(cleared.currentRaw, null);
    assert.equal(cleared.protectedRaw, currentRaw);
    assert.equal(cleared.protectedKey, STORAGE_KEY);
    assert.match(cleared.error, /cleared in another tab/);
  }
  storage.entries.clear();
  assert.equal(writeStoredWorkspace(storage, STORAGE_KEY, canvasArchive(), cleared).ok, false);
  assert.deepEqual(storage.writes, []);
});

test('clearing browser storage pauses legacy migration but ignores an initially empty workspace', () => {
  const oldRaw = JSON.stringify(legacyArchive());
  const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: oldRaw });
  const legacy = readStoredWorkspace(storage, STORAGE_KEY);
  const cleared = observeExternalStorageChange(legacy, STORAGE_KEY, null, null);
  assert.equal(cleared.kind, 'blocked');
  if (cleared.kind === 'blocked') {
    assert.equal(cleared.protectedRaw, oldRaw);
    assert.equal(cleared.protectedKey, LEGACY_STORAGE_KEY);
    assert.match(cleared.error, /cleared in another tab/);
  }
  storage.entries.clear();
  assert.equal(writeStoredWorkspace(storage, STORAGE_KEY, legacyArchive(), cleared).ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), null);

  const empty = readStoredWorkspace(storage, STORAGE_KEY);
  assert.equal(empty.kind, 'empty');
  assert.equal(observeExternalStorageChange(empty, STORAGE_KEY, null, null), empty);
});

test('removing one watched save is reported without claiming newer bytes remain', () => {
  const raw = JSON.stringify(canvasArchive());
  const storage = memoryStorage({ [STORAGE_KEY]: raw });
  const loaded = readStoredWorkspace(storage, STORAGE_KEY);
  const removed = observeExternalStorageChange(loaded, STORAGE_KEY, STORAGE_KEY, null);
  assert.equal(removed.kind, 'blocked');
  if (removed.kind === 'blocked') {
    assert.equal(removed.protectedRaw, null);
    assert.match(removed.error, /removed in another tab/);
  }
});
