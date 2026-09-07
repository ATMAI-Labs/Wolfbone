/**
 * Import the published mathlib documentation index at an explicitly pinned snapshot.
 * Names, declaration kinds, and module imports are metadata, not proof objects.
 * Run with --verify to check the committed offline corpus without network access.
 * Upstream's documentation endpoint is rolling: updating a snapshot requires an
 * explicit review of REVISION and SOURCE_SHA256 below. A changed endpoint fails
 * closed instead of silently relabelling newer content with an older revision.
 */
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEST = join(ROOT, 'data', 'mathlib');
const REVISION = '71a80585ee495fc24472fd0eaffc89d94e4fd8d6';
const SOURCE_SHA256 = '9577ef2e19c91d54554a0eadd433e3a7f4e0ee67c46b1e606b7c014db2dfde25';
const SOURCE_URL =
  'https://leanprover-community.github.io/mathlib4_docs/declarations/declaration-data.bmp';
const DOCS = 'https://leanprover-community.github.io/mathlib4_docs/';
const SOURCE = `https://github.com/leanprover-community/mathlib4/blob/${REVISION}/`;
const LICENSE_URL = `https://raw.githubusercontent.com/leanprover-community/mathlib4/${REVISION}/LICENSE`;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const alphabetical = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const areaLabels = {
  algebra: 'Algebra',
  algebraicgeometry: 'Algebraic geometry',
  algebraictopology: 'Algebraic topology',
  analysis: 'Analysis',
  categorytheory: 'Category theory',
  combinatorics: 'Combinatorics',
  computability: 'Computability',
  condensed: 'Condensed mathematics',
  control: 'Control and computation',
  data: 'Numbers and data structures',
  deprecated: 'Deprecated compatibility modules',
  dynamics: 'Dynamical systems',
  fieldtheory: 'Field theory',
  geometry: 'Geometry',
  grouptheory: 'Group theory',
  informationtheory: 'Information theory',
  init: 'Initial definitions',
  lean: 'Lean infrastructure',
  linearalgebra: 'Linear algebra',
  logic: 'Logic and functions',
  measuretheory: 'Measure theory',
  modeltheory: 'Model theory',
  numbertheory: 'Number theory',
  order: 'Order and lattices',
  probability: 'Probability',
  representationtheory: 'Representation theory',
  ringtheory: 'Ring theory',
  settheory: 'Set theory',
  tactic: 'Proof tactics',
  testing: 'Testing infrastructure',
  topology: 'Topology',
  util: 'Utilities',
};

async function fetchBytes(url, maxBytes = 96 * 1024 * 1024) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const length = Number(response.headers.get('content-length'));
  if (length > maxBytes) throw new Error(`Source exceeds the allowed size: ${url}`);
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > maxBytes) throw new Error(`Source exceeds the allowed size: ${url}`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function verify() {
  const manifest = JSON.parse(await readFile(join(DEST, 'manifest.json'), 'utf8'));
  if (manifest.revision !== REVISION || manifest.sourceSha256 !== SOURCE_SHA256) {
    throw new Error('Manifest does not match the reviewed upstream snapshot');
  }
  const modules = JSON.parse(await readFile(join(DEST, 'modules.json'), 'utf8'));
  const names = new Set();
  const moduleCounts = new Map();
  const kindCounts = new Map();
  let declarations = 0;
  for (const artifact of manifest.artifacts) {
    const bytes = await readFile(join(DEST, artifact.file));
    if (sha256(bytes) !== artifact.sha256 || bytes.length !== artifact.bytes) {
      throw new Error(`Integrity mismatch: ${artifact.file}`);
    }
    if (artifact.file.endsWith('.json.gz')) {
      const area = manifest.areas.find((candidate) => candidate.file === artifact.file);
      const rows = JSON.parse(gunzipSync(bytes).toString('utf8'));
      if (!area || rows.length !== area.declarationCount) {
        throw new Error(`Area count mismatch: ${artifact.file}`);
      }
      for (const [name, kindId, moduleId, fragment] of rows) {
        const module = modules[moduleId];
        const kind = manifest.kinds[kindId];
        if (
          typeof name !== 'string' ||
          names.has(name) ||
          !Number.isInteger(kindId) ||
          !Number.isInteger(moduleId) ||
          !kind ||
          !module ||
          module.area !== area.id ||
          (fragment !== undefined && (typeof fragment !== 'string' || !fragment.startsWith('#')))
        ) {
          throw new Error(`Invalid declaration record in ${artifact.file}: ${name}`);
        }
        names.add(name);
        moduleCounts.set(moduleId, (moduleCounts.get(moduleId) || 0) + 1);
        kindCounts.set(kindId, (kindCounts.get(kindId) || 0) + 1);
      }
      declarations += rows.length;
    }
  }
  if (declarations !== manifest.declarationCount || modules.length !== manifest.moduleCount) {
    throw new Error('Manifest counts do not match the offline corpus');
  }
  const moduleNames = new Set(modules.map((module) => module.name));
  if (moduleNames.size !== modules.length) throw new Error('Duplicate module names');
  for (const [index, module] of modules.entries()) {
    if (module.declarationCount !== (moduleCounts.get(index) || 0)) {
      throw new Error(`Module declaration count mismatch: ${module.name}`);
    }
    for (const dependency of module.imports) {
      const source = modules.find((candidate) => candidate.name === dependency);
      if (source && !source.importedBy.includes(module.name)) {
        throw new Error(`Module import edge is not reciprocal: ${module.name}`);
      }
    }
  }
  for (const [index, kind] of manifest.kinds.entries()) {
    if (kind.count !== (kindCounts.get(index) || 0)) {
      throw new Error(`Declaration kind count mismatch: ${kind.id}`);
    }
  }
  console.log(
    `Verified ${declarations} declarations and ${modules.length} modules at ${manifest.revision}.`,
  );
}

async function importCorpus() {
  const [bytes, sourcePage, licence] = await Promise.all([
    fetchBytes(SOURCE_URL),
    fetchBytes(`${DOCS}Mathlib/Logic/Function/Defs.html`, 4 * 1024 * 1024),
    fetchBytes(LICENSE_URL, 128 * 1024),
  ]);
  if (sha256(bytes) !== SOURCE_SHA256) {
    throw new Error(
      'The rolling upstream index changed. Review and explicitly pin the new revision and hash before importing.',
    );
  }
  if (!sourcePage.toString('utf8').includes(`${SOURCE}Mathlib/Logic/Function/Defs.lean`)) {
    throw new Error('The documentation source link does not match the pinned mathlib revision.');
  }
  const index = JSON.parse(bytes.toString('utf8'));
  const moduleNames = Object.keys(index.modules)
    .filter((name) => name === 'Mathlib' || name.startsWith('Mathlib.'))
    .sort(alphabetical);
  const moduleIds = new Map(moduleNames.map((name, i) => [name, i]));
  const kinds = [...new Set(Object.values(index.declarations).map((item) => item.kind))].sort(
    alphabetical,
  );
  const kindIds = new Map(kinds.map((name, i) => [name, i]));
  const imports = new Map(moduleNames.map((name) => [name, new Set()]));
  // Inverting importedBy recovers direct MODULE import edges, including external
  // Lean/Std/Aesop imports. These are not declaration-level proof dependencies.
  for (const [dependency, module] of Object.entries(index.modules)) {
    for (const dependent of module.importedBy) imports.get(dependent)?.add(dependency);
  }
  const modules = moduleNames.map((name) => ({
    name,
    area: (name.split('.')[1] || 'Root').toLowerCase(),
    declarationCount: 0,
    imports: [...imports.get(name)].sort(alphabetical),
    importedBy: [...new Set(index.modules[name].importedBy)].sort(alphabetical),
  }));
  const rows = new Map();
  const kindCounts = new Map();
  let declarationCount = 0;
  for (const [name, declaration] of Object.entries(index.declarations)) {
    const documentationUrl = new URL(declaration.docLink, DOCS);
    if (documentationUrl.origin !== new URL(DOCS).origin)
      throw new Error('Unexpected declaration source');
    const relativePath = documentationUrl.pathname.slice(new URL(DOCS).pathname.length);
    if (!relativePath.startsWith('Mathlib/') && relativePath !== 'Mathlib.html') continue;
    const moduleName = relativePath.replace(/\.html$/, '').replaceAll('/', '.');
    const moduleId = moduleIds.get(moduleName);
    if (moduleId === undefined) throw new Error(`Unknown module for declaration ${name}`);
    const module = modules[moduleId];
    const expectedHash = new URL(`#${encodeURIComponent(name)}`, DOCS).hash;
    // Retain an exact exceptional fragment if the upstream ID differs from its name.
    const row = [name, kindIds.get(declaration.kind), moduleId];
    if (documentationUrl.hash !== expectedHash) {
      row.push(documentationUrl.hash);
    }
    if (!rows.has(module.area)) rows.set(module.area, []);
    rows.get(module.area).push(row);
    module.declarationCount += 1;
    declarationCount += 1;
    kindCounts.set(declaration.kind, (kindCounts.get(declaration.kind) || 0) + 1);
  }
  for (const module of modules) if (!rows.has(module.area)) rows.set(module.area, []);
  await mkdir(join(DEST, 'areas'), { recursive: true });
  const artifacts = [];
  const areas = [];
  async function save(file, bytes) {
    await writeFile(join(DEST, file), bytes);
    artifacts.push({ file, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await save('modules.json', Buffer.from(JSON.stringify(modules)));
  await save('LICENSE.mathlib.txt', licence);
  const attribution = [
    'mathlib documentation metadata snapshot',
    `Upstream: https://github.com/leanprover-community/mathlib4/tree/${REVISION}`,
    'Copyright: the mathlib contributors and respective source-file copyright holders.',
    'Licence: Apache License 2.0. See LICENSE.mathlib.txt.',
    'This bundled metadata was extracted, filtered to Mathlib modules, compacted,',
    'and grouped into areas by Atmai for Wolfbone. It is a modified representation.',
    'Declaration names, kinds, and module-import relationships are imported from',
    "the Lean community's doc-gen4 documentation index. Source links preserve",
    'the route to the original files and their per-file copyright/author notices.',
    'No theorem bodies, checked proof objects, or declaration proof dependencies',
    'are included. Documentation links point to a rolling upstream website.',
    'No upstream NOTICE file was present in the pinned mathlib source tree.',
    "Wolfbone's original code retains its separate MIT licence.",
    '',
  ].join('\n');
  await save('ATTRIBUTION.txt', Buffer.from(attribution));
  for (const [id, declarations] of [...rows.entries()].sort(([a], [b]) => alphabetical(a, b))) {
    declarations.sort(([a], [b]) => alphabetical(a, b));
    const file = `areas/${id}.json.gz`;
    await save(file, gzipSync(JSON.stringify(declarations), { level: 9 }));
    const firstModule = modules.find((module) => module.area === id);
    const originalName = firstModule.name.split('.')[1] || 'Root';
    areas.push({
      id,
      label: areaLabels[id] || originalName.replace(/([a-z])([A-Z])/g, '$1 $2'),
      declarationCount: declarations.length,
      moduleCount: modules.filter((module) => module.area === id).length,
      file,
    });
  }
  const manifest = {
    format: 'wolfbone.mathlib-metadata',
    version: 1,
    revision: REVISION,
    sourceUrl: SOURCE_URL,
    sourceSha256: SOURCE_SHA256,
    sourceBytes: bytes.length,
    importedAt: new Date().toISOString(),
    documentationBaseUrl: DOCS,
    sourceBaseUrl: SOURCE,
    licence: 'Apache-2.0',
    sourceCopyright: 'The mathlib contributors and respective source-file copyright holders',
    scope:
      'All Mathlib declaration names and kinds in the pinned documentation index, plus direct module import relationships. Metadata only; no imported proof objects or local Lean verification.',
    declarationCount,
    moduleCount: modules.length,
    kinds: kinds.map((id) => ({ id, count: kindCounts.get(id) || 0 })),
    areas,
    artifacts,
  };
  await writeFile(join(DEST, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await verify();
}

if (process.argv.includes('--verify')) await verify();
else await importCorpus();
