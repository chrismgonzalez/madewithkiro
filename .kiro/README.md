# Kiro Configuration

This directory contains Kiro-specific configuration for the MadeWithKiro project.

## Structure

```
.kiro/
├── skills/              # On-demand specialized guidance
│   ├── testing.md       # 4-layer acceptance testing framework
│   └── docs.md          # Documentation sync process
├── steering/            # Always-on context and guidance
│   ├── development-guide.md    # Coding standards, tech stack
│   ├── code-index.md           # Complete file/symbol map
│   ├── testing-guide.md        # Testing quick reference
│   ├── docs-guide.md           # Documentation quick reference
│   ├── architecture.md         # System architecture overview
│   └── mobile-first-design.md  # Responsive design patterns
├── hooks/               # Automated agent triggers
│   └── source-to-docs-sync.kiro.hook  # Doc drift detection
└── specs/               # Feature specifications
    └── application-upvoting/
        ├── requirements.md
        └── design.md
```

## Skills

Skills are comprehensive guides loaded on-demand to keep context focused.

### testing.md

**When to use:** When writing tests, building test infrastructure, or deciding what kind of test to write.

**Provides:**

- 4-layer acceptance testing architecture (Scenarios → DSL → Protocol Driver → System)
- TypeScript and Python examples adapted to MadeWithKiro
- Realistic test data and fixture design guidance
- Scenario design patterns (happy path, boundary, failure)
- MadeWithKiro-specific mocking patterns

**Activate with:**

- "Use the testing skill to help me write tests for upvoting"
- "Create a DSL for the application domain"
- "Set up acceptance tests for profile editing"

### docs.md

**When to use:** When syncing docs, checking for drift, or updating documentation after code changes.

**Provides:**

- 6-step documentation sync process
- Discovery of existing documentation
- Semantic change analysis
- Gap identification
- Systematic update proposals
- MadeWithKiro-specific documentation patterns

**Activate with:**

- "Use the docs skill to sync documentation"
- "Check for doc drift before this PR"
- "Update docs for the upvoting feature"

## Steering Files

Steering files are always-on context that guides Kiro's behavior.

### development-guide.md

Core development guidance including:

- Quick start commands
- Technology stack
- Coding standards (TypeScript, React, Python)
- Testing requirements
- Package management
- File structure and naming conventions

### code-index.md

Complete map of the codebase:

- Frontend source map (components, pages, hooks, services, contexts)
- Backend source map (handlers, auth triggers, shared utilities)
- Infrastructure and configuration files
- Key patterns and architecture
- Testing strategy

**Always update when:**

- Adding new files
- Renaming or moving files
- Deleting files
- Adding new exported functions/classes

### testing-guide.md

Quick testing reference:

- Test-first development principles
- Test structure (Given-When-Then)
- Test locations
- Running tests
- When to use the testing skill

### docs-guide.md

Quick documentation reference:

- Documentation structure
- What to update when code changes
- When to use the docs skill

### architecture.md

High-level system architecture:

- Frontend architecture (React, TanStack Router/Query)
- Backend architecture (Lambda, DynamoDB)
- Authentication flow (Cognito, OTP, OAuth)
- Data models and access patterns

### mobile-first-design.md

Responsive design patterns:

- Breakpoints and media queries
- Mobile-first component patterns
- Touch-friendly interactions
- Performance considerations

## Hooks

Hooks automate agent actions based on IDE events.

### source-to-docs-sync.kiro.hook

**Trigger:** User-triggered (manual)

**Action:** Asks agent to use the docs skill to check for documentation drift

**Use when:**

- Before opening a PR
- After completing a feature
- After a refactor
- When you suspect docs are stale

**Trigger from:** Kiro Hooks panel in the IDE or command palette

## Specs

Specs are structured feature development workflows:

- Requirements definition
- Design documentation
- Implementation tasks
- Incremental development with control and feedback

See individual spec directories for feature-specific documentation.

## Best Practices

### When to Use Skills vs Steering

**Use skills when:**

- You need comprehensive, detailed guidance
- Building new infrastructure (test DSLs, documentation systems)
- Learning a new pattern or framework
- Need step-by-step processes

**Use steering when:**

- You need quick reference information
- Following established patterns
- Checking conventions or standards
- Getting oriented in the codebase

### Keeping Configuration in Sync

**Update steering files when:**

- Project structure changes
- New conventions are established
- Technology stack changes
- Common patterns emerge

**Update skills when:**

- Processes evolve
- New frameworks are adopted
- Best practices change
- Examples need updating

**Update hooks when:**

- Workflow automation needs change
- New events need monitoring
- Trigger conditions change

## Contributing

When adding new configuration:

1. **Skills:** Create for comprehensive, process-oriented guidance
2. **Steering:** Create for quick reference and always-on context
3. **Hooks:** Create for workflow automation
4. **Specs:** Create for structured feature development

Keep all configuration files:

- Focused and single-purpose
- Well-documented with examples
- Adapted to MadeWithKiro patterns
- Up-to-date with the codebase
