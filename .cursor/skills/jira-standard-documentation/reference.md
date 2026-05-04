# ADF — minimal reference

Use only when the Jira tool **requires** Atlassian Document Format (JSON) and does not accept Markdown.

## Root document

```json
{
  "version": 1,
  "type": "doc",
  "content": []
}
```

## Useful patterns

- **Paragraph:** `type: "paragraph"`, `content: [{ "type": "text", "text": "..." }]`.
- **Heading:** `type: "heading"`, `attrs: { "level": 2 }`, `content: [ ... ]`.
- **Bullet list:** `type: "bulletList"`, `content: [ { "type": "listItem", "content": [ { "type": "paragraph", ... } ] } ]`.
- **Task / checkbox list:** depends on Jira version; if the MCP does not support `taskList`, use a **bulletList** with a plain-text `[ ]` prefix inside the paragraph.

## Links

`type: "text"`, `marks: [{ "type": "link", "attrs": { "href": "https://..." } }]`.

Priority: **follow the tool descriptor example** or the official API docs used by the MCP, because the supported ADF subset can vary.
