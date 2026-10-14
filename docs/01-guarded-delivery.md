# Guarded software-delivery orchestration

## Problem
A model producing a pull request does not prove that the work was authorized, dependencies were satisfied, validation remains fresh, or merging is safe.

## Implementation reviewed
In the private `bebop-control` implementation, the scheduler requires explicit admission and re-evaluates work when durable facts change. The dependency resolver checks versioned declarations, detects cross-repository cycles, and requires authoritative evidence that dependent pull requests were merged. A `test_verified` milestone additionally depends on test-deployment verification.

The guarded merge engine checks the approved mode, current candidate SHA, expected base branch, validation evidence, required checks, branch protection, and fresh GitHub state. It submits a SHA-pinned mutation and reconciles ambiguous results through readback rather than blindly retrying.

**Engineering principle: unknown is not approved.** Failure to confirm prerequisites creates a visible hold rather than a false success.

## Inspect the code
[Versioned dependency contract and tests](../examples/dependency-contract/) is one runnable part of the larger architecture.

## Scope
These are implemented control-plane mechanisms with private unit/integration tests. The Test deployment runbook explicitly labels deployment integration as staged/mock-validated; this is **not** a claim that unattended deployment to production was activated.
