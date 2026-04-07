---
inclusion: always
---

# Development Guide

## Quick Start

```sh
make install                   # install dependencies (bun + uv)
make dev                       # start Vite dev server
make test                      # run all tests (frontend + backend)
make build                     # build frontend for production
make deploy-dev                # deploy to dev environment
make deploy-prod               # deploy to production
```

> Use `make seed-db` to populate DynamoDB with test data after deploying.
> Use `make check-deps` to verify all required tools are installed.

## Codebase Index

When searching the code during research, debugging, or implementation, read `code-index.md` (steering) — it maps every component, hook, service, handler, and utility to its exact file and location.

## Development Guidelines

1. All production code must have a test. Prefer acceptance tests that describe behavior in Gherkin format. Unit tests are for isolated logic too granular for acceptance tests.

2. Tests first. Write or update the test before writing implementation code. If a behavior changes, update the test first, then make it pass. Follow the red-green-refactor cycle.

3. Author the simplest implementation that works. Do not over-engineer. Start with the simplest code that is correct, readable, and easy to extend. Avoid abstractions not justified by a current need.

4. Do not rewrite complete files — only fix what needs to be fixed.

5. No need for abundant comments or summary documentation unless asked.

## Technology Stack

- Frontend: React 18 + TypeScript + Vite + TanStack Router/Query
- Styling: Tailwind CSS + shadcn/ui + lucide-react
- Backend: Python 3.13 + AWS Lambda + DynamoDB
- Infrastructure: AWS SAM + CloudFormation
- Auth: AWS Cognito (OTP + Google OAuth)
- Package managers: Bun (frontend), uv (backend)

## Coding Standards

### TypeScript

- Strict mode enabled
- Explicit types for props, state, and function parameters
- Avoid `any` — use interfaces for object shapes, types for unions/primitives

### React

- Functional components with hooks
- Error boundaries for error handling
- Single responsibility per component
- React.memo() for expensive re-renders
- Context API over prop drilling

### shadcn/ui & Icons

- Install components: `bunx shadcn-ui@latest add <component>`
- Customize in `src/components/ui/`
- Icons: `import { IconName } from 'lucide-react'` (sizes: 16, 20, 24)
- Standalone icons need aria-labels

### Mobile-First Design

See `mobile-first-design.md` for responsive patterns, breakpoints, and component examples.

### Package Management

- Frontend: `bun install`, `bun run <script>`
- Backend: `uv` with `pyproject.toml`, `uv pip compile` for lock files

## Testing

```sh
bun run test                   # frontend tests
bun run test:watch             # watch mode
bun run test:coverage          # coverage report
bun run test:property          # property-based tests
cd backend && uv run pytest    # backend tests
make test                      # all tests
```

- Frontend: Vitest + React Testing Library + fast-check (property-based)
- Backend: pytest + moto (DynamoDB mocking) + unittest.mock
- Tests validate behavior, not implementation details

## Infrastructure

- All infrastructure defined in `template.yaml`
- Environment variables for configuration
- IAM roles with least privilege
- CloudFormation parameters for environment-specific values
- DynamoDB: single-table design, composite keys (PK/SK), GSIs for query flexibility
- Cognito: User Pools for auth, token refresh logic, secure token storage

## Security

- Never commit AWS credentials or secrets
- Use environment variables for sensitive data
- Proper CORS policies (no wildcards in production)
- Validate all user inputs
- Cognito for authentication — no custom auth solutions

## Adding Things

| What                        | Where                                                        |
| --------------------------- | ------------------------------------------------------------ |
| New React component         | `src/components/`                                            |
| New page                    | `src/pages/` + add route in `src/router.tsx`                 |
| New hook                    | `src/hooks/`                                                 |
| New API service method      | `src/services/`                                              |
| New TypeScript type         | `src/types/index.ts`                                         |
| New utility function        | `src/utils/`                                                 |
| New shadcn/ui component     | `bunx shadcn-ui@latest add <name>`                           |
| New Lambda handler          | `backend/<module>/handler.py` + `template.yaml`              |
| New DynamoDB access pattern | `backend/shared/dynamodb_utils.py`                           |
| New Pydantic model          | `backend/shared/models.py`                                   |
| New environment variable    | `.env.development` / `.env.production` + `src/config/env.ts` |
| New SSM parameter           | `scripts/setup-ssm-parameters.sh`                            |
| New infrastructure resource | `template.yaml`                                              |

## File Structure

```
src/
  components/ui/    # shadcn/ui (auto-generated)
  components/       # custom components
  pages/            # page-level components
  hooks/            # custom React hooks
  contexts/         # React contexts
  services/         # API and AWS service integrations
  types/            # TypeScript type definitions
  utils/            # utility functions
  config/           # app configuration (Amplify, env, queryClient)

backend/
  auth/             # Cognito Lambda triggers
  profile/          # Profile API handler
  application/      # Application API handler
  shared/           # shared utilities (DynamoDB, CORS, logging, errors)
  scripts/          # database seeding
  tests/            # backend tests
```

## Naming Conventions

- Components: PascalCase (`UserProfile.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`)
- Utilities: camelCase (`formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)
- Types/Interfaces: PascalCase (`User.ts`)
