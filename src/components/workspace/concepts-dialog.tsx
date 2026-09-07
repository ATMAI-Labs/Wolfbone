'use client';
import { useState } from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const concepts = [
  {
    name: 'Finite collection',
    symbol: 'A',
    text: 'An explicitly listed set of distinct elements. A label lets us recognise an element; its identity is what the function refers to.',
    depends: 'Elements with declared identities',
    enables: 'Functions with an input and an output collection',
    example: 'A contains a, b, and c. Moving the card does not change those elements.',
  },
  {
    name: 'Function',
    symbol: 'f: A → B',
    text: 'For each input in A, assign exactly one output in B. Several inputs may share an output. An output may receive no inputs.',
    depends: 'An input collection and an output collection',
    enables: 'Composition and comparison',
    example: 'f sends a to 1, b to 2, and c to 1. No choice is left open for any input.',
  },
  {
    name: 'Composition',
    symbol: 'g ∘ f',
    text: 'Follow f first, then g. The output collection of f must be the same declared collection as the input collection of g.',
    depends: 'Two complete functions with a matching middle collection',
    enables: 'A direct function with the same two-step result',
    example: 'a goes to 1 using f. Then 1 goes to sun using g. The composition sends a to sun.',
  },
  {
    name: 'Equality of functions',
    symbol: 'h = g ∘ f',
    text: 'Two total functions with the same domain and codomain are equal when their outputs agree on every input. Here we can check each input because they are all listed.',
    depends: 'Complete functions with the same declared domain and codomain',
    enables: 'An exhaustive agreement check or a specific counterexample',
    example:
      'If h sends a to moon but the composition sends a to sun, a is a witness of disagreement.',
  },
];
export function ConceptsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const selected = concepts[index];
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="concept-dialog">
        <DialogHeader>
          <DialogTitle>A small map of this workspace</DialogTitle>
          <DialogDescription>
            Follow what each construction requires, and what it makes possible.
          </DialogDescription>
        </DialogHeader>
        <div className="concept-layout">
          <nav aria-label="Mathematical concepts">
            {concepts.map((c, i) => (
              <Button
                variant="ghost"
                key={c.name}
                aria-current={i === index ? 'page' : undefined}
                className={cn('concept-link', i === index && 'is-active')}
                onClick={() => setIndex(i)}
              >
                {c.name}
                <ArrowRight data-icon="inline-end" />
              </Button>
            ))}
          </nav>
          <article className="concept-body">
            <p className="math concept-symbol">{selected.symbol}</p>
            <h3>{selected.name}</h3>
            <p>{selected.text}</p>
            <dl>
              <dt>Requires</dt>
              <dd>{selected.depends}</dd>
              <dt>Makes possible</dt>
              <dd>{selected.enables}</dd>
            </dl>
            <div className="ink-bay">
              <p>{selected.example}</p>
            </div>
          </article>
        </div>
        <div className="source-notes">
          <h3>Context and sources</h3>
          <p>
            This workspace uses finite, explicitly listed sets and total functions. Unassigned
            inputs are incomplete constructions. These examples were constructed in Wolfbone; they
            are not imported Lean proofs.
          </p>
          <a
            href="https://leanprover-community.github.io/mathlib4_docs/Mathlib/CategoryTheory/FintypeCat.html"
            target="_blank"
            rel="noreferrer"
          >
            Mathlib: the category of finite types <ArrowUpRight />
          </a>
          <a href="https://stacks.math.columbia.edu/tag/0013" target="_blank" rel="noreferrer">
            Stacks Project: categories and composition <ArrowUpRight />
          </a>
          <p className="muted">
            The sources provide mathematical context. No proof-assistant connection is active in
            this version.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
