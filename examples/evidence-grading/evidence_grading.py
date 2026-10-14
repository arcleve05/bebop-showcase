"""Standalone scoring policy, adapted from private evaluation-harness code.

This module consumes externally verified decisions; it does not run untrusted code.
"""
from __future__ import annotations
from typing import Any


def grade_criteria(
    criteria: list[dict[str, Any]],
    *,
    classification: str = "completed",
    scope_violations: list[str] | None = None,
) -> dict[str, Any]:
    if not criteria:
        raise ValueError("at least one independent criterion is required")
    if any(type(row.get("passed")) is not bool for row in criteria):
        raise ValueError("passed must be a Boolean")
    if any(type(row.get("weight", 1)) not in (int, float) or row.get("weight", 1) <= 0 for row in criteria):
        raise ValueError("weights must be positive numbers")

    violations = list(scope_violations or [])
    total = sum(row.get("weight", 1) for row in criteria)
    raw = sum(row.get("weight", 1) for row in criteria if row["passed"]) / total
    critical = [
        str(row["id"]) for row in criteria
        if row.get("critical", False) and not row["passed"]
    ]
    if any(row.get("harness_error", False) for row in criteria):
        critical.append("harness_error")
    if classification != "completed":
        critical.append(classification)
    if violations:
        critical.append("scope_violation")
    return {
        "raw_score": raw,
        "score": 0.0 if critical else raw,
        "critical_failures": critical,
        "scope_violations": violations,
        "success": not critical and all(row["passed"] for row in criteria),
    }
