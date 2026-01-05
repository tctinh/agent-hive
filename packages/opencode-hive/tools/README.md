# Hive Tools

Tools to be implemented based on OpenCode plugin API.

## Tools

| Tool | Purpose |
|------|---------|
| hive_feature_create | Create feature folder structure |
| hive_feature_list | List all features with status |
| hive_feature_switch | Switch active feature |
| hive_step_create | Create execution step |
| hive_step_update | Update step status + log |
| hive_step_edit | Edit step spec or task (revision) |
| hive_step_delete | Delete a step entirely |
| hive_step_reorder | Change step order number |
| hive_step_reset | Reset step to pending (redo) |
| hive_doc_save | Save to problem/ or context/ |
| hive_report_generate | Generate and save report |

## Implementation Notes

Tools interact with .hive/ folder structure:

```
.hive/features/{name}/
├── problem/
├── context/
├── execution/{order}-{step}/
│   ├── spec.md
│   ├── status
│   ├── log.md
│   └── sessions.json
└── report.md
```

Sessions tracked per client in sessions.json:
```json
{
  "opencode": { "sessionId": "xxx", "lastActive": "..." },
  "claude": { "sessionId": "yyy", "lastActive": "..." }
}
```
