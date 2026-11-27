# Sections Example

Sections are the folders of a project's work item tree. Every project has a root section (`parentId: null`).

## Example User Prompt

`Create a "Payments" section under the root of the default project, then move the "Refunds" section into it.`

## Typical Tools

- `list_sections`
- `get_section`
- `create_section`
- `rename_section`
- `move_section`
- `delete_section`

## Example Calls

List sections (flat list with `parentId`):

```json
{
  "name": "list_sections",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
}
```

Create a section (parent defaults to the root section):

```json
{
  "name": "create_section",
  "arguments": {
    "name": "Payments",
    "preconditionSteps": [
      { "action": "Enable the payment sandbox" }
    ]
  }
}
```

Move a section under another parent:

```json
{
  "name": "move_section",
  "arguments": {
    "id": "6b1e2c9a-1f4d-4c1a-9e2b-7d3f0a5c8e11",
    "parentId": "f0e1d2c3-b4a5-4968-8776-655443322110"
  }
}
```

## Notes

- `delete_section` archives the section together with its subsections and work items.
- Use section ids as `sectionId` in `create_work_item`, `move_work_item` and as `sectionIds` filters in `list_work_items`.
