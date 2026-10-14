// Live snapshot cache with explicit status semantics and stale-while-revalidate.
//
// Statuses (never fabricated, never falling back to fixtures):
//   live          fresh snapshot from the control plane
//   stale         last known snapshot, older than the TTL, refresh failed
//   unavailable   control plane unreachable / not configured (no snapshot yet)
//   failed        control plane answered but the payload failed validation
//   unauthorized  the control plane refused the read-only state token
//
// The cache stores the validated upstream pipeline state only. Projection into
// the render model happens per request so the RC status of the signed-in
// operator can be included without sharing it across sessions.

export const LIVE = 'live';
export const STALE = 'stale';
export const UNAVAILABLE = 'unavailable';
export const FAILED = 'failed';
export const UNAUTHORIZED = 'unauthorized';

export class LiveStateCache {
  constructor(adapter, { ttlMs = 15_000, refreshWaitMs = 250, now = () => Date.now() } = {}) {
    this.adapter = adapter;
    this.ttlMs = ttlMs;
    this.refreshWaitMs = refreshWaitMs;
    this.now = now;
    this.state = null;
    this.fetchedAt = 0;
    this.lastError = null;
    this.inFlight = null;
  }

  // A completed action means the next render must refetch instead of serving
  // the pre-action snapshot.
  invalidate() {
    this.fetchedAt = 0;
  }

  status() {
    if (this.state === null) {
      return { status: this.#failureStatus(), fetchedAt: null, ageMs: null };
    }
    const ageMs = Math.max(0, this.now() - this.fetchedAt);
    const status = ageMs <= this.ttlMs ? LIVE : STALE;
    return { status, fetchedAt: this.fetchedAt, ageMs };
  }

  // Returns { status, state, fetchedAt, ageMs, kind, detail }. `state` is only
  // non-null when a previously validated payload exists (live or stale).
  async get() {
    if (this.inFlight) {
      await this.#waitForRefresh(this.inFlight);
      return this.#view();
    }

    const ageMs = this.state === null ? null : Math.max(0, this.now() - this.fetchedAt);
    const fresh = this.state !== null && ageMs <= this.ttlMs;
    if (fresh) {
      return this.#view(LIVE);
    }

    const refresh = (async () => {
      let result;
      try {
        if (this.adapter === null || typeof this.adapter.readPipelineState !== 'function') {
          result = { ok: false, kind: 'unconfigured', message: 'control plane not configured' };
        } else {
          result = await this.adapter.readPipelineState();
        }
      } catch {
        // Adapter transport failures must degrade to an explicit status, never
        // crash the request or fabricate data.
        result = { ok: false, kind: 'unavailable', message: 'adapter error' };
      }
      if (result.ok) {
        this.state = result.state;
        this.fetchedAt = this.now();
        this.lastError = null;
      } else {
        this.lastError = result;
      }
      return result;
    })().finally(() => { this.inFlight = null; });

    this.inFlight = refresh;

    if (this.state === null) {
      // Nothing to show: wait for the outcome so the page can be honest.
      await refresh;
    } else {
      // Give a healthy fast upstream a short window to return current data.
      // Slow/unavailable upstreams still serve the previous snapshot promptly.
      await this.#waitForRefresh(refresh);
    }
    return this.#view();
  }

  async #waitForRefresh(refresh) {
    if (this.state === null) { await refresh; return; }
    let timer;
    try {
      await Promise.race([refresh, new Promise((resolve) => {
        timer = setTimeout(resolve, this.refreshWaitMs);
      })]);
    } finally { clearTimeout(timer); }
  }

  #failureStatus() {
    if (this.lastError === null) return UNAVAILABLE;
    if (this.lastError.kind === 'invalid') return FAILED;
    if (this.lastError.kind === 'unauthorized') return UNAUTHORIZED;
    return UNAVAILABLE;
  }

  #view(override) {
    if (this.state === null) {
      const status = override ?? this.#failureStatus();
      return {
        status,
        state: null,
        fetchedAt: null,
        ageMs: null,
        kind: this.lastError?.kind ?? 'unconfigured',
        detail: this.lastError?.message ?? null,
      };
    }
    const status = override ?? this.status().status;
    const { fetchedAt, ageMs } = this.status();
    return {
      status,
      state: this.state,
      fetchedAt,
      ageMs,
      kind: status === LIVE ? null : this.lastError?.kind ?? (this.inFlight ? 'refreshing' : 'stale'),
      detail: this.lastError?.message ?? null,
    };
  }
}

// Per-operator RC status cache (GET /rc/status is session-scoped).
export class RcStatusCache {
  constructor(adapter, { ttlMs = 10_000, maxEntries = 100, now = () => Date.now() } = {}) {
    this.adapter = adapter;
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
    this.maxEntries = maxEntries;
  }

  invalidate(sessionId) {
    this.entries.delete(sessionId);
  }

  async get(sessionId, session) {
    if (!session) return { ok: false, kind: 'unauthenticated' };
    const cached = this.entries.get(sessionId);
    if (cached && this.now() - cached.at <= this.ttlMs) return cached.result;

    if (this.entries.size >= this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
    const result = await this.#read(session);
    this.entries.set(sessionId, { at: this.now(), result });
    return result;
  }

  async #read(session) {
    if (!this.adapter || typeof this.adapter.readRcStatus !== 'function') {
      return { ok: false, kind: 'unconfigured' };
    }
    try {
      return await this.adapter.readRcStatus(session);
    } catch {
      return { ok: false, kind: 'unavailable' };
    }
  }
}
