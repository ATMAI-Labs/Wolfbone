// SPDX-License-Identifier: MIT
// Validate repository-local Markdown file links and YAML syntax without a network.
// Anchor fragments and mathematical correctness are deliberately outside this check.
import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, extname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { parseDocument } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['.git', 'node_modules', 'work', '.cache', 'dist', 'build', '.venv']);
const markdown = new MarkdownIt();
const errors = [];
let markdownFiles = 0;
let yamlFiles = 0;
let localLinks = 0;

async function* files(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory() && !excluded.has(entry.name)) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

function* tokens(nodes) {
  for (const node of nodes) {
    yield node;
    if (node.children) yield* tokens(node.children);
  }
}

for await (const path of files(root)) {
  const extension = extname(path).toLowerCase();
  if (!['.md', '.yml', '.yaml'].includes(extension)) continue;
  const name = relative(root, path);
  const content = await readFile(path, 'utf8');
  if (extension !== '.md') {
    yamlFiles++;
    const document = parseDocument(content, { uniqueKeys: true });
    for (const error of document.errors) errors.push(`${name}: ${error.message}`);
    continue;
  }
  markdownFiles++;
  for (const token of tokens(markdown.parse(content, {}))) {
    const href = token.type === 'link_open' ? token.attrGet('href')
      : token.type === 'image' ? token.attrGet('src') : null;
    if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) continue;
    try {
      const target = decodeURIComponent(href.split(/[?#]/, 1)[0]);
      if (!target) continue;
      if (target.startsWith('/')) throw new Error('use a repository-relative path');
      const destination = resolve(dirname(path), target);
      const within = relative(root, destination);
      if (within === '..' || within.startsWith('../') || isAbsolute(within)) {
        throw new Error('link points outside the repository');
      }
      await access(destination);
      localLinks++;
    } catch (error) {
      errors.push(`${name}: invalid local link ${href} (${error.message})`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${markdownFiles} Markdown files, ${localLinks} local file links, and ${yamlFiles} YAML files.`);
}
