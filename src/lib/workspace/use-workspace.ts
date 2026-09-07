'use client';
// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { type MathDocument } from '../math/model';
import { STORAGE_KEY, type WorkspaceArchive, type Positions } from './archive';
import { createWorkspaceHistory, decodeImportableArchive, workspaceReducer } from './history';

export function useWorkspace() {
  const [history, dispatch] = useReducer(workspaceReducer, undefined, createWorkspaceHistory);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Opening workspace…');
  const [loadError, setLoadError] = useState('');
  const protectStored = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const decoded = decodeImportableArchive(raw);
        if (decoded.ok) dispatch({ type: 'load', value: decoded.value });
        else {
          protectStored.current = true;
          setLoadError(
            'Your browser save could not be read. The example is open; your original save is kept until you make a change.',
          );
        }
      }
    } catch {
      setLoadError('Browser storage is unavailable. You can work here and export a file.');
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (protectStored.current) {
      if (history.revision === 0) {
        setSaveStatus('Original browser save kept');
        return;
      }
      protectStored.current = false;
      setLoadError('');
    }
    setSaveStatus('Saving in this browser…');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
        setSaveStatus('Saved in this browser');
      } catch {
        setSaveStatus('Not saved — export to keep your work');
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [history.present, history.revision, ready]);
  const edit = useCallback((recipe: (current: WorkspaceArchive) => WorkspaceArchive) => {
    dispatch({ type: 'edit', recipe });
  }, []);
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
  const restoreExample = useCallback(() => edit(() => createWorkspaceHistory().present), [edit]);
  const importText = useCallback(
    (text: string) => {
      const result = decodeImportableArchive(text);
      if (result.ok) edit(() => result.value);
      return result;
    },
    [edit],
  );
  return {
    document: history.present.document,
    positions: history.present.layout,
    archive: history.present,
    ready,
    saveStatus,
    loadError,
    editError: history.editError,
    editErrorId: history.editErrorId,
    setDocument,
    setPositions,
    edit,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    restoreExample,
    importText,
  };
}
