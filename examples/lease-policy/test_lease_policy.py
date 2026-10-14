import unittest
from lease_policy import Lease

class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.events = []
        self.policy = dict(checkpoint=3600, hard=7200, inactivity=1500, poll=15, grace=15)
        self.initial = dict(head='a', tracked_diff_sha256='x', changed_files_sha256='f', tests=None)
        self.lease = Lease(0, self.initial, self.policy,
                                 lambda event, **fields: self.events.append(event), wall=lambda: 42)

    def test_normal_return_before_checkpoint(self):
        self.assertIsNone(self.lease.tick(300, self.initial))
        self.assertEqual(self.events, [])

    def test_log_tokens_cpu_and_low_cpu_are_not_inputs(self):
        observation = dict(self.initial, logs='busy', tokens=9000, cpu=100)
        self.assertIsNone(self.lease.tick(3599, observation))
        self.assertEqual(self.lease.tick(3600, observation), 'STALLED')
        self.assertNotIn('code_meaningful_progress', self.events)

    def test_progress_extends_but_hard_limit_always_wins(self):
        for now in (2200, 3500, 3600, 5000, 6500):
            self.assertIsNone(self.lease.tick(now, dict(self.initial, tracked_diff_sha256=str(now))))
        self.assertIn('code_lease_checkpoint', self.events)
        self.assertIn('code_lease_extended', self.events)
        self.assertEqual(self.lease.tick(7200, dict(self.initial, head='b')), 'HARD_TIMEOUT')

    def test_inference_wait_then_real_progress(self):
        self.assertIsNone(self.lease.tick(2100, self.initial))
        self.assertIsNone(self.lease.tick(2800, dict(self.initial, head='b')))
        self.assertIsNone(self.lease.tick(3600, dict(self.initial, head='b')))
        self.assertEqual(self.lease.tick(4300, dict(self.initial, head='b')), 'STALLED')

    def test_test_fingerprint_and_fileset_are_progress(self):
        self.lease.tick(2500, dict(self.initial, tests={'fingerprint': 'failures-decreased'}))
        self.assertEqual(self.lease.last, 2500)
        self.lease.tick(3500, dict(self.initial, changed_files_sha256='new-file'))
        self.assertIsNone(self.lease.tick(3600, None))
        self.assertEqual(self.lease.last_wall, 42)

    def test_unknown_observation_cannot_extend(self):
        self.assertEqual(self.lease.tick(3600, None), 'STALLED')

if __name__ == '__main__':
    unittest.main()
