"""Progress fingerprint and bounded execution lease policy, extracted for portfolio review."""
import time

def fingerprint(value):
    return tuple(value.get(k) for k in ('head', 'tracked_diff_sha256', 'changed_files_sha256')) + (
        (value.get('tests') or {}).get('fingerprint'),)


class Lease:
    """Pure clock-controlled policy. Check inactivity on every poll after checkpoint."""
    def __init__(self, now, initial, policy, emit, wall=time.time):
        self.started = self.last = now
        self.last_wall = wall()
        self.wall = wall
        self.previous = fingerprint(initial)
        self.policy, self.emit = policy, emit
        self.checked = False

    def tick(self, now, observation):
        elapsed = now - self.started
        # Absolute ceiling wins even if this sample changed.
        if elapsed >= self.policy['hard']:
            self.emit('code_lease_hard_timeout', elapsed=elapsed)
            return 'HARD_TIMEOUT'
        if observation is not None and fingerprint(observation) != self.previous:
            self.previous = fingerprint(observation)
            self.last, self.last_wall = now, self.wall()
            self.emit('code_meaningful_progress', elapsed=elapsed)
        if elapsed >= self.policy['checkpoint']:
            if not self.checked:
                self.emit('code_lease_checkpoint', elapsed=elapsed, inactivity=now-self.last)
                self.checked = True
                if now-self.last < self.policy['inactivity']:
                    self.emit('code_lease_extended', elapsed=elapsed)
            if now-self.last >= self.policy['inactivity']:
                self.emit('code_lease_stalled', elapsed=elapsed, inactivity=now-self.last)
                return 'STALLED'
        return None
