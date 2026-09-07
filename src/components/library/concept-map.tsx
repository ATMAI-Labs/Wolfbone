'use client';
// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  Position,
  Handle,
  useReactFlow,
  type Node,
  type NodeProps,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Minus, Plus, Maximize } from 'lucide-react';
import type { Concept, ConceptRelation } from '@/lib/library/types';
import { AREAS } from '@/lib/library/types';
import { conceptNeighbourhood, unshownConceptConnections } from '@/lib/library/relations';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

type CardData = {
  name: string;
  symbol: string;
  subtitle: string;
  summary: string;
  selected: boolean;
  overview?: boolean;
  onExplore: () => void;
};
type ConceptNode = Node<CardData>;
function ConceptCard({ data }: NodeProps<ConceptNode>) {
  return (
    <div
      className={`atlas-node ${data.selected ? 'atlas-node--selected' : ''} ${data.overview ? 'atlas-node--overview' : ''}`}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <button onClick={data.onExplore} aria-label={`Explore ${data.name}`} className="nodrag nopan">
        <span className="atlas-node-meta">{data.subtitle}</span>
        <span className="atlas-node-name">
          <span className="math">{data.symbol}</span>
          <strong>{data.name}</strong>
        </span>
        <span className="atlas-node-summary">{data.summary}</span>
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
const nodeTypes = { concept: ConceptCard };
type MapProps = {
  concepts: Concept[];
  selected?: Concept;
  onSelect: (id: string) => void;
  onArea: (id: string) => void;
};
function Map({ concepts, selected, onSelect, onArea }: MapProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [ready, setReady] = useState(false);
  const [relationshipView, setRelationshipView] = useState<'uses' | 'specializes' | 'related'>(
    'uses',
  );
  const fitOptions = useMemo(
    () => ({
      padding: {
        top: selected ? ('76px' as const) : ('24px' as const),
        right: '28px' as const,
        bottom: '92px' as const,
        left: '28px' as const,
      },
      maxZoom: 1,
      duration: 0,
    }),
    [Boolean(selected)],
  );
  const { nodes, edges, hiddenCount } = useMemo(() => {
    const nodes: ConceptNode[] = [];
    const edges: Edge[] = [];
    const shownRelations: ConceptRelation[] = [];
    let hiddenCount = 0;
    if (!selected) {
      AREAS.forEach((area, index) =>
        nodes.push({
          id: area.id,
          type: 'concept',
          position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 180 },
          data: {
            name: area.name,
            symbol: area.symbol,
            subtitle: `${concepts.filter((c) => c.area === area.id).length} ideas to explore`,
            summary: area.description,
            selected: false,
            overview: true,
            onExplore: () => onArea(area.id),
          },
        }),
      );
      return { nodes, edges, hiddenCount };
    }
    const neighbours = conceptNeighbourhood(concepts, selected.id);
    const shown = new Set([selected.id]);
    function add(concept: Concept, x: number, y: number, subtitle: string, active = false) {
      nodes.push({
        id: concept.id,
        type: 'concept',
        position: { x, y },
        data: {
          name: concept.name,
          symbol: concept.symbol,
          subtitle,
          summary: concept.summary,
          selected: active,
          onExplore: () => onSelect(concept.id),
        },
      });
    }
    add(selected, 310, 180, 'Your anchor', true);
    const left =
      relationshipView === 'uses'
        ? neighbours.uses
        : relationshipView === 'specializes'
          ? neighbours.specializes
          : neighbours.related.slice(0, 2);
    const right =
      relationshipView === 'uses'
        ? neighbours.usedBy
        : relationshipView === 'specializes'
          ? neighbours.specializedBy
          : neighbours.related.slice(2, 4);
    function side(items: Concept[], rightSide: boolean) {
      const visible = items.filter((c) => !shown.has(c.id)).slice(0, 2);
      visible.forEach((c, index) => {
        shown.add(c.id);
        const subtitle =
          relationshipView === 'uses'
            ? rightSide
              ? 'Uses your anchor'
              : 'Used by your anchor'
            : relationshipView === 'specializes'
              ? rightSide
                ? 'A kind of your anchor'
                : 'Broader kind'
              : 'Related idea';
        add(c, rightSide ? 620 : 0, 180 + (index - (visible.length - 1) / 2) * 240, subtitle);
        const kind = relationshipView;
        const relation: ConceptRelation = {
          from: rightSide && kind !== 'related' ? c.id : selected!.id,
          to: rightSide && kind !== 'related' ? selected!.id : c.id,
          kind,
        };
        shownRelations.push(relation);
        // Diagram direction is explicit: 'used by' reverses a stored 'uses' edge.
        const source = kind === 'uses' ? relation.to : relation.from;
        const target = kind === 'uses' ? relation.from : relation.to;
        edges.push({
          id: `${kind}:${c.id}`,
          source,
          target,
          label:
            kind === 'uses' ? 'used by' : kind === 'specializes' ? 'is a kind of' : 'related to',
          markerEnd: kind === 'related' ? undefined : { type: MarkerType.ArrowClosed },
          style: {
            stroke: '#737370',
            strokeDasharray:
              kind === 'specializes' ? '6 4' : kind === 'related' ? '2 4' : undefined,
          },
        });
      });
    }
    side(left, false);
    side(right, true);
    // One displayed neighbour can have several relationship kinds. Count every
    // omitted kind, including another relationship to an already-visible node.
    hiddenCount = unshownConceptConnections(concepts, selected.id, shownRelations).length;
    return { nodes, edges, hiddenCount };
  }, [concepts, selected, onArea, onSelect, relationshipView]);
  useEffect(() => {
    if (!ready) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        void fitView(fitOptions);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [nodes, ready, fitView, fitOptions]);
  return (
    <div className="atlas-map" data-testid="concept-map">
      {selected && (
        <div className="atlas-connection-filter">
          <label htmlFor="connection-perspective">Connections</label>
          <NativeSelect
            id="connection-perspective"
            value={relationshipView}
            onChange={(e) => setRelationshipView(e.target.value as typeof relationshipView)}
          >
            <option value="uses">Uses and used by</option>
            <option value="specializes">Kinds and specializations</option>
            <option value="related">Related ideas</option>
          </NativeSelect>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={fitOptions}
        minZoom={0.3}
        maxZoom={1.6}
        onInit={() => setReady(true)}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          labelStyle: { fontSize: 13, fontFamily: 'IBM Plex Mono' },
          labelBgStyle: { fill: '#f4f4f2' },
          labelBgPadding: [6, 4],
        }}
      >
        <Background color="#d9d9d5" gap={24} size={1} />
      </ReactFlow>
      <div className="atlas-map-controls">
        <Button
          variant="outline"
          size="icon"
          aria-label="Zoom out of concept map"
          onClick={() => void zoomOut()}
        >
          <Minus />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Zoom into concept map"
          onClick={() => void zoomIn()}
        >
          <Plus />
        </Button>
        <Button variant="outline" onClick={() => void fitView(fitOptions)}>
          <Maximize /> Fit map
        </Button>
      </div>
      <p className="atlas-map-caption" data-hidden-connections={hiddenCount}>
        {selected
          ? `${hiddenCount ? `${hiddenCount} more typed ${hiddenCount === 1 ? 'connection' : 'connections'} in the inspector. ` : ''}Connections have labels. Position is a view.`
          : 'Choose an area. These positions do not imply a hierarchy.'}
      </p>
    </div>
  );
}
export default function ConceptMap(props: MapProps) {
  return (
    <ReactFlowProvider>
      <Map {...props} />
    </ReactFlowProvider>
  );
}
