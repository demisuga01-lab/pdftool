# Release Process

## Purpose

Describe the current release shape for manual review, commit, push, and VPS deployment.

## Current Flow

1. review `git status`
2. run backend compile
3. run frontend typecheck/build
4. review staged files for secrets
5. commit manually
6. push manually
7. deploy on VPS
8. run smoke tests

## Related Documents

- [../PRE_COMMIT_FINAL_CHECK.md](../PRE_COMMIT_FINAL_CHECK.md)
- [../PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md)

