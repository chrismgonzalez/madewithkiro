# Developer Guide

This guide covers local development setup, testing, and contributing to MadeWithKiro.

## Prerequisites

Before you begin, install these tools:

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [uv](https://docs.astral.sh/uv/) - Python package manager
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) - For AWS deployment
- [AWS CLI](https://aws.amazon.com/cli/) - AWS command line interface
- AWS Account with appropriate permissions (for deployment)

## Quick Start

### 1. Install Dependencies

```bash
make install
```

This installs both frontend (Bun) and backend (uv) dependencies.

### 2. Start Local Development

```bash
make dev
```

The app will be available at http://localhost:5173

### 3. Run Tests

```bash
make test
```

## Available Commands

Run `make help` to see all available commands:

- `make install` - Install all dependencies
- `make dev` - Start local development server
- `make build` - Build frontend for production
- `make test` - Run all tests
- `make deploy-dev` - Deploy to development environment
- `make deploy-prod` - Deploy to production environment
- `make logs` - Tail Lambda logs
- `make outputs-dev` - Show CloudFormation outputs
- `make clean` - Clean build artifacts
- `make check-deps` - Check if required tools are installed

## Project Structure

```
.
├── src/                    # React frontend
│   ├── components/        # UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   └── types/            # TypeScript types
├── backend/
│   ├── profile/          # Profile Lambda function
│   ├── application/      # Application Lambda function
│   └── shared/           # Shared utilities
├── template.yaml         # AWS SAM template
├── samconfig.toml        # SAM configuration
├── Makefile             # Deployment automation
└── docs/                # Documentation
```

## Technology Stack

### Frontend

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: lucide-react
- **Data Fetching**: TanStack Query (React Query)

### Backend

- **Runtime**: AWS Lambda (Python 3.13)
- **Database**: DynamoDB (single-table design)
- **Authentication**: AWS Cognito
- **API**: API Gateway with Cognito authorizer

### Infrastructure

- **Hosting**: S3 + CloudFront
- **DNS**: Route 53 (optional)
- **SSL/TLS**: ACM Certificate
- **IaC**: AWS SAM (Serverless Application Model)

## Environment Configuration

### Environment Variables

The frontend requires environment variables for API configuration.

After deploying the backend, run the setup script to populate your `.env` files from CloudFormation outputs:

```bash
./scripts/setup-env.sh
```

Or get the values manually:

```bash
make outputs-dev
```

Then update `.env.development` with the `ApiUrl` output value. See `.env.example` for the full list of required variables.

## Seeding Test Data

The backend includes a seed script to populate DynamoDB with test data:

**Seed database with test data:**

```bash
make seed-db
```

This creates:

- Sample user profiles
- 10+ sample applications with various tags

**Clean and reseed database:**

```bash
make seed-db-clean
```

This deletes all existing data before seeding fresh data.

## API Integration

### TanStack Query (React Query)

The application uses TanStack Query for data fetching, caching, and synchronization:

- **Automatic caching**: API responses are cached for 5 minutes
- **Background refetching**: Data is automatically refreshed in the background
- **Optimistic updates**: UI updates immediately before server confirmation
- **Request deduplication**: Multiple identical requests are automatically deduplicated
- **Automatic retries**: Failed requests are retried with exponential backoff

### API Services

The frontend includes service modules that abstract API communication:

- **`apiClient.ts`**: Core HTTP client with retry logic and error handling
- **`profileService.ts`**: Profile-related API operations (get, create, update)
- **`applicationService.ts`**: Application-related API operations (list, create)

### Custom Hooks

React hooks provide a clean interface for components to interact with the API:

- **`useProfile(userId)`**: Fetch and update user profiles with optimistic updates
- **`useApplications(userId?)`**: Fetch applications (all or by user) with optimistic creation
- **`useData()`**: Legacy hook using mock data (still used by application editing feature)

Example usage:

```typescript
import { useProfile } from "@/hooks/useProfile";

function ProfilePage({ userId }: { userId: string }) {
  const { profile, isLoading, error, updateProfile } = useProfile(userId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <ProfileView profile={profile} onUpdate={updateProfile} />;
}
```

**Note:** Some features (like application editing) still use mock data services. These will be migrated to real API services in future updates.

## Testing

### Frontend Tests

The frontend includes comprehensive test coverage:

- **Unit tests**: Service functions, utilities, and hooks
- **Component tests**: UI components with user interactions
- **Integration tests**: Complete user flows with mocked API
- **Property-based tests**: Correctness properties validated with fast-check

Run frontend tests only:

```bash
bun run test
```

### Backend Tests

The backend includes tests for Lambda functions and DynamoDB operations:

```bash
cd backend && uv run pytest
```

## Monitoring

View Lambda logs in real-time:

```bash
make logs
```

Or view specific function logs:

```bash
make logs-profile
make logs-application
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `make dev`
4. Run tests with `make test`
5. Deploy to dev with `make deploy-dev` (if needed)
6. Submit a pull request

## Code Standards

- Follow mobile-first responsive design patterns
- Use TypeScript with strict typing
- Write tests for new features
- Follow the existing code structure
- Use shadcn/ui components for UI elements

## Need Help?

- Check the [Architecture Overview](ARCHITECTURE.md) for system design
- See [Deployment Guide](DEPLOYMENT.md) for AWS deployment
- Review existing code for patterns and examples
