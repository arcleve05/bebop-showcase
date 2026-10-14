"""Synthetic release decision policy. NOT employer code or a production integration."""
import re

SHA = re.compile(r"^[0-9a-f]{40}$")


def assess(packet):
    """Conservatively HOLD on absent, stale, or negative objective evidence."""
    reasons = []
    if not isinstance(packet, dict):
        return {"decision": "HOLD", "reasons": ["invalid evidence packet"]}
    commit = packet.get("candidate_sha")
    if not isinstance(commit, str) or not SHA.fullmatch(commit):
        reasons.append("invalid candidate commit")
    requirements = packet.get("requirements")
    if not isinstance(requirements, list) or not requirements or any(
        not isinstance(r, str) or not r.strip() for r in requirements
    ) or len(requirements) != len(set(r for r in requirements if isinstance(r, str))):
        reasons.append("invalid requirement set")
        requirements = []
    tests = packet.get("tests")
    if not isinstance(tests, list) or not tests:
        reasons.append("missing tests")
        tests = []
    covered = set()
    for test in tests:
        if not isinstance(test, dict):
            reasons.append("malformed test evidence")
            continue
        if test.get("candidate_sha") != commit or not isinstance(commit, str) or not SHA.fullmatch(commit):
            reasons.append("stale test evidence")
        if test.get("status") != "passed":
            reasons.append("test did not pass")
        if not isinstance(test.get("evidence_id"), str) or not test["evidence_id"].strip():
            reasons.append("missing test evidence id")
        requirement = test.get("requirement_id")
        if requirement not in requirements:
            reasons.append("unmapped test")
        elif test.get("candidate_sha") == commit and test.get("status") == "passed" and test.get("evidence_id"):
            covered.add(requirement)
    if set(requirements) - covered:
        reasons.append("incomplete requirement coverage")
    defects = packet.get("defects")
    if not isinstance(defects, list):
        reasons.append("missing defect register")
    else:
        for defect in defects:
            if not isinstance(defect, dict) or defect.get("severity") not in ("S1", "S2", "S3", "S4") or defect.get("status") not in ("open", "closed"):
                reasons.append("malformed defect record")
            elif defect["status"] == "open" and defect["severity"] in ("S1", "S2"):
                reasons.append("blocking defect")
    for kind, status, proof in (("ci", "passed", "run_id"), ("uat", "approved", "approval_id")):
        evidence = packet.get(kind)
        if not isinstance(evidence, dict) or evidence.get("status") != status or evidence.get("candidate_sha") != commit or not isinstance(evidence.get(proof), str) or not evidence[proof].strip():
            reasons.append("missing, stale, or negative " + kind + " approval")
    return {"decision": "HOLD" if reasons else "READY", "reasons": reasons,
            "covered": len(covered), "required": len(requirements)}
