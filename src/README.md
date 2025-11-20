# MadeWithKiro Frontend Structure

## Overview

This is the frontend application for MadeWithKiro, built with React, TypeScript, and Vite following a mobile-first, component-driven architecture.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Package Manager**: Bun
- **Routing**: Tanstack Router
- **Data Fetching**: Tanstack Query
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: lucide-react
- **Testing**: Vitest + React Testing Library + fast-check

## Folder Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (auto-generated)
│   └── __tests__/      # Component unit tests
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── contexts/           # React contexts (Auth, Theme, etc.)
├── services/           # API and data service layer
│   └── __tests__/      # Service tests
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   └── __tests__/      # Utility tests
├── constants/          # Application constants
├── config/             # Configuration files
├── lib/                # Third-party library configurations
├── test/               # Test setup and utilities
│   ├── setup.ts        # Global test configuration
│   ├── utils.tsx       # Custom test utilities
│   └── README.md       # Testing documentation
└── __tests__/          # Integration and property tests
    └── property/       # Property-based tests
```

## Key Directories

### `/components`

Reusable UI components following atomic design principles:

- **ui/**: shadcn/ui components (Button, Card, Input, etc.)
- Custom components (ApplicationCard, ProfileForm, etc.)
- Each component should be self-contained with its own types

### `/pages`

Page-level components that correspond to routes:

- Gallery page
- Profile view/edit pages
- Add application page

### `/hooks`

Custom React hooks for reusable logic:

- Data fetching hooks (useApplications, useProfile)
- Form hooks
- Authentication hooks

### `/contexts`

React Context providers for global state:

- MockAuthContext (for MVP)
- Future: Real AuthContext

### `/services`

Data access layer and API integration:

- mockDataService.ts (MVP implementation)
- Future: apiService.ts (real backend)

### `/types`

TypeScript type definitions:

- Domain models (User, Application)
- Form types
- API request/response types

### `/utils`

Utility functions:

- Validation helpers
- Formatting functions
- Data transformation

### `/test`

Testing infrastructure:

- Test setup and configuration
- Custom render functions
- Test utilities and helpers

## Development Workflow

### Running the Application

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

### Running Tests

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

## Code Style Guidelines

### Component Structure

```typescript
// ComponentName.tsx
import { FC } from 'react';

interface ComponentNameProps {
  // Props definition
}

export const ComponentName: FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // Component logic

  return (
    // JSX
  );
};
```

### Custom Hooks

```typescript
// useCustomHook.ts
import { useState, useEffect } from "react";

export const useCustomHook = (param: string) => {
  // Hook logic

  return { data, isLoading, error };
};
```

### Service Layer

```typescript
// service.ts
export const serviceName = {
  async getData(): Promise<DataType> {
    // Service logic
  },
};
```

## Path Aliases

The project uses path aliases for cleaner imports:

```typescript
// Instead of: import { Component } from '../../../components/Component'
import { Component } from "@/components/Component";
```

## Testing Strategy

### BDD/TDD Approach

1. Write acceptance tests first (Given-When-Then)
2. Run tests and watch them fail (Red)
3. Write minimal code to pass tests (Green)
4. Refactor while keeping tests green

### Test Types

- **Unit Tests**: Component and function tests
- **Property Tests**: Property-based tests with fast-check
- **Integration Tests**: Multi-component interactions

See `/test/README.md` for detailed testing documentation.

## Mobile-First Design

All components should be built mobile-first:

- Start with 320px viewport
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Ensure touch targets are at least 44x44px
- Test on mobile devices regularly

## Next Steps

1. Install shadcn/ui components as needed
2. Create mock data layer
3. Implement authentication context
4. Build core components
5. Set up routing
6. Add forms and validation

## Resources

- [React Documentation](https://react.dev)
- [Tanstack Router](https://tanstack.com/router)
- [Tanstack Query](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com)
- [Vitest](https://vitest.dev)
- [fast-check](https://fast-check.dev)
