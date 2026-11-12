# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

## [0.2.0] - 2026-11-12

### Added

- Toolsets: sections, test suites, autotests, configuration parameters, attachments, dictionaries;
  opt-in `admin` (custom attributes, templates, webhooks, workflows, notifications, project settings)
  and `bulk` (mass delete/restore/purge, background jobs) toolsets.
- `TESTIT_TOOLSETS` to expose a subset of tools and `TESTIT_READ_ONLY` mode.
- MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`).
- Work items: partial edit, move, comments, results history, autotest links, shared step references.
- Test plans: typed create, state transitions, clone, testers, test point reset, summary, history, restore/purge.
- Test runs and results: typed create, state filters, runs from work items / test points / autotests,
  result submission, safe partial updates, reruns, statistics, result attachments.
- Readable API errors with hints, 429 retry honoring `Retry-After`, compact tool output.
- Live integration tests covering every tool, contract test against the TestIT OpenAPI spec.

### Fixed

- IDs that escape the intended endpoint (`../`, `%2e%2e`, `?`, `#`, empty) are rejected before the request,
  so a tool can no longer reach endpoints outside its toolset.
- Upload tools reject invalid base64; `get_shared_step` refuses non-shared-step work items;
  `create_project` / `update_*` require a payload object.
- Pagination mapping to TestIT `Skip`/`Take`; list tools moved off deprecated endpoints;
  `search_work_items` request body.
- MCP server info reports the package version.

## [0.1.0]

### Added

- Public OSS docs set (`CONTRIBUTING`, `LICENSE`, `CODE_OF_CONDUCT`, `SECURITY`)
- Expanded README with MCP setup instructions for Claude Desktop, Claude Code, Cursor, and other clients
- GitHub Actions CI (`build` then `lint`) for push and pull requests
- CODEOWNERS and automatic reviewer request for `@iampopovich`
- Dependabot, stale triage workflow, and release drafter automation

