'use client';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { compareFunctions, type FiniteFunction, type MathDocument } from '@/lib/math/model';
import { elementLabel } from './mapping-editor';
export function ComparisonResult({
  left,
  right,
  document,
}: {
  left: FiniteFunction;
  right: FiniteFunction;
  document: MathDocument;
}) {
  const result = compareFunctions(left, right, document.sets);
  const domain = document.sets.find((s) => s.id === left.domainId);
  const title = {
    equal: 'Same on every input',
    different: 'A difference, made visible',
    incomparable: 'Different boundaries',
    incomplete: 'Finish the construction',
  }[result.kind];
  return (
    <section
      className="ink-bay comparison-bay"
      aria-live="polite"
      aria-atomic="true"
      data-testid="comparison-result"
    >
      <div className="result-heading">
        {result.kind === 'equal' ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <CircleAlert aria-hidden="true" />
        )}
        <h3>{title}</h3>
      </div>
      {result.kind === 'equal' ? (
        <p>
          {domain?.elements.length ?? 0} of {domain?.elements.length ?? 0} inputs checked. Both
          functions agree.
        </p>
      ) : result.witness ? (
        <p>
          For <strong>{elementLabel(document, left.domainId, result.witness.inputId)}</strong>,{' '}
          {left.name} gives{' '}
          <strong>{elementLabel(document, left.codomainId, result.witness.leftOutputId)}</strong>.{' '}
          {right.name} gives{' '}
          <strong>{elementLabel(document, right.codomainId, result.witness.rightOutputId)}</strong>.
        </p>
      ) : (
        <p>{result.explanation}</p>
      )}
      {['equal', 'different'].includes(result.kind) ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <caption>
              {left.name} compared with {right.name}
            </caption>
            <thead>
              <tr>
                <th scope="col">Input</th>
                <th scope="col">{left.name}</th>
                <th scope="col">{right.name}</th>
              </tr>
            </thead>
            <tbody>
              {domain?.elements.map((input) => (
                <tr key={input.id} data-witness={result.witness?.inputId === input.id}>
                  <th scope="row">
                    {input.label}
                    {result.witness?.inputId === input.id ? (
                      <span className="sr-only">: counterexample</span>
                    ) : null}
                  </th>
                  <td>{elementLabel(document, left.codomainId, left.mapping[input.id])}</td>
                  <td>{elementLabel(document, right.codomainId, right.mapping[input.id])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="check-scope">
        Exact comparison of these finite functions. No external proof service is involved.
      </p>
    </section>
  );
}
