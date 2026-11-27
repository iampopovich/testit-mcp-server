# Attachments Example

File content is passed as base64 in `contentBase64`. Attachments are addressed by UUID.

## Example User Prompt

`Attach this screenshot to the failed test result and to the test case it belongs to.`

## Typical Tools

- `upload_test_result_attachment`
- `list_test_result_attachments`
- `upload_work_item_attachment`
- `upload_attachment`
- `get_attachment_metadata`
- `get_attachment`
- `delete_attachment`

## Example Calls

Attach a file to a test result:

```json
{
  "name": "upload_test_result_attachment",
  "arguments": {
    "id": "8f9e0d1c-2b3a-4c5d-8e7f-6a5b4c3d2e99",
    "filename": "checkout-timeout.png",
    "contentType": "image/png",
    "contentBase64": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

Attach a file to a work item:

```json
{
  "name": "upload_work_item_attachment",
  "arguments": {
    "id": "9c2f7e10-4a3b-4d8e-b1f2-0e6a5d4c3b21",
    "filename": "payment-flow.pdf",
    "contentType": "application/pdf",
    "contentBase64": "JVBERi0xLjQK..."
  }
}
```

Upload first, then reference it when creating a work item:

```json
{
  "name": "upload_attachment",
  "arguments": {
    "filename": "test-data.csv",
    "contentType": "text/csv",
    "contentBase64": "aWQsYW1vdW50CjEsMTAwCg=="
  }
}
```

```json
{
  "name": "create_work_item",
  "arguments": {
    "name": "Import - CSV with one row",
    "attachmentIds": ["e1f2a3b4-c5d6-4e7f-8091-a2b3c4d5e6bb"]
  }
}
```

## Notes

- `get_attachment` and `get_test_result_attachment` return the content base64-encoded.
- `delete_attachment` works only for attachments not linked to any entity (Test IT returns 422 otherwise); use `delete_test_result_attachment` for result attachments.
