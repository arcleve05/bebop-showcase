# Reproducible local image and video experiments

## Engineering focus
Local generative AI experimentation benefits from reproducible builds, model provenance and tightly scoped validation just as much as conventional software does.

The private `bebop-images` and `bebop-video` projects include pinned dependency sets, model-source/revision metadata, file hashes, native ComfyUI workflow manifests, smoke-run evidence and explicit separation of model weights and private inputs from Git.

Dated October 2026 internal experiment records describe successful image generation/editing and short text-to-video/image-to-video smoke runs. The captured times are single-run observations—not standardized cold/warm throughput benchmarks or evidence of a production media platform.

## What remains experimental
Model quality, automated worker ownership, dynamic resource scheduling and broader workflow integration require further controlled validation. This case study intentionally omits local endpoint addresses, private artifacts, model weights and licensed upstream workflow files.
