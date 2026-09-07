'use client';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { composeFunctions, type MathDocument, type FiniteFunction } from '@/lib/math/model';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signature, elementLabel } from './mapping-editor';
export function CompositionDialog({
  open,
  onClose,
  document,
  firstId,
  secondId,
  onPairChange,
  onShow,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  document: MathDocument;
  firstId: string;
  secondId: string;
  onPairChange: (first: string, second: string) => void;
  onShow: () => void;
  onAdd: (fn: FiniteFunction) => boolean;
}) {
  const first = document.functions.find((f) => f.id === firstId);
  const second = document.functions.find((f) => f.id === secondId);
  const result = first && second ? composeFunctions(first, second, document.sets) : null;
  const domain = first && document.sets.find((s) => s.id === first.domainId);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="composition-dialog">
        <DialogHeader>
          <DialogTitle>Follow one function, then another.</DialogTitle>
          <DialogDescription>
            Composition turns a two-step path into a direct function. The middle collection must
            match.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="composition-fields">
          <Field>
            <FieldLabel htmlFor="compose-first">First function</FieldLabel>
            <NativeSelect
              id="compose-first"
              value={firstId}
              onChange={(e) => onPairChange(e.target.value, secondId)}
            >
              <option value="">Choose a function</option>
              {document.functions.map((f) => (
                <option key={f.id} value={f.id}>
                  {signature(f, document)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <ArrowRight className="compose-arrow" aria-hidden="true" />
          <Field>
            <FieldLabel htmlFor="compose-second">Then this function</FieldLabel>
            <NativeSelect
              id="compose-second"
              value={secondId}
              onChange={(e) => onPairChange(firstId, e.target.value)}
            >
              <option value="">Choose a function</option>
              {document.functions.map((f) => (
                <option key={f.id} value={f.id}>
                  {signature(f, document)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>
        {result?.ok ? (
          <section className="composition-result">
            <div className="result-heading">
              <Check aria-hidden="true" />
              <h3>{signature(result.value, document)}</h3>
            </div>
            <p className="muted">
              Read the composition right to left: {first?.name} first, then {second?.name}.
            </p>
            <div className="data-table-wrap">
              <table className="data-table">
                <caption>Every path through this composition</caption>
                <thead>
                  <tr>
                    <th scope="col">Input</th>
                    <th scope="col">After {first?.name}</th>
                    <th scope="col">After {second?.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {domain?.elements.map((e) => (
                    <tr key={e.id}>
                      <th scope="row">{e.label}</th>
                      <td>{elementLabel(document, first!.codomainId, first!.mapping[e.id])}</td>
                      <td>
                        {elementLabel(document, second!.codomainId, result.value.mapping[e.id])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!domain?.elements.length ? (
              <p>
                No inputs to follow: this is the unique function from the empty domain to this
                codomain.
              </p>
            ) : null}
          </section>
        ) : (
          <Alert role="status">
            <AlertDescription>
              {result && !result.ok
                ? first && second && first.codomainId !== second.domainId
                  ? `The middle collection does not match: ${first.name} finishes in ${document.sets.find((s) => s.id === first.codomainId)?.name}, but ${second.name} starts in ${document.sets.find((s) => s.id === second.domainId)?.name}.`
                  : result.errors.join(' ')
                : 'Choose two functions to inspect their composition.'}
            </AlertDescription>
          </Alert>
        )}
        <p className="muted">
          “Show on canvas” stays linked to these two functions. “Keep a copy” stores the current
          result as an editable snapshot.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={!result?.ok || document.functions.length >= 50}
            title={
              document.functions.length >= 50
                ? 'The workspace supports up to 50 functions.'
                : !result?.ok
                  ? 'Choose two complete, composable functions.'
                  : 'Add the current mapping as an independent function.'
            }
            onClick={() => {
              if (result?.ok) {
                const accepted = onAdd({
                  ...result.value,
                  id: `function-${crypto.randomUUID()}`,
                  name: `${result.value.name} copy`.slice(0, 120),
                });
                if (accepted) onClose();
              }
            }}
          >
            <Plus data-icon="inline-start" />
            Keep a copy
          </Button>
          <Button
            disabled={!result?.ok}
            title={
              !result?.ok
                ? 'Choose two complete, composable functions.'
                : 'Show the computed direct mapping.'
            }
            onClick={() => {
              onShow();
              onClose();
            }}
          >
            Show on canvas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
