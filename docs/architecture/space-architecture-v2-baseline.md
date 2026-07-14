# SPACE Architecture V2 Baseline

This document freezes the pre-migration baseline for the approved SPACE Architecture V2 / Solution B implementation.

## Reference

- Baseline date: 2026-07-14
- Git commit: `bb9200b` (`bb9200be2b10792ee3370ce84d64d8ada04fe013`)
- Baseline commit subject: `fix: prevent mobile project list overlap`

## Dependency Installation

Command: `npm install`

Result: PASS (exit code 0). npm added 28 packages and audited 279 packages in 862 ms; 59 packages reported funding links. The command did not change `package-lock.json` or any tracked file.

`npm audit` reports **1 high severity vulnerability**. This is recorded as existing baseline debt and is deliberately not fixed as part of the architecture migration baseline.

## Verification Baseline

| Command | Result | Baseline detail |
| --- | --- | --- |
| `npm run verify:quick` | PASS | 102 unit tests passed; all contract checks passed. |
| `npm run build:chunks` | PASS | Production build and chunk contract checks passed. |

## Production Chunk Gzip Baseline

| Output group | Gzip size |
| --- | ---: |
| CSS | 15.19 kB |
| React | 59.65 kB |
| Index | 62.59 kB |
| Largest three application chunks combined | 169.43 kB |
| Rapier | 1086.02 kB |

These values are comparison points for Architecture V2, not new budgets. Future verification must continue to run the repository's chunk contract and explain any material regression, especially movement of Rapier into an eager shell or non-SPACE route.

## Scope Boundary

The baseline records repository state and verification evidence only. It does not authorize dependency remediation, generated-content edits, workbook changes, media/3D asset changes, or production-code changes.
