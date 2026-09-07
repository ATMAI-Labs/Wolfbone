// SPDX-License-Identifier: MIT
import { createExample, type MathDocument } from '../math/model';
import { archiveDocument, decodeArchive, defaultPositions, type WorkspaceArchive } from './archive';

export type WorkspaceHistory = {
  past: WorkspaceArchive[];
  present: WorkspaceArchive;
  future: WorkspaceArchive[];
  /** Increases only after an accepted user edit, Undo, or Redo changes the archive. */
  revision: number;
  editError: string;
  /** Increases for every rejection, so identical repeated failures can be announced. */
  editErrorId: number;
};

export type WorkspaceAction =
  | { type: 'edit'; recipe: (current: WorkspaceArchive) => WorkspaceArchive }
  | { type: 'load'; value: WorkspaceArchive }
  | { type: 'undo' }
  | { type: 'redo' };

type ArchiveResult = ReturnType<typeof decodeArchive>;

function checkCanonicalArchive(result: ArchiveResult): ArchiveResult {
  // Filling omitted positions can increase size. Check the actual normalized
  // archive as well, so every accepted state can be imported after serialization.
  return result.ok ? decodeArchive(JSON.stringify(result.value)) : result;
}

export function validateArchiveCandidate(candidate: unknown): ArchiveResult {
  try {
    const serialized = JSON.stringify(candidate);
    if (typeof serialized !== 'string')
      return { ok: false, errors: ['A workspace must contain serializable document data.'] };
    return checkCanonicalArchive(decodeArchive(serialized));
  } catch {
    return { ok: false, errors: ['This change could not be serialized as workspace data.'] };
  }
}

/** Validate the raw text limit and the complete archive that would enter history. */
export function decodeImportableArchive(text: string): ArchiveResult {
  return checkCanonicalArchive(decodeArchive(text));
}

export function createWorkspaceHistory(initialDocument?: MathDocument): WorkspaceHistory {
  const document = initialDocument ?? createExample();
  const result = validateArchiveCandidate(archiveDocument(document, defaultPositions(document)));
  if (!result.ok) throw new Error('The built-in example is not a valid workspace.');
  return {
    past: [],
    present: result.value,
    future: [],
    revision: 0,
    editError: '',
    editErrorId: 0,
  };
}

function rejected(state: WorkspaceHistory, errors: string[]): WorkspaceHistory {
  return {
    ...state,
    editError: `The change was not applied. ${errors.slice(0, 3).join(' ')}`,
    editErrorId: state.editErrorId + 1,
  };
}

function clearError(state: WorkspaceHistory): WorkspaceHistory {
  return state.editError ? { ...state, editError: '' } : state;
}

export function workspaceReducer(
  state: WorkspaceHistory,
  action: WorkspaceAction,
): WorkspaceHistory {
  if (action.type === 'load') {
    const result = validateArchiveCandidate(action.value);
    if (!result.ok) return rejected(state, result.errors);
    // Loading is browser hydration. User imports go through an ordinary edit.
    return { ...state, past: [], present: result.value, future: [], revision: 0, editError: '' };
  }
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    return previous
      ? {
          ...state,
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future],
          revision: state.revision + 1,
          editError: '',
        }
      : clearError(state);
  }
  if (action.type === 'redo') {
    const next = state.future[0];
    return next
      ? {
          ...state,
          past: [...state.past, state.present],
          present: next,
          future: state.future.slice(1),
          revision: state.revision + 1,
          editError: '',
        }
      : clearError(state);
  }

  let result: ArchiveResult;
  try {
    // A recipe may mutate its working copy. It cannot mutate the current archive
    // or previous Undo states before the proposed result has been accepted.
    result = validateArchiveCandidate(action.recipe(structuredClone(state.present)));
  } catch {
    return rejected(state, ['The edit could not be completed. Your current workspace was kept.']);
  }
  if (!result.ok) return rejected(state, result.errors);
  if (JSON.stringify(result.value) === JSON.stringify(state.present)) return clearError(state);
  return {
    ...state,
    past: [...state.past.slice(-49), state.present],
    present: result.value,
    future: [],
    revision: state.revision + 1,
    editError: '',
  };
}
