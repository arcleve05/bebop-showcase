import unittest
from release_gate import assess

SHA = "a" * 40
STALE = "b" * 40


def packet():
    return {
        "candidate_sha": SHA,
        "requirements": ["BANK-1", "BANK-2"],
        "tests": [
            {"requirement_id": "BANK-1", "status": "passed", "candidate_sha": SHA, "evidence_id": "run-1"},
            {"requirement_id": "BANK-2", "status": "passed", "candidate_sha": SHA, "evidence_id": "run-2"},
        ],
        "defects": [{"severity": "S3", "status": "open"}],
        "ci": {"status": "passed", "candidate_sha": SHA, "run_id": "CI-123"},
        "uat": {"status": "approved", "candidate_sha": SHA, "approval_id": "UAT-456"},
    }


class ReleaseGateTests(unittest.TestCase):
    def test_complete_evidence_is_ready(self):
        self.assertEqual(assess(packet())["decision"], "READY")

    def test_missing_requirement_coverage_holds(self):
        item = packet()
        item["tests"].pop()
        self.assertIn("incomplete requirement coverage", assess(item)["reasons"])

    def test_stale_test_evidence_holds(self):
        item = packet()
        item["tests"][0]["candidate_sha"] = STALE
        self.assertIn("stale test evidence", assess(item)["reasons"])

    def test_failed_test_holds(self):
        item = packet()
        item["tests"][0]["status"] = "failed"
        self.assertIn("test did not pass", assess(item)["reasons"])

    def test_open_severity_one_defect_holds(self):
        item = packet()
        item["defects"].append({"severity": "S1", "status": "open"})
        self.assertIn("blocking defect", assess(item)["reasons"])

    def test_closed_severity_one_defect_allowed(self):
        item = packet()
        item["defects"].append({"severity": "S1", "status": "closed"})
        self.assertEqual(assess(item)["decision"], "READY")

    def test_wrong_ci_sha_holds(self):
        item = packet()
        item["ci"]["candidate_sha"] = STALE
        self.assertEqual(assess(item)["decision"], "HOLD")

    def test_missing_uat_approval_holds(self):
        item = packet()
        item["uat"]["status"] = "pending"
        self.assertEqual(assess(item)["decision"], "HOLD")

    def test_malformed_packet_holds(self):
        self.assertEqual(assess(None)["decision"], "HOLD")

    def test_missing_defect_register_holds(self):
        item = packet()
        item.pop("defects")
        self.assertEqual(assess(item)["decision"], "HOLD")

    def test_no_missing_evidence_ids_allowed(self):
        item = packet()
        item["tests"][0].pop("evidence_id")
        self.assertEqual(assess(item)["decision"], "HOLD")


if __name__ == "__main__":
    unittest.main()
