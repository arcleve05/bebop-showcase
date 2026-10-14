# Observability without false confidence

## Problem
Dashboards mislead operators when stale, invalid or missing data appears as healthy live data.

## Implementation reviewed
The `bebop-dashboard` code validates the structure of upstream pipeline responses, uses a strictly defined freshness contract, and never substitutes fixture data for a failing live source. It distinguishes:

- `live`: a currently validated snapshot;
- `stale`: a previously validated snapshot whose TTL has expired;
- `unavailable`: no usable upstream data;
- `failed`: an invalid upstream payload;
- `unauthorized`: upstream authentication refusal.

The cache coalesces concurrent upstream refresh requests and separates per-operator release-candidate status from shared pipeline state. Unknowns remain visible rather than being silently represented as empty healthy lists.

## Inspect the code
[Live-state cache excerpt and synthetic tests](../examples/live-state-cache/).
