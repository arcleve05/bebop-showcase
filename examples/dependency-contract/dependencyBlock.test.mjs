import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDependencyBlock, DependencyDeclarationError, issueKeyOf, parseIssueKey, convertProseDependencies } from './dependencyBlock.mjs';

test('valid bebop-deps-v1 block parses fully qualified refs with required milestones', () => {
  const body = [
    'Implement the dashboard rollout.',
    '',
    '```bebop-deps-v1',
    'sample/workflow#68 milestone=merged',
    'sample/dashboard#13 milestone=test_verified',
    '```'
  ].join('\n');
  const { deps } = parseDependencyBlock(body);
  assert.deepEqual(deps, [
    { repo: 'sample/workflow', number: 68, milestone: 'merged' },
    { repo: 'sample/dashboard', number: 13, milestone: 'test_verified' }
  ]);
});

test('zero blocks means no declared dependencies', () => {
  assert.deepEqual(parseDependencyBlock('Just a normal issue body.').deps, []);
  assert.deepEqual(parseDependencyBlock('').deps, []);
  assert.deepEqual(parseDependencyBlock(null).deps, []);
});

test('prose is never interpreted as a dependency declaration', () => {
  const body = 'Depends on: none\n\nAlso mentions sample/workflow#68 milestone=merged in prose.\n\nbebop-deps-v1 without a fence is text.';
  assert.deepEqual(parseDependencyBlock(body).deps, []);
});

test('explicit none declares an empty dependency set', () => {
  assert.deepEqual(parseDependencyBlock('```bebop-deps-v1\nnone\n```').deps, []);
});

test('bare-number references are rejected', () => {
  assert.throws(() => parseDependencyBlock('```bebop-deps-v1\n#68 milestone=merged\n```'), DependencyDeclarationError);
  assert.throws(() => parseDependencyBlock('```bebop-deps-v1\n68 milestone=merged\n```'), DependencyDeclarationError);
});

test('milestone is required on every line', () => {
  assert.throws(() => parseDependencyBlock('```bebop-deps-v1\nsample/workflow#68\n```'), /unparseable dependency line/);
  assert.throws(() => parseDependencyBlock('```bebop-deps-v1\nsample/workflow#68 milestone=shipped\n```'), /unparseable dependency line/);
});

test('unsupported dependency block versions are a deterministic error', () => {
  assert.throws(() => parseDependencyBlock('```bebop-deps-v2\nsample/workflow#68 milestone=merged\n```'), /unsupported dependency block version 'v2'/);
  assert.throws(() => parseDependencyBlock('```bebop-deps\nsample/workflow#68 milestone=merged\n```'), /unsupported dependency block version 'unversioned'/);
});

test('exactly one bebop-deps-v1 block is allowed', () => {
  const body = '```bebop-deps-v1\nsample/workflow#68 milestone=merged\n```\n\n```bebop-deps-v1\nsample/workflow#69 milestone=merged\n```';
  assert.throws(() => parseDependencyBlock(body), /exactly one bebop-deps-v1 block is allowed, found 2/);
});

test('empty block and none mixed with dependencies are declaration errors', () => {
  assert.throws(() => parseDependencyBlock('```bebop-deps-v1\n```'), /block is empty/);
  assert.throws(() => parseDependencyBlock('```bebop-deps-v1\nnone\nsample/workflow#68 milestone=merged\n```'), /'none' must be the only line/);
});

test('identical duplicate lines dedupe; contradictory milestones error', () => {
  const dup = '```bebop-deps-v1\nsample/workflow#68 milestone=merged\nsample/workflow#68 milestone=merged\n```';
  assert.deepEqual(parseDependencyBlock(dup).deps, [{ repo: 'sample/workflow', number: 68, milestone: 'merged' }]);
  const contra = '```bebop-deps-v1\nsample/workflow#68 milestone=merged\nsample/workflow#68 milestone=test_verified\n```';
  assert.throws(() => parseDependencyBlock(contra), /contradictory milestones for dependency sample\/workflow#68/);
});

test('issue keys round-trip and are normalized to lower case', () => {
  assert.equal(issueKeyOf('Sample/Workflow', 68), 'sample/workflow#68');
  assert.deepEqual(parseIssueKey('sample/workflow#68'), { repo: 'sample/workflow', number: 68 });
  assert.throws(() => parseIssueKey('bebop-control#68'), /invalid issue key/);
});


test('malformed or unterminated dependency fences fail closed', () => {
  const fence = String.fromCharCode(96).repeat(3);
  assert.throws(
    () => parseDependencyBlock(fence + 'bebop-deps-v1 extra\nsample/workflow#68 milestone=merged\n' + fence),
    /invalid bebop-deps fence header/
  );
  assert.throws(
    () => parseDependencyBlock(fence + 'bebop-deps-v1\nsample/workflow#68 milestone=merged'),
    /unterminated bebop-deps fence/
  );
  assert.throws(
    () => parseDependencyBlock(fence + 'bebop-deps-typo\nnone\n' + fence),
    /unsupported dependency block version/
  );
});

test('dependency-looking examples inside unrelated fenced blocks are ignored', () => {
  const fence = String.fromCharCode(96).repeat(3);
  const prose = fence + 'text\n' + fence + 'bebop-deps-v1\nnone\n' + fence + '\n' + fence;
  assert.deepEqual(parseDependencyBlock(prose).deps, []);
});

test('conservative prose conversion validates and preserves non-dependency text', () => {
  const source = 'Work item\nDepends on: sample/workflow#68 (merged)\nOther notes';
  const result = convertProseDependencies(source);
  assert.equal(result.converted, true);
  assert.deepEqual(result.deps, [{ repo: 'sample/workflow', number: 68, milestone: 'merged' }]);
  assert.match(result.body, /Other notes/);
});

test('empty dependency headings do not become an implicit none', () => {
  assert.throws(() => convertProseDependencies('Depends on:\nDetails TBD'), /dependency header has no values/);
  assert.deepEqual(convertProseDependencies('Depends on: none').deps, []);
});

test('ambiguous prose and preexisting blocks cannot be auto-converted', () => {
  assert.throws(() => convertProseDependencies('Depends on: #12'), /refusing to convert ambiguous/);
  assert.throws(
    () => convertProseDependencies('Depends on: none, sample/workflow#12'),
    /ambiguous 'none'/
  );
  const fence = String.fromCharCode(96).repeat(3);
  assert.throws(() => convertProseDependencies(fence + 'bebop-deps-v1\nnone\n' + fence), /already contains/);
});
