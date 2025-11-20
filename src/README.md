# Source Code Structure

This directory contains the frontend application source code organized by feature and responsibility.

## Directory Structure

```
src/
├── components/       # Reusable UI components
│   └── ui/          # shadcn/ui components (auto-generated)
├── pages/           # Page-level components (route components)
├── hooks/           # Custom React hooks
├── contexts/        # React Context providers
├── services/        # API and external service integrations
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
├── constants/       # Application constants and configuration
├── config/          # Environment and app configuration
└── lib/             # Third-party library utilities (e.g., shadcn utils)
```

## Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)
- **Types/Interfaces**: PascalCase (e.g., `UserProfile`)

## Key Files

- `App.tsx` - Main application component
- `main.tsx` - Application entry point
- `index.css` - Global styles and Tailwind imports
- `vite-env.d.ts` - TypeScript environment variable types
