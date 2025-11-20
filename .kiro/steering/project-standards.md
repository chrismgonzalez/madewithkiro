# Project Standards

## Technology Stack

### Frontend

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Package Manager**: Bun
- **Design Approach**: Mobile-first responsive design
- **Styling**: Tailwind CSS (already configured)
- **UI Components**: shadcn/ui (component library)
- **Icons**: lucide-react (icon library)

### Infrastructure (AWS SAM)

- **Compute**: AWS Lambda (serverless functions)
- **Database**: DynamoDB (NoSQL database)
- **Storage**: S3 (object storage)
- **CDN**: CloudFront (content delivery)
- **Authentication**: Cognito (user management)
- **Infrastructure as Code**: AWS SAM (Serverless Application Model)

## Development Guidelines

### TypeScript

- Use strict TypeScript configuration
- Define explicit types for props, state, and function parameters
- Avoid `any` type unless absolutely necessary
- Use interfaces for object shapes and types for unions/primitives

### React Best Practices

- Use functional components with hooks
- Implement proper error boundaries
- Keep components small and focused on single responsibility
- Use React.memo() for expensive components that re-render frequently
- Prefer composition over prop drilling (use Context when needed)

### UI Components (shadcn/ui)

- Use shadcn/ui components as the foundation for UI elements
- Install components individually using `bunx shadcn-ui@latest add <component>`
- Customize components in `src/components/ui/` as needed
- Follow shadcn/ui's composition patterns for complex components
- Leverage the built-in accessibility features

### Icons (lucide-react)

- Use lucide-react for all icon needs
- Import icons individually: `import { IconName } from 'lucide-react'`
- Keep icon sizes consistent (use size prop: 16, 20, 24)
- Use semantic icon names that match their purpose
- Apply proper aria-labels for accessibility when icons are standalone

### Mobile-First Design

- Start with mobile layouts (320px minimum width)
- Use Tailwind's responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Test on mobile viewports first before scaling up
- Ensure touch targets are at least 44x44px
- Optimize images and assets for mobile bandwidth

### Package Management

**Frontend (Bun):**

- Use `bun install` for dependencies
- Use `bun run` for scripts
- Keep dependencies up to date and minimal
- Document any peer dependency requirements

**Backend (uv):**

- Use `uv` for Python package management
- Define dependencies in `pyproject.toml`
- Use `uv pip compile` to generate lock files
- Use `uv pip sync` to install dependencies
- Fast, reliable dependency resolution

### AWS SAM Structure

- Define all infrastructure in `template.yaml`
- Use environment variables for configuration
- Implement proper IAM roles with least privilege
- Tag all resources appropriately
- Use CloudFormation parameters for environment-specific values
- Bundle Lambda functions as zip files for deployment
- Use SAM build process to package dependencies

### DynamoDB Patterns

- Design single-table patterns where appropriate
- Use composite keys for access patterns
- Implement proper GSIs for query flexibility
- Consider read/write capacity and use on-demand when appropriate
- Always handle pagination for queries

### S3 Best Practices

- Use appropriate bucket policies and CORS configuration
- Implement lifecycle policies for cost optimization
- Use CloudFront for public assets
- Enable versioning for critical data

### Cognito Integration

- Use Cognito User Pools for authentication
- Implement proper token refresh logic
- Store tokens securely (httpOnly cookies or secure storage)
- Handle authentication state across the application

## Code Organization

### File Structure

```
src/
  components/
    ui/           # shadcn/ui components (auto-generated)
    ...           # Custom reusable components
  pages/          # Page-level components
  hooks/          # Custom React hooks
  contexts/       # React contexts
  services/       # API and AWS service integrations
  types/          # TypeScript type definitions
  utils/          # Utility functions
  constants/      # Application constants
```

### Naming Conventions

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useAuth.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- Types/Interfaces: PascalCase (e.g., `User.ts`)

## Testing

- Write Behavior Driven acceptance tests validating the behavior we expect to see
- Always follow BDD/TDD practice and use red, green, refactor method BEFORE writing new code
- Write unit tests for utility functions and hooks
- Test mobile responsiveness manually or with tools
- Test authentication flows thoroughly

## Performance

- Lazy load routes and heavy components
- Optimize images (use WebP, proper sizing)
- Minimize bundle size (analyze with `bun run build`)
- Use CloudFront caching effectively
- Implement proper loading states

## Security

- Never commit AWS credentials or secrets
- Use environment variables for sensitive data
- Implement proper CORS policies
- Validate all user inputs
- Use Cognito for authentication, not custom solutions
- Follow AWS security best practices


## Extra

- No need for abundant comments
- No need for summary documentation unless asked
