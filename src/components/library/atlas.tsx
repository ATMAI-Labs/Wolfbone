'use client';
// SPDX-License-Identifier: MIT
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FlaskConical,
  Grid2X2,
  Library,
  List,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { CONCEPTS } from '@/lib/library/concepts';
import { PLAYGROUNDS } from '@/lib/library/playgrounds';
import { AREAS } from '@/lib/library/types';
import { conceptNeighbourhood, conceptRelations, searchConcepts } from '@/lib/library/relations';
import type { MathlibSummary, MathlibDeclaration, MathlibModule } from '@/lib/library/mathlib';
import './library.css';

const ConceptMap = dynamic(() => import('./concept-map'), {
  ssr: false,
  loading: () => (
    <div className="atlas-loading" role="status">
      Opening the map…
    </div>
  ),
});
type View = 'map' | 'index' | 'sources' | 'examples';
type SearchResult = { items: MathlibDeclaration[]; total: number; offset: number; limit: number };
const format = (n: number) => new Intl.NumberFormat('en').format(n);
const relationCount = conceptRelations(CONCEPTS).length;

export default function Atlas({
  summary,
  initialConcept = '',
}: {
  summary: MathlibSummary;
  initialConcept?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialConcept);
  const [area, setArea] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('map');
  const [sourceArea, setSourceArea] = useState('');
  const [offset, setOffset] = useState(0);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sourceModule, setSourceModule] = useState<MathlibModule | null>(null);
  const [moduleBusy, setModuleBusy] = useState(false);
  const [moduleError, setModuleError] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [exported, setExported] = useState(false);
  const selected = CONCEPTS.find((c) => c.id === selectedId);
  const filtered = useMemo(() => searchConcepts(CONCEPTS, query, area), [query, area]);
  const neighbourhood = useMemo(
    () => (selected ? conceptNeighbourhood(CONCEPTS, selected.id) : null),
    [selected],
  );
  const choose = useCallback((id: string) => {
    setSelectedId(id);
    setView('map');
    setQuery('');
    setArea('');
    const url = new URL(window.location.href);
    url.search = '';
    if (id) url.searchParams.set('concept', id);
    window.history.pushState(null, '', url);
  }, []);
  const chooseArea = useCallback((id: string) => {
    setArea(id);
    setQuery('');
    setView('index');
    setSelectedId('');
  }, []);
  useEffect(() => {
    const pop = () => {
      setSelectedId(new URLSearchParams(window.location.search).get('concept') ?? '');
      setArea('');
      setQuery('');
      setView('map');
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    if (view !== 'sources') return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setResults(null);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, area: sourceArea, offset: String(offset) });
        const response = await fetch(`/api/library?${params}`, { signal: controller.signal });
        if (!response.ok)
          throw new Error('The imported library could not be opened. Please try again.');
        setResults(await response.json());
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'The imported library could not be opened.');
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [view, query, sourceArea, offset]);
  useEffect(() => {
    if (!moduleName) {
      setSourceModule(null);
      return;
    }
    const controller = new AbortController();
    setModuleBusy(true);
    setModuleError('');
    setSourceModule(null);
    fetch(`/api/library?module=${encodeURIComponent(moduleName)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('This module could not be opened.');
        return r.json();
      })
      .then(setSourceModule)
      .catch((e) => {
        if (!controller.signal.aborted) setModuleError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setModuleBusy(false);
      });
    return () => controller.abort();
  }, [moduleName]);
  function switchView(next: View) {
    setView(next);
    setQuery('');
    setOffset(0);
    setArea('');
    setError('');
  }
  function exportMap() {
    const data = {
      format: 'wolfbone.atlas',
      version: 1,
      licence: 'MIT',
      contentStatus: 'Wolfbone explanations and editorial relationships; not proof certificates',
      areas: AREAS,
      concepts: CONCEPTS,
      relations: conceptRelations(CONCEPTS),
      sourceSnapshot: {
        revision: summary.revision,
        declarationCount: summary.declarationCount,
        moduleCount: summary.moduleCount,
      },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'wolfbone-foundations.atlas.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  }
  function sourceFor(name: string) {
    setModuleName(name);
    setView('sources');
    setQuery(name);
    setSourceArea('');
    setOffset(0);
  }
  const currentArea = AREAS.find((a) => a.id === area);
  const exampleMatches = PLAYGROUNDS.filter(
    (p) =>
      !query.trim() ||
      `${p.name} ${p.summary} ${p.context}`.toLowerCase().includes(query.toLowerCase().trim()),
  );
  const selectedExamples = selected
    ? PLAYGROUNDS.filter(
        (p) => p.conceptIds.includes(selected.id) || p.id === selected.playgroundId,
      )
    : [];

  return (
    <div className="atlas-app">
      <a className="skip-link" href="#atlas-main">
        Skip to mathematics
      </a>
      <header className="app-header atlas-header">
        <Link href="/explore" className="brand" aria-label="Wolfbone mathematics home">
          <span className="wordmark">WOLFBONE</span>
          <span className="brand-by">by atmai</span>
        </Link>
        <span className="workspace-name">Mathematical thought, open to explore.</span>
        <div className="header-actions">
          <Button variant="outline" onClick={exportMap}>
            {exported ? <Check /> : <Download />}
            <span>{exported ? 'Exported' : 'Export map'}</span>
          </Button>
          <Button asChild>
            <Link href="/">
              <FlaskConical /> Your workspace <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </header>
      <div className="atlas-layout">
        <aside className="atlas-sidebar" aria-label="Mathematical areas">
          <div className="atlas-side-title">
            <Library size={17} />
            <strong>The mathematics library</strong>
          </div>
          <button
            className={`atlas-area ${!area ? 'is-current' : ''}`}
            onClick={() => {
              choose('');
              setArea('');
            }}
          >
            <span>All areas</span>
            <small>{CONCEPTS.length}</small>
          </button>
          <nav>
            {AREAS.map((a) => (
              <button
                key={a.id}
                className={`atlas-area ${area === a.id ? 'is-current' : ''}`}
                onClick={() => chooseArea(a.id)}
                aria-pressed={area === a.id}
              >
                <span className="atlas-area-symbol math" aria-hidden="true">
                  {a.symbol}
                </span>
                <span>{a.name}</span>
                <small>{CONCEPTS.filter((c) => c.area === a.id).length}</small>
              </button>
            ))}
          </nav>
          <div className="atlas-side-bottom">
            <button
              onClick={() => switchView('examples')}
              className={view === 'examples' ? 'is-current' : ''}
            >
              <FlaskConical /> Ready-to-edit examples <small>{PLAYGROUNDS.length}</small>
            </button>
            <button
              onClick={() => switchView('sources')}
              className={view === 'sources' ? 'is-current' : ''}
            >
              <BookOpen /> Imported mathlib <ArrowRight />
            </button>
            <p>
              {format(summary.declarationCount)} declarations
              <br />
              {format(summary.moduleCount)} modules · available locally
            </p>
          </div>
        </aside>

        <main id="atlas-main" className="atlas-main">
          <div className="atlas-heading">
            <div>
              <p className="atlas-eyebrow">
                {view === 'sources'
                  ? 'SOURCE MATHEMATICS'
                  : view === 'examples'
                    ? 'CONSTRUCT & INSPECT'
                    : selected
                      ? 'FOLLOW THE RELATIONSHIPS'
                      : 'A SHARED MAP'}
              </p>
              <h1>
                {view === 'sources'
                  ? 'Inside mathlib.'
                  : view === 'examples'
                    ? 'Start with something real.'
                    : selected
                      ? selected.name
                      : currentArea
                        ? currentArea.name
                        : 'Where would you like to begin?'}
              </h1>
              <p>
                {view === 'sources'
                  ? 'Search imported names and kinds. Follow a source to its formal statement.'
                  : view === 'examples'
                    ? 'Open a working construction. Change it. See what follows.'
                    : selected
                      ? 'Keep one idea as your anchor. Follow what it uses and what uses it.'
                      : (currentArea?.description ??
                        'Enter through any idea. There is more than one way through mathematics.')}
              </p>
            </div>
          </div>
          <div className="atlas-toolbar">
            <div role="tablist" aria-label="Library view" className="atlas-tabs">
              {(
                [
                  { id: 'map', label: 'Map', Icon: Grid2X2 },
                  { id: 'index', label: 'Index', Icon: List },
                  { id: 'sources', label: 'Mathlib', Icon: BookOpen },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  role="tab"
                  id={`atlas-tab-${id}`}
                  aria-controls={`atlas-panel-${id}`}
                  aria-selected={view === id}
                  tabIndex={view === id || (view === 'examples' && id === 'map') ? 0 : -1}
                  onClick={() => switchView(id)}
                  onKeyDown={(event) => {
                    const views = ['map', 'index', 'sources'] as const;
                    let next = views.indexOf(id);
                    if (event.key === 'ArrowRight') next = (next + 1) % views.length;
                    else if (event.key === 'ArrowLeft')
                      next = (next + views.length - 1) % views.length;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = views.length - 1;
                    else return;
                    event.preventDefault();
                    switchView(views[next]);
                    document.getElementById(`atlas-tab-${views[next]}`)?.focus();
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <div className="atlas-search">
              <Search size={16} />
              <Input
                aria-label={
                  view === 'sources' ? 'Search imported mathlib' : 'Search mathematical ideas'
                }
                placeholder={
                  view === 'sources' ? 'Search names, modules…' : 'Search an idea, word, or symbol…'
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOffset(0);
                  if (view === 'map') setView('index');
                }}
              />
              {query && (
                <button
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('');
                    setOffset(0);
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {view === 'map' && (
            <div
              className="atlas-map-panel"
              id="atlas-panel-map"
              role="tabpanel"
              aria-labelledby="atlas-tab-map"
            >
              <ConceptMap
                concepts={CONCEPTS}
                selected={selected}
                onSelect={choose}
                onArea={chooseArea}
              />
            </div>
          )}
          {view === 'index' && (
            <div
              className="atlas-scroll"
              id="atlas-panel-index"
              role="tabpanel"
              aria-labelledby="atlas-tab-index"
            >
              <div className="atlas-results-meta" role="status">
                <span>
                  {filtered.length} {filtered.length === 1 ? 'idea' : 'ideas'}
                  {currentArea ? ` in ${currentArea.name}` : ''}
                </span>
                {(area || query) && (
                  <button
                    onClick={() => {
                      setArea('');
                      setQuery('');
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              {filtered.length ? (
                <div className="atlas-concept-list">
                  {filtered.map((c) => (
                    <button className="atlas-concept-row" key={c.id} onClick={() => choose(c.id)}>
                      <span className="atlas-index-symbol math">{c.symbol}</span>
                      <span>
                        <strong>{c.name}</strong>
                        <span>{c.summary}</span>
                        <small>
                          {AREAS.find((a) => a.id === c.area)?.name} · {c.kind}
                        </small>
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="atlas-empty">
                  <h2>No matching ideas yet.</h2>
                  <p>Try another word, or search the imported mathlib index.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setView('sources');
                      setOffset(0);
                    }}
                  >
                    Search mathlib for “{query}” <ArrowRight />
                  </Button>
                </div>
              )}
            </div>
          )}
          {view === 'sources' && (
            <div
              className="atlas-scroll"
              id="atlas-panel-sources"
              role="tabpanel"
              aria-labelledby="atlas-tab-sources"
            >
              <div className="atlas-source-filter">
                <label htmlFor="mathlib-area">Source area</label>
                <NativeSelect
                  id="mathlib-area"
                  value={sourceArea}
                  onChange={(e) => {
                    setSourceArea(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="">All source areas</option>
                  {summary.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({format(a.declarationCount)})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="atlas-source-note">
                <span className="atlas-dot" />
                Bundled declaration index · Apache-2.0 · source revision{' '}
                <span className="math">{summary.revision.slice(0, 8)}</span>
                <p>
                  Names, declaration kinds, and module imports are available here. Formal statements
                  and proofs open in mathlib; Wolfbone has not rechecked them.
                </p>
              </div>
              <div className="atlas-results-meta" role="status">
                {busy
                  ? 'Searching the local library…'
                  : results
                    ? `${format(results.total)} matching declarations`
                    : error}
              </div>
              {error && (
                <p className="atlas-empty" role="alert">
                  {error}
                </p>
              )}
              {!busy && results?.items.length === 0 && (
                <div className="atlas-empty">
                  <h2>No matching declarations.</h2>
                  <p>Try a shorter name, such as “add”, “prime”, or “continuous”.</p>
                </div>
              )}
              {results && (
                <>
                  <div className="atlas-source-list">
                    {results.items.map((item) => (
                      <article key={item.name} className="atlas-source-row">
                        <div>
                          <a
                            href={item.documentationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="math"
                          >
                            {item.name}
                            <ArrowUpRight size={14} />
                          </a>
                          <span className="atlas-kind">{item.kind}</span>
                        </div>
                        <button onClick={() => setModuleName(item.module)}>
                          {item.module}
                          <ArrowRight size={13} />
                        </button>
                      </article>
                    ))}
                  </div>
                  {results.total > results.limit && (
                    <div className="atlas-pagination">
                      <Button
                        variant="outline"
                        disabled={offset === 0}
                        onClick={() => setOffset(Math.max(0, offset - results.limit))}
                      >
                        <ChevronLeft /> Previous
                      </Button>
                      <span>
                        {format(offset + 1)}–{format(offset + results.items.length)} of{' '}
                        {format(results.total)}
                      </span>
                      <Button
                        variant="outline"
                        disabled={offset + results.limit >= results.total}
                        onClick={() => setOffset(offset + results.limit)}
                      >
                        Next <ChevronRight />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {view === 'examples' && (
            <div className="atlas-scroll">
              <div className="atlas-results-meta">
                {exampleMatches.length} working examples · each opens in its own saved workspace
              </div>
              <div className="atlas-example-list">
                {exampleMatches.map((example, i) => (
                  <article key={example.id}>
                    <span className="atlas-example-number math">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h2>{example.name}</h2>
                      <p>{example.summary}</p>
                      <small>{example.context}</small>
                      <Link
                        className="atlas-example-open"
                        href={`/?example=${encodeURIComponent(example.id)}`}
                      >
                        Open this construction <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              {!exampleMatches.length && (
                <p className="atlas-empty">No examples match this search.</p>
              )}
            </div>
          )}
          <footer className="atlas-main-footer">
            <span>
              {CONCEPTS.length} explained ideas · {relationCount} typed connections
            </span>
            <span>Explore at your own scale.</span>
          </footer>
        </main>

        <aside className="atlas-inspector" aria-label="Concept and source inspector">
          {view === 'sources' ? (
            <>
              <p className="atlas-eyebrow">SOURCE CONTEXT</p>
              <h2>{moduleName ? 'Inside a module' : 'Where this mathematics comes from'}</h2>
              {moduleBusy && <p role="status">Opening module…</p>}
              {moduleError && <p role="alert">{moduleError}</p>}
              {sourceModule ? (
                <>
                  <h3 className="math atlas-module-name">{sourceModule.name}</h3>
                  <p>{format(sourceModule.declarationCount)} indexed declarations.</p>
                  <a
                    className="atlas-source-link"
                    href={sourceModule.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read module documentation <ArrowUpRight />
                  </a>
                  <a
                    className="atlas-source-link"
                    href={sourceModule.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the pinned source <ArrowUpRight />
                  </a>
                  <Button
                    variant="outline"
                    className="atlas-wide-button"
                    onClick={() => {
                      setQuery(sourceModule.name);
                      setOffset(0);
                      setSourceArea('');
                    }}
                  >
                    Find declarations in this module <Search />
                  </Button>
                  <div className="atlas-relations">
                    <h3>Imports ({sourceModule.imports.length})</h3>
                    <p className="atlas-small">
                      Module imports. These are not theorem-to-theorem proof dependencies.
                    </p>
                    {sourceModule.imports.length ? (
                      sourceModule.imports.map((name) =>
                        name === 'Mathlib' || name.startsWith('Mathlib.') ? (
                          <button key={name} onClick={() => setModuleName(name)}>
                            {name}
                            <ArrowRight />
                          </button>
                        ) : (
                          <a
                            key={name}
                            href={`https://leanprover-community.github.io/mathlib4_docs/${name.replaceAll('.', '/')}.html`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>
                              {name} <small>external module</small>
                            </span>
                            <ArrowUpRight />
                          </a>
                        ),
                      )
                    ) : (
                      <p className="atlas-small">No imported modules recorded in this index.</p>
                    )}
                  </div>
                  <div className="atlas-relations">
                    <h3>Imported by ({sourceModule.importedBy.length})</h3>
                    {sourceModule.importedBy.slice(0, 100).map((name) => (
                      <button key={name} onClick={() => setModuleName(name)}>
                        {name}
                        <ArrowRight />
                      </button>
                    ))}
                    {sourceModule.importedBy.length > 100 && (
                      <p className="atlas-small">Showing the first 100 dependants.</p>
                    )}
                  </div>
                </>
              ) : (
                !moduleBusy && (
                  <>
                    <p>
                      mathlib is the Lean community’s mathematical library. Its authors and
                      contributors provide the source mathematics.
                    </p>
                    <div className="atlas-ink">
                      <strong>{format(summary.declarationCount)}</strong>
                      <span>imported declarations</span>
                      <strong>{format(summary.moduleCount)}</strong>
                      <span>source modules</span>
                    </div>
                    <p className="atlas-small">
                      This snapshot is bundled with Wolfbone. Browsing and searching it require no
                      external service. Source links open the original library.
                    </p>
                    <p className="atlas-small">
                      Import date: {summary.importedAt.slice(0, 10)}
                      <br />
                      Revision: <span className="math break-anywhere">{summary.revision}</span>
                    </p>
                    <a
                      className="atlas-source-link"
                      href="https://github.com/leanprover-community/mathlib4"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Meet the mathlib community <ArrowUpRight />
                    </a>
                  </>
                )
              )}
            </>
          ) : selected && view !== 'examples' ? (
            <>
              <p className="atlas-eyebrow">
                {selected.kind} · {AREAS.find((a) => a.id === selected.area)?.name}
              </p>
              <div className="atlas-inspector-symbol math">{selected.symbol}</div>
              <h2>{selected.name}</h2>
              <p>{selected.detail}</p>
              <div className="atlas-ink">
                <span>A CONCRETE EXAMPLE</span>
                <p>{selected.example}</p>
              </div>
              <section className="atlas-context">
                <h3>The context matters</h3>
                <p>{selected.context}</p>
              </section>
              {selectedExamples.length > 0 && (
                <section className="atlas-relations">
                  <h3>Try a construction</h3>
                  {selectedExamples.map((p) => (
                    <Link key={p.id} href={`/?example=${encodeURIComponent(p.id)}`}>
                      <span>{p.name}</span>
                      <ArrowUpRight />
                    </Link>
                  ))}
                </section>
              )}
              {neighbourhood &&
                (
                  [
                    ['uses', 'Uses these ideas', 'Ideas used by this explanation.'],
                    ['usedBy', 'Used by these ideas', 'Ideas whose explanations use this one.'],
                    ['specializes', 'Is a kind of', 'Classification, not a derivation.'],
                    ['specializedBy', 'Has these specializations', 'Follow a more specific kind.'],
                    ['related', 'Related ideas', 'Connections without an implication claim.'],
                  ] as const
                ).map(
                  ([key, title, note]) =>
                    neighbourhood[key].length > 0 && (
                      <section className="atlas-relations" key={key}>
                        <h3>
                          {title} <span>{neighbourhood[key].length}</span>
                        </h3>
                        <p className="atlas-small">{note}</p>
                        {neighbourhood[key].map((c) => (
                          <button key={c.id} onClick={() => choose(c.id)}>
                            <span>{c.name}</span>
                            <ArrowRight />
                          </button>
                        ))}
                      </section>
                    ),
                )}
              <section className="atlas-relations">
                <h3>Source mathematics</h3>
                <p className="atlas-small">
                  Wolfbone explanation, connected to relevant mathlib modules. This connection is
                  editorial.
                </p>
                {selected.sourceModules.map((name) => (
                  <button key={name} onClick={() => sourceFor(name)}>
                    <span>{name.replace(/^Mathlib\./, '')}</span>
                    <BookOpen />
                  </button>
                ))}
              </section>
            </>
          ) : (
            <>
              <p className="atlas-eyebrow">MATHEMATICS BELONGS TO EVERYONE</p>
              <h2>Follow the shape of an idea.</h2>
              <p>
                You can enter through a familiar word, a symbol, a structure, or a working example.
              </p>
              <div className="atlas-start">
                <span>01</span>
                <div>
                  <strong>Choose your anchor</strong>
                  <p>Pick an idea to see its neighbourhood.</p>
                </div>
              </div>
              <div className="atlas-start">
                <span>02</span>
                <div>
                  <strong>Follow a connection</strong>
                  <p>Inspect what the relationship means.</p>
                </div>
              </div>
              <div className="atlas-start">
                <span>03</span>
                <div>
                  <strong>Make something with it</strong>
                  <p>Open an editable example where available.</p>
                </div>
              </div>
              <div className="atlas-ink">
                <span>A PLACE TO START</span>
                <h3>What makes a function?</h3>
                <p>Collections. Inputs. Outputs. One assignment for every input.</p>
                <button onClick={() => choose('function')}>
                  Explore the idea <ArrowRight />
                </button>
              </div>
              <Button
                variant="outline"
                className="atlas-wide-button"
                onClick={() => switchView('examples')}
              >
                <FlaskConical /> Browse {PLAYGROUNDS.length} constructions
              </Button>
              <p className="atlas-small">
                The map contains original explanations and labelled connections. The imported
                mathlib index provides a route into existing formal mathematics.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
