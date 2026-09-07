// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveDocument, decodeArchive, MAX_ARCHIVE_BYTES } from './archive';
import { createWorkspaceHistory, decodeImportableArchive, workspaceReducer } from './history';

test('accepted edits are importable and retain an unchanged Undo state', () => {
  const initial = createWorkspaceHistory();
  const before = JSON.stringify(initial.present);
  const next = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => {
      current.document.functions[0].mapping.a = '2';
      current.layout.A.x = -200;
      return current;
    },
  });
  assert.equal(next.revision, 1);
  assert.equal(next.editError, '');
  assert.equal(next.past[0], initial.present);
  assert.equal(JSON.stringify(initial.present), before);
  const decoded = decodeArchive(JSON.stringify(next.present));
  if (!decoded.ok) assert.fail(decoded.errors.join(' '));
  assert.deepEqual(decoded.value, next.present);
  assert.equal(next.present.document.functions[0].mapping.a, '2');
});

test('invalid mutations preserve the present, both history branches, and revision', () => {
  const initial = createWorkspaceHistory();
  const changed = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => ({ ...current, document: { ...current.document, title: 'Changed' } }),
  });
  const undone = workspaceReducer(changed, { type: 'undo' });
  const before = JSON.stringify(undone);
  const rejected = workspaceReducer(undone, {
    type: 'edit',
    recipe: (current) => {
      current.document.functions[0].mapping.a = 'outside';
      current.layout.A.x = 123;
      return current;
    },
  });
  assert.equal(JSON.stringify(undone), before);
  assert.equal(rejected.present, undone.present);
  assert.equal(rejected.past, undone.past);
  assert.equal(rejected.future, undone.future);
  assert.equal(rejected.revision, undone.revision);
  assert.match(rejected.editError, /outside its codomain/);
  assert.equal(rejected.editErrorId, 1);
});

test('repeated errors have distinct IDs and a successful change clears the error', () => {
  const initial = createWorkspaceHistory();
  const invalid = {
    type: 'edit' as const,
    recipe: (current: typeof initial.present) => ({
      ...current,
      layout: { A: { x: Infinity, y: 0 } },
    }),
  };
  const first = workspaceReducer(initial, invalid);
  const second = workspaceReducer(first, invalid);
  assert.equal(second.editError, first.editError);
  assert.equal(second.editErrorId, first.editErrorId + 1);
  assert.equal(second.revision, 0);
  const accepted = workspaceReducer(second, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      document: { ...current.document, title: 'Accepted change' },
    }),
  });
  assert.equal(accepted.editError, '');
  assert.equal(accepted.editErrorId, 2);
  assert.equal(accepted.revision, 1);
});

test('throwing recipes, cyclic objects and oversized edits leave the workspace intact', () => {
  const initial = createWorkspaceHistory();
  const throwing = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => {
      current.document.title = 'Must not leak into current history';
      throw new Error('An edit failed');
    },
  });
  const cyclic = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => {
      Object.assign(current, { cycle: current });
      return current;
    },
  });
  const oversized = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      document: { ...current.document, title: 'x'.repeat(MAX_ARCHIVE_BYTES) },
    }),
  });
  for (const rejected of [throwing, cyclic, oversized]) {
    assert.equal(rejected.present, initial.present);
    assert.equal(rejected.revision, 0);
    assert.ok(rejected.editError.length > 0);
    assert.deepEqual(rejected.past, []);
    assert.deepEqual(rejected.future, []);
  }
  assert.equal(initial.present.document.title, createWorkspaceHistory().present.document.title);
});

test('valid no-ops and unavailable Undo/Redo do not count as user changes', () => {
  const initial = createWorkspaceHistory();
  assert.equal(workspaceReducer(initial, { type: 'edit', recipe: (current) => current }), initial);
  assert.equal(workspaceReducer(initial, { type: 'undo' }), initial);
  assert.equal(workspaceReducer(initial, { type: 'redo' }), initial);
  assert.equal(initial.revision, 0);
});

test('empty imported archives are ordinary edits that can be undone and redone', () => {
  const initial = createWorkspaceHistory();
  const imported = decodeImportableArchive(
    JSON.stringify(archiveDocument({ version: 1, title: 'Empty', sets: [], functions: [] }, {})),
  );
  if (!imported.ok) assert.fail(imported.errors.join(' '));
  const changed = workspaceReducer(initial, { type: 'edit', recipe: () => imported.value });
  assert.deepEqual(changed.present.document.sets, []);
  const undone = workspaceReducer(changed, { type: 'undo' });
  assert.equal(undone.present, initial.present);
  const redone = workspaceReducer(undone, { type: 'redo' });
  assert.equal(redone.present, changed.present);
  assert.equal(redone.revision, 3);
  assert.equal(decodeArchive(JSON.stringify(redone.present)).ok, true);
});

test('accepted edits after Undo replace the future; rejected edits do not', () => {
  const initial = createWorkspaceHistory();
  const first = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => ({ ...current, document: { ...current.document, title: 'First' } }),
  });
  const undone = workspaceReducer(first, { type: 'undo' });
  const second = workspaceReducer(undone, {
    type: 'edit',
    recipe: (current) => ({ ...current, document: { ...current.document, title: 'Second' } }),
  });
  assert.equal(second.future.length, 0);
  assert.equal(second.past.length, 1);
  assert.equal(second.present.document.title, 'Second');
});

test('browser hydration validates data and does not itself count as a user edit', () => {
  const initial = createWorkspaceHistory();
  const valid = workspaceReducer(initial, {
    type: 'load',
    value: archiveDocument(
      { version: 1, title: 'Saved empty workspace', sets: [], functions: [] },
      {},
    ),
  });
  assert.equal(valid.present.document.title, 'Saved empty workspace');
  assert.equal(valid.revision, 0);
  assert.equal(valid.past.length, 0);
  assert.equal(valid.future.length, 0);
  const invalid = workspaceReducer(initial, {
    type: 'load',
    value: { ...initial.present, layout: { stranger: { x: 0, y: 0 } } },
  });
  assert.equal(invalid.present, initial.present);
  assert.equal(invalid.revision, 0);
  assert.ok(invalid.editError);
});

test('history keeps at most 50 accepted prior states', () => {
  let state = createWorkspaceHistory();
  for (let index = 1; index <= 55; index += 1) {
    state = workspaceReducer(state, {
      type: 'edit',
      recipe: (current) => ({
        ...current,
        document: { ...current.document, title: `Revision ${index}` },
      }),
    });
  }
  assert.equal(state.past.length, 50);
  assert.equal(state.past[0].document.title, 'Revision 5');
  assert.equal(state.revision, 55);
});
