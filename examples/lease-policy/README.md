# Evidence-based execution lease

A **source excerpt** isolating the clock-controlled policy from a Linux CODE agent supervisor. Only changes to the Git head, tracked diff hash, changed-file hash, or test fingerprint count as progress. Tokens, CPU and log volume do not. The hard limit always wins.

`python -m unittest discover -s examples/lease-policy`

The private system also has Linux process-supervision code; this sample does not create, observe or terminate processes.
