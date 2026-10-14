# Synthetic regulated-release evidence gate

This is a **new, standalone portfolio illustration**, not code taken from First Citizens Bank, Baxter/Hillrom, Sardine or any customer. Synthetic identifiers are used throughout.

A green CI badge is not sufficient evidence for a regulated release. This policy demonstrates how an audit-oriented READY/HOLD decision can require an exact candidate commit, documented requirement coverage, passing tests with traceable evidence IDs, an explicit defect register, a successful CI record, and formal UAT approval for the same candidate.

The function accepts precollected evidence and **does not** authenticate people, retrieve evidence from authoritative systems, certify bank integrations, or substitute for a real release authority. All unknown, incomplete, stale or negative inputs should lead to HOLD.

Run: `python -m unittest discover -s examples/release-gate -p 'test_*.py'`.
