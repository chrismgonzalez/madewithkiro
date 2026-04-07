# MadeWithKiro Technical Reference

This document provides a technical overview of the MadeWithKiro platform: a serverless showcase application where users submit and browse projects built with Kiro.

## System Architecture

```
                          ┌──────────────┐
                          │   Browser    │
                          └──────┬───────┘
                                 │ HTTPS
                                 ▼
                          ┌──────────────┐
                          │  CloudFront  │
                          │  (CDN/WAF)   │
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │             │
                    ▼            ▼             ▼
             ┌───────────┐ ┌──────────┐ ┌───────────┐
             │ S3 Bucket │ │ PostHog  │ │    API     │
             │ (Static)  │ │ (Proxy)  │ │  Gateway   │
             └───────────┘ └──────────┘ └─────┬─────┘
                                              │
                                    ┌─────────┼─────────┐
                                    │         │         │
                                    ▼         ▼         ▼
                              ┌─────────┐ ┌───────┐ ┌───────┐
                              │ Cognito │ │Profile│ │  App  │
                              │Triggers │ │Lambda │ │Lambda │
                              │ (6 fns) │ └───┬───┘ └───┬───┘
                              └────┬────┘     │         │
                                   │          ▼         ▼
                                   │    ┌───────────────────┐
                                   ├───▶│     DynamoDB      │
                                   │    │ (Single-Table)    │
                                   │    └───────────────────┘
                                   ▼
                              ┌─────────┐
                              │   SES   │
                              │ (Email) │
                              └─────────┘
```

### Component Summary

| Component      | Service              | Purpose                                                                   |
| -------------- | -------------------- | ------------------------------------------------------------------------- |
| CDN            | CloudFront           | Static asset delivery, HTTPS termination, security headers, PostHog proxy |
| Static Hosting | S3                   | React SPA bundle (private bucket, OAC access)                             |
| API            | API Gateway (REST)   | Request routing, rate limiting, Cognito JWT authorization                 |
| Compute        | Lambda (Python 3.12) | Business logic for profiles, applications, and auth triggers              |
| Database       | DynamoDB             | Single-table design with on-demand billing and PITR                       |
| Auth           | Cognito User Pool    | OTP and Google OAuth, custom auth flow via Lambda triggers                |
| Email          | SES                  | OTP code delivery with branded HTML templates                             |
| Analytics      | PostHog              | Page tracking, user identification (proxied through CloudFront)           |
| IaC            | SAM/CloudFormation   | All infrastructure defined in `template.yaml`                             |

## Authentication

The platform supports two authentication methods: email OTP and Google OAuth. Both are managed through a single Cognito User Pool with a custom authentication flow.

### OTP Authentication Flow

Six Lambda triggers orchestrate the OTP flow:

```
Client                    API Gateway       Cognito              Lambda Triggers
  │                           │                │                       │
  │ POST /auth/register       │                │                       │
  │──────────────────────────▶│                │                       │
  │                           │  AdminCreateUser (if new)              │
  │                           │───────────────▶│──PreSignUp───────────▶│
  │                           │                │  (auto-confirm)       │
  │                           │                │◀──────────────────────│
  │◀──────────────────────────│                │                       │
  │                           │                │                       │
  │ Amplify signIn(CUSTOM_WITHOUT_SRP)         │                       │
  │───────────────────────────────────────────▶│                       │
  │                           │                │──DefineAuthChallenge─▶│
  │                           │                │  (issue CUSTOM_CHALLENGE)
  │                           │                │◀──────────────────────│
  │                           │                │──CreateAuthChallenge─▶│
  │                           │                │  (generate OTP, send  │
  │                           │                │   via SES, rate limit)│
  │                           │                │◀──────────────────────│
  │◀──────────────────────────────────────────(challenge params)       │
  │                           │                │                       │
  │ Amplify confirmSignIn(otp_code)            │                       │
  │───────────────────────────────────────────▶│                       │
  │                           │                │──VerifyAuthChallenge─▶│
  │                           │                │  (compare OTP,        │
  │                           │                │   check expiry)       │
  │                           │                │◀──────────────────────│
  │                           │                │──DefineAuthChallenge─▶│
  │                           │                │  (issue tokens)       │
  │                           │                │◀──────────────────────│
  │                           │                │──PostAuthentication──▶│
  │                           │                │  (create profile,     │
  │                           │                │   detect duplicates)  │
  │                           │                │◀──────────────────────│
  │                           │                │──PreTokenGeneration──▶│
  │                           │                │  (add linking claims) │
  │                           │                │◀──────────────────────│
  │◀──────────────────────────────────────────(JWT tokens)             │
```

### Trigger Responsibilities

| Trigger             | File                                    | Purpose                                                                       |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| PreSignUp           | `backend/auth/pre_signup.py`            | Auto-confirms OTP users, checks for duplicate emails across providers         |
| DefineAuthChallenge | `backend/auth/define_auth_challenge.py` | Controls flow: issue challenge, issue tokens, or fail after 5 bad attempts    |
| CreateAuthChallenge | `backend/auth/create_auth_challenge.py` | Generates 6-digit OTP, sends via SES, enforces 60s rate limit between sends   |
| VerifyAuthChallenge | `backend/auth/verify_auth_challenge.py` | Validates OTP code and expiry (10 min TTL), timing-safe comparison            |
| PostAuthentication  | `backend/auth/post_authentication.py`   | Creates DynamoDB profile for new OTP users, detects duplicate Google accounts |
| PreTokenGeneration  | `backend/auth/pre_token_generation.py`  | Injects `custom:pending_link` and `custom:link_google_user` claims into JWT   |

### OTP Security Controls

- 6-digit numeric code generated with `secrets.randbelow()`
- 10-minute expiration stored in `privateChallengeParameters`
- 60-second cooldown between OTP requests (session-based rate limiting)
- Maximum 5 failed verification attempts before authentication fails
- OTP stored only in Cognito's private challenge parameters (never in DynamoDB)
- Email masking in all log output (`use***@domain.com`)

### Google OAuth Flow

Google sign-in uses Cognito's hosted UI with `signInWithRedirect`. The Amplify SDK handles the OAuth code exchange. After redirect, the `AuthCallbackPage` component processes the tokens and the `AuthContext` hydrates user state from the ID token claims.

### Account Linking

When a user authenticates via OTP and a Google account with the same email exists (or vice versa), the system detects the duplicate:

1. `PostAuthentication` trigger queries Cognito for users with the same email
2. If a duplicate is found, it stores a `PENDING_LINK` record in DynamoDB
3. `PreTokenGeneration` reads the pending link and adds custom claims to the JWT
4. The frontend reads `custom:pending_link` from the ID token and prompts the user
5. User confirms via `POST /profile/link`, which merges the accounts

## API Reference

All endpoints are served through API Gateway at `https://{api-id}.execute-api.us-west-2.amazonaws.com/{env}`.

### Profile Endpoints

| Method | Path                   | Auth    | Handler           | Description                                     |
| ------ | ---------------------- | ------- | ----------------- | ----------------------------------------------- |
| GET    | `/profile/{userId}`    | None    | `profile.handler` | Get a user profile by ID                        |
| POST   | `/profile`             | Cognito | `profile.handler` | Create a new profile for the authenticated user |
| PUT    | `/profile`             | Cognito | `profile.handler` | Update the authenticated user's profile         |
| GET    | `/profile/check-email` | Cognito | `profile.handler` | Look up a profile by email (GSI1 query)         |
| POST   | `/profile/link`        | Cognito | `profile.handler` | Confirm account linking between OTP and Google  |

### Application Endpoints

| Method | Path                        | Auth    | Handler               | Description                            |
| ------ | --------------------------- | ------- | --------------------- | -------------------------------------- |
| GET    | `/applications`             | None    | `application.handler` | List all applications (public gallery) |
| GET    | `/applications?userId={id}` | None    | `application.handler` | List applications by user              |
| GET    | `/applications/{appId}`     | None    | `application.handler` | Get a single application               |
| POST   | `/applications`             | Cognito | `application.handler` | Create an application                  |
| PUT    | `/applications/{appId}`     | Cognito | `application.handler` | Update an application (owner only)     |
| DELETE | `/applications/{appId}`     | Cognito | `application.handler` | Delete an application (owner only)     |

### Auth Endpoints

| Method | Path             | Auth | Handler         | Description                                   |
| ------ | ---------------- | ---- | --------------- | --------------------------------------------- |
| POST   | `/auth/register` | None | `auth.register` | Ensure user exists in Cognito before OTP flow |

### Response Format

All responses follow a consistent envelope:

```json
{
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed. Please check your input.",
    "details": { "firstName": "Field cannot be empty or whitespace" }
  }
}
```

Standard error codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `METHOD_NOT_ALLOWED`, `TOO_MANY_REQUESTS`.

### Rate Limiting

API Gateway enforces per-endpoint throttling (requests/sec and burst):

| Endpoint Pattern               | Prod Rate | Prod Burst | Purpose                     |
| ------------------------------ | --------- | ---------- | --------------------------- |
| `GET /applications`            | 200       | 400        | Public gallery browsing     |
| `GET /profile/{userId}`        | 150       | 300        | Profile viewing             |
| `POST /applications`           | 10        | 20         | Prevent spam creation       |
| `POST /profile`                | 5         | 10         | Profile creation (one-time) |
| `DELETE /applications/{appId}` | 20        | 40         | Safety limit on deletes     |
| Default (`/*`)                 | 100       | 200        | Catch-all                   |

## Data Model

### DynamoDB Single-Table Design

Table: `MadeWithKiro-{env}` with on-demand billing, encryption at rest, and point-in-time recovery.

**Key Schema:**

- PK (String) — Partition key
- SK (String) — Sort key
- GSI1PK / GSI1SK — Global secondary index (projects all attributes)

### Entity: User Profile

```
PK:     USER#{cognitoSub}
SK:     PROFILE
GSI1PK: EMAIL#{email}
GSI1SK: PROFILE
```

| Attribute        | Type         | Required | Description                                        |
| ---------------- | ------------ | -------- | -------------------------------------------------- |
| userId           | String       | Yes      | Cognito sub                                        |
| email            | String       | Yes      | Verified email                                     |
| firstName        | String       | Yes      | 1–50 chars                                         |
| lastName         | String       | Yes      | 1–50 chars                                         |
| awsBuilderHandle | String       | Yes      | AWS Builder Center handle, 1–50 chars              |
| linkedInUsername | String       | No       | LinkedIn username                                  |
| githubUsername   | String       | No       | GitHub username                                    |
| authMethods      | List[String] | Yes      | `["google"]`, `["email"]`, or `["google","email"]` |
| createdAt        | String       | Yes      | ISO 8601                                           |
| updatedAt        | String       | Yes      | ISO 8601                                           |

### Entity: Application

```
PK:     APP#{uuid}
SK:     METADATA
GSI1PK: USER#{userId}
GSI1SK: APP#{appId}
```

| Attribute     | Type         | Required | Description                     |
| ------------- | ------------ | -------- | ------------------------------- |
| appId         | String       | Yes      | UUID v4                         |
| userId        | String       | Yes      | Owner's Cognito sub             |
| name          | String       | Yes      | 1–100 chars                     |
| description   | String       | Yes      | 1–500 chars                     |
| appUrl        | String       | No       | Live URL (validated as HttpUrl) |
| repositoryUrl | String       | No       | Source code URL                 |
| tags          | List[String] | Yes      | 1–10 tags                       |
| createdAt     | String       | Yes      | ISO 8601                        |

### Entity: Pending Account Link

```
PK:     USER#{otpUserSub}
SK:     PENDING_LINK
```

Temporary record created by `PostAuthentication` when a duplicate Google account is detected. Deleted after the user confirms or rejects the link.

### Access Patterns

| Pattern                  | Key Condition                                             | Index |
| ------------------------ | --------------------------------------------------------- | ----- |
| Get profile by user ID   | `PK = USER#{id}, SK = PROFILE`                            | Table |
| Find profile by email    | `GSI1PK = EMAIL#{email}, GSI1SK = PROFILE`                | GSI1  |
| Get application by ID    | `PK = APP#{id}, SK = METADATA`                            | Table |
| List user's applications | `GSI1PK = USER#{id}`                                      | GSI1  |
| List all applications    | Scan where `SK = METADATA` and `entityType = APPLICATION` | Table |

## Frontend

### Technology Stack

| Library         | Version     | Purpose                                      |
| --------------- | ----------- | -------------------------------------------- |
| React           | 18          | UI framework                                 |
| TypeScript      | Strict mode | Type safety                                  |
| Vite            | —           | Build tooling and dev server                 |
| TanStack Router | —           | Type-safe file-based routing                 |
| TanStack Query  | —           | Server state, caching, request deduplication |
| Tailwind CSS    | —           | Utility-first styling                        |
| shadcn/ui       | —           | Accessible component primitives              |
| lucide-react    | —           | Icon library                                 |
| AWS Amplify     | —           | Cognito auth SDK                             |
| PostHog         | —           | Product analytics                            |

### Routing

Routes are defined in `src/router.tsx` using TanStack Router. The root route wraps all pages in `ThemeProvider → QueryClientProvider → AuthProvider → Layout`.

| Path                       | Component           | Auth      | Description                            |
| -------------------------- | ------------------- | --------- | -------------------------------------- |
| `/`                        | GalleryPage         | Public    | Application gallery with tag filtering |
| `/login`                   | LoginPage           | Public    | Auth method selection (OTP / Google)   |
| `/auth`                    | AuthPage            | Public    | Legacy auth route (backward compat)    |
| `/auth/callback`           | AuthCallbackPage    | Public    | OAuth redirect handler                 |
| `/create-profile`          | CreateProfilePage   | Protected | New user profile creation              |
| `/link-account`            | LinkAccountPage     | Protected | Account linking confirmation           |
| `/profile/$userId`         | ProfilePage         | Protected | View user profile                      |
| `/profile/$userId/edit`    | ProfilePage (edit)  | Protected | Edit user profile                      |
| `/add-application`         | AddApplicationPage  | Protected | Submit a new application               |
| `/edit-application/$appId` | EditApplicationPage | Protected | Edit an existing application           |
| `/privacy`                 | PrivacyPage         | Public    | Privacy policy                         |
| `/terms`                   | TermsPage           | Public    | Terms of service                       |

Protected routes use the `ProtectedRoute` wrapper which checks `AuthContext.isAuthenticated` and redirects to `/login` if false.

### State Management

- **Auth state**: `AuthContext` (React Context) — manages user session, token refresh, OTP/Google sign-in methods, and account linking flags
- **Server state**: TanStack Query — caches API responses with `staleTime: Infinity` and `retry: false` defaults
- **Theme**: `ThemeProvider` (next-themes) — system/light/dark mode persisted to localStorage

### API Client

`src/services/apiClient.ts` provides an `ApiClient` class that:

- Reads `VITE_API_BASE_URL` for the base URL
- Attaches the Cognito ID token as `Authorization: Bearer {token}` on authenticated requests
- Retries 5xx errors up to 2 times with exponential backoff and jitter
- Does not retry 4xx errors
- Handles 401 by attempting a session refresh, then retrying once
- Supports request cancellation via `AbortSignal`

### Key Frontend Services

| Service            | File                                 | Responsibility                                |
| ------------------ | ------------------------------------ | --------------------------------------------- |
| ApiClient          | `src/services/apiClient.ts`          | HTTP client with auth, retry, cancellation    |
| AuthService        | `src/services/authService.ts`        | Token retrieval, session refresh, auth checks |
| ApplicationService | `src/services/applicationService.ts` | Application CRUD via ApiClient                |
| AccountLinking     | `src/services/accountLinking.ts`     | Confirm account link API call                 |

### Type Definitions

All shared types live in `src/types/index.ts` and mirror the backend Pydantic models:

- `UserProfile`, `CreateProfileRequest`, `UpdateProfileRequest`
- `Application`, `CreateApplicationRequest`, `UpdateApplicationRequest`
- `ApiError`, `ApiResponse<T>`

## Backend

### Lambda Functions

All Lambda functions run Python 3.12 with 256 MB memory and 30s timeout. Code is packaged from the `backend/` directory.

| Function            | Handler                                     | Events                                                              |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Profile             | `profile.handler.lambda_handler`            | GET/POST/PUT /profile, GET /profile/check-email, POST /profile/link |
| Application         | `application.handler.lambda_handler`        | GET/POST/PUT/DELETE /applications                                   |
| Register            | `auth.register.lambda_handler`              | POST /auth/register                                                 |
| DefineAuthChallenge | `auth.define_auth_challenge.lambda_handler` | Cognito trigger                                                     |
| CreateAuthChallenge | `auth.create_auth_challenge.lambda_handler` | Cognito trigger                                                     |
| VerifyAuthChallenge | `auth.verify_auth_challenge.lambda_handler` | Cognito trigger                                                     |
| PreSignUp           | `auth.pre_signup.lambda_handler`            | Cognito trigger                                                     |
| PostAuthentication  | `auth.post_authentication.lambda_handler`   | Cognito trigger                                                     |
| PreTokenGeneration  | `auth.pre_token_generation.lambda_handler`  | Cognito trigger                                                     |

### Shared Utilities

| Module         | File                               | Purpose                                                                   |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| DynamoDB Utils | `backend/shared/dynamodb_utils.py` | `get_item`, `put_item`, `update_item`, `query_gsi`, `scan_by_entity_type` |
| Error Handler  | `backend/shared/error_handler.py`  | Sanitized error responses, never exposes stack traces to clients          |
| Logger         | `backend/shared/logger.py`         | Structured JSON logging with PII filtering                                |
| CORS Utils     | `backend/shared/cors_utils.py`     | Origin validation, dynamic CORS headers                                   |
| Models         | `backend/shared/models.py`         | Pydantic models for request validation                                    |

### Validation

Request bodies are validated using Pydantic models (`CreateProfileRequest`, `UpdateProfileRequest`, `CreateApplicationRequest`). Validation errors return a 400 with field-level error details. All string fields are stripped of whitespace. Required fields reject empty/whitespace-only values.

### Error Handling Pattern

Every Lambda handler follows this pattern:

1. Parse HTTP method and route parameters
2. For mutations, extract `userId` from Cognito JWT claims
3. Parse and validate request body with Pydantic
4. Execute business logic
5. Return `success_response(data)` or a specific error handler (`handle_not_found`, `handle_unauthorized`, `handle_validation_error`, `handle_internal_error`)
6. All exceptions are caught at the top level and return a generic 500 without internal details

Internal errors are logged to CloudWatch with full context; client responses contain only safe error codes and messages.

## Infrastructure

### Environments

| Property               | Dev                          | Prod                       |
| ---------------------- | ---------------------------- | -------------------------- |
| Stack name             | `madewithkiro-dev`           | `madewithkiro-prod`        |
| Domain                 | CloudFront default           | `madewithkiro.com`         |
| Cognito domain         | `auth-dev.madewithkiro.com`  | `auth.madewithkiro.com`    |
| CORS                   | `*` (localhost + CloudFront) | `https://madewithkiro.com` |
| API throttle (default) | 500 req/s, 1000 burst        | 100 req/s, 200 burst       |

### Security Headers (CloudFront)

Applied via `CloudFrontResponseHeadersPolicy`:

- HSTS: `max-age=31536000; includeSubDomains; preload`
- X-Content-Type-Options: `nosniff`
- X-Frame-Options: `DENY`
- X-XSS-Protection: `1; mode=block`
- Referrer-Policy: `strict-origin-when-cross-origin`
- Content-Security-Policy: restricts `default-src`, `script-src`, `connect-src`, `frame-ancestors` to known origins

### IAM

Each Lambda function has a least-privilege IAM policy:

- Profile Lambda: DynamoDB `GetItem`, `PutItem`, `UpdateItem`, `Query` on table + GSI1; Cognito `AdminUpdateUserAttributes`
- Application Lambda: DynamoDB full CRUD + `Scan` on table; `Query` on GSI1
- Auth triggers: scoped to their specific needs (SES send for CreateAuthChallenge, Cognito admin for VerifyAuthChallenge, DynamoDB read/write for PostAuthentication and PreTokenGeneration)

### Deployment

```sh
make deploy-dev    # sam build + sam deploy --config-env dev
make deploy-prod   # sam build + sam deploy --config-env prod
```

The deployment process:

1. `sam build` packages Lambda functions
2. `sam deploy` creates/updates the CloudFormation stack
3. `bun run build` builds the React SPA
4. `aws s3 sync dist/ s3://{bucket}/` uploads static assets
5. `aws cloudfront create-invalidation` clears the CDN cache

### Environment Variables

Frontend (Vite, compile-time):

- `VITE_API_BASE_URL` — API Gateway URL
- `VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`, `VITE_IDENTITY_POOL_ID` — Cognito IDs
- `VITE_COGNITO_DOMAIN` — Cognito hosted UI domain
- `VITE_AWS_REGION` — AWS region

Backend (Lambda runtime):

- `TABLE_NAME` — DynamoDB table name
- `ENVIRONMENT` — `dev` or `prod`
- `ALLOWED_ORIGINS` — Comma-separated CORS origins
- `SES_EMAIL_IDENTITY` — Sender email for OTP
- `SES_TEMPLATE_NAME` — SES template name
- `SES_CONFIGURATION_SET` — SES config set
- `COGNITO_USER_POOL_ID` / `USER_POOL_ID` — Cognito User Pool ID
