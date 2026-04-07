---
inclusion: always
---

# MadeWithKiro - Code Index

## Project Overview

**MadeWithKiro** is a serverless showcase platform built with React + TypeScript (frontend) and Python Lambda functions (backend), deployed on AWS using SAM (Serverless Application Model).

- **Frontend**: React 18 + TypeScript + Vite + TanStack Router/Query
- **Backend**: Python 3.13 + AWS Lambda + DynamoDB
- **Infrastructure**: AWS SAM + CloudFormation
- **Authentication**: AWS Cognito (OTP + Google OAuth)
- **Database**: DynamoDB (single-table design)
- **CDN**: CloudFront
- **Package Managers**: Bun (frontend), uv (backend)

---

## Frontend Source Map

### Entry Points

- **src/main.tsx** - App initialization, providers setup (PostHog, QueryClient, Router, Toaster)
- **src/router.tsx** - TanStack Router configuration, all routes defined
- **src/index.css** - Global Tailwind CSS styles
- **src/vite-env.d.ts** - Vite environment type definitions

### Configuration Files

- **src/config/amplify.ts** - AWS Amplify configuration for Cognito auth
- **src/config/env.ts** - Environment variable validation and config object
- **src/config/queryClient.ts** - TanStack Query client setup with defaults
- **src/config/**tests**/** - Config tests

### Components (src/components/)

#### Layout & Navigation

- **Layout.tsx** - Main layout wrapper with navigation
- **Navigation.tsx** - Navigation bar component
- **ThemeProvider.tsx** - Dark/light theme provider (next-themes)
- **ModeToggle.tsx** - Theme toggle button
- **KiroIcon.tsx** - Kiro logo/icon component

#### Authentication Components

- **AuthMethodSelector.tsx** - UI for selecting auth method (OTP/Google)
- **MagicLinkAuth.tsx** - Magic link/OTP authentication form
- **OTPAuthPage.tsx** - OTP authentication page layout
- **OTPInput.tsx** - OTP code input component
- **AccountLinkDialog.tsx** - Dialog for account linking confirmation
- **AccountLinkPrompt.tsx** - Prompt to link duplicate accounts

#### User Profile Components

- **ProfileForm.tsx** - Form for creating/editing user profile
- **ProfileView.tsx** - Display user profile information
- **EmptyProfile.tsx** - Empty state when no profile exists
- **UserAvatar.tsx** - User avatar display component

#### Application Components

- **ApplicationCard.tsx** - Card displaying application info
- **ApplicationForm.tsx** - Form for creating/editing applications
- **ApplicationGallery.tsx** - Gallery grid of applications with filtering

#### Utility Components

- **ProtectedRoute.tsx** - Route wrapper for authenticated-only pages
- **ErrorBoundary.tsx** - Error boundary for error handling
- **LoadingSpinner.tsx** - Loading indicator component
- **ui/** - shadcn/ui components (auto-generated, customizable)

#### Component Tests

- ****tests**/AccountLinkPrompt.test.tsx** - Account linking prompt tests
- ****tests**/ApplicationForm.test.tsx** - Application form tests
- ****tests**/ErrorBoundary.test.tsx** - Error boundary tests
- ****tests**/ProfileForm.test.tsx** - Profile form tests
- ****tests**/ProtectedRoute.simple.test.tsx** - Protected route tests
- ****tests**/ToastNotifications.test.tsx** - Toast notification tests

### Pages (src/pages/)

- **GalleryPage.tsx** - Public gallery of all applications
- **LandingPage.tsx** - Landing/home page
- **LoginPage.tsx** - Login page with auth method selection
- **AuthPage.tsx** - Legacy auth page (backward compatibility)
- **AuthCallbackPage.tsx** - OAuth callback handler
- **CreateProfilePage.tsx** - Profile creation page (protected)
- **ProfilePage.tsx** - User profile view/edit page (protected)
- **AddApplicationPage.tsx** - Create new application page (protected)
- **EditApplicationPage.tsx** - Edit existing application page (protected)
- **LinkAccountPage.tsx** - Account linking page (protected)
- **PrivacyPage.tsx** - Privacy policy page
- **TermsPage.tsx** - Terms of service page

### Hooks (src/hooks/)

#### Authentication & Account Linking

- **useAccountLinking.ts** - Account linking state and navigation management
  - `useAccountLinking()` - Main hook
  - `getIntendedDestination()` - Get redirect destination
  - `clearIntendedDestination()` - Clear redirect
  - `setIntendedDestination(path)` - Set redirect path

#### Data Fetching

- **useApplications.ts** - Fetch applications (all or by user)
  - `useApplications(userId?)` - Query hook for applications
- **useApplication.ts** - Fetch single application
  - `useApplication(appId)` - Query hook for single app

#### UI & Responsive

- **useMediaQuery.ts** - Media query hook for responsive design
  - `useMediaQuery(query)` - Returns boolean for media query match
- **usePageTracking.ts** - PostHog analytics tracking
  - `usePageTracking()` - Track page views

#### Hook Tests

- ****tests**/useApplications.test.tsx** - useApplications hook tests
- ****tests**/useApplications.cancellation.test.tsx** - Request cancellation tests
- ****tests**/useProfile.test.tsx** - useProfile hook tests
- ****tests**/useProfile.cancellation.test.tsx** - Profile request cancellation tests

### Contexts (src/contexts/)

- **AuthContext.tsx** - Authentication state and methods
  - `AuthUser` interface - User data structure
  - `OTPSignInResponse` interface - OTP sign-in response
  - `OTPConfirmResponse` interface - OTP confirmation response
  - `OTPRequestResponse` interface - OTP request response
  - `OTPVerifyResponse` interface - OTP verification response
  - `useAuth()` hook - Access auth context

- **PostHogContext.tsx** - Analytics context
  - `PostHogProvider` - Provider component
  - `usePostHog()` - Access PostHog instance

### Services (src/services/)

#### API Client

- **apiClient.ts** - HTTP client with request/response handling
  - `ApiClientConfig` interface - Client configuration
  - `RequestOptions` interface - Request options
  - `ApiResponse<T>` interface - Response wrapper
  - `ApiError` interface - Error structure
  - `ApiClientError` class - Custom error class
  - `ApiClient` class - Main HTTP client

#### Authentication Service

- **authService.ts** - Cognito authentication methods
  - `AuthService` class
  - `getAccessToken()` - Get access token
  - `getIdToken()` - Get ID token
  - `isAuthenticated()` - Check auth status
  - `refreshSession()` - Refresh tokens

#### Application Service

- **applicationService.ts** - Application CRUD operations
  - `ApplicationService` class
  - `listApplications(userId?)` - List applications
  - `createApplication(...)` - Create new application
  - `getApplication(appId)` - Get single application

#### Account Linking

- **accountLinking.ts** - Account linking API calls
  - `confirmAccountLink()` - Confirm account linking

#### Mock Data

- **mockData.ts** - Mock data for development/testing
  - `getAllUsers()` - Get all mock users
  - `getUserById(userId)` - Get mock user
  - `getAllApplications(isAuthenticated)` - Get mock applications
  - `getApplicationsByUserId(...)` - Get user's mock applications
  - `getAllTags(isAuthenticated)` - Get mock tags

#### Service Tests

- ****tests**/apiClient.cancellation.test.ts** - API client cancellation tests

### Types (src/types/)

- **index.ts** - All TypeScript type definitions
  - `UserProfile` interface - User profile data
  - `CreateProfileRequest` interface - Profile creation request
  - `UpdateProfileRequest` interface - Profile update request
  - `Application` interface - Application data
  - `CreateApplicationRequest` interface - Application creation request

### Utils (src/utils/)

- **analytics.ts** - Analytics utilities
  - `isPostHogEnabled()` - Check if PostHog is enabled

- **authErrors.ts** - Authentication error handling
  - `getOAuthErrorMessage(error)` - Get user-friendly error message

- **toast.ts** - Toast notification utilities
  - `showSuccessToast(message)` - Show success toast
  - `showErrorToast(message)` - Show error toast
  - `showLoadingToast(message)` - Show loading toast
  - `dismissToast(toastId)` - Dismiss specific toast
  - `dismissAllToasts()` - Dismiss all toasts

- **validation.ts** - Data validation utilities
  - `ValidationError` class - Custom validation error
  - `validateSchema<T>(data, schema)` - Validate against Zod schema
  - `validateUserProfile(data)` - Validate profile data
  - `validateApplication(data)` - Validate application data

### Constants (src/constants/)

- Currently empty, can be used for API endpoints, feature flags, etc.

### Lib (src/lib/)

- **utils.ts** - General utility functions (cn() for Tailwind class merging)

### Test Setup (src/test/)

- **setup.ts** - Vitest setup file (mocks, globals)
- **setup.test.ts** - Setup verification tests
- **utils.tsx** - Test utilities and helpers
- **shadcn-components.test.ts** - shadcn/ui component tests
- **README.md** - Testing documentation

### Test Files (src/**tests**/)

- **auth-routing.test.tsx** - Authentication routing tests
- **property/setup.property.test.ts** - Property-based tests for setup

---

## Backend Source Map

### Configuration & Setup

- **backend/pyproject.toml** - Python project configuration, dependencies
- **backend/requirements.txt** - Pinned dependencies
- **backend/uv.lock** - uv lock file for reproducible installs
- **backend/**init**.py** - Package initialization

### Authentication Module (backend/auth/)

#### Lambda Trigger Functions

- **define_auth_challenge.py** - Cognito trigger: Define auth flow
  - `lambda_handler(event, context)` - Main handler
  - `_count_failed_attempts(session)` - Count failed OTP attempts
  - `_mask_email(email)` - Mask email for logging

- **create_auth_challenge.py** - Cognito trigger: Generate & send OTP
  - `lambda_handler(event, context)` - Main handler
  - `create_cognito_user_if_not_exists(user_pool_id, email)` - Create user
  - `mask_email(email)` - Mask email
  - `get_last_otp_created_at(session)` - Get last OTP timestamp
  - `should_rate_limit(session, current_time)` - Check rate limiting

- **verify_auth_challenge.py** - Cognito trigger: Verify OTP code
  - `lambda_handler(event, context)` - Main handler

- **pre_signup.py** - Cognito trigger: Pre-signup validation
  - `lambda_handler(event, context)` - Main handler
  - `check_for_duplicate_users(email)` - Find duplicate accounts
  - `mask_email(email)` - Mask email

- **post_authentication.py** - Cognito trigger: Post-auth actions
  - `lambda_handler(event, context)` - Main handler
  - `_process_otp_user_authentication(...)` - Process OTP auth
  - `_set_linking_custom_attributes(...)` - Set account linking attributes
  - `handle_otp_user_profile(email, user_sub, user_pool_id, ...)` - Create profile
  - `_mask_email(email)` - Mask email

- **pre_token_generation.py** - Cognito trigger: Add custom claims to JWT
  - `lambda_handler(event, context)` - Main handler
  - `get_pending_link(user_sub)` - Get pending account link

#### API Endpoint Functions

- **register.py** - API: User registration
  - `lambda_handler(event, context)` - Main handler
  - `mask_email(email)` - Mask email

- **link_accounts.py** - API: Initiate account linking
  - `lambda_handler(event, context)` - Main handler
  - `_extract_user_from_token(event)` - Extract user from JWT
  - `_parse_request_body(event)` - Parse request
  - `_error_response(...)` - Format error response
  - `_mask_email(email)` - Mask email

- **confirm_link_accounts.py** - API: Confirm account linking
  - `lambda_handler(event, context)` - Main handler
  - `_extract_user_from_token(event)` - Extract user from JWT
  - `_parse_request_body(event)` - Parse request
  - `_get_pending_link(user_sub)` - Get pending link
  - `_get_user_username(user_sub)` - Get username

#### Utilities

- **otp_utils.py** - OTP generation and email sending
  - `generate_otp_code()` - Generate 6-digit OTP
  - `calculate_expiration_time(created_at?)` - Calculate OTP expiration
  - `is_valid_email(email)` - Validate email format
  - `send_otp_email(...)` - Send OTP via SES
  - `is_otp_expired(expiration_timestamp)` - Check if OTP expired

- **auth/README.md** - Authentication module documentation

### Shared Utilities (backend/shared/)

- **dynamodb_utils.py** - DynamoDB operations
  - `get_table()` - Get DynamoDB table resource
  - `get_item(pk, sk)` - Get single item
  - `put_item(item)` - Put item
  - `update_item(pk, sk, updates)` - Update item
  - `query_by_pk(pk, sk_prefix?)` - Query by partition key

- **error_handler.py** - Error handling and responses
  - `ErrorCode` class - Error code constants
  - `log_error(...)` - Log error with context
  - `sanitized_error_response(...)` - Format error response
  - `success_response(...)` - Format success response
  - `handle_validation_error(...)` - Handle validation errors

- **logger.py** - Structured logging
  - `LogLevel` class - Log level constants
  - `StructuredLogger` class - Main logger
  - `_filter_sensitive_data(data)` - Filter PII from logs
  - `_create_log_entry(...)` - Create structured log entry

- **cors_utils.py** - CORS handling
  - `get_allowed_origins()` - Get allowed CORS origins
  - `validate_origin(origin)` - Validate origin
  - `get_cors_headers(event)` - Get CORS headers for response

- **models.py** - Pydantic models for validation
  - `CreateProfileRequest` - Profile creation validation
  - `UpdateProfileRequest` - Profile update validation

- **LOGGING_QUICK_REFERENCE.md** - Logging documentation
- **SCHEMA.md** - DynamoDB schema documentation

### Profile Handler (backend/profile/)

- **handler.py** - Profile API endpoints
  - `lambda_handler(event, context)` - Main handler
  - `get_profile(user_id)` - Get user profile
  - `create_profile(user_id, data)` - Create profile
  - `update_profile(user_id, data)` - Update profile
  - `get_user_id_from_event(event)` - Extract user ID from JWT

- ****init**.py** - Package initialization

### Application Handler (backend/application/)

- **handler.py** - Application API endpoints
  - `lambda_handler(event, context)` - Main handler
  - `list_all_applications()` - List all applications
  - `list_user_applications(user_id)` - List user's applications
  - `create_application(user_id, data)` - Create application
  - `transform_application_response(app_data)` - Transform response

- ****init**.py** - Package initialization

### Scripts (backend/scripts/)

- **seed_db.py** - Database seeding script
  - Populates DynamoDB with test data
  - Supports clean/reseed operations

- **README.md** - Scripts documentation

### Tests (backend/tests/)

- **test_cors_utils.py** - CORS utilities tests
- **test_dynamodb_utils.py** - DynamoDB utilities tests
- **test_error_handler.py** - Error handler tests
- **test_logger.py** - Logger tests
- **test_models.py** - Pydantic models tests
- **test_link_accounts.py** - Account linking tests
- **test_post_authentication.py** - Post-auth trigger tests
- **test_pre_signup.py** - Pre-signup trigger tests
- **test_profile_auth_methods.py** - Profile auth methods tests
- **test_seed_db.py** - Database seeding tests
- **test_infrastructure.py** - Infrastructure tests

---

## Infrastructure & Configuration

### AWS SAM Templates

- **template.yaml** - Main SAM template (1414 lines)
  - DynamoDB table definition
  - SES configuration for OTP emails
  - Lambda functions (auth triggers, API endpoints)
  - Cognito User Pool, Identity Pool, Clients
  - API Gateway
  - CloudFront distribution
  - IAM roles and policies

- **samconfig.toml** - SAM deployment configuration
  - Default, dev, and prod environment configs
  - Parameter overrides for each environment
  - Region, capabilities, and deployment settings

- **certificate-template.yaml** - ACM certificate template (prod custom domain)
- **certificate-samconfig.toml** - Certificate deployment config
- **oidc-template.yaml** - OIDC configuration template
- **oidc-samconfig.toml** - OIDC deployment config

### Build & Development Configuration

- **Makefile** - Build and deployment commands
  - `make install` - Install dependencies
  - `make dev` - Start dev server
  - `make build` - Build for production
  - `make test` - Run all tests
  - `make deploy-dev` / `make deploy-prod` - Deploy to AWS
  - `make logs` - Tail Lambda logs
  - `make seed-db` - Seed DynamoDB

- **vite.config.ts** - Vite build configuration
  - React plugin, path aliases, PostHog proxy

- **vitest.config.ts** - Vitest test configuration
  - jsdom environment, setup files, coverage settings

- **tsconfig.json** - TypeScript configuration
  - Strict mode, path aliases, React JSX

- **tsconfig.node.json** - TypeScript config for Node files

- **postcss.config.js** - PostCSS configuration (Tailwind)

- **components.json** - shadcn/ui configuration

### Environment & Secrets

- **.env** - Environment variables (git-ignored)
- **.env.development** - Dev environment variables
- **.env.production** - Prod environment variables
- **.env.local** - Local overrides (git-ignored)
- **.env.example** - Example environment variables

### Package Management

- **package.json** - Frontend dependencies and scripts
  - React, TypeScript, Vite, TanStack Router/Query
  - Tailwind CSS, shadcn/ui, lucide-react
  - Testing: Vitest, Testing Library, fast-check

- **package-lock.json** - npm lock file
- **bun.lock** - Bun lock file

- **backend/pyproject.toml** - Backend Python configuration
  - boto3, pydantic, pytest, moto

- **backend/uv.lock** - uv lock file

### Scripts

- **scripts/setup-env.sh** - Generate .env from CloudFormation outputs
- **scripts/setup-ssm-parameters.sh** - Store OAuth credentials in SSM

### Documentation

- **README.md** - Project overview
- **docs/ARCHITECTURE.md** - Architecture documentation
- **docs/DEVELOPER.md** - Developer guide
- **docs/DEPLOYMENT.md** - Deployment guide
- **docs/OTP_AUTH_IMPLEMENTATION_GUIDE.md** - OTP implementation details
- **docs/SES_SETUP.md** - SES email configuration
- **docs/COGNITO_CUSTOM_DOMAIN.md** - Custom domain setup

---

## Key Patterns & Architecture

### Frontend Architecture

- **TanStack Router** - File-based routing with type safety
- **TanStack Query** - Server state management with caching
- **React Context** - Auth and analytics state
- **Custom Hooks** - Reusable logic (useApplications, useAccountLinking)
- **Error Boundaries** - Error handling at component level
- **Protected Routes** - Authentication-based route protection

### Backend Architecture

- **Single-Table DynamoDB** - Composite keys (PK/SK) with GSI1
- **Cognito Lambda Triggers** - Custom auth flow (OTP + Google)
- **API Gateway + Lambda** - Serverless REST API
- **Structured Logging** - JSON logs with sensitive data filtering
- **Error Handling** - Standardized error responses with codes

### Authentication Flow

1. User enters email → Register endpoint
2. Cognito triggers PreSignUp → Check for duplicates
3. User initiates auth → DefineAuthChallenge trigger
4. CreateAuthChallenge → Generate OTP, send via SES
5. User submits OTP → VerifyAuthChallenge trigger
6. PostAuthentication → Create/link profile
7. PreTokenGeneration → Add custom claims to JWT

### Data Models

- **Users**: PK=USER#{sub}, SK=PROFILE
- **Applications**: PK=USER#{userId}, SK=APP#{appId}
- **Account Links**: PK=PENDING_LINK#{email}, SK=TARGET#{targetSub}

---

## Testing Strategy

### Frontend Tests

- **Unit Tests**: Utility functions, hooks (useApplications, useProfile)
- **Component Tests**: Form validation, error boundaries, protected routes
- **Integration Tests**: Auth routing, account linking flow
- **Property-Based Tests**: Setup validation with fast-check

### Backend Tests

- **Unit Tests**: Utilities (CORS, DynamoDB, error handling, logging)
- **Integration Tests**: Auth triggers, profile/application handlers
- **Mocking**: moto for DynamoDB, unittest.mock for AWS services

### Test Commands

- `bun run test` - Run all frontend tests
- `bun run test:watch` - Watch mode
- `bun run test:ui` - UI dashboard
- `bun run test:coverage` - Coverage report
- `bun run test:property` - Property-based tests only
- `cd backend && uv run pytest` - Run backend tests

---

## Deployment

### Development Environment

- Stack: `madewithkiro-dev`
- Region: `us-west-2`
- Domain: `dh1nph2ldx21y.cloudfront.net` (CloudFront)
- Cognito Domain: `auth-dev.madewithkiro.com`
- Command: `make deploy-dev`

### Production Environment

- Stack: `madewithkiro-prod`
- Region: `us-west-2`
- Domain: `madewithkiro.com` (custom domain)
- Cognito Domain: `auth.madewithkiro.com`
- Command: `make deploy-prod`

### Deployment Process

1. Build frontend: `bun run build`
2. Build backend: `sam build`
3. Deploy: `sam deploy --config-env [dev|prod]`
4. Sync frontend to S3: `aws s3 sync dist/ s3://bucket/`
5. Invalidate CloudFront: `aws cloudfront create-invalidation`

---

## Key Files Quick Reference

### Must-Know Frontend Files

- `src/router.tsx` - All routes defined here
- `src/contexts/AuthContext.tsx` - Auth state and methods
- `src/services/apiClient.ts` - HTTP client for all API calls
- `src/services/authService.ts` - Cognito auth methods
- `src/config/amplify.ts` - Amplify/Cognito configuration

### Must-Know Backend Files

- `template.yaml` - All infrastructure defined here
- `backend/auth/` - All Cognito Lambda triggers
- `backend/shared/dynamodb_utils.py` - DynamoDB operations
- `backend/shared/error_handler.py` - Error handling patterns
- `backend/profile/handler.py` - Profile API endpoints
- `backend/application/handler.py` - Application API endpoints

### Must-Know Config Files

- `package.json` - Frontend dependencies and scripts
- `backend/pyproject.toml` - Backend dependencies
- `samconfig.toml` - Deployment configuration
- `Makefile` - Common commands
- `.env.development` / `.env.production` - Environment variables
