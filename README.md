# Lovely Coffee House

Production source repository for [lovelycoffeehouse.com](https://lovelycoffeehouse.com).

## Current production candidate

- Release: **R18 — Planner JSON Hardening**
- Build: `lovely-live-source-r18-planner-json-mode-20260912-r18`
- Cloudflare Pages project: `lovelycoffeehouse`
- Sealed site manifest: `release/r18-site.sha256` (50 files)
- Rollback manifest retained: `release/r17-site.sha256`
- Workers AI binding: `AI`

R18 preserves the R17 deterministic commerce validation layer and hardens the structured action planner with Cloudflare Workers AI JSON-schema output. Production deployment is guarded by exact source checksums, runtime AI checks, planner smoke tests, and custom-domain build verification.
