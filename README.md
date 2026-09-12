# Lovely Coffee House

Production source repository for [lovelycoffeehouse.com](https://lovelycoffeehouse.com).

## Current production candidate

- Release: **R19 — JSON Object Planner Compatibility Hardening**
- Build: `lovely-live-source-r19-json-object-planner-20260912-r19`
- Cloudflare Pages project: `lovelycoffeehouse`
- Sealed site manifest: `release/r19-site.sha256` (50 files)
- Rollback manifests retained: `release/r18-site.sha256`, `release/r17-site.sha256`
- Workers AI binding: `AI`

R19 preserves the deterministic commerce validation and action-execution layers, while using Cloudflare Workers AI JSON Object mode for the planner instead of the stricter nested JSON Schema request that failed in production.
