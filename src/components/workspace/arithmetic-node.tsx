'use client';

import { useId, useMemo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { ARITHMETIC_LIMITS, evaluateArithmetic, type Rational } from '@/lib/math/arithmetic';
import './arithmetic-node.css';

export const ARITHMETIC_NODE_WIDTH = 300;
export const ARITHMETIC_NODE_HEIGHT = 320;

export type ArithmeticNodeData = {
  id: string;
  expression: string;
  onChange: (id: string, expression: string) => void;
  onRemove: (id: string) => void;
  onSelect?: (id: string) => void;
  onEndEditing?: () => void;
  onFocusConsumed?: () => void;
  autoFocus?: boolean;
};

export type ArithmeticCanvasNode = Node<ArithmeticNodeData, 'arithmetic'>;

const COUNT_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

function NumberLine({ value, formatted }: { value: Rational; formatted: string }) {
  const { numerator, denominator } = value;
  const integer = denominator === 1n;
  const quotient = numerator / denominator;
  const floor = numerator < 0n && numerator % denominator !== 0n ? quotient - 1n : quotient;
  const left = integer ? numerator - 1n : floor;
  const right = integer ? numerator + 1n : floor + 1n;
  // Scale the exact remainder before converting, so very large values stay finite.
  const position = integer
    ? 50
    : Number(((numerator - floor * denominator) * 10_000n) / denominator) / 100;

  return (
    <div
      className="arithmetic-card__number-line"
      role="img"
      aria-label={`${formatted} on a number line between ${left} and ${right}. The marker shows its approximate position.`}
    >
      <div className="arithmetic-card__axis" aria-hidden="true">
        <span className="arithmetic-card__marker" style={{ left: `${position}%` }} />
      </div>
      <div className="arithmetic-card__ticks" aria-hidden="true">
        <span title={left.toString()}>{left.toString()}</span>
        {integer && <span title={formatted}>{formatted}</span>}
        <span title={right.toString()}>{right.toString()}</span>
      </div>
    </div>
  );
}

export function ArithmeticNode({ data, selected }: NodeProps<ArithmeticCanvasNode>) {
  const fieldId = useId();
  const messageId = `${fieldId}-message`;
  const result = useMemo(() => evaluateArithmetic(data.expression), [data.expression]);
  const count =
    result.ok &&
    result.value.denominator === 1n &&
    result.value.numerator >= 0n &&
    result.value.numerator <= 20n
      ? Number(result.value.numerator)
      : null;
  const invalid = Boolean(data.expression.trim()) && !result.ok;

  return (
    <article
      className={`arithmetic-card${selected ? ' arithmetic-card--selected' : ''}`}
      style={{ width: ARITHMETIC_NODE_WIDTH, height: ARITHMETIC_NODE_HEIGHT }}
      aria-label="Arithmetic expression"
      onPointerDown={() => data.onSelect?.(data.id)}
    >
      <header className="arithmetic-card__header" title="Drag to arrange this expression">
        <span>Arithmetic</span>
        <button
          type="button"
          className="arithmetic-card__remove nodrag nopan"
          aria-label="Remove expression"
          title="Remove expression"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            data.onRemove(data.id);
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div
        className="arithmetic-card__body nodrag nopan nowheel"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="arithmetic-card__field">
          <label htmlFor={fieldId}>Expression on canvas</label>
          <input
            id={fieldId}
            className="arithmetic-card__input nodrag nopan nowheel"
            value={data.expression}
            onChange={(event) => data.onChange(data.id, event.target.value)}
            onFocus={() => {
              data.onSelect?.(data.id);
              if (data.autoFocus) data.onFocusConsumed?.();
            }}
            onBlur={() => data.onEndEditing?.()}
            autoFocus={data.autoFocus}
            placeholder="2 + 2"
            maxLength={ARITHMETIC_LIMITS.sourceLength}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={messageId}
          />
        </div>

        <div className="arithmetic-card__result" aria-live="polite" aria-atomic="true">
          <span className="arithmetic-card__label">Canvas result</span>
          {result.ok ? (
            <output aria-label="Canvas result" title={result.formatted} tabIndex={0}>
              {result.formatted}
            </output>
          ) : (
            <p className="arithmetic-card__message" id={messageId}>
              {data.expression.trim() ? result.error : 'Write an expression to see its result.'}
            </p>
          )}
          {result.ok && (
            <span className="arithmetic-card__sr-only" id={messageId}>
              The exact result updates as you type.
            </span>
          )}
        </div>

        {result.ok ? (
          <details className="arithmetic-card__explorer nowheel">
            <summary>Explore this number</summary>
            <div className="arithmetic-card__exploration">
              {count !== null ? (
                <>
                  <p>
                    {COUNT_WORDS[count]} ·{' '}
                    {count === 0
                      ? 'no counters'
                      : `${count} ${count === 1 ? 'counter' : 'counters'}`}
                  </p>
                  {count > 0 && (
                    <div
                      className="arithmetic-card__counters"
                      aria-label={`${count} counters`}
                      role="img"
                    >
                      {Array.from({ length: count }, (_, index) => (
                        <span key={index} aria-hidden="true" />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="arithmetic-card__fraction">
                  Exact value: <span>{result.value.numerator.toString()}</span> divided by{' '}
                  <span>{result.value.denominator.toString()}</span>.
                </p>
              )}
              <NumberLine value={result.value} formatted={result.formatted} />
            </div>
          </details>
        ) : (
          <p className="arithmetic-card__help">Use + − × ÷ and parentheses.</p>
        )}
      </div>
    </article>
  );
}

export default ArithmeticNode;
