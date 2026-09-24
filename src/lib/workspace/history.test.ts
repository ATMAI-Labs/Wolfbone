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

test('arithmetic and pencil edits share Undo, Redo, and importable history with the existing document', () => {
  const initial = createWorkspaceHistory();
  const withCard = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      version: 2,
      arithmetic: [{ id: 'calc', expression: '2 + 2' }],
      layout: { ...current.layout, calc: { x: 40, y: -20 } },
    }),
  });
  const withStroke = workspaceReducer(withCard, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      ink: [
        {
          id: 'stroke',
          points: [
            { x: 4, y: 5 },
            { x: 6, y: 7 },
          ],
        },
      ],
    }),
  });
  const movedAndEdited = workspaceReducer(withStroke, {
    type: 'edit',
    recipe: (current) => {
      current.layout.calc = { x: 120, y: 90 };
      current.arithmetic![0].expression = '2 + (';
      return current;
    },
  });
  assert.equal(movedAndEdited.editError, '');
  assert.equal(movedAndEdited.revision, 3);
  assert.deepEqual(movedAndEdited.present.document, initial.present.document);
  assert.equal(withCard.present.arithmetic![0].expression, '2 + 2');
  assert.deepEqual(withCard.present.layout.calc, { x: 40, y: -20 });
  assert.equal(withCard.present.ink, undefined);
  const undoneEdit = workspaceReducer(movedAndEdited, { type: 'undo' });
  assert.equal(undoneEdit.present, withStroke.present);
  const undoneInk = workspaceReducer(undoneEdit, { type: 'undo' });
  assert.equal(undoneInk.present, withCard.present);
  const undoneCard = workspaceReducer(undoneInk, { type: 'undo' });
  assert.equal(undoneCard.present, initial.present);
  assert.equal(undoneCard.present.version, 1);
  let redone = undoneCard;
  for (let index = 0; index < 3; index++) redone = workspaceReducer(redone, { type: 'redo' });
  assert.equal(redone.present, movedAndEdited.present);
  const imported = decodeImportableArchive(JSON.stringify(redone.present));
  if (!imported.ok) assert.fail(imported.errors.join(' '));
  assert.deepEqual(imported.value, redone.present);
  const loaded = workspaceReducer(initial, { type: 'load', value: imported.value });
  assert.deepEqual(loaded.present, redone.present);
  assert.equal(loaded.revision, 0);
});

test('invalid new content cannot mutate prior states or remove a Redo branch', () => {
  const initial = createWorkspaceHistory();
  const changed = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      version: 2,
      arithmetic: [{ id: 'calc', expression: '2+2' }],
      ink: [
        {
          id: 'stroke',
          points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ],
        },
      ],
    }),
  });
  const undone = workspaceReducer(changed, { type: 'undo' });
  const invalid = workspaceReducer(undone, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      version: 2,
      arithmetic: [{ id: 'A', expression: '999' }],
    }),
  });
  assert.equal(invalid.present, undone.present);
  assert.equal(invalid.future, undone.future);
  assert.equal(invalid.revision, undone.revision);
  assert.ok(invalid.editError);
  const mutatedInk = workspaceReducer(changed, {
    type: 'edit',
    recipe: (current) => {
      current.ink![0].points[0].x = Infinity;
      current.arithmetic![0].expression = 'discard me';
      return current;
    },
  });
  assert.equal(mutatedInk.present, changed.present);
  assert.equal(changed.present.ink![0].points[0].x, 1);
  assert.equal(changed.present.arithmetic![0].expression, '2+2');
  assert.equal(mutatedInk.revision, changed.revision);
  assert.ok(mutatedInk.editError);
});

function addBlankArithmeticCard(state: ReturnType<typeof createWorkspaceHistory>) {
  return workspaceReducer(state, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      version: 2,
      arithmetic: [{ id: 'calc', expression: '' }],
      layout: { ...current.layout, calc: { x: 0, y: 0 } },
    }),
  });
}

function typeInCard(state: ReturnType<typeof createWorkspaceHistory>, expression: string) {
  return workspaceReducer(state, {
    type: 'edit',
    coalesce: { kind: 'arithmetic-expression', cardId: 'calc' },
    recipe: (current) => ({
      ...current,
      arithmetic: current.arithmetic?.map((card) =>
        card.id === 'calc' ? { ...card, expression } : card,
      ),
    }),
  });
}

test('a long arithmetic typing burst is one Undo step after card creation', () => {
  const initial = createWorkspaceHistory();
  const created = addBlankArithmeticCard(initial);
  let typed = created;
  for (let length = 1; length <= 60; length += 1) {
    typed = typeInCard(typed, '1'.repeat(length));
  }
  assert.equal(typed.revision, 61);
  assert.equal(typed.past.length, 2);
  assert.equal(typed.past[0], initial.present);
  assert.equal(typed.past[1], created.present);
  const undoneTyping = workspaceReducer(typed, { type: 'undo' });
  assert.equal(undoneTyping.present, created.present);
  assert.equal(undoneTyping.coalescing, null);
  const undoneCreation = workspaceReducer(undoneTyping, { type: 'undo' });
  assert.equal(undoneCreation.present, initial.present);
  const redoneCreation = workspaceReducer(undoneCreation, { type: 'redo' });
  const redoneTyping = workspaceReducer(redoneCreation, { type: 'redo' });
  assert.equal(redoneTyping.present, typed.present);
  assert.equal(redoneTyping.coalescing, null);
  assert.equal(redoneTyping.revision, 65);
  const typedAfterRedo = typeInCard(redoneTyping, '1'.repeat(61));
  assert.equal(typedAfterRedo.past.length, 3, 'typing after Redo begins a new step');
});

test('blur, other edits, and a misleading grouping hint separate Undo steps', () => {
  const created = addBlankArithmeticCard(createWorkspaceHistory());
  const firstBurst = typeInCard(created, '2');
  const ended = workspaceReducer(firstBurst, { type: 'end-coalescing' });
  assert.equal(ended.revision, firstBurst.revision);
  assert.equal(ended.present, firstBurst.present);
  assert.equal(ended.coalescing, null);
  const secondBurst = typeInCard(ended, '2+');
  assert.equal(secondBurst.past.length, 3);
  const changedMath = workspaceReducer(secondBurst, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      document: { ...current.document, title: 'After a math edit' },
    }),
  });
  const thirdBurst = typeInCard(changedMath, '2+2');
  assert.equal(thirdBurst.past.length, 5);
  const ink = workspaceReducer(thirdBurst, {
    type: 'edit',
    coalesce: { kind: 'arithmetic-expression', cardId: 'calc' },
    recipe: (current) => ({
      ...current,
      arithmetic: current.arithmetic?.map((card) =>
        card.id === 'calc' ? { ...card, expression: '2+3' } : card,
      ),
      ink: [
        {
          id: 'stroke',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    }),
  });
  assert.equal(ink.past.length, 6, 'expression plus ink cannot masquerade as typing alone');
  assert.equal(ink.coalescing, null);
  const imported = workspaceReducer(ink, {
    type: 'edit',
    recipe: () => created.present,
  });
  assert.equal(imported.past.length, 7, 'an import remains its own step');
  assert.equal(workspaceReducer(imported, { type: 'undo' }).present, ink.present);
});

test('rejected typing keeps the active group, archive, revision, and Redo branch', () => {
  const created = addBlankArithmeticCard(createWorkspaceHistory());
  const first = typeInCard(created, '3');
  const rejected = typeInCard(first, 'x'.repeat(513));
  assert.equal(rejected.present, first.present);
  assert.equal(rejected.past, first.past);
  assert.equal(rejected.future, first.future);
  assert.equal(rejected.revision, first.revision);
  assert.deepEqual(rejected.coalescing, first.coalescing);
  assert.equal(rejected.editErrorId, first.editErrorId + 1);
  const corrected = typeInCard(rejected, '3+4');
  assert.equal(corrected.past.length, 2);
  assert.equal(corrected.editError, '');
  const undone = workspaceReducer(corrected, { type: 'undo' });
  const rejectedOnRedoBranch = typeInCard(undone, 'x'.repeat(513));
  assert.equal(rejectedOnRedoBranch.future, undone.future);
  assert.equal(rejectedOnRedoBranch.revision, undone.revision);
  assert.equal(rejectedOnRedoBranch.coalescing, null);
});

test('other card and quoted document text cannot impersonate the typed card', () => {
  const initial = createWorkspaceHistory();
  const created = workspaceReducer(initial, {
    type: 'edit',
    recipe: (current) => ({
      ...current,
      version: 2,
      document: {
        ...current.document,
        title: `Card text ${JSON.stringify({ id: 'calc', expression: '1' })}`,
      },
      arithmetic: [
        { id: 'calc', expression: '1' },
        { id: 'calc-other', expression: '1' },
      ],
      layout: {
        ...current.layout,
        calc: { x: 0, y: 0 },
        'calc-other': { x: 10, y: 0 },
      },
    }),
  });
  const first = typeInCard(created, '1$');
  const second = typeInCard(first, '1$$');
  assert.equal(second.past.length, 2, 'quoted card JSON does not block a real typing burst');
  const otherCard = workspaceReducer(second, {
    type: 'edit',
    coalesce: { kind: 'arithmetic-expression', cardId: 'calc' },
    recipe: (current) => ({
      ...current,
      arithmetic: current.arithmetic?.map((card) =>
        card.id === 'calc-other' ? { ...card, expression: '2' } : card,
      ),
    }),
  });
  assert.equal(otherCard.past.length, 3, 'a misleading card ID cannot combine another card');
  assert.equal(otherCard.coalescing, null);
  assert.equal(workspaceReducer(otherCard, { type: 'undo' }).present, second.present);
  assert.equal(workspaceReducer(second, { type: 'undo' }).present, created.present);
});
