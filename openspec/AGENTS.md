# OpenSpec Instructions

Lightweight spec-driven development workflow for ClearWorth.

> **Note**: The `specs/` folder is currently empty. Standard changes can be implemented without formal proposals.

## When to Create Proposals

Create a proposal in `openspec/changes/[change-id]/` when:
- Adding new features or capabilities
- Making breaking changes (API, schema)
- Changing architecture or patterns
- Updating security patterns

**Skip proposals for**: Bug fixes, typos, dependency updates, config changes.

## Proposal Structure

```
openspec/changes/[change-id]/
├── proposal.md     # Why and what changes
├── tasks.md        # Implementation checklist
└── specs/          # Delta changes (if modifying existing specs)
```

### proposal.md Template
```markdown
# Change: [Brief description]

## Why
[1-2 sentences on problem/opportunity]

## What Changes
- [Bullet list of changes]
- [Mark breaking changes with **BREAKING**]

## Impact
- Affected code: [key files/systems]
```

## CLI Quick Reference

```bash
openspec list              # List active changes
openspec show [item]       # View details
openspec validate --strict # Validate changes
openspec archive <id> -y   # Archive after deployment
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Must have at least one delta" | Add spec files in `changes/[name]/specs/` |
| "Requirement must have scenario" | Use `#### Scenario:` format (4 hashtags) |

## See Also
- [project.md](project.md) - Full project specification
