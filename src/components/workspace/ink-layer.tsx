'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';

type InkPoint = { x: number; y: number };

export type InkLayerProps = {
  strokes: Array<{ id: string; points: InkPoint[] }>;
  drawing: boolean;
  onStroke: (points: InkPoint[]) => void;
};

type ActiveStroke = {
  pointerId: number;
  target: SVGSVGElement;
  points: InkPoint[];
};

const POINT_LIMIT = 2_000;
const POSITION_LIMIT = 100_000;

function boundPoint(point: InkPoint): InkPoint | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return {
    x: Math.max(-POSITION_LIMIT, Math.min(POSITION_LIMIT, point.x)),
    y: Math.max(-POSITION_LIMIT, Math.min(POSITION_LIMIT, point.y)),
  };
}

function strokePath(points: InkPoint[]): string {
  const bounded = points
    .slice(0, POINT_LIMIT)
    .map(boundPoint)
    .filter((point): point is InkPoint => point !== null);
  if (!bounded.length) return '';
  // A zero-length segment with a round cap also displays a single pencil tap.
  if (bounded.length === 1) bounded.push(bounded[0]);
  return bounded.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

function releaseCapture(stroke: ActiveStroke) {
  if (stroke.target.hasPointerCapture(stroke.pointerId)) {
    stroke.target.releasePointerCapture(stroke.pointerId);
  }
}

/** Freehand marks in canvas coordinates. Only a completed pointer gesture is committed. */
export function InkLayer({ strokes, drawing, onStroke }: InkLayerProps) {
  const { screenToFlowPosition } = useReactFlow();
  const { x, y, zoom } = useViewport();
  const active = useRef<ActiveStroke | null>(null);
  const [draft, setDraft] = useState<InkPoint[]>([]);
  const paths = useMemo(
    () => strokes.map((stroke) => ({ id: stroke.id, path: strokePath(stroke.points) })),
    [strokes],
  );

  const cancel = useCallback(() => {
    const stroke = active.current;
    if (!stroke) return;
    active.current = null;
    releaseCapture(stroke);
    setDraft([]);
  }, []);

  useEffect(() => {
    if (!drawing) cancel();
  }, [cancel, drawing]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', onKeyDown);
      const stroke = active.current;
      active.current = null;
      if (stroke) releaseCapture(stroke);
    };
  }, [cancel]);

  const getPoint = (event: PointerEvent<SVGSVGElement>) =>
    boundPoint(screenToFlowPosition({ x: event.clientX, y: event.clientY }, { snapToGrid: false }));

  const appendPoint = (stroke: ActiveStroke, event: PointerEvent<SVGSVGElement>) => {
    if (stroke.points.length >= POINT_LIMIT) return;
    const point = getPoint(event);
    if (!point) return;
    const last = stroke.points[stroke.points.length - 1];
    if (last.x !== point.x || last.y !== point.y) stroke.points.push(point);
  };

  const begin = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawing || !event.isPrimary || event.button !== 0 || active.current) return;
    event.preventDefault();
    event.stopPropagation();
    const point = getPoint(event);
    if (!point) return;
    const stroke = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      points: [point],
    };
    // If the pointer has already gone away, do not leave a gesture waiting for pointerup.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    active.current = stroke;
    setDraft(stroke.points.slice());
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const stroke = active.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (!drawing) {
      cancel();
      return;
    }
    const previousLength = stroke.points.length;
    appendPoint(stroke, event);
    if (stroke.points.length !== previousLength) setDraft(stroke.points.slice());
  };

  const finish = (event: PointerEvent<SVGSVGElement>) => {
    const stroke = active.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (!drawing) {
      cancel();
      return;
    }
    appendPoint(stroke, event);
    active.current = null;
    releaseCapture(stroke);
    setDraft([]);
    const points = stroke.points.slice();
    if (points.length === 1) points.push({ ...points[0] });
    onStroke(points);
  };

  const cancelPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (active.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    cancel();
  };

  return (
    <svg
      className="function-canvas__ink nodrag nopan"
      data-drawing={drawing}
      aria-label="Freehand canvas marks"
      role="img"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 4,
        pointerEvents: drawing ? 'all' : 'none',
        touchAction: drawing ? 'none' : 'auto',
        cursor: drawing ? 'crosshair' : undefined,
        userSelect: 'none',
      }}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={cancelPointer}
      onLostPointerCapture={cancelPointer}
    >
      <rect width="100%" height="100%" fill="transparent" />
      <g
        transform={`translate(${x} ${y}) scale(${zoom})`}
        fill="none"
        stroke="var(--canvas-signal, #6c2bee)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map(({ id, path }) => (
          <path key={id} d={path} vectorEffect="non-scaling-stroke" />
        ))}
        {drawing && draft.length > 0 && (
          <path d={strokePath(draft)} vectorEffect="non-scaling-stroke" />
        )}
      </g>
    </svg>
  );
}
