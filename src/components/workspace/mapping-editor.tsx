'use client';
import { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import type { FiniteFunction, MathDocument } from '@/lib/math/model';

export function signature(fn: FiniteFunction, document: MathDocument) {
  return `${fn.name}: ${document.sets.find((s) => s.id === fn.domainId)?.name ?? '?'} → ${document.sets.find((s) => s.id === fn.codomainId)?.name ?? '?'}`;
}
export function elementLabel(document: MathDocument, setId: string, elementId: string | undefined) {
  return (
    document.sets.find((s) => s.id === setId)?.elements.find((e) => e.id === elementId)?.label ??
    'Unassigned'
  );
}
export function MappingEditor({
  fn,
  document,
  onChange,
  prefix = '',
}: {
  fn: FiniteFunction;
  document: MathDocument;
  onChange: (functionId: string, inputId: string, outputId: string) => void;
  prefix?: string;
}) {
  const controlScope = useId();
  const domain = document.sets.find((s) => s.id === fn.domainId);
  const codomain = document.sets.find((s) => s.id === fn.codomainId);
  if (!domain || !codomain) return null;
  if (!domain.elements.length)
    return (
      <p className="muted">
        This collection is empty. Its function needs no input-output assignments.
      </p>
    );
  return (
    <FieldGroup className="mapping-fields">
      {domain.elements.map((input, index) => (
        <Field orientation="horizontal" key={input.id} className="mapping-row">
          <FieldLabel
            className="input-token"
            htmlFor={`${controlScope}-${index}`}
            title={`Element identity: ${input.id}`}
          >
            {input.label}
          </FieldLabel>
          <ArrowRight aria-hidden="true" className="mapping-arrow" />
          <NativeSelect
            id={`${controlScope}-${index}`}
            className="mapping-select"
            aria-label={`${prefix}${fn.name} output for ${input.label}`}
            value={fn.mapping[input.id] ?? ''}
            onChange={(e) => onChange(fn.id, input.id, e.target.value)}
          >
            <option value="">Unassigned</option>
            {codomain.elements.map((output) => (
              <option key={output.id} value={output.id}>
                {output.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ))}
    </FieldGroup>
  );
}
