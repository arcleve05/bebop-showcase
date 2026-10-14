import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveStateCache, RcStatusCache } from './state-cache.mjs';

test('a fresh validated snapshot is reused until expiry', async () => {
  let calls = 0;
  const cache = new LiveStateCache({ async readPipelineState() {
    calls++;
    return { ok: true, state: { revision: calls } };
  } }, { ttlMs: 1000 });
  assert.equal((await cache.get()).status, 'live');
  assert.equal((await cache.get()).state.revision, 1);
  assert.equal(calls, 1);
});

test('failed and unauthorized upstream responses are explicit', async () => {
  const failed = new LiveStateCache({ async readPipelineState() {
    return { ok: false, kind: 'invalid', message: 'bad contract' };
  } });
  const unauth = new LiveStateCache({ async readPipelineState() {
    return { ok: false, kind: 'unauthorized' };
  } });
  assert.equal((await failed.get()).status, 'failed');
  assert.equal((await failed.get()).state, null);
  assert.equal((await unauth.get()).status, 'unauthorized');
});

test('unavailable refresh retains only formerly validated state', async () => {
  let now = 1000;
  let reachable = true;
  const cache = new LiveStateCache({ async readPipelineState() {
    return reachable
      ? { ok: true, state: { revision: 'validated' } }
      : { ok: false, kind: 'unavailable', message: 'offline' };
  } }, { now: () => now, ttlMs: 5 });
  await cache.get();
  reachable = false; now += 10;
  const result = await cache.get();
  assert.equal(result.status, 'stale');
  assert.equal(result.state.revision, 'validated');
});

test('single-flight refresh shares outstanding request', async () => {
  let calls = 0;
  let resolveRefresh;
  let now = 1000;
  const cache = new LiveStateCache({ readPipelineState() {
    calls++;
    if (calls === 1) return Promise.resolve({ ok: true, state: { revision: 1 } });
    return new Promise(resolve => { resolveRefresh = resolve; });
  } }, { now: () => now, ttlMs: 5, refreshWaitMs: 0 });
  await cache.get();
  now += 10;
  const views = await Promise.all([cache.get(), cache.get()]);
  assert.equal(calls, 2);
  assert.deepEqual(views.map(v => v.status), ['stale', 'stale']);
  resolveRefresh({ ok: true, state: { revision: 2 } });
  await cache.inFlight;
  assert.equal((await cache.get()).state.revision, 2);
});

test('operator-specific cache is scoped by session', async () => {
  let calls = 0;
  const cache = new RcStatusCache({ async readRcStatus(session) {
    calls++;
    return { ok: true, principal: session.user };
  } });
  assert.equal((await cache.get('one', { user: 'A' })).principal, 'A');
  assert.equal((await cache.get('one', { user: 'A' })).principal, 'A');
  assert.equal((await cache.get('two', { user: 'B' })).principal, 'B');
  assert.equal(calls, 2);
  assert.equal((await cache.get('visitor', null)).kind, 'unauthenticated');
});
