---
inclusion: auto
---

# Documentation Guide

> For comprehensive documentation sync guidance, ask Kiro to use the `docs` skill.

## Documentation Structure

**Root level:**

- `README.md` - Project overview, quick start
- `OIDC-SETUP.md` - OAuth configuration

**docs/ directory:**

- `ARCHITECTURE.md` - System architecture, data flow
- `DEPLOYMENT.md` - Deployment process, infrastructure
- `DEVELOPER.md` - Developer setup, troubleshooting
- `TECHNICAL_REFERENCE.md` - API endpoints, models, utilities

**.kiro/steering/ (always-on):**

- `development-guide.md` - Coding standards, tech stack
- `code-index.md` - Complete file/symbol map
- `testing-guide.md` - Testing quick reference
- `docs-guide.md` - This file

**.kiro/skills/ (on-demand):**

- `testing.md` - Comprehensive testing framework
- `docs.md` - Documentation sync process

## Keep Docs in Sync

When making code changes, consider which docs need updates:

| Changed                 | Update                                    |
| ----------------------- | ----------------------------------------- |
| New file/class/function | `code-index.md`                           |
| API endpoint            | `TECHNICAL_REFERENCE.md`, `code-index.md` |
| DynamoDB pattern        | `SCHEMA.md`, `TECHNICAL_REFERENCE.md`     |
| System architecture     | `ARCHITECTURE.md`                         |
| Environment variable    | `development-guide.md`, `DEPLOYMENT.md`   |
| Setup steps             | `DEVELOPER.md`, `development-guide.md`    |
| Infrastructure          | `DEPLOYMENT.md`, `ARCHITECTURE.md`        |

## When to Use the Docs Skill

Ask Kiro to use the `docs` skill when you need:

- Pre-PR documentation review
- Post-feature documentation sync
- Comprehensive drift detection
- Systematic documentation updates across multiple files
- Gap analysis for missing documentation
