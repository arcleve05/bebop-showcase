import unittest
from evidence_grading import grade_criteria


class GradingTests(unittest.TestCase):
    def test_all_pass(self):
        score = grade_criteria([
            {"id": "unit", "weight": 3, "passed": True},
            {"id": "security", "weight": 2, "critical": True, "passed": True},
        ])
        self.assertEqual(score["score"], 1)
        self.assertTrue(score["success"])

    def test_critical_failure_overrides_high_raw_score(self):
        score = grade_criteria([
            {"id": "unit", "weight": 100, "passed": True},
            {"id": "security", "weight": 1, "critical": True, "passed": False},
        ])
        self.assertGreater(score["raw_score"], .98)
        self.assertEqual(score["score"], 0)
        self.assertEqual(score["critical_failures"], ["security"])

    def test_scope_violation_blocks_success(self):
        score = grade_criteria([{"id": "unit", "passed": True}], scope_violations=["forbidden.txt"])
        self.assertEqual(score["score"], 0)
        self.assertIn("scope_violation", score["critical_failures"])

    def test_timeout_blocks_success(self):
        score = grade_criteria([{"id": "unit", "passed": True}], classification="timeout")
        self.assertEqual(score["score"], 0)

    def test_harness_error_blocks_success(self):
        score = grade_criteria([{"id": "unit", "passed": True, "harness_error": True}])
        self.assertIn("harness_error", score["critical_failures"])

    def test_no_evidence_is_invalid(self):
        with self.assertRaises(ValueError):
            grade_criteria([])

    def test_non_boolean_evidence_rejected(self):
        with self.assertRaises(ValueError):
            grade_criteria([{"id": "invalid", "passed": "yes"}])


if __name__ == "__main__":
    unittest.main()
