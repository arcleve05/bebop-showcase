# Evidence-based execution leases

## Problem
LLM workers can generate tokens and logs without making meaningful engineering progress. Runtime limits should measure actual deliverables and bound resource consumption.

## Design
The private Linux CODE supervisor fingerprints Git head, diff hash, changed-file hash, and test-result evidence. It does **not** count CPU utilization, token output, or chat messages as progress.

A clock-controlled policy checks meaningful progress after a checkpoint, detects inactivity, and honors a hard deadline even when progress continues. The broader private supervisor also uses Linux subreaping and pidfd-based ownership to terminate only processes it owns.

## Inspect the code
[Pure lease policy and tests](../examples/lease-policy/) is a portable extraction of the time and progress policy, using injected time and synthetic observations. It intentionally omits real process launch/termination.
