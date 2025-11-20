# Testing Structure

## Overview

This project uses Vitest for unit testing and fast-check for property-based testing, following BDD/TDD methodology.

## Test Organization

```
src/
  test/
    setup.ts              # Test configuration and global setup
    utils.tsx             # Custom render functions and test utilities
    setup.test.ts         # Verify test setup works
  components/
    __tests__/            # Component unit tests
  services/
    __tests__/            # Service layer tests
  utils/
    __tests__/            # Utility function tests
  __tests__/
    property/             # Property-based tests
```

## Running Tests

```bash
# Run all tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage
```

## Testing Guidelines

### Unit Tests

- Test components with React Testing Library
- Test utility functions and hooks
- Focus on behavior, not implementation
- Use descriptive test names

### Property-Based Tests

- Use fast-check for property-based testing
- Configure minimum 100 iterations per property
- Tag tests with property numbers from design doc
- Format: `// Feature: madewithkiro-mvp, Property X: [description]`

### BDD/TDD Workflow

1. **Write Acceptance Tests First** - Given-When-Then format
2. **Red** - Run tests and watch them fail
3. **Green** - Write minimal code to make tests pass
4. **Refactor** - Improve code quality while keeping tests green

## Custom Test Utilities

### renderWithProviders

Wraps components with necessary providers (QueryClient, etc.):

```typescript
import { render } from "@/test/utils";

test("renders component", () => {
  render(<MyComponent />);
  // assertions...
});
```

## Property-Based Testing

Example property test:

```typescript
import * as fc from "fast-check";

// Feature: madewithkiro-mvp, Property 1: Profile required fields validation
fc.assert(
  fc.property(profileArbitrary, (profile) => {
    const invalidProfile = { ...profile, firstName: "" };
    const result = validateProfile(invalidProfile);
    return result.isValid === false;
  }),
  { numRuns: 100 }
);
```
