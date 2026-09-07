'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { FiniteSet, FiniteFunction, MathDocument } from '@/lib/math/model';
export function ConstructionDialog({
  kind,
  document,
  onClose,
  onCollection,
  onFunction,
}: {
  kind: 'collection' | 'function' | null;
  document: MathDocument;
  onClose: () => void;
  onCollection: (set: FiniteSet) => boolean;
  onFunction: (fn: FiniteFunction) => boolean;
}) {
  const [name, setName] = useState('');
  const [labels, setLabels] = useState('');
  const [domain, setDomain] = useState(document.sets[0]?.id ?? '');
  const [codomain, setCodomain] = useState(document.sets[1]?.id ?? document.sets[0]?.id ?? '');
  const [error, setError] = useState('');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError('Give this construction a name.');
      return;
    }
    if (kind === 'collection') {
      const tokens = labels
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (document.sets.length >= 20) {
        setError('This first workspace supports up to 20 collections.');
        return;
      }
      if (tokens.length > 100 || tokens.some((t) => t.length > 120)) {
        setError('Use up to 100 labels, each no longer than 120 characters.');
        return;
      }
      if (new Set(tokens).size !== tokens.length) {
        setError('Use distinct labels in this collection so each input is easy to identify.');
        return;
      }
      const accepted = onCollection({
        id: `set-${crypto.randomUUID()}`,
        name: clean,
        elements: tokens.map((label, i) => ({ id: `element-${i + 1}`, label })),
      });
      if (!accepted) return;
    } else {
      if (
        !document.sets.some((s) => s.id === domain) ||
        !document.sets.some((s) => s.id === codomain)
      ) {
        setError('Choose both an input and an output collection.');
        return;
      }
      if (document.functions.length >= 50) {
        setError('This first workspace supports up to 50 functions.');
        return;
      }
      const accepted = onFunction({
        id: `function-${crypto.randomUUID()}`,
        name: clean,
        domainId: domain,
        codomainId: codomain,
        mapping: {},
      });
      if (!accepted) return;
    }
    onClose();
  }
  return (
    <Dialog
      open={kind !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="construction-dialog">
        <DialogHeader>
          <DialogTitle>
            {kind === 'collection' ? 'Create a collection' : 'Create a function'}
          </DialogTitle>
          <DialogDescription>
            {kind === 'collection'
              ? 'A finite collection is an explicitly listed set of elements. Start with words you can recognise.'
              : 'Choose where inputs live and where outputs can go. Then assign one output to each input.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="construction-name">
                {kind === 'collection' ? 'Collection name' : 'Function name'}
              </FieldLabel>
              <Input
                id="construction-name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                placeholder={kind === 'collection' ? 'Shapes' : 'choose'}
                required
                autoFocus
              />
            </Field>
            {kind === 'collection' ? (
              <Field>
                <FieldLabel htmlFor="element-labels">Element labels</FieldLabel>
                <Textarea
                  id="element-labels"
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  placeholder={'circle, square, triangle'}
                  rows={4}
                />
                <FieldDescription>
                  Separate with commas or new lines. Leave blank to make an empty collection.
                </FieldDescription>
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="function-domain">Input collection (domain)</FieldLabel>
                  <NativeSelect
                    id="function-domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  >
                    {document.sets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="function-codomain">Output collection (codomain)</FieldLabel>
                  <NativeSelect
                    id="function-codomain"
                    value={codomain}
                    onChange={(e) => setCodomain(e.target.value)}
                  >
                    {document.sets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            )}
            {error ? (
              <Alert role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter className="form-footer">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              {kind === 'collection' ? 'Create collection' : 'Create function'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
