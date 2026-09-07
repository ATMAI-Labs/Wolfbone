'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  useUpdateNodeInternals,
  useViewport,
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  EdgeProps,
  IsValidConnection,
  Node,
  NodeProps,
  OnEdgesChange,
  OnNodesChange,
  Rect,
} from '@xyflow/react';
import { validateFunction } from '@/lib/math/model';
import type { FiniteFunction, FiniteSet, MathDocument } from '@/lib/math/model';
import '@xyflow/react/dist/style.css';
import './canvas.css';

type Point = { x: number; y: number };
type Positions = Record<string, Point>;
type Trace = { setId: string; elementId: string } | null;

export type FunctionCanvasProps = {
  document: MathDocument;
  selectedFunctionId: string;
  positions: Positions;
  onPositionsChange: (positions: Positions) => void;
  onSelectFunction: (id: string) => void;
  onMappingChange: (functionId: string, inputId: string, outputId: string) => void;
  trace: Trace;
  onTrace: (trace: Trace) => void;
  composite?: FiniteFunction;
  viewMode: 'all' | 'selected' | 'composite';
};

const NODE_WIDTH = 176;
const HEADER_HEIGHT = 72;
const ROW_HEIGHT = 54;
const FOOTER_HEIGHT = 42;
const POSITION_LIMIT = 100_000;
const MIN_ZOOM = 0.001;
const INK = '#737370';
const SIGNAL = '#6c2bee';
const pairKey = (first: string, second: string) => JSON.stringify([first, second]);
// React Flow interpolates view IDs into selectors. Keep mathematical IDs intact in the document.
const selectorId = (id: string) =>
  id.replace(
    /[^a-zA-Z0-9_-]/g,
    (character) => `%${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
const canvasNodeId = (id: string) => selectorId(id);
const sourceHandle = (id: string) => `out:${selectorId(id)}`;
const targetHandle = (id: string) => `in:${selectorId(id)}`;
const canvasEdgeId = (functionId: string, inputId: string) =>
  `mapping:${selectorId(functionId)}:${selectorId(inputId)}`;
const boundPosition = (value: number) =>
  Number.isFinite(value) ? Math.min(POSITION_LIMIT, Math.max(-POSITION_LIMIT, value)) : 0;
const nodeHeight = (set: FiniteSet) =>
  HEADER_HEIGHT + Math.max(1, set.elements.length) * ROW_HEIGHT + FOOTER_HEIGHT;

type CollectionData = {
  set: FiniteSet;
  activeFunction?: FiniteFunction;
  canStart: boolean;
  canEnd: boolean;
  missing: Set<string>;
  status: string;
  tracedElements: Set<string>;
  pendingInput: Trace;
  onTrace: (trace: Trace) => void;
  onKeyboardHandle: (kind: 'source' | 'target', setId: string, elementId: string) => void;
};
type CollectionNode = Node<CollectionData, 'collection'>;

type MappingData = {
  functionId: string;
  label: string;
  active: boolean;
  traced: boolean;
  direct: boolean;
  laneY: number;
  laneIndex: number;
  inputIndex: number;
  parallelOffset: number;
  onSelect?: (id: string) => void;
};
type MappingEdge = Edge<MappingData, 'mapping'>;

const Collection = memo(function Collection({ id, data, selected }: NodeProps<CollectionNode>) {
  const setId = data.set.id;
  const updateNodeInternals = useUpdateNodeInternals();
  const handleSignature = JSON.stringify(data.set.elements.map((element) => element.id));

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handleSignature, updateNodeInternals]);

  const handleKey = (
    event: KeyboardEvent<HTMLDivElement>,
    kind: 'source' | 'target',
    elementId: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      data.onKeyboardHandle(kind, setId, elementId);
    }
  };

  return (
    <div className={`function-collection${selected ? ' function-collection--selected' : ''}`}>
      <header className="function-collection__header" title="Drag to arrange this collection">
        <div className="function-collection__eyebrow">Collection</div>
        <div className="function-collection__heading">
          <strong title={data.set.name}>{data.set.name}</strong>
          <span>
            {data.set.elements.length} {data.set.elements.length === 1 ? 'element' : 'elements'}
          </span>
        </div>
      </header>
      <div className="function-collection__elements">
        {data.set.elements.length === 0 && (
          <div className="function-collection__empty">Empty collection ∅</div>
        )}
        {data.set.elements.map((element) => {
          const traced = data.tracedElements.has(pairKey(setId, element.id));
          const unassigned = data.canStart && data.missing.has(element.id);
          const pending =
            data.pendingInput?.setId === setId && data.pendingInput.elementId === element.id;
          return (
            <div
              key={element.id}
              className={`function-collection__row${traced ? ' function-collection__row--traced' : ''}${unassigned ? ' function-collection__row--unassigned' : ''}`}
            >
              <Handle
                id={targetHandle(element.id)}
                type="target"
                position={Position.Left}
                className="function-port function-port--target"
                isConnectable={data.canEnd}
                isConnectableStart={false}
                isConnectableEnd={data.canEnd}
                role="button"
                tabIndex={data.canEnd ? 0 : -1}
                aria-disabled={!data.canEnd}
                aria-label={`Map to ${element.label} in ${data.set.name}${data.activeFunction ? ` using ${data.activeFunction.name}` : ''}`}
                title={
                  data.canEnd
                    ? `Connect an input to ${element.label}`
                    : 'Choose a function ending at this collection to connect here'
                }
                onKeyDown={(event) => handleKey(event, 'target', element.id)}
              />
              <button
                type="button"
                className="function-collection__element nodrag nopan"
                onClick={() => data.onTrace({ setId, elementId: element.id })}
                onKeyDown={(event) => event.stopPropagation()}
                aria-label={`Trace ${element.label} in collection ${data.set.name}${unassigned ? ', unassigned input' : ''}`}
                aria-pressed={traced}
                title={`Follow the mappings from ${element.label}`}
              >
                <span className="function-collection__element-label">{element.label}</span>
                {unassigned ? (
                  <span className="function-collection__unassigned">unassigned</span>
                ) : traced ? (
                  <span className="function-collection__trace-mark">trace</span>
                ) : null}
              </button>
              <Handle
                id={sourceHandle(element.id)}
                type="source"
                position={Position.Right}
                className={`function-port function-port--source${pending ? ' function-port--pending' : ''}`}
                isConnectable={data.canStart}
                isConnectableStart={data.canStart}
                isConnectableEnd={false}
                role="button"
                tabIndex={data.canStart ? 0 : -1}
                aria-disabled={!data.canStart}
                aria-pressed={pending}
                aria-label={`Choose ${element.label} in ${data.set.name} as input${data.activeFunction ? ` for ${data.activeFunction.name}` : ''}`}
                title={
                  data.canStart
                    ? `Connect ${element.label} to an output; Enter starts a keyboard connection`
                    : 'Choose a function starting at this collection to connect here'
                }
                onKeyDown={(event) => handleKey(event, 'source', element.id)}
              />
            </div>
          );
        })}
      </div>
      <footer className="function-collection__footer" title={data.status}>
        {data.status}
      </footer>
    </div>
  );
});

const Mapping = memo(function Mapping(props: EdgeProps<MappingEdge>) {
  const { data, sourceX, sourceY, targetX, targetY, markerEnd, id } = props;
  if (!data) return null;
  let [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    curvature: 0.3,
  });

  if (data.direct) {
    // These are drawing coordinates only. The edge still joins the exact two handles.
    const exit = 24 + (data.laneIndex % 4) * 8;
    const turn = 22;
    const left = sourceX + exit;
    const right = targetX - exit;
    path = `M ${sourceX} ${sourceY} C ${left} ${sourceY}, ${left} ${data.laneY}, ${left + turn} ${data.laneY} L ${right - turn} ${data.laneY} C ${right} ${data.laneY}, ${right} ${targetY}, ${targetX} ${targetY}`;
    labelX = (left + right) / 2;
    labelY = data.laneY;
  } else {
    if (data.parallelOffset !== 0) {
      const controlWidth = Math.max(24, Math.abs(targetX - sourceX) * 0.42);
      path = `M ${sourceX} ${sourceY} C ${sourceX + controlWidth} ${sourceY + data.parallelOffset}, ${targetX - controlWidth} ${targetY + data.parallelOffset}, ${targetX} ${targetY}`;
      labelX = (sourceX + targetX) / 2;
      labelY = (sourceY + targetY) / 2 + data.parallelOffset * 0.75;
    }
    // Stagger labels where distinct inputs converge on the same output.
    labelX += ((data.inputIndex % 3) - 1) * 18;
    labelY += data.inputIndex % 2 === 0 ? -11 : 11;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={22}
        style={{
          stroke: data.active ? SIGNAL : INK,
          strokeWidth: data.traced ? 3 : data.active ? 2 : 1.5,
          strokeDasharray: data.direct ? '6 5' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        {data.onSelect ? (
          <button
            type="button"
            className={`function-mapping-label nodrag nopan${data.active ? ' function-mapping-label--active' : ''}${data.traced ? ' function-mapping-label--traced' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onClick={() => data.onSelect?.(data.functionId)}
            aria-label={`Select function ${data.functionId}: ${data.label}${data.direct ? '; direct route' : ''}`}
            aria-pressed={data.active}
          >
            {data.label}
          </button>
        ) : (
          <span
            className={`function-mapping-label function-mapping-label--inspection${data.active ? ' function-mapping-label--active' : ''}${data.traced ? ' function-mapping-label--traced' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            aria-label={`Computed mapping: ${data.label}`}
          >
            {data.label}
          </span>
        )}
      </EdgeLabelRenderer>
    </>
  );
});

const nodeTypes = { collection: Collection };
const edgeTypes = { mapping: Mapping };

function CanvasControls({ bounds }: { bounds: Rect }) {
  const { zoomIn, zoomOut, fitBounds } = useReactFlow();
  const { zoom } = useViewport();
  return (
    <Panel
      position="bottom-left"
      className="function-canvas__controls nodrag nopan"
      aria-label="Canvas view controls"
    >
      <button
        type="button"
        onClick={() => void zoomOut({ duration: 0 })}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Zoom out"
        title="Zoom out"
      >
        −
      </button>
      <output aria-label="Current zoom">
        {zoom < 0.1 ? (zoom * 100).toFixed(1) : Math.round(zoom * 100)}%
      </output>
      <button
        type="button"
        onClick={() => void zoomIn({ duration: 0 })}
        disabled={zoom >= 2}
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        className="function-canvas__fit"
        onClick={() => void fitBounds(bounds, { padding: 0.06, duration: 0 })}
        aria-label="Fit all collections and arrows in view"
      >
        Fit view
      </button>
    </Panel>
  );
}

function Canvas({
  document,
  selectedFunctionId,
  positions,
  onPositionsChange,
  onSelectFunction,
  onMappingChange,
  trace,
  onTrace,
  composite,
  viewMode,
}: FunctionCanvasProps) {
  const [localPositions, setLocalPositions] = useState<Positions>(positions);
  const positionsRef = useRef(localPositions);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(() => new Set());
  const [pendingInput, setPendingInput] = useState<Trace>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const activeFunction = document.functions.find((fn) => fn.id === selectedFunctionId);
  const editable = viewMode !== 'composite' && Boolean(activeFunction);
  const visibleFunctions = useMemo(() => {
    if (viewMode === 'composite') return composite ? [composite] : [];
    if (viewMode === 'selected') return activeFunction ? [activeFunction] : [];
    return document.functions;
  }, [activeFunction, composite, document.functions, viewMode]);

  useEffect(() => {
    positionsRef.current = positions;
    setLocalPositions(positions);
  }, [positions]);

  useEffect(() => {
    setPendingInput(null);
    setConnectionMessage('');
  }, [selectedFunctionId, viewMode, document.sets]);

  const layout = useMemo(
    () =>
      document.sets.map((set, index) => ({
        set,
        position: localPositions[set.id] ?? { x: index * 340, y: 120 },
      })),
    [document.sets, localPositions],
  );

  const traceState = useMemo(() => {
    const elements = new Set<string>();
    const mappings = new Set<string>();
    const queue = trace ? [trace] : [];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const key = pairKey(current.setId, current.elementId);
      if (elements.has(key)) continue;
      elements.add(key);
      for (const fn of visibleFunctions) {
        if (fn.domainId !== current.setId || !Object.hasOwn(fn.mapping, current.elementId))
          continue;
        const outputId = fn.mapping[current.elementId];
        if (
          !document.sets
            .find((set) => set.id === fn.codomainId)
            ?.elements.some((element) => element.id === outputId)
        )
          continue;
        mappings.add(pairKey(fn.id, current.elementId));
        queue.push({ setId: fn.codomainId, elementId: outputId });
      }
    }
    return { elements, mappings };
  }, [document.sets, trace, visibleFunctions]);

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      if (
        !editable ||
        !activeFunction ||
        connection.source !== canvasNodeId(activeFunction.domainId) ||
        connection.target !== canvasNodeId(activeFunction.codomainId)
      )
        return false;
      const domain = document.sets.find((set) => set.id === activeFunction.domainId);
      const codomain = document.sets.find((set) => set.id === activeFunction.codomainId);
      return Boolean(
        domain?.elements.some((element) => sourceHandle(element.id) === connection.sourceHandle) &&
        codomain?.elements.some((element) => targetHandle(element.id) === connection.targetHandle),
      );
    },
    [activeFunction, document.sets, editable],
  );

  const connect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection) || !activeFunction) return;
      const input = document.sets
        .find((set) => canvasNodeId(set.id) === connection.source)
        ?.elements.find((element) => sourceHandle(element.id) === connection.sourceHandle);
      const output = document.sets
        .find((set) => canvasNodeId(set.id) === connection.target)
        ?.elements.find((element) => targetHandle(element.id) === connection.targetHandle);
      if (!input || !output) return;
      onMappingChange(activeFunction.id, input.id, output.id);
      setPendingInput(null);
      setConnectionMessage(`${activeFunction.name} now maps ${input.label} to ${output.label}.`);
    },
    [activeFunction, document.sets, isValidConnection, onMappingChange],
  );

  const onKeyboardHandle = useCallback(
    (kind: 'source' | 'target', setId: string, elementId: string) => {
      if (!editable || !activeFunction) return;
      if (kind === 'source' && setId === activeFunction.domainId) {
        setPendingInput({ setId, elementId });
        const label =
          document.sets
            .find((set) => set.id === setId)
            ?.elements.find((element) => element.id === elementId)?.label ?? elementId;
        const target =
          document.sets.find((set) => set.id === activeFunction.codomainId)?.name ??
          activeFunction.codomainId;
        setConnectionMessage(
          `Input ${label} selected for ${activeFunction.name}. Tab to an output handle in ${target} and press Enter. Escape cancels.`,
        );
      } else if (kind === 'target' && pendingInput) {
        connect({
          source: canvasNodeId(pendingInput.setId),
          sourceHandle: sourceHandle(pendingInput.elementId),
          target: canvasNodeId(setId),
          targetHandle: targetHandle(elementId),
        });
      } else if (kind === 'target') {
        setConnectionMessage('Choose an input handle first, then choose its output.');
      }
    },
    [activeFunction, connect, document.sets, editable, pendingInput],
  );

  const nodes = useMemo<CollectionNode[]>(() => {
    const validation = activeFunction ? validateFunction(activeFunction, document.sets) : undefined;
    const missing = new Set(validation?.missing ?? []);
    return layout.map(({ set, position }) => {
      const isDomain = editable && activeFunction?.domainId === set.id;
      const status =
        isDomain && activeFunction
          ? `${activeFunction.name}: ${validation?.valid ? 'complete' : 'incomplete'} · ${set.elements.length - missing.size}/${set.elements.length} assigned`
          : `${set.elements.length} ${set.elements.length === 1 ? 'element' : 'elements'} · finite set`;
      return {
        id: canvasNodeId(set.id),
        type: 'collection',
        position,
        width: NODE_WIDTH,
        height: nodeHeight(set),
        extent: [
          [-POSITION_LIMIT, -POSITION_LIMIT],
          [POSITION_LIMIT + NODE_WIDTH, POSITION_LIMIT + nodeHeight(set)],
        ],
        dragHandle: '.function-collection__header',
        selected: selectedNodes.has(canvasNodeId(set.id)),
        focusable: true,
        deletable: false,
        ariaLabel: `Collection ${set.name}, ${set.elements.length} elements. ${status}. Select with Enter, then use arrow keys to arrange.`,
        data: {
          set,
          activeFunction,
          canStart: Boolean(isDomain),
          canEnd: Boolean(editable && activeFunction?.codomainId === set.id),
          missing,
          status,
          tracedElements: traceState.elements,
          pendingInput,
          onTrace,
          onKeyboardHandle,
        },
      };
    });
  }, [
    activeFunction,
    document.sets,
    editable,
    layout,
    onKeyboardHandle,
    onTrace,
    pendingInput,
    selectedNodes,
    traceState.elements,
  ]);

  const edges = useMemo<MappingEdge[]>(() => {
    const bottom = layout.length
      ? Math.max(...layout.map(({ set, position }) => position.y + nodeHeight(set)))
      : 0;
    const parallelFunctions = new Map<string, string[]>();
    for (const fn of visibleFunctions) {
      const key = pairKey(fn.domainId, fn.codomainId);
      const group = parallelFunctions.get(key) ?? [];
      group.push(fn.id);
      parallelFunctions.set(key, group);
    }
    let laneIndex = 0;
    return visibleFunctions.flatMap((fn) => {
      const sourceIndex = document.sets.findIndex((set) => set.id === fn.domainId);
      const targetIndex = document.sets.findIndex((set) => set.id === fn.codomainId);
      const domain = document.sets[sourceIndex];
      const codomain = document.sets[targetIndex];
      if (!domain || !codomain) return [];
      const sourcePosition = layout[sourceIndex].position;
      const targetPosition = layout[targetIndex].position;
      const direct =
        Math.abs(targetIndex - sourceIndex) > 1 ||
        targetIndex <= sourceIndex ||
        targetPosition.x < sourcePosition.x + NODE_WIDTH + 48;
      const group = parallelFunctions.get(pairKey(fn.domainId, fn.codomainId))!;
      const parallelOffset = (group.indexOf(fn.id) - (group.length - 1) / 2) * 32;
      return domain.elements.flatMap((input, inputIndex) => {
        if (!Object.hasOwn(fn.mapping, input.id)) return [];
        const output = codomain.elements.find((element) => element.id === fn.mapping[input.id]);
        if (!output) return [];
        const currentLane = direct ? laneIndex++ : 0;
        const active = fn.id === selectedFunctionId || viewMode === 'composite';
        return [
          {
            id: canvasEdgeId(fn.id, input.id),
            type: 'mapping' as const,
            source: canvasNodeId(domain.id),
            target: canvasNodeId(codomain.id),
            sourceHandle: sourceHandle(input.id),
            targetHandle: targetHandle(output.id),
            animated: false,
            deletable: false,
            reconnectable: false,
            focusable: viewMode !== 'composite',
            selectable: viewMode !== 'composite',
            selected: active,
            ariaLabel: `${fn.name} maps ${input.label} in ${domain.name} to ${output.label} in ${codomain.name}${direct ? ', drawn on a direct route' : ''}`,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: active ? SIGNAL : INK,
              width: 16,
              height: 16,
            },
            data: {
              functionId: fn.id,
              label: `${fn.name}(${input.label}) = ${output.label}`,
              active,
              traced: traceState.mappings.has(pairKey(fn.id, input.id)),
              direct,
              laneY: bottom + 58 + currentLane * 30,
              laneIndex: currentLane,
              inputIndex,
              parallelOffset,
              onSelect: viewMode === 'composite' ? undefined : onSelectFunction,
            },
          },
        ];
      });
    });
  }, [
    document.sets,
    layout,
    onSelectFunction,
    selectedFunctionId,
    traceState.mappings,
    viewMode,
    visibleFunctions,
  ]);

  const bounds = useMemo<Rect>(() => {
    const left = layout.length ? Math.min(...layout.map(({ position }) => position.x)) : 0;
    const top = layout.length ? Math.min(...layout.map(({ position }) => position.y)) : 80;
    const right = layout.length
      ? Math.max(...layout.map(({ position }) => position.x + NODE_WIDTH))
      : NODE_WIDTH;
    const parallelExtent = Math.max(
      0,
      ...edges.map((edge) => Math.abs(edge.data?.parallelOffset ?? 0)),
    );
    const bottom = layout.length
      ? Math.max(
          ...layout.map(({ set, position }) => position.y + nodeHeight(set) + parallelExtent),
          ...edges.filter((edge) => edge.data?.direct).map((edge) => edge.data!.laneY + 24),
        )
      : 300;
    return {
      x: left - 88,
      y: top - 32 - parallelExtent,
      width: right - left + 176,
      height: bottom - top + 96 + parallelExtent,
    };
  }, [edges, layout]);

  const onNodesChange = useCallback<OnNodesChange<CollectionNode>>(
    (changes) => {
      const movement = changes.filter((change) => change.type === 'position' && change.position);
      if (movement.length) {
        const next = { ...positionsRef.current };
        for (const change of movement) {
          if (change.type === 'position' && change.position) {
            const set = document.sets.find((item) => canvasNodeId(item.id) === change.id);
            if (set)
              next[set.id] = {
                x: boundPosition(change.position.x),
                y: boundPosition(change.position.y),
              };
          }
        }
        positionsRef.current = next;
        setLocalPositions(next);
        // Pointer drags remain local until they stop; keyboard/group moves are committed too.
        if (movement.every((change) => change.type === 'position' && !change.dragging))
          onPositionsChange(next);
      }
      const selection = changes.filter((change) => change.type === 'select');
      if (selection.length)
        setSelectedNodes((previous) => {
          const next = new Set(previous);
          for (const change of selection) {
            if (change.type === 'select') {
              if (change.selected) next.add(change.id);
              else next.delete(change.id);
            }
          }
          return next;
        });
    },
    [document.sets, onPositionsChange],
  );

  const onEdgesChange = useCallback<OnEdgesChange<MappingEdge>>(
    (changes) => {
      if (viewMode === 'composite') return;
      const selected = changes.find((change) => change.type === 'select' && change.selected);
      const edge =
        selected?.type === 'select' ? edges.find((item) => item.id === selected.id) : undefined;
      if (edge?.data && edge.data.functionId !== selectedFunctionId)
        onSelectFunction(edge.data.functionId);
    },
    [edges, onSelectFunction, selectedFunctionId, viewMode],
  );

  const { fitBounds, viewportInitialized } = useReactFlow<CollectionNode, MappingEdge>();
  const membershipKey = useMemo(
    () =>
      JSON.stringify(
        document.sets.map((set) => [set.id, set.elements.map((element) => element.id)]),
      ),
    [document.sets],
  );
  const latestBounds = useRef(bounds);
  const fittedMembership = useRef<string | null>(null);
  useEffect(() => {
    latestBounds.current = bounds;
  }, [bounds]);
  const onInit = useCallback(() => {
    void fitBounds(latestBounds.current, { padding: 0.06, duration: 0 }).then((fitted) => {
      if (fitted) fittedMembership.current = membershipKey;
    });
  }, [fitBounds, membershipKey]);
  useEffect(() => {
    if (document.sets.length === 0) {
      fittedMembership.current = membershipKey;
      return;
    }
    if (!viewportInitialized || fittedMembership.current === membershipKey) return;
    let cancelled = false;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      // Card dimensions are explicit; wait for the viewport and commit the changed layout.
      secondFrame = requestAnimationFrame(() => {
        if (fittedMembership.current === membershipKey) return;
        void fitBounds(latestBounds.current, { padding: 0.06, duration: 0 }).then((fitted) => {
          if (fitted && !cancelled) fittedMembership.current = membershipKey;
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [document.sets.length, fitBounds, membershipKey, viewportInitialized]);
  const onEdgeClick = useCallback(
    (_event: unknown, edge: MappingEdge) => {
      if (viewMode !== 'composite' && edge.data) onSelectFunction(edge.data.functionId);
    },
    [onSelectFunction, viewMode],
  );
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setPendingInput(null);
      setConnectionMessage('');
    }
  }, []);

  return (
    <div className="function-canvas" onKeyDown={onKeyDown}>
      <ReactFlow<CollectionNode, MappingEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onConnect={connect}
        isValidConnection={isValidConnection}
        connectionMode={ConnectionMode.Strict}
        onInit={onInit}
        minZoom={MIN_ZOOM}
        maxZoom={2}
        deleteKeyCode={null}
        nodesConnectable={editable}
        edgesReconnectable={false}
        nodesFocusable
        edgesFocusable
        disableKeyboardA11y={false}
        connectionLineStyle={{ stroke: SIGNAL, strokeWidth: 2 }}
        colorMode="light"
        aria-label="Finite functions canvas"
        ariaLabelConfig={{
          'node.a11yDescription.default':
            "Press Enter to select a collection. Use arrow keys to move selected collections, or Shift and arrows for larger steps. Tab enters the collection's trace buttons and connection handles. Moving collections changes only their arrangement.",
          'edge.a11yDescription.default':
            viewMode === 'composite'
              ? 'This computed arrow records one input and its assigned output.'
              : 'Press Enter to select this function. The arrow records one input and its assigned output.',
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="#d9d9d5"
          bgColor="#f4f4f2"
        />
        <Panel position="top-left" className="function-canvas__guidance">
          {pendingInput ? (
            <span>{connectionMessage}</span>
          ) : (
            <span>
              {viewMode === 'composite'
                ? 'Computed composition · inspect each input'
                : 'Drag a collection to arrange · choose an element to trace'}
            </span>
          )}
        </Panel>
        {edges.some((edge) => edge.data?.direct) && (
          <Panel position="bottom-right" className="function-canvas__legend">
            <span aria-hidden="true" />
            Dashed = direct route
          </Panel>
        )}
        <CanvasControls bounds={bounds} />
      </ReactFlow>
      <div className="function-canvas__sr-only" role="status" aria-live="polite">
        {connectionMessage}
      </div>
    </div>
  );
}

export default function FunctionCanvas(props: FunctionCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
