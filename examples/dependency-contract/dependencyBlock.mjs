/**
 * Versioned machine-readable dependency declarations (dependency parser).
 *
 * A ticket declares dependencies with at most one fenced code block tagged
 * `bebop-deps-v1` in its issue body. Only that block is parsed; incidental
 * prose (for example "Depends on: none") is never interpreted.
 *
 * Block grammar (one dependency per line):
 *
 *   ```bebop-deps-v1
 *   sample/workflow#68 milestone=merged
 *   sample/dashboard#13 milestone=test_verified
 *   ```
 *
 * - References must be fully qualified `owner/repo#number`.
 * - `milestone` is required: `merged` (default code dependency) or
 *   `test_verified` (deployment dependency).
 * - A lone `none` line declares an explicit empty dependency set.
 * - Zero blocks means no declared dependencies (same effect as `none`).
 *
 * Any malformed, duplicated, contradictory, or unsupported-version block is a
 * deterministic declaration error: the ticket must be visibly held, never
 * silently treated as dependency-free.
 */

/** Deterministic declaration problem: hold visibly, do not retry blindly. */
export class DependencyDeclarationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DependencyDeclarationError';
    this.declarationError = true;
  }
}

export const DEPENDENCY_BLOCK_TAG = 'bebop-deps-v1';
const MILESTONES = new Set(['merged', 'test_verified']);
const DEP_LINE = /^([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)#([1-9][0-9]*)\s+milestone=(merged|test_verified)$/;

/**
 * Extract every fenced block whose info string starts with `bebop-deps`.
 * Returns [{version, body}] where version is the tag suffix (e.g. 'v1').
 */
function extractDepBlocks(body) {
  const blocks = [];
  const fence = /```[ \t]*(bebop-deps(?:-[A-Za-z0-9._-]+)?)[ \t]*\r?\n([\s\S]*?)```/g;
  let match;
  while ((match = fence.exec(body)) !== null) {
    const tag = match[1];
    const version = tag.includes('-') ? tag.slice('bebop-deps'.length + 1) : '';
    blocks.push({ version, body: match[2] });
  }
  return blocks;
}

/**
 * Parse the dependency block from an issue body.
 * @returns {{deps: Array<{repo: string, number: number, milestone: string}>}}
 * @throws {DependencyDeclarationError} on any deterministic declaration problem
 */
export function parseDependencyBlock(body) {
  if (typeof body !== 'string' || !body.trim()) return { deps: [] };
  const blocks = extractDepBlocks(body);
  if (blocks.length === 0) return { deps: [] };
  const v1 = blocks.filter(b => b.version === 'v1');
  if (blocks.some(b => b.version !== 'v1')) {
    const other = blocks.find(b => b.version !== 'v1');
    throw new DependencyDeclarationError(`unsupported dependency block version '${other.version || 'unversioned'}'; only bebop-deps-v1 is supported`);
  }
  if (v1.length !== 1) throw new DependencyDeclarationError(`exactly one bebop-deps-v1 block is allowed, found ${v1.length}`);
  const lines = v1[0].body.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) throw new DependencyDeclarationError('bebop-deps-v1 block is empty; declare dependencies or an explicit none');
  const deps = [];
  const seen = new Map();
  for (const line of lines) {
    if (line === 'none') {
      if (lines.length !== 1) throw new DependencyDeclarationError("'none' must be the only line in a bebop-deps-v1 block");
      return { deps: [] };
    }
    const match = DEP_LINE.exec(line);
    if (!match) throw new DependencyDeclarationError(`unparseable dependency line: ${JSON.stringify(line)}`);
    const repo = match[1].toLowerCase();
    const number = Number(match[2]);
    const milestone = match[3];
    if (!MILESTONES.has(milestone)) throw new DependencyDeclarationError(`unsupported milestone '${milestone}'`);
    const key = `${repo}#${number}`;
    const prior = seen.get(key);
    if (prior) {
      if (prior !== milestone) throw new DependencyDeclarationError(`contradictory milestones for dependency ${key}: ${prior} vs ${milestone}`);
      continue; // exact duplicate declaration is redundant but consistent
    }
    seen.set(key, milestone);
    deps.push({ repo, number, milestone });
  }
  return { deps };
}

export const issueKeyOf = (repo, number) => `${String(repo).toLowerCase()}#${number}`;
export const parseIssueKey = key => {
  const match = /^([\w.-]+\/[\w.-]+)#([1-9][0-9]*)$/.exec(String(key || ''));
  if (!match) throw new Error(`invalid issue key: ${key}`);
  return { repo: match[1].toLowerCase(), number: Number(match[2]) };
};

/**
 * Conservative prose -> bebop-deps-v1 conversion (event-driven scheduler cutover aid).
 *
 * Existing queue tickets declare dependencies in prose, e.g.
 *
 *   Depends on: sample/workflow#68 (merged), sample/x#3 (test_verified)
 *
 * or a bullet list under a `Depends on:`/`Blocked by:`/`Dependencies:`
 * header. This helper rewrites such a section into the machine-readable
 * fenced block. It is deliberately conservative:
 *
 * - refuses when the body already contains any `bebop-deps*` block;
 * - refuses (throws) when a dependency token is not a fully qualified
 *   `owner/repo#number` reference — ambiguous prose is never guessed;
 * - milestone markers default to `merged` only when absent;
 * - `none`/`no dependencies` becomes an explicit `none` block;
 * - the converted body is re-parsed with parseDependencyBlock before being
 *   returned, so the output is always valid by construction.
 *
 * Returns {converted:false} unchanged when no prose dependency section is
 * present. Actual GitHub issue edits remain an operator action at cutover.
 */
const PROSE_HEADER = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:depends\s+on|dependencies|blocked\s+by|blocking\s+dependencies)(?:\*\*)?\s*:\s*(.*)$/i;
const PROSE_REF = /^([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)#([1-9][0-9]*)(?:\s*\((merged|test_verified)\))?$/;
const PROSE_BULLET = /^\s*[-*]\s+(.*)$/;

export function convertProseDependencies(body) {
  if (typeof body !== 'string') throw new DependencyDeclarationError('issue body must be a string');
  if (extractDepBlocks(body).length > 0) {
    throw new DependencyDeclarationError('body already contains a bebop-deps block; refusing to convert');
  }
  const lines = body.split(/\r?\n/);
  const headerIndex = lines.findIndex(line => PROSE_HEADER.test(line));
  if (headerIndex === -1) return { converted: false, body, deps: [] };

  const headerRemainder = PROSE_HEADER.exec(lines[headerIndex])[1].trim();
  const tokens = [];
  if (headerRemainder) tokens.push(...headerRemainder.split(/[,;]/).map(t => t.trim()).filter(Boolean));
  // Consume following bullet lines until a non-bullet, non-blank line.
  let endIndex = headerIndex;
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const bullet = PROSE_BULLET.exec(lines[i]);
    if (bullet) {
      tokens.push(...bullet[1].split(/[,;]/).map(t => t.trim()).filter(Boolean));
      endIndex = i;
      continue;
    }
    if (!lines[i].trim() && i + 1 < lines.length && PROSE_BULLET.test(lines[i + 1])) continue;
    break;
  }

  const deps = [];
  for (const token of tokens) {
    if (/^(none|no dependencies|nothing)$/i.test(token)) {
      if (tokens.length !== 1) throw new DependencyDeclarationError(`ambiguous 'none' mixed with other tokens: ${JSON.stringify(token)}`);
      deps.length = 0;
      break;
    }
    const match = PROSE_REF.exec(token);
    if (!match) {
      throw new DependencyDeclarationError(`refusing to convert ambiguous dependency reference: ${JSON.stringify(token)}; references must be fully qualified owner/repo#number`);
    }
    deps.push({ repo: match[1].toLowerCase(), number: Number(match[2]), milestone: match[3] ?? 'merged' });
  }

  const block = ['```bebop-deps-v1'];
  if (deps.length === 0) block.push('none');
  else for (const dep of deps) block.push(`${dep.repo}#${dep.number} milestone=${dep.milestone}`);
  block.push('```');

  const convertedLines = [...lines.slice(0, headerIndex), ...block, ...lines.slice(endIndex + 1)];
  const convertedBody = convertedLines.join('\n');
  const parsed = parseDependencyBlock(convertedBody); // validate by construction
  return { converted: true, body: convertedBody, deps: parsed.deps };
}
