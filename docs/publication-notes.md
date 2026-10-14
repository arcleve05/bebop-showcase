# Publication boundaries and provenance

This repository contains a **curated public presentation**, not private source repositories or preserved commit history.

## Example origins
| Public example | Private implementation reviewed | Publication treatment |
| --- | --- | --- |
| Dependency contract | `bebop-control/src/backlog/dependencyBlock.js` and test file | Code/test excerpts with anonymized GitHub owner/repo names |
| Execution lease | `bebop-control/integrations/bebop-run/code_lease.py` | Only the pure clock/fingerprint policy and tests |
| Evidence scoring | `bebop-bench/src/bebop_bench/grading.py` | Standalone adaptation of final score/critical-failure decision |
| Live-state cache | `bebop-dashboard/src/state-cache.js` | Cache and tests, synthetic adapter only |

## What is not published
- Private service topology, machine identities, credentials and network endpoints
- Live state, log histories, model weights, private inputs or code from a company's systems
- Internal operations, configuration and all-repository commit history
- Claims that staged deployments or prototype workflows were operating as complete production systems

## Review before external distribution
Check source ownership, employment/IP obligations and licensing independently. A private repository does not automatically imply that its contents are owned solely by the account holder. This portfolio has no general reuse license by default. GitHub Actions is intended to test only these isolated examples.
