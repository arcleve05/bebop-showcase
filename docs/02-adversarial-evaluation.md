# Evaluating engineering work under adversarial conditions

## Problem
Model-written logs or test reports are not trustworthy proof that an implementation works. A candidate may forge successful output, alter test scripts, leak private grading inputs, or violate edit scope.

## Implementation reviewed
The `bebop-bench` harness validates strict schemas, allocates isolated candidate workspaces, runs an adapter, examines Git changes, and grades the final submission using independent criteria. Grading can include visible/hidden tests, allowed-file constraints, deterministic JSON checks, and required commit evidence. A failed critical condition or out-of-scope edit zeroes the effective score regardless of weighted results.

Its adversarial tests cover early exits, fixture echoes, test replacement, forged success messages, invalid grader inputs, and attempted access to grading materials.

A dated internal validation record (September 29, 2026) reports **136 passing pytest tests**, including 26 adversarial tests, plus lint/type/build checks. These are *historical recorded results*, not fresh public CI results or measures of any model's performance.

## Inspect the code
[Fail-closed grading policy](../examples/evidence-grading/) is a small, dependency-free adaptation. It does not reproduce the private Linux sandbox or independently execute grader probes.
