# Live-state cache with explicit failure semantics

A real dashboard cache excerpt, exercised with **synthetic adapters**. Live mode never substitutes demo fixtures: valid prior data may be shown as stale, and absence/invalidity of data produces an explicit state.

`node --test examples/live-state-cache/state-cache.test.mjs`

The public excerpt has no production URLs, secrets, or external dependencies.
