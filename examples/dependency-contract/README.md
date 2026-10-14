# Versioned dependency declarations

**Anonymized and hardened personal parser excerpt** with deterministic tests. The full private system additionally verifies authoritative GitHub state; this sample parses dependency declarations only.

Example issue-body block:

~~~markdown
```bebop-deps-v1
sample/workflow#12 milestone=merged
sample/dashboard#8 milestone=test_verified
```
~~~

Malformed headers, duplicate dependency blocks, unsupported versions, contradictory milestones, incomplete dependency headers and ambiguous prose conversion raise explicit errors instead of silently granting eligibility.

Run: `node --test examples/dependency-contract/dependencyBlock.test.mjs`
