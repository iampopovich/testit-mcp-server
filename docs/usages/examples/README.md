# Usage Examples

Prompt-oriented examples for using the Test IT MCP server from an AI assistant.

Each guide includes:

- a user prompt to copy/adapt
- the MCP tools typically used
- example argument shapes
- notes for common variations

IDs in the examples are placeholder UUIDs; replace them with ids from your instance.

## Example Guides

- [Test Cases (Work Items)](./test-cases.md)
- [Shared Steps](./shared-steps.md)
- [Sections](./sections.md)
- [Test Plans, Suites and Test Points](./test-plans.md)
- [Test Runs](./test-runs.md)
- [Test Results](./test-results.md)
- [Autotests](./autotests.md)
- [Configurations](./configurations.md)
- [Custom Attributes](./custom-attributes.md)
- [Attachments](./attachments.md)
- [Analytics](./analytics.md)
- [Workflows](./workflows.md)
- [System Prompt Template (Token-Saving)](./system-prompt-template.md)

## Project Scope Inputs

For project-scoped operations, use one of:

- `projectId` (project UUID)
- `projectName` (exact project name, resolved to its UUID)
- environment default `TESTIT_PROJECT_ID`

## Tool Availability

- `TESTIT_TOOLSETS` selects toolsets. The default set covers everything except the opt-in `admin` (custom attributes, webhooks, workflows, notifications, project autotest settings) and `bulk` toolsets; enable them with e.g. `TESTIT_TOOLSETS=default,admin`.
- `TESTIT_READ_ONLY=true` leaves only list/get/search tools.
