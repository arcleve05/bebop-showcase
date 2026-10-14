# Versioned dependency declarations

**Anonymized excerpt of real parser code**, plus its original-style negative tests. The full private resolver additionally checks authoritative GitHub evidence; this example is limited to declarations.

```text
```bebop-deps-v1
sample/workflow#12 milestone=merged
sample/dashboard#8 milestone=test_verified
```
```

A malformed line, duplicate block, unsupported version or contradictory milestone is rejected rather than assumed eligible. To run: `node --test examples/dependency-contract/dependencyBlock.test.mjs`.
