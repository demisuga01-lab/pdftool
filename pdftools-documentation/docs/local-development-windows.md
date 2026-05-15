# Local Development on Windows

## Purpose

Document the current Windows-oriented local setup used in this repository context.

## Prerequisites

- Python 3 with `py` launcher
- Node.js
- `pnpm`
- optional local or Docker Redis

## Validation Commands

```powershell
cd E:\pdftool
py -3 -m compileall backend\app

cd frontend
pnpm exec tsc --noEmit
pnpm build
```

## PowerShell Search Alternative

```powershell
Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.next\\|\\venv\\|\\.git\\|__pycache__' } |
  Select-String -Pattern 'PATTERN'
```

## Windows Caveats

- local machine may not have all production CLI tools
- line endings may differ
- build success on Windows does not fully replace Linux VPS validation

## Related Documents

- [../CONTRIBUTING.md](../CONTRIBUTING.md)
- [../PRE_COMMIT_FINAL_CHECK.md](../PRE_COMMIT_FINAL_CHECK.md)

