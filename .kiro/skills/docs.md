---
name: docs
description: This skill should be used when the user asks to "sync docs", "check for doc drift", "update documentation", "review docs before a PR", "find stale docs", "check if docs are up to date", or has just completed a feature or refactor and needs documentation kept in sync with code changes. Discovers existing docs, analyzes what changed semantically, proposes updates, and applies after approval.
---

# Docs Skill

Documentation drifts from code constantly. Every merged PR that changes behavior, adds an endpoint, removes a service, or introduces a new pattern is an opportunity for docs to become stale. This skill exists to catch that drift — it treats documentation as a first-class artifact that must stay in sync with the codebase, not something written once and forgotten.

Use this skill to discover what documentation exists, analyze what changed in the code, identify gaps and stale references, and propose updates — never writing anything without approval.

## When to Use

- Before opening a PR — catch doc drift before it ships
- After completing a feature or refactor — sync docs with new behavior
- When reviewing recent commits — scan for accumulated documentation debt
- When documentation feels out of sync with the code
- When onboarding a service that has sparse or no documentation

The skill accepts optional arguments to focus on specific work:

- `/docs` — default: diff the current branch against main, find doc gaps
- `/docs read over the last several commits and see if there are documentation gaps` — scan recent commit history for accumulated drift

---

## Process

### Step 1: Discover Existing Documentation

Scan the repository for documentation. Do not assume a structure — find what is actually there.

```
Look for:
- README.md (project overview)
- docs/ directory and all files within it
- .kiro/steering/*.md (development guides, always-on context)
- .kiro/skills/*.md (specialized guidance)
- Any *.md files at the root level (ARCHITECTURE.md, DEPLOYMENT.md, etc.)
- openapi.json / openapi.yaml (API specs)
- Code comments and docstrings in key files
```

Build an inventory of what exists:

```
## Documentation Found

Root level:
- README.md
- OIDC-SETUP.md

docs/:
- docs/ARCHITECTURE.md
- docs/DEPLOYMENT.md
- docs/DEVELOPER.md
- docs/TECHNICAL_REFERENCE.md

.kiro/steering/:
- .kiro/steering/development-guide.md
- .kiro/steering/code-index.md
- .kiro/steering/testing-guide.md

.kiro/skills/:
- .kiro/skills/testing.md
- .kiro/skills/docs.md

Backend docs:
- backend/auth/README.md
- backend/shared/LOGGING_QUICK_REFERENCE.md
- backend/shared/SCHEMA.md
- backend/scripts/README.md

Frontend docs:
- src/README.md
- src/test/README.md
```

If no documentation exists yet, note that and move to Step 2 — the gap analysis will propose a starter set.

---

### Step 2: Understand What Changed

Get the diff against the main branch:

```bash
git diff main...HEAD --name-only          # files changed
git diff main...HEAD                      # full diff
git log main...HEAD --oneline             # commit summary
```

Read each changed file. Reason about what the changes mean semantically — not just which files changed, but what behavior, structure, or interface changed. Also check test files for new behavior that should be documented.

```
## Changes Detected

New files:
- backend/application/upvote_handler.py              → new API endpoint for upvoting
- src/components/UpvoteButton.tsx                    → new UI component
- backend/tests/acceptance/test_upvoting.py          → new acceptance tests

Modified files:
- backend/shared/models.py                           → added UpvoteRequest model
- backend/shared/dynamodb_utils.py                   → new upvote access patterns
- src/services/applicationService.ts                 → added upvoteApplication method
- template.yaml                                      → new Lambda function, DynamoDB GSI

Deleted files:
- None
```

If changes are unclear — new endpoint with no obvious doc target, architectural shift, removal of a pattern — ask before proceeding:

- "I see a new Lambda function in `template.yaml`. Should this be documented in ARCHITECTURE.md or TECHNICAL_REFERENCE.md?"
- "A new DynamoDB access pattern was added. Should this update SCHEMA.md?"
- "New authentication flow detected. Does this need a dedicated guide?"

---

### Step 3: Map Changes to Documentation

Cross-reference what changed against what exists. Use this table as a starting point — supplement with reasoning about the specific changes:

| Code location changed              | Documentation likely affected                                |
| ---------------------------------- | ------------------------------------------------------------ |
| `src/components/`                  | `code-index.md`, `TECHNICAL_REFERENCE.md`                    |
| `src/pages/`                       | `code-index.md`, `ARCHITECTURE.md`                           |
| `src/hooks/`                       | `code-index.md`, `TECHNICAL_REFERENCE.md`                    |
| `src/services/`                    | `code-index.md`, `TECHNICAL_REFERENCE.md`                    |
| `src/contexts/`                    | `code-index.md`, `ARCHITECTURE.md`                           |
| `backend/*/handler.py`             | `code-index.md`, `TECHNICAL_REFERENCE.md`, `ARCHITECTURE.md` |
| `backend/shared/models.py`         | `code-index.md`, `SCHEMA.md`, `TECHNICAL_REFERENCE.md`       |
| `backend/shared/dynamodb_utils.py` | `SCHEMA.md`, `TECHNICAL_REFERENCE.md`                        |
| `backend/auth/`                    | `code-index.md`, `ARCHITECTURE.md` (auth flow)               |
| `template.yaml`                    | `ARCHITECTURE.md`, `DEPLOYMENT.md`, `TECHNICAL_REFERENCE.md` |
| `package.json` dependencies        | `DEVELOPER.md`, `development-guide.md`                       |
| `backend/pyproject.toml`           | `DEVELOPER.md`, `development-guide.md`                       |
| `.env.*` files                     | `DEPLOYMENT.md`, `development-guide.md`                      |
| `Makefile`                         | `DEVELOPER.md`, `development-guide.md`                       |
| New test patterns                  | `testing-guide.md`, `testing.md` skill                       |
| New integration (AWS service)      | `ARCHITECTURE.md`, possibly new guide                        |

**code-index.md is always checked.** Every structural code change — new file, new class, deleted file — potentially affects it.

---

### Step 4: Produce the Documentation Sync Report

Present the full report before making any changes:

```
## Documentation Sync Report

### Documentation found
[list of existing doc files organized by location]

### Changes detected
[semantic summary of what changed in the PR/commits]

### Updates needed

For each affected existing doc:
- File: [path]
- What changes: [description]
- Rationale: [why this needs updating]

### Gaps identified
[docs that don't exist yet but should, given the current codebase]

### Proposed changes

For each file:

**File:** [path]
**Change type:** add / update / remove
**Current:**
[excerpt of existing content]

**Proposed:**
[new content]

**Rationale:**
[why]
```

Wait for approval before proceeding to Step 5.

---

### Step 5: Apply Documentation Changes

After receiving approval, apply changes systematically:

**For straightforward updates** (adding entries, updating commands, fixing stale references):

- Use `strReplace` for targeted edits
- Use `fsAppend` for adding new sections
- Use `fsWrite` only for new files

**For code-index.md updates:**

- Read the entire file first to understand structure
- Add new entries in the correct section
- Update existing entries if behavior changed
- Remove entries for deleted files
- Maintain alphabetical or logical ordering

**For architecture/technical docs:**

- Read surrounding context before editing
- Maintain consistent voice and style
- Keep examples minimal and focused
- Update diagrams descriptions if visual elements changed

**For development guides:**

- Update commands if they changed
- Add new setup steps if dependencies added
- Update file structure if organization changed
- Keep quick reference tables current

Apply changes one file at a time. Re-read each file before editing to ensure context is fresh.

---

### Step 6: Verify

After all changes are applied:

- Re-read each updated file to confirm changes applied correctly
- Check that internal links still resolve (e.g., `[see SCHEMA.md](backend/shared/SCHEMA.md)`)
- Verify code examples are syntactically correct
- Confirm no references to deleted files remain
- Ensure consistency in terminology across docs

Summarize what was updated and flag anything that needs manual review:

```
## Documentation Updated

✓ code-index.md
  - Added ApplicationUpvoting section
  - Added UpvoteButton component entry
  - Added upvoteApplication service method

✓ TECHNICAL_REFERENCE.md
  - Added upvoting API endpoint documentation
  - Updated Application model with upvote fields

✓ SCHEMA.md
  - Added upvote access pattern
  - Documented new GSI for upvote queries

⚠ Manual review needed:
  - ARCHITECTURE.md: Consider adding sequence diagram for upvote flow
  - README.md: May want to mention upvoting in feature list
```

---

## MadeWithKiro-Specific Patterns

### Documentation Structure

This project has a well-defined documentation structure:

**Root level:**

- `README.md` - Project overview, quick start, high-level features
- `OIDC-SETUP.md` - OAuth/OIDC configuration guide

**docs/ directory:**

- `ARCHITECTURE.md` - System architecture, data flow, auth flow
- `DEPLOYMENT.md` - Deployment process, environments, infrastructure
- `DEVELOPER.md` - Developer setup, common tasks, troubleshooting
- `TECHNICAL_REFERENCE.md` - API endpoints, models, utilities reference

**.kiro/steering/ (always-on context):**

- `development-guide.md` - Coding standards, tech stack, conventions
- `code-index.md` - Complete file/symbol map of the codebase
- `testing-guide.md` - Quick testing reference

**.kiro/skills/ (on-demand):**

- `testing.md` - Comprehensive testing framework
- `docs.md` - This documentation skill

**Module-specific:**

- `backend/auth/README.md` - Authentication flow details
- `backend/shared/LOGGING_QUICK_REFERENCE.md` - Logging patterns
- `backend/shared/SCHEMA.md` - DynamoDB schema and access patterns
- `src/test/README.md` - Frontend testing setup

### Update Priorities

When changes affect multiple docs, prioritize in this order:

1. **code-index.md** - Always update first, it's the source of truth for file locations
2. **SCHEMA.md** - If DynamoDB access patterns changed
3. **TECHNICAL_REFERENCE.md** - If APIs, models, or utilities changed
4. **ARCHITECTURE.md** - If system design or data flow changed
5. **development-guide.md** - If coding patterns or conventions changed
6. **DEVELOPER.md** - If setup steps or commands changed
7. **DEPLOYMENT.md** - If infrastructure or deployment process changed
8. **README.md** - If high-level features or quick start changed

### Common Update Patterns

**New Lambda function:**

```
Update:
- code-index.md (Backend Source Map section)
- TECHNICAL_REFERENCE.md (API Endpoints or Lambda Functions section)
- ARCHITECTURE.md (if it changes data flow)
- template.yaml is self-documenting, but note in DEPLOYMENT.md if special config needed
```

**New React component:**

```
Update:
- code-index.md (Frontend Source Map → Components section)
- TECHNICAL_REFERENCE.md (if it's a significant UI pattern)
```

**New DynamoDB access pattern:**

```
Update:
- SCHEMA.md (Access Patterns section)
- code-index.md (if new utility function added)
- TECHNICAL_REFERENCE.md (if it's a public API)
```

**New environment variable:**

```
Update:
- development-guide.md (Adding Things table)
- DEPLOYMENT.md (Environment Configuration section)
- .env.example (add the variable)
```

**New dependency:**

```
Update:
- development-guide.md (Technology Stack section)
- DEVELOPER.md (if it requires setup steps)
```

### Style Guidelines

**Voice:**

- Direct and concise
- Use present tense ("The handler processes..." not "The handler will process...")
- Use active voice ("The system validates..." not "Validation is performed...")

**Code examples:**

- Always include language identifier in code blocks
- Keep examples minimal and focused
- Use realistic values, not foo/bar
- Include comments only when necessary for clarity

**Structure:**

- Use headers for navigation
- Use tables for structured data
- Use bullet lists for steps or options
- Use numbered lists only for sequential steps

**Links:**

- Use relative paths for internal docs
- Use descriptive link text, not "click here"
- Verify links resolve after updates

---

## Limitations

This skill does not:

- Auto-commit documentation — always requires approval
- Generate docs for code it hasn't read
- Make assumptions about undocumented behavior
- Create diagrams (but will flag when one would help)
- Update external documentation (wikis, Notion, etc.)

---

## Example Workflow

```
User: "I just added upvoting functionality. Can you sync the docs?"

Agent (using docs skill):

1. Discover existing documentation
   → Found: code-index.md, ARCHITECTURE.md, TECHNICAL_REFERENCE.md, SCHEMA.md, etc.

2. Understand what changed
   → git diff main...HEAD
   → Read: backend/application/upvote_handler.py, src/components/UpvoteButton.tsx, etc.
   → Semantic analysis: New upvoting feature with API endpoint, UI component, DynamoDB pattern

3. Map changes to documentation
   → code-index.md: needs new entries
   → TECHNICAL_REFERENCE.md: needs API endpoint docs
   → SCHEMA.md: needs new access pattern
   → ARCHITECTURE.md: may need data flow update

4. Produce sync report
   → Present full report with proposed changes
   → Wait for approval

5. Apply changes (after approval)
   → Update code-index.md
   → Update TECHNICAL_REFERENCE.md
   → Update SCHEMA.md
   → Update ARCHITECTURE.md

6. Verify
   → Re-read updated files
   → Check links
   → Summarize changes
```

---

## Tips for Effective Use

**Be specific about scope:**

- "Sync docs for the upvoting feature" → focused on specific changes
- "Check all docs for drift" → comprehensive review
- "Update code-index.md only" → targeted update

**Provide context:**

- "I just merged 3 PRs, can you check for doc drift?" → scan recent history
- "About to open a PR, review docs" → pre-merge check
- "Refactored auth flow, update architecture docs" → specific area

**Review before approval:**

- Check that proposed changes are accurate
- Verify examples match actual code
- Ensure terminology is consistent
- Flag anything that needs more detail

**Iterate if needed:**

- "The ARCHITECTURE.md update needs more detail on the data flow"
- "Add an example to the TECHNICAL_REFERENCE.md section"
- "Update the code-index.md entry to include the new methods"
