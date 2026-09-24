'use client';
// SPDX-License-Identifier: MIT
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Download,
  FilePlus2,
  Layers,
  Link2,
  Plus,
  Pencil,
  MousePointer2,
  Redo2,
  RotateCcw,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NativeSelect } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWorkspace } from '@/lib/workspace/use-workspace';
import { validateArchiveCandidate } from '@/lib/workspace/history';
import { defaultPositions, MAX_ARCHIVE_BYTES } from '@/lib/workspace/archive';
import {
  composeFunctions,
  validateFunction,
  type FiniteFunction,
  type FiniteSet,
} from '@/lib/math/model';
import { cn } from '@/lib/utils';
import { ConstructionDialog } from './construction-dialog';
import { ConceptsDialog } from './concepts-dialog';
import { CompositionDialog } from './composition-dialog';
import { ComparisonResult } from './comparison-result';
import { MappingEditor, signature, elementLabel } from './mapping-editor';
import type { Playground } from '@/lib/library/playgrounds';
import { STORAGE_KEY } from '@/lib/workspace/archive';
import type { ArithmeticCard, InkStroke } from '@/lib/workspace/archive';
import { evaluateArithmetic } from '@/lib/math/arithmetic';
import './canvas-tools.css';
const NO_ARITHMETIC: ArithmeticCard[] = [];
const NO_INK: InkStroke[] = [];
const FunctionCanvas = dynamic(() => import('./function-canvas'), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading" role="status">
      Opening the diagram…
    </div>
  ),
});

function ToolButton({
  label,
  disabled,
  children,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={disabled ? 0 : undefined}>
          <Button variant="outline" disabled={disabled} onClick={onClick} aria-label={label}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
export default function Workspace({ playground }: { playground?: Playground }) {
  const initialPair = playground?.composition
    ? {
        first: playground.composition.firstFunctionId,
        second: playground.composition.secondFunctionId,
      }
    : playground
      ? {
          first: playground.document.functions[0]?.id ?? '',
          second: playground.document.functions[1]?.id ?? '',
        }
      : { first: 'f', second: 'g' };
  const initialSelected = playground?.document.functions.at(-1)?.id ?? 'h';
  const workspace = useWorkspace(
    playground?.document,
    playground ? `${STORAGE_KEY}.example.${playground.id}` : STORAGE_KEY,
  );
  const { document, positions, setDocument, setPositions } = workspace;
  const arithmetic = workspace.archive.arithmetic ?? NO_ARITHMETIC;
  const ink = workspace.archive.ink ?? NO_INK;
  const [mathInput, setMathInput] = useState('');
  const [canvasTool, setCanvasTool] = useState<'move' | 'pencil'>('move');
  const [selectedArithmeticId, setSelectedArithmeticId] = useState<string | null>(null);
  const [arithmeticFocus, setArithmeticFocus] = useState<{ id: string } | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const selectedArithmetic = arithmetic.find((card) => card.id === selectedArithmeticId);
  const arithmeticResult = selectedArithmetic
    ? evaluateArithmetic(selectedArithmetic.expression)
    : null;
  const [selectedId, setSelectedId] = useState(initialSelected);
  const selected = document.functions.find((f) => f.id === selectedId) ?? document.functions[0];
  const [tab, setTab] = useState('diagram');
  const [viewMode, setViewMode] = useState<'all' | 'selected' | 'composite'>('all');
  const [construction, setConstruction] = useState<'collection' | 'function' | null>(null);
  const [conceptsOpen, setConceptsOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compareActive, setCompareActive] = useState(false);
  const [pair, setPair] = useState(initialPair);
  const first = document.functions.find((f) => f.id === pair.first);
  const second = document.functions.find((f) => f.id === pair.second);
  const composed = first && second ? composeFunctions(first, second, document.sets) : null;
  const composite = composed?.ok ? composed.value : undefined;
  const compositionUnavailable = viewMode === 'composite' && !composite;
  const [trace, setTrace] = useState<{ setId: string; elementId: string } | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  useEffect(() => {
    if (workspace.editError) toast.error(workspace.editError);
  }, [workspace.editError, workspace.editErrorId]);
  const inputFile = useRef<HTMLInputElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const validation = selected ? validateFunction(selected, document.sets) : null;
  const inputSet = document.sets.find((s) => s.id === selected?.domainId);
  const selectedSet = document.sets.find((s) => s.id === selectedSetId);
  const chooseFunction = useCallback((id: string) => {
    setSelectedArithmeticId(null);
    setSelectedId(id);
    setSelectedSetId(null);
    setViewMode((mode) => (mode === 'composite' ? 'all' : mode));
  }, []);
  const chooseArithmetic = useCallback((id: string) => {
    setSelectedArithmeticId(id);
    setSelectedSetId(null);
    setCanvasTool('move');
    setTab('diagram');
  }, []);
  const addArithmetic = useCallback(
    (expression: string, position?: { x: number; y: number }) => {
      if (arithmetic.length >= 50) {
        toast.error('This canvas supports up to 50 expressions.');
        return;
      }
      const id = `arithmetic-${crypto.randomUUID()}`;
      workspace.edit((current) => {
        const cards = current.arithmetic ?? [];
        const point = position ?? {
          x: (cards.length % 4) * 340,
          y:
            Math.max(
              600,
              ...current.document.sets.map(
                (set) => (current.layout[set.id]?.y ?? 0) + 200 + set.elements.length * 54,
              ),
            ) +
            Math.floor(cards.length / 4) * 370,
        };
        return {
          ...current,
          version: 2,
          arithmetic: [...cards, { id, expression }],
          layout: { ...current.layout, [id]: point },
        };
      });
      chooseArithmetic(id);
      setArithmeticFocus({ id });
    },
    [arithmetic.length, workspace.edit, chooseArithmetic],
  );
  const changeArithmetic = useCallback(
    (id: string, expression: string) => {
      workspace.edit((current) => ({
        ...current,
        arithmetic: (current.arithmetic ?? []).map((card) =>
          card.id === id ? { ...card, expression } : card,
        ),
      }));
    },
    [workspace.edit],
  );
  const removeArithmetic = useCallback(
    (id: string) => {
      workspace.edit((current) => {
        const layout = { ...current.layout };
        delete layout[id];
        return {
          ...current,
          layout,
          arithmetic: (current.arithmetic ?? []).filter((card) => card.id !== id),
        };
      });
      setSelectedArithmeticId((current) => (current === id ? null : current));
    },
    [workspace.edit],
  );
  const addStroke = useCallback(
    (points: { x: number; y: number }[]) => {
      if (ink.length >= 100) {
        toast.error('This canvas supports 100 strokes. Undo or clear some ink to keep drawing.');
        return;
      }
      const id = `ink-${crypto.randomUUID()}`;
      workspace.edit((current) => ({
        ...current,
        version: 2,
        ink: [...(current.ink ?? []), { id, points }],
      }));
    },
    [ink.length, workspace.edit],
  );
  const changeMapping = useCallback(
    (id: string, input: string, output: string) => {
      setDocument((doc) => ({
        ...doc,
        functions: doc.functions.map((fn) => {
          if (fn.id !== id) return fn;
          const domain = doc.sets.find((s) => s.id === fn.domainId);
          const codomain = doc.sets.find((s) => s.id === fn.codomainId);
          if (
            !domain?.elements.some((e) => e.id === input) ||
            (output && !codomain?.elements.some((e) => e.id === output))
          )
            return fn;
          const mapping = { ...fn.mapping };
          if (output) mapping[input] = output;
          else delete mapping[input];
          return { ...fn, mapping };
        }),
      }));
    },
    [setDocument],
  );
  function addCollection(set: FiniteSet) {
    const next = { ...document, sets: [...document.sets, set] };
    const candidate = validateArchiveCandidate({
      ...workspace.archive,
      document: next,
      layout: { ...positions, [set.id]: defaultPositions(next)[set.id] },
    });
    if (!candidate.ok) {
      toast.error(candidate.errors.join(' '));
      return false;
    }
    workspace.edit(() => candidate.value);
    setSelectedSetId(set.id);
    setTab('diagram');
    toast.success(`${set.name} is in your workspace.`);
    return true;
  }
  function addFunction(fn: FiniteFunction) {
    const candidate = validateArchiveCandidate({
      ...workspace.archive,
      document: { ...document, functions: [...document.functions, fn] },
    });
    if (!candidate.ok) {
      toast.error(candidate.errors.join(' '));
      return false;
    }
    workspace.edit(() => candidate.value);
    chooseFunction(fn.id);
    setViewMode('selected');
    toast.success(`${fn.name} is ready to edit.`);
    return true;
  }
  const exportWorkspace = useCallback(() => {
    const blob = new Blob([JSON.stringify(workspace.archive)], { type: 'application/json' });
    if (blob.size > MAX_ARCHIVE_BYTES) {
      toast.error('This workspace exceeds the 2 MB file limit. Reduce its size before exporting.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = 'wolfbone.workspace.json';
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Workspace exported: mathematics and layout.');
  }, [workspace.archive]);
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_ARCHIVE_BYTES) {
      toast.error('Choose a workspace smaller than 2 MB.');
      return;
    }
    try {
      const result = workspace.importText(await file.text());
      if (result.ok) {
        setArithmeticFocus(null);
        setFitRequest((value) => value + 1);
        setSelectedId(result.value.document.functions[0]?.id ?? '');
        setPair({
          first: result.value.document.functions[0]?.id ?? '',
          second: result.value.document.functions[1]?.id ?? '',
        });
        setSelectedSetId(null);
        setSelectedArithmeticId(null);
        setTrace(null);
        setCompareActive(false);
        setViewMode('all');
        toast.success('Workspace imported.');
      } else toast.error(result.errors.slice(0, 3).join(' '));
    } catch {
      toast.error('This file could not be read. Your workspace has been kept.');
    }
  }
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) workspace.redo();
        else workspace.undo();
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        exportWorkspace();
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [workspace.undo, workspace.redo, exportWorkspace]);
  function reset() {
    setArithmeticFocus(null);
    setFitRequest((value) => value + 1);
    workspace.restoreExample();
    setSelectedId(initialSelected);
    setPair(initialPair);
    setSelectedSetId(null);
    setSelectedArithmeticId(null);
    setTrace(null);
    setViewMode('all');
    setCompareActive(false);
    toast('Example opened.');
  }
  function library() {
    return (
      <>
        <div className="library-top">
          <h2>In this workspace</h2>
          <p>Numbers, sketches, collections & functions</p>
          {playground && (
            <details className="starting-example">
              <summary>About this starting example</summary>
              <p>{playground.context}</p>
              <strong>Things to try</strong>
              <ol>
                {playground.tryThis.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>
                These notes describe the starting example. Your edits can change its properties.
              </p>
            </details>
          )}
        </div>
        <section className="library-section canvas-number-library">
          <h3>Numbers & expressions</h3>
          <p className="canvas-number-hint">Click or drag a number onto the canvas.</p>
          <div className="canvas-number-palette">
            {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                draggable
                aria-label={`Add number ${digit} to canvas`}
                onClick={() => addArithmetic(digit)}
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-wolfbone-expression', digit);
                  event.dataTransfer.effectAllowed = 'copy';
                }}
              >
                {digit}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="new-object"
            onClick={() => addArithmetic('')}
            disabled={arithmetic.length >= 50}
          >
            <Plus />
            New expression
          </Button>
          <div className="object-list">
            {arithmetic.map((card) => (
              <button
                key={card.id}
                className={cn('library-item', selectedArithmeticId === card.id && 'is-active')}
                aria-label={`Find expression ${card.expression || 'blank'}`}
                onClick={() => {
                  chooseArithmetic(card.id);
                  setArithmeticFocus({ id: card.id });
                }}
              >
                <span className="math canvas-expression-name">
                  {card.expression || 'Write here…'}
                </span>
              </button>
            ))}
          </div>
        </section>
        <Separator />
        <section className="library-section">
          <h3>Collections</h3>
          <div className="object-list">
            {document.sets.map((s) => (
              <button
                key={s.id}
                className={cn('library-item', selectedSetId === s.id && 'is-active')}
                onClick={() => {
                  setSelectedArithmeticId(null);
                  setSelectedSetId(s.id);
                  setTrace(null);
                }}
                aria-pressed={selectedSetId === s.id}
              >
                <span className="object-symbol math" aria-hidden="true">
                  {s.name.slice(0, 2)}
                </span>
                <span>
                  <strong>{s.name}</strong>
                  <small>
                    {s.elements.length} {s.elements.length === 1 ? 'element' : 'elements'}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="new-object"
            onClick={() => setConstruction('collection')}
            disabled={document.sets.length >= 20}
            title={
              document.sets.length >= 20
                ? 'The first workspace supports up to 20 collections.'
                : 'Create a finite collection.'
            }
          >
            <Plus data-icon="inline-start" />
            New collection
          </Button>
        </section>
        <Separator />
        <section className="library-section">
          <h3>Functions</h3>
          <div className="object-list">
            {document.functions.map((fn) => (
              <button
                key={fn.id}
                className={cn(
                  'library-item',
                  selected?.id === fn.id && !selectedSet && 'is-active',
                )}
                onClick={() => chooseFunction(fn.id)}
                aria-pressed={selected?.id === fn.id && !selectedSet}
              >
                <span className="object-symbol math" aria-hidden="true">
                  {fn.name.slice(0, 2)}
                </span>
                <span>
                  <strong className="math">{signature(fn, document)}</strong>
                  <small>
                    {validateFunction(fn, document.sets).valid
                      ? 'Complete function'
                      : 'Construction in progress'}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="new-object"
            onClick={() => setConstruction('function')}
            disabled={!document.sets.length || document.functions.length >= 50}
            title={
              !document.sets.length
                ? 'Create a collection first.'
                : document.functions.length >= 50
                  ? 'The first workspace supports up to 50 functions.'
                  : 'Choose a domain and codomain.'
            }
          >
            <Plus data-icon="inline-start" />
            New function
          </Button>
        </section>
        <div className="library-bottom">
          <Button variant="ghost" asChild>
            <Link href="/explore">
              <BookOpen data-icon="inline-start" />
              Explore mathematics
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => setConceptsOpen(true)}>
            <BookOpen data-icon="inline-start" />
            Explore concepts
          </Button>
          <Button variant="ghost" onClick={() => setConceptsOpen(true)}>
            <Link2 data-icon="inline-start" />
            Context & sources
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw data-icon="inline-start" />
            Restore example
          </Button>
        </div>
      </>
    );
  }
  if (!workspace.ready)
    return (
      <main className="opening-workspace">
        <h1>WOLFBONE</h1>
        <p role="status">Opening your mathematical workspace…</p>
      </main>
    );
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={250}>
        <div className="wolfbone-app">
          <a href="#main-workspace" className="skip-link">
            Skip to workspace
          </a>
          <a href="#function-inspector" className="skip-link">
            Skip to function controls
          </a>
          <header className="app-header">
            <div className="brand">
              <span className="wordmark">WOLFBONE</span>
              <span className="brand-by">by atmai</span>
            </div>
            <span className="workspace-name">{document.title}</span>
            <div className="header-actions">
              <Button variant="outline" asChild className="workspace-explore-link">
                <Link href="/explore">
                  <BookOpen />
                  <span className="button-word">Explore mathematics</span>
                </Link>
              </Button>
              <ToolButton
                label={
                  workspace.canUndo ? 'Undo last change (⌘Z / Ctrl+Z)' : 'No change to undo yet'
                }
                disabled={!workspace.canUndo}
                onClick={workspace.undo}
              >
                <Undo2 data-icon="inline-start" />
                <span className="button-word">Undo</span>
              </ToolButton>
              <ToolButton
                label={workspace.canRedo ? 'Redo change (⇧⌘Z / Ctrl+Shift+Z)' : 'No change to redo'}
                disabled={!workspace.canRedo}
                onClick={workspace.redo}
              >
                <Redo2 data-icon="inline-start" />
                <span className="button-word">Redo</span>
              </ToolButton>
              <ToolButton
                label="Import a Wolfbone JSON file"
                onClick={() => inputFile.current?.click()}
              >
                <Upload data-icon="inline-start" />
                <span className="button-word">Import</span>
              </ToolButton>
              <ToolButton label="Export workspace (⌘S / Ctrl+S)" onClick={exportWorkspace}>
                <Download data-icon="inline-start" />
                <span className="button-word">Export</span>
              </ToolButton>
              <input
                className="sr-only"
                tabIndex={-1}
                type="file"
                accept=".json,application/json"
                ref={inputFile}
                aria-label="Import workspace file"
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </header>
          {workspace.loadError ? (
            <Alert className="storage-alert">
              <AlertDescription>{workspace.loadError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="workspace-grid">
            <aside className="library" aria-label="Workspace library">
              {library()}
            </aside>
            <details className="mobile-library">
              <summary>
                <Layers />
                In this workspace <span>{document.sets.length} collections</span>
              </summary>
              {library()}
            </details>
            <main id="main-workspace" className="main-workspace" tabIndex={-1}>
              <Tabs value={tab} onValueChange={setTab} className="workspace-tabs">
                <div className="workspace-toolbar">
                  <div>
                    <h1>Make room for a thought.</h1>
                    <p>Type, draw, and move things around.</p>
                  </div>
                  <div className="view-actions">
                    <TabsList aria-label="Representation">
                      <TabsTrigger value="diagram">Diagram</TabsTrigger>
                      <TabsTrigger value="table">Table</TabsTrigger>
                    </TabsList>
                    <Button onClick={() => setComposeOpen(true)} className="compose-button">
                      <span className="math" aria-hidden="true">
                        ∘
                      </span>
                      Compose
                    </Button>
                  </div>
                </div>
                <div className="canvas-writing-tools" aria-label="Canvas writing tools">
                  <div className="canvas-tool-choice">
                    <Button
                      variant="outline"
                      aria-pressed={canvasTool === 'move'}
                      onClick={() => {
                        setCanvasTool('move');
                        setTab('diagram');
                      }}
                    >
                      <MousePointer2 />
                      Move
                    </Button>
                    <Button
                      variant="outline"
                      aria-pressed={canvasTool === 'pencil'}
                      onClick={() => {
                        setCanvasTool('pencil');
                        setTab('diagram');
                      }}
                    >
                      <Pencil />
                      Pencil
                    </Button>
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (mathInput.trim()) {
                        addArithmetic(mathInput);
                        setMathInput('');
                      }
                    }}
                  >
                    <input
                      aria-label="Math to add to canvas"
                      placeholder="Type 2 + 2…"
                      value={mathInput}
                      maxLength={512}
                      onChange={(event) => setMathInput(event.target.value)}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={!mathInput.trim() || arithmetic.length >= 50}
                    >
                      Add to canvas
                    </Button>
                  </form>
                  {ink.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => workspace.edit((current) => ({ ...current, ink: [] }))}
                    >
                      Clear ink
                    </Button>
                  )}
                </div>
                <div className="canvas-context">
                  <label htmlFor="canvas-scope">Show</label>
                  <NativeSelect
                    id="canvas-scope"
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
                  >
                    <option value="all">All functions</option>
                    <option value="selected">Selected function</option>
                    {composite || viewMode === 'composite' ? (
                      <option value="composite">
                        {composite ? `Composition: ${composite.name}` : 'Composition unavailable'}
                      </option>
                    ) : null}
                  </NativeSelect>
                  <span>
                    {viewMode === 'composite'
                      ? composite
                        ? `Computed from ${first?.name}, then ${second?.name}`
                        : 'Needs complete, composable functions'
                      : selected
                        ? `Editing ${selected.name}`
                        : 'Create your first function'}
                  </span>
                </div>
                {compositionUnavailable ? (
                  <Alert className="composition-unavailable" role="status">
                    <AlertDescription>
                      <strong>Composition unavailable.</strong>{' '}
                      {composed && !composed.ok
                        ? composed.errors.join(' ')
                        : 'Choose both source functions.'}{' '}
                      Both views will show the result when these requirements are met.
                    </AlertDescription>
                    <Button variant="outline" onClick={() => setComposeOpen(true)}>
                      Inspect source functions
                    </Button>
                  </Alert>
                ) : null}
                <TabsContent value="diagram" className="diagram-panel">
                  <FunctionCanvas
                    document={document}
                    selectedFunctionId={selected?.id ?? ''}
                    positions={positions}
                    onPositionsChange={setPositions}
                    onSelectFunction={chooseFunction}
                    onMappingChange={changeMapping}
                    trace={trace}
                    onTrace={setTrace}
                    composite={composite}
                    viewMode={viewMode}
                    arithmetic={arithmetic}
                    ink={ink}
                    drawing={canvasTool === 'pencil'}
                    focusRequest={arithmeticFocus}
                    fitRequest={fitRequest}
                    onAddArithmetic={addArithmetic}
                    onChangeArithmetic={changeArithmetic}
                    onRemoveArithmetic={removeArithmetic}
                    onSelectArithmetic={chooseArithmetic}
                    onStroke={addStroke}
                  />
                </TabsContent>
                <TabsContent value="table" className="table-panel">
                  <div className="table-heading">
                    <h2>The same functions, in full.</h2>
                    <p>
                      {viewMode === 'composite'
                        ? 'The computed mapping follows the selected source functions. Edit those sources in the inspector or show all functions.'
                        : 'Change an output here. Its connection changes on the diagram too.'}
                    </p>
                  </div>
                  <div className="function-tables">
                    {(viewMode === 'composite'
                      ? composite
                        ? [composite]
                        : []
                      : viewMode === 'selected' && selected
                        ? [selected]
                        : document.functions
                    ).map((fn) => (
                      <section className="function-table" key={fn.id}>
                        <h3 className="math">{signature(fn, document)}</h3>
                        {fn === composite ? (
                          <div className="data-table-wrap">
                            <table className="data-table">
                              <caption>Computed composition</caption>
                              <thead>
                                <tr>
                                  <th>Input</th>
                                  <th>Output</th>
                                </tr>
                              </thead>
                              <tbody>
                                {document.sets
                                  .find((s) => s.id === fn.domainId)
                                  ?.elements.map((e) => (
                                    <tr key={e.id}>
                                      <th>{e.label}</th>
                                      <td>
                                        {elementLabel(document, fn.codomainId, fn.mapping[e.id])}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <MappingEditor
                            fn={fn}
                            document={document}
                            onChange={changeMapping}
                            prefix="Table "
                          />
                        )}
                      </section>
                    ))}
                  </div>
                  {!document.functions.length ? (
                    <p>Create a function from the workspace library to begin.</p>
                  ) : null}
                </TabsContent>
                <div className="canvas-footer">
                  {trace ? (
                    <>
                      <span>
                        Following{' '}
                        <strong>{elementLabel(document, trace.setId, trace.elementId)}</strong> from{' '}
                        {document.sets.find((s) => s.id === trace.setId)?.name}. Connected paths are
                        highlighted.
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Clear traced path"
                        onClick={() => setTrace(null)}
                      >
                        <X />
                      </Button>
                    </>
                  ) : (
                    <span>
                      {canvasTool === 'pencil'
                        ? 'Draw with your mouse or stylus. Undo removes the last stroke. Handwriting stays as ink.'
                        : 'Double-click the grid to write. Drag a card by its heading. Use Pencil to sketch.'}
                    </span>
                  )}
                </div>
              </Tabs>
            </main>
            <aside
              className="inspector"
              id="function-inspector"
              tabIndex={-1}
              ref={inspector}
              aria-label="Function inspector"
            >
              <motion.div
                key={selectedArithmetic?.id ?? selectedSet?.id ?? selected?.id ?? 'empty'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.16 }}
              >
                {selectedArithmetic ? (
                  <>
                    <p className="inspector-label">On your canvas</p>
                    <h2 className="math inspector-title">
                      {selectedArithmetic.expression || 'A new expression'}
                    </h2>
                    <p className="muted inspector-description">
                      Edit the card directly. Its answer updates as you type.
                    </p>
                    {arithmeticResult?.ok && (
                      <div className="ink-bay">
                        <h3>Result</h3>
                        <p className="math canvas-inspector-result">{arithmeticResult.formatted}</p>
                      </div>
                    )}
                    <Separator />
                    <h3>Things to try</h3>
                    <ul className="canvas-math-tips">
                      <li>Change a number or an operation.</li>
                      <li>Try brackets: (2 + 2) × 3.</li>
                      <li>Open “Explore this number” on the card.</li>
                      <li>Use Pencil to sketch beside it.</li>
                    </ul>
                    <p className="muted">
                      Addition, subtraction, multiplication, division, and exact fractions are
                      supported.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => removeArithmetic(selectedArithmetic.id)}
                    >
                      Remove expression
                    </Button>
                  </>
                ) : selectedSet ? (
                  <>
                    <p className="inspector-label">Inspect a collection</p>
                    <h2 className="math inspector-title">{selectedSet.name}</h2>
                    <Separator />
                    <h3>Elements</h3>
                    <div className="element-roster">
                      {selectedSet.elements.map((e) => (
                        <Button
                          key={e.id}
                          variant="outline"
                          title={`Element identity: ${e.id}`}
                          onClick={() => {
                            setTrace({ setId: selectedSet.id, elementId: e.id });
                            setTab('diagram');
                          }}
                        >
                          {e.label}
                          <ArrowRight data-icon="inline-end" />
                        </Button>
                      ))}
                    </div>
                    {!selectedSet.elements.length ? (
                      <p className="muted">An empty collection has no elements.</p>
                    ) : null}
                    <div className="ink-bay">
                      <h3>{selectedSet.elements.length} distinct identities</h3>
                      <p>
                        Each element belongs to this declared collection. Its position on the canvas
                        is a separate choice.
                      </p>
                    </div>
                    <details className="context-details">
                      <summary>Inspect identity</summary>
                      <p className="math break-anywhere">Collection ID: {selectedSet.id}</p>
                      <p>
                        The label is {selectedSet.name}. Equal labels in different collections do
                        not identify the same mathematical object.
                      </p>
                    </details>
                  </>
                ) : selected ? (
                  <>
                    <p className="inspector-label">Inspect a function</p>
                    <h2 className="math inspector-title">{signature(selected, document)}</h2>
                    <p className="muted inspector-description">Assign one output to every input.</p>
                    <Separator />
                    <div className="mapping-heading">
                      <h3>Mappings</h3>
                      <span className="mono-small">
                        {(inputSet?.elements.length ?? 0) - (validation?.missing.length ?? 0)} /{' '}
                        {inputSet?.elements.length ?? 0} assigned
                      </span>
                    </div>
                    <MappingEditor fn={selected} document={document} onChange={changeMapping} />
                    <Button
                      variant="outline"
                      className="compare-button"
                      onClick={() => {
                        if (composite) {
                          setCompareActive(true);
                        } else {
                          setComposeOpen(true);
                        }
                        setSelectedSetId(null);
                      }}
                    >
                      Compare with composition
                    </Button>
                    {compareActive && composite ? (
                      <>
                        <ComparisonResult left={selected} right={composite} document={document} />
                        <Button
                          variant="ghost"
                          className="choose-pair"
                          onClick={() => setComposeOpen(true)}
                        >
                          Using {first?.name}, then {second?.name}{' '}
                          <ArrowUpRight data-icon="inline-end" />
                        </Button>
                      </>
                    ) : (
                      <section className="ink-bay function-status" aria-live="polite">
                        <div className="result-heading">
                          {validation?.valid ? (
                            <CheckCircle2 aria-hidden="true" />
                          ) : (
                            <CircleAlert aria-hidden="true" />
                          )}
                          <h3>
                            {validation?.valid
                              ? 'A complete function'
                              : 'A construction in progress'}
                          </h3>
                        </div>
                        <p>
                          {validation?.valid
                            ? 'Every input has exactly one output. Try comparing this function with a two-step path.'
                            : `${validation?.missing.length} ${validation?.missing.length === 1 ? 'input still needs' : 'inputs still need'} an output. Choose one above or connect it on the canvas.`}
                        </p>
                      </section>
                    )}
                    <details className="context-details">
                      <summary>Context & checking</summary>
                      <p>
                        Finite, explicitly listed collections. Input and output identities belong to
                        this document.
                      </p>
                      <p>
                        This is an editable construction. Completeness and comparison are evaluated
                        over the listed inputs; no external prover is connected.
                      </p>
                      <p className="math break-anywhere">Function ID: {selected.id}</p>
                      <Button variant="link" onClick={() => setConceptsOpen(true)}>
                        Explore the underlying concepts
                      </Button>
                    </details>
                  </>
                ) : (
                  <>
                    <h2>Make a first construction.</h2>
                    <p>
                      Create a collection, then a function with a declared input and output
                      collection.
                    </p>
                    <Button onClick={() => setConstruction('collection')}>
                      <FilePlus2 data-icon="inline-start" />
                      New collection
                    </Button>
                  </>
                )}
              </motion.div>
            </aside>
          </div>
          <footer className="app-footer">
            <span role="status">
              <span className="save-marker" aria-hidden="true" />
              {workspace.saveStatus}
            </span>
            <span>
              Canvas workspace <span aria-hidden="true">·</span> v0.2
            </span>
          </footer>
          {construction ? (
            <ConstructionDialog
              key={construction}
              kind={construction}
              document={document}
              onClose={() => setConstruction(null)}
              onCollection={addCollection}
              onFunction={addFunction}
            />
          ) : null}
          <ConceptsDialog open={conceptsOpen} onClose={() => setConceptsOpen(false)} />
          <CompositionDialog
            open={composeOpen}
            onClose={() => setComposeOpen(false)}
            document={document}
            firstId={first?.id ?? ''}
            secondId={second?.id ?? ''}
            onPairChange={(first, second) => setPair({ first, second })}
            onShow={() => {
              setViewMode('composite');
              setTab('diagram');
              setSelectedSetId(null);
              setCompareActive(true);
            }}
            onAdd={addFunction}
          />
          <Toaster position="bottom-right" theme="light" closeButton />
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
