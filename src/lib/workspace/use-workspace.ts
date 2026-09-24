'use client';
// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { type MathDocument } from '../math/model';
import { STORAGE_KEY, type WorkspaceArchive, type Positions } from './archive';
import {
  createWorkspaceHistory,
  decodeImportableArchive,
  workspaceReducer,
  type WorkspaceAction,
} from './history';
import {
  allowExplicitReplacement,
  observeExternalStorageChange,
  readStoredWorkspace,
  writeStoredWorkspace,
  type StoredWorkspace,
} from './storage';

function blockedSaveStatus(state: StoredWorkspace): string {
  return state.kind === 'blocked' &&
    (state.error.startsWith('Browser storage was cleared') ||
      state.error.startsWith('Browser save was removed'))
    ? 'Autosave paused — browser storage changed'
    : 'Original browser save kept — export your work';
}

export function useWorkspace(initialDocument?: MathDocument, storageKey = STORAGE_KEY) {
  const [history, dispatch] = useReducer(workspaceReducer, initialDocument, createWorkspaceHistory);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('Opening workspace…');
  const [loadError, setLoadError] = useState('');
  const [replacementEpoch, setReplacementEpoch] = useState(0);
  const stored = useRef<StoredWorkspace>({ kind: 'empty', currentRaw: null });
  const latestArchive = useRef(history.present);
  const pendingSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    latestArchive.current = history.present;
    pendingSave.current = true;
  }, [history.present]);
  useEffect(() => {
    setLoadError('');
    try {
      const result = readStoredWorkspace(localStorage, storageKey);
      stored.current = result;
      if (result.kind === 'loaded') dispatch({ type: 'load', value: result.value });
      if (result.kind === 'blocked') {
        setLoadError(
          `${result.error} The original bytes are kept. Export your work, or import a file or restore the example to replace the active save.`,
        );
      }
    } catch {
      stored.current = { kind: 'empty', currentRaw: null };
      setLoadError('Browser storage is unavailable. You can work here and export a file.');
    }
    setHydratedKey(storageKey);
  }, [storageKey]);
  const saveNow = useCallback(() => {
    if (stored.current.kind === 'blocked') {
      pendingSave.current = false;
      setSaveStatus(blockedSaveStatus(stored.current));
      return;
    }
    try {
      const result = writeStoredWorkspace(
        localStorage,
        storageKey,
        latestArchive.current,
        stored.current,
      );
      if (!result.ok) {
        pendingSave.current = false;
        if (result.reason === 'changed') {
          stored.current = {
            kind: 'blocked',
            currentRaw: result.currentRaw,
            protectedRaw: result.protectedRaw,
            protectedKey: result.protectedKey,
            error:
              result.protectedRaw === null
                ? 'Browser save was removed in another tab.'
                : 'This browser save changed in another tab.',
          };
          setLoadError(
            result.protectedRaw === null
              ? 'Browser save was removed in another tab. Autosave is paused. Export your current workspace before leaving.'
              : 'This browser save changed in another tab. Its newer bytes are kept. Export your work, or import a file or restore the example to replace the active save.',
          );
        }
        setSaveStatus(blockedSaveStatus(stored.current));
        return;
      }
      pendingSave.current = false;
      stored.current = result.state;
      setSaveStatus('Saved in this browser');
    } catch {
      setSaveStatus('Not saved — export to keep your work');
    }
  }, [storageKey]);
  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    if (stored.current.kind === 'blocked') {
      pendingSave.current = false;
      setSaveStatus(blockedSaveStatus(stored.current));
      return;
    }
    pendingSave.current = true;
    setSaveStatus('Saving in this browser…');
    const timer = setTimeout(() => {
      saveTimer.current = null;
      saveNow();
    }, 200);
    saveTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (saveTimer.current === timer) saveTimer.current = null;
    };
  }, [history.present, history.revision, hydratedKey, replacementEpoch, saveNow, storageKey]);
  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    function flushPendingSave() {
      if (!pendingSave.current) return;
      if (saveTimer.current !== null) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      saveNow();
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flushPendingSave();
    }
    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Client-side route changes can unmount this workspace without pagehide.
      // Flush while this workspace's archive and storage key are still available.
      flushPendingSave();
    };
  }, [hydratedKey, saveNow, storageKey]);
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.storageArea !== localStorage) return;
      const before = stored.current;
      const observed = observeExternalStorageChange(before, storageKey, event.key, event.newValue);
      if (observed === before) return;
      stored.current = observed;
      setLoadError(
        event.key === null
          ? 'Browser storage was cleared in another tab. Autosave is paused. Export your current workspace before leaving.'
          : event.newValue === null
            ? 'Browser save was removed in another tab. Autosave is paused. Export your current workspace before leaving.'
            : 'This browser save changed in another tab. Its newer bytes are kept. Export your work, or import a file or restore the example to replace the active save.',
      );
      setSaveStatus(blockedSaveStatus(observed));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);
  const edit = useCallback(
    (
      recipe: (current: WorkspaceArchive) => WorkspaceArchive,
      coalesce?: Extract<WorkspaceAction, { type: 'edit' }>['coalesce'],
    ) => {
      dispatch({ type: 'edit', recipe, coalesce });
    },
    [],
  );
  const endCoalescing = useCallback(() => dispatch({ type: 'end-coalescing' }), []);
  const setDocument = useCallback(
    (recipe: (document: MathDocument) => MathDocument) =>
      edit((current) => ({ ...current, document: recipe(current.document) })),
    [edit],
  );
  const setPositions = useCallback(
    (layout: Positions) => edit((current) => ({ ...current, layout })),
    [edit],
  );
  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);
  const redo = useCallback(() => {
    dispatch({ type: 'redo' });
  }, []);
  const restoreExample = useCallback(() => {
    stored.current = allowExplicitReplacement(stored.current);
    setLoadError('');
    setReplacementEpoch((epoch) => epoch + 1);
    edit(() => createWorkspaceHistory(initialDocument).present);
  }, [edit, initialDocument]);
  const importText = useCallback(
    (text: string) => {
      const result = decodeImportableArchive(text);
      if (result.ok) {
        stored.current = allowExplicitReplacement(stored.current);
        setLoadError('');
        setReplacementEpoch((epoch) => epoch + 1);
        edit(() => result.value);
      }
      return result;
    },
    [edit],
  );
  return {
    document: history.present.document,
    positions: history.present.layout,
    archive: history.present,
    ready: hydratedKey === storageKey,
    saveStatus,
    loadError,
    protectedSaveText: stored.current.kind === 'blocked' ? stored.current.protectedRaw : null,
    protectedSaveKey: stored.current.kind === 'blocked' ? stored.current.protectedKey : null,
    editError: history.editError,
    editErrorId: history.editErrorId,
    setDocument,
    setPositions,
    edit,
    endCoalescing,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    restoreExample,
    importText,
  };
}
