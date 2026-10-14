# Fail-closed evidence scoring

A standalone adaptation of the final scoring rule from an adversarial evaluation harness: independent criterion outcomes are weighted, but critical failures, incomplete executions, unsafe scope edits, and harness errors override a strong raw score.

`python -m unittest discover -s examples/evidence-grading`

This code scores precomputed evidence; it is **not** a process sandbox or full grading harness.
