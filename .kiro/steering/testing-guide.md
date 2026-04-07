---
inclusion: auto
---

# Testing Guide

> For comprehensive testing guidance including the 4-layer architecture, DSL patterns, and protocol drivers, ask Kiro to use the `testing` skill.

## Test-First Development

Always write tests before implementation. Follow the red-green-refactor cycle:

1. Write a failing test (red)
2. Write minimal code to pass (green)
3. Refactor while keeping tests green

## Quick Reference

### Test Structure

All tests use Given-When-Then format to describe behavior:

```typescript
describe("Feature: [Feature Name]", () => {
  describe("Scenario: [Scenario Name]", () => {
    test("Given [context] When [action] Then [outcome]", async () => {
      // Test implementation
    });
  });
});
```

### Test Locations

- Frontend: `src/__tests__/acceptance/`, `src/__tests__/unit/`
- Backend: `backend/tests/acceptance/`, `backend/tests/unit/`
- Property-based: `src/__tests__/property/`

### Running Tests

```bash
# Frontend
bun run test              # All tests
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report

# Backend
cd backend && uv run pytest                    # All tests
cd backend && uv run pytest -v                 # Verbose
cd backend && uv run pytest --cov=.            # Coverage
```

### When to Use the Testing Skill

Ask Kiro to use the `testing` skill when you need:

- Guidance on the 4-layer test architecture (Scenarios → DSL → Protocol Driver → System)
- Help creating a new test domain with DSL and protocol driver
- Examples of realistic test data and fixture design
- Patterns for mocking external dependencies while running real business logic
- Detailed scenario design guidance (happy path, boundary, failure cases)
