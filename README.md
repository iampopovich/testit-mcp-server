<h1 align="center">TestIT MCP Server</h1>

<p align="center">Let an AI assistant read and update your TestIT work items, test runs and test plans.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/testit-mcp-server"><img alt="npm version" src="https://img.shields.io/npm/v/testit-mcp-server"></a>
  <a href="https://github.com/iampopovich/testit-mcp-server/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/iampopovich/testit-mcp-server/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/iampopovich/testit-mcp-server/blob/main/LICENSE"><img alt="MIT License" src="https://img.shields.io/npm/l/testit-mcp-server"></a>
</p>

QA engineers spend a lot of time clicking through the test management system: finding which tests failed in a run, checking whether they failed before, assigning test points, updating work items after a release. This server lets an AI assistant (Claude, Cursor or any other MCP client) do that work through the official TestIT v2 API, using your own API token. It is a small Node.js process that runs on your machine and talks only to your TestIT instance.

## What you can ask

- "Which tests failed in the last test run of the Checkout plan, and were they failing before?"
- "Create a test run from the open test points of test plan 'Release 4.2' and start it."
- "Assign all unassigned test points in this plan to Anna, and show me the plan summary."
- "Create a work item in the Payments section with these steps and expected results."
- "Mark these three autotests as flaky and list the test runs they took part in."
- "Show the analytics for test plan 'Regression' and the statistics of its last run."

## Quick start

You need Node.js 18 or newer, the URL of your TestIT instance and an API token (TestIT profile, API secret key).

Add the server to your MCP client configuration:

```json
{
  "mcpServers": {
    "testit": {
      "command": "npx",
      "args": ["-y", "testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://testit.example.com",
        "TESTIT_TOKEN": "<your API token>",
        "TESTIT_PROJECT_ID": "<optional default project UUID>"
      }
    }
  }
}
```

Claude Code, in one line:

```bash
claude mcp add testit -e TESTIT_URL=https://testit.example.com -e TESTIT_TOKEN=<your API token> -- npx -y testit-mcp-server
```

<details>
<summary>Other clients and Docker</summary>

- **Claude Desktop**: add the `mcpServers` entry above to `claude_desktop_config.json` and restart the app.
- **Cursor**: add the same entry to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global), then reload MCP servers.
- **Any other stdio MCP client**: command `npx`, args `-y testit-mcp-server`, plus the environment variables below.
- **Docker** (no published image; build it from a checkout):

  ```bash
  docker build -t testit-mcp-server .
  docker run -i --rm -e TESTIT_URL=https://testit.example.com -e TESTIT_TOKEN=<token> testit-mcp-server
  ```

  In an MCP client use `"command": "docker"` with `"args": ["run", "-i", "--rm", "-e", "TESTIT_URL", "-e", "TESTIT_TOKEN", "testit-mcp-server"]` and put the values in `env`.

</details>

## Configuration

| Variable | Required | Description |
|---|---|---|
| `TESTIT_URL` | yes | Base URL of your TestIT instance, e.g. `https://testit.example.com`. |
| `TESTIT_TOKEN` | yes | TestIT API secret key. Sent as `Authorization: PrivateToken <token>`; a value that already starts with `PrivateToken ` or `Bearer ` is sent as is. |
| `TESTIT_PROJECT_ID` | no | Default project UUID. Without it, project-scoped tools take `projectId` or `projectName` in each call. |
| `TESTIT_READ_ONLY` | no | `true`, `1`, `yes` or `on`: expose only tools without side effects (list, get, search). |
| `TESTIT_TOOLSETS` | no | Comma-separated toolsets to expose. Default `default` = every toolset except the opt-in ones; `all` = everything. Example: `default,admin`. |

Toolsets: `projects`, `work-items`, `sections`, `test-runs`, `test-results`, `test-plans`, `test-suites`, `autotests`, `analytics`, `shared-steps`, `configurations`, `configuration-parameters`, `attachments`, `dictionaries`. Opt-in, hidden unless listed: `admin` (custom attributes, attribute templates, webhooks, workflows, notifications, project autotest settings) and `bulk` (mass delete, restore and purge). An unknown toolset name stops the server with an error that lists the valid ones. Fewer tools also means less context for the model.

## Safety

- **Read-only mode.** `TESTIT_READ_ONLY=true` leaves 61 of the 130 default tools (78 of 180 with `TESTIT_TOOLSETS=all`), all of them list/get/search.
- **Annotations.** Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), derived from the verb in its name. Delete, purge, unlink, reset and the full-replacement `update_*` tools are marked destructive (41 tools), so clients that honour the hints ask before running them.
- **Admin and bulk operations are off by default.** They appear only when you list `admin` or `bulk` in `TESTIT_TOOLSETS`.
- **Your token stays local.** The server runs on your machine and sends requests only to `TESTIT_URL`. IDs that would escape the intended endpoint (`../`, `%2e%2e`, `?`, `#`) are rejected before the request is made.

## Tools

180 tools in total: 130 in the default toolsets, 50 opt-in.

- **Projects** (8): list, search, get, create, update, set, delete, autotest namespaces
- **Work items** (21): list, search, get, create, update, set (partial edit), move, delete, restore, purge, history, versions, comments (list/create/update/delete), attachments, linked autotests (list/unlink), shared step references, test results history
- **Sections** (6): list, get, create, rename, move, delete
- **Test runs** (16): list, search, get, create, create from work items / test points / autotests, start, stop, complete, set, rerun results, results, delete, restore, purge
- **Test results** (11): get, search, set, update, submit run results, reruns, statistics, attachments (list/upload/get/delete)
- **Test plans** (16): list, get, create, update, set state, clone, test runs, testers (assign/unassign), reset test points, summary, configurations, history, delete, restore, purge
- **Test suites and points** (13): list, get, create, set, set work items, set configurations, delete, test points (list/search), suite results and configurations, point work item and runs
- **Autotests** (12): search, get, create, set, delete, work item links (list/link/unlink), results history, test runs, average duration, mark flaky
- **Analytics** (3): project analytics, test plan analytics, test run statistics
- **Shared steps** (2): list, get
- **Configurations** (9) and **configuration parameters** (5): list, search, get, create, set, update, delete, restore, purge
- **Attachments** (4): upload, get, metadata, delete
- **Dictionaries** (4): test statuses, tags, test plan tags, project attributes
- **Admin, opt-in** (39): custom attributes and attribute templates, webhooks (including test calls and logs), workflows, notifications, background jobs, project autotest settings
- **Bulk, opt-in** (11): delete/restore/purge test runs, test plans and configurations; bulk set test runs; delete autotests

The full list with input schemas is generated into [`docs/tools.json`](docs/tools.json).

---

## For developers

```bash
git clone https://github.com/iampopovich/testit-mcp-server.git
cd testit-mcp-server
npm install
npm run build          # tsc -> dist/
npm run lint
npm test               # unit tests; integration tests are skipped without TESTIT_* env
npm run dev            # run from source with tsx
npm run docs:generate  # regenerate docs/tools.json

# live integration tests against a real instance (they create and delete data)
TESTIT_URL=https://testit.example.com TESTIT_TOKEN=<token> TESTIT_PROJECT_ID=<uuid> npm test
```

Architecture rules:

1. **One bundle per area.** `src/api/<area>.ts` holds typed HTTP calls; `src/tools/<area>.ts` exports `create<Area>Tools(client)` that returns tool definitions (name, description, JSON Schema) plus handlers. `src/server-bootstrap.ts` registers every bundle with its category and toolset id, and applies the `TESTIT_TOOLSETS` and `TESTIT_READ_ONLY` filters.
2. **Annotations come from the tool name.** `src/tools/annotations.ts` maps the leading verb (`list`, `get`, `create`, `update`, `delete`, `purge`, ...) to MCP hints. A tool whose verb has no rule fails at startup, so every new tool gets classified.
3. **One HTTP client.** `src/client.ts` adds the `PrivateToken` header, retries GET requests on network errors and 502/503/504, honours `Retry-After` on 429 and turns API errors into readable messages. Tool output is compact JSON.
4. **The catalog comes from the registry.** `scripts/generate-tool-catalog.ts` builds `docs/tools.json` from the same bundles the server uses, so the catalog cannot drift from the code.

Adding a tool: add the API call to `src/api/<area>.ts`, add the definition and handler to the bundle in `src/tools/<area>.ts` with a name that starts with a known verb, add a unit test in `tests/unit/tools/`, run `npm run docs:generate` and note the change in `CHANGELOG.md`. A new area also needs a line in `buildToolBundles()`.

Tests: unit tests use a mocked client; integration tests in `tests/integration/` call every tool against a live instance; `tests/contract/` checks requests against the TestIT OpenAPI spec when `TESTIT_SWAGGER` points to a local copy.

CI: [`ci.yml`](.github/workflows/ci.yml) runs build, lint and tests on every push and pull request; [`publish.yml`](.github/workflows/publish.yml) publishes to npm with provenance on a GitHub release. Dependabot, release drafter and stale triage are configured too.

[Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Changelog](CHANGELOG.md)

Licence: [MIT](LICENSE).

See also: [allure-testops-mcp](https://github.com/iampopovich/allure-testops-mcp), the same kind of server for Allure TestOps.
