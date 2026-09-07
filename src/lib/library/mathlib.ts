/**
 * Server-side reader for the bundled, revision-pinned mathlib metadata corpus.
 * The Node filesystem import keeps this out of a browser bundle. No network
 * request or Lean runtime is involved; a declaration record is not a proof.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

export type MathlibDeclaration = {
  name: string;
  kind: string;
  module: string;
  area: string;
  documentationUrl: string;
  sourceUrl: string;
};

export type MathlibModule = {
  name: string;
  area: string;
  declarationCount: number;
  /** Direct module imports. These are not declaration proof dependencies. */
  imports: string[];
  importedBy: string[];
  documentationUrl: string;
  sourceUrl: string;
};

export type MathlibArea = {
  id: string;
  label: string;
  declarationCount: number;
  moduleCount: number;
};

export type MathlibSummary = {
  revision: string;
  sourceSha256: string;
  importedAt: string;
  declarationCount: number;
  moduleCount: number;
  licence: string;
  sourceCopyright: string;
  scope: string;
  areas: MathlibArea[];
  kinds: { id: string; count: number }[];
};

type Manifest = Omit<MathlibSummary, 'areas'> & {
  format: 'wolfbone.mathlib-metadata';
  version: 1;
  documentationBaseUrl: string;
  sourceBaseUrl: string;
  areas: (MathlibArea & { file: string })[];
};

type StoredModule = Omit<MathlibModule, 'documentationUrl' | 'sourceUrl'>;
type StoredDeclaration = [name: string, kind: number, module: number, fragment?: string];
type Corpus = { manifest: Manifest; modules: StoredModule[]; byName: Map<string, StoredModule> };
type SearchRow = { row: StoredDeclaration; name: string; module: string };

const DATA = join(process.cwd(), 'data', 'mathlib');
let corpusPromise: Promise<Corpus> | undefined;
const areaPromises = new Map<string, Promise<SearchRow[]>>();

async function getCorpus(): Promise<Corpus> {
  if (!corpusPromise) {
    corpusPromise = Promise.all([
      readFile(join(DATA, 'manifest.json'), 'utf8'),
      readFile(join(DATA, 'modules.json'), 'utf8'),
    ])
      .then(([manifestText, modulesText]) => {
        const manifest = JSON.parse(manifestText) as Manifest;
        const modules = JSON.parse(modulesText) as StoredModule[];
        if (manifest.format !== 'wolfbone.mathlib-metadata' || manifest.version !== 1) {
          throw new Error('Unsupported mathlib metadata format');
        }
        return {
          manifest,
          modules,
          byName: new Map(modules.map((module) => [module.name, module])),
        };
      })
      .catch((error: unknown) => {
        corpusPromise = undefined;
        throw error;
      });
  }
  return corpusPromise;
}

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_.]+/gu, ' ')
    .trim();
}

async function getArea(id: string, corpus: Corpus): Promise<SearchRow[]> {
  const area = corpus.manifest.areas.find((candidate) => candidate.id === id);
  if (!area) return [];
  let promise = areaPromises.get(id);
  if (!promise) {
    promise = readFile(join(DATA, area.file))
      .then((bytes) => {
        const rows = JSON.parse(gunzipSync(bytes).toString('utf8')) as StoredDeclaration[];
        return rows.map((row) => ({
          row,
          name: normalize(row[0]),
          module: normalize(corpus.modules[row[2]].name),
        }));
      })
      .catch((error: unknown) => {
        areaPromises.delete(id);
        throw error;
      });
    areaPromises.set(id, promise);
  }
  return promise;
}

function moduleUrls(name: string, manifest: Manifest) {
  const path = name.replaceAll('.', '/');
  return {
    documentationUrl: new URL(`${path}.html`, manifest.documentationBaseUrl).href,
    sourceUrl: new URL(`${path}.lean`, manifest.sourceBaseUrl).href,
  };
}

function declarationRecord(row: StoredDeclaration, corpus: Corpus): MathlibDeclaration {
  const module = corpus.modules[row[2]];
  const urls = moduleUrls(module.name, corpus.manifest);
  return {
    name: row[0],
    kind: corpus.manifest.kinds[row[1]].id,
    module: module.name,
    area: module.area,
    sourceUrl: urls.sourceUrl,
    documentationUrl: `${urls.documentationUrl}${row[3] || `#${encodeURIComponent(row[0])}`}`,
  };
}

export async function getMathlibSummary(): Promise<MathlibSummary> {
  const { manifest } = await getCorpus();
  return {
    revision: manifest.revision,
    sourceSha256: manifest.sourceSha256,
    importedAt: manifest.importedAt,
    declarationCount: manifest.declarationCount,
    moduleCount: manifest.moduleCount,
    licence: manifest.licence,
    sourceCopyright: manifest.sourceCopyright,
    scope: manifest.scope,
    areas: manifest.areas.map(({ file: _file, ...area }) => area),
    kinds: manifest.kinds,
  };
}

export async function getMathlibModule(name: string): Promise<MathlibModule | null> {
  const corpus = await getCorpus();
  const module = corpus.byName.get(name);
  if (!module) return null;
  return { ...module, ...moduleUrls(name, corpus.manifest) };
}

export type MathlibSearch = {
  query?: string;
  area?: string;
  module?: string;
  offset?: number;
  limit?: number;
};

export type MathlibSearchResult = {
  items: MathlibDeclaration[];
  total: number;
  offset: number;
  limit: number;
};

/** Search is literal and bounded: no user-supplied regular expression or path. */
export async function searchMathlib(input: MathlibSearch = {}): Promise<MathlibSearchResult> {
  const corpus = await getCorpus();
  const query = normalize(typeof input.query === 'string' ? input.query.slice(0, 200) : '');
  const tokens = query.split(' ').filter(Boolean);
  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset!)) : 0;
  const limit = Number.isFinite(input.limit)
    ? Math.max(1, Math.min(100, Math.floor(input.limit!)))
    : 30;
  const module = typeof input.module === 'string' ? corpus.byName.get(input.module) : undefined;
  if (input.module && !module) return { items: [], total: 0, offset, limit };
  const selectedArea = input.area || module?.area;
  const areas = selectedArea
    ? corpus.manifest.areas.filter((area) => area.id === selectedArea)
    : corpus.manifest.areas;
  const groups = await Promise.all(areas.map((area) => getArea(area.id, corpus)));
  const matches: { row: StoredDeclaration; rank: number }[] = [];
  for (const group of groups) {
    for (const candidate of group) {
      if (module && corpus.modules[candidate.row[2]].name !== module.name) continue;
      if (
        !tokens.every((token) => candidate.name.includes(token) || candidate.module.includes(token))
      )
        continue;
      const rank =
        query && candidate.name === query ? 0 : query && candidate.name.startsWith(query) ? 1 : 2;
      matches.push({ row: candidate.row, rank });
    }
  }
  matches.sort(
    (a, b) => a.rank - b.rank || (a.row[0] < b.row[0] ? -1 : a.row[0] > b.row[0] ? 1 : 0),
  );
  return {
    items: matches.slice(offset, offset + limit).map(({ row }) => declarationRecord(row, corpus)),
    total: matches.length,
    offset,
    limit,
  };
}
