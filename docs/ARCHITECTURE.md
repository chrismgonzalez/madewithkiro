# Architecture Overview

High-level architecture of the MadeWithKiro platform.

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│ CloudFront  │ (CDN + Security Headers)
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  S3 Bucket  │   │ API Gateway │
│ (React SPA) │   │  (REST API) │
└─────────────┘   └──────┬──────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
             ┌──────────┐ ┌──────────┐
             │  Lambda  │ │ Cognito  │
             │Functions │ │  (Auth)  │
             └────┬─────┘ └────┬─────┘
                  │            │
                  ▼            ▼
           ┌──────────┐ ┌──────────┐
           │ DynamoDB  │ │   SES    │
           │(Database) │ │ (Email)  │
           └──────────┘ └──────────┘
```

## Components

| Component | Service                      | Role                                                             |
| --------- | ---------------------------- | ---------------------------------------------------------------- |
| Frontend  | React 18 + TypeScript + Vite | SPA with TanStack Router/Query, Tailwind CSS, shadcn/ui          |
| CDN       | CloudFront                   | Static assets, HTTPS, security headers, PostHog analytics proxy  |
| API       | API Gateway (REST)           | Routing, rate limiting, Cognito JWT authorization, CORS          |
| Compute   | Lambda (Python 3.12)         | Profile CRUD, application CRUD, 6 Cognito auth triggers          |
| Database  | DynamoDB                     | Single-table design, on-demand billing, PITR, encryption at rest |
| Auth      | Cognito User Pool            | Email OTP + Google OAuth, custom auth flow via Lambda triggers   |
| Email     | SES                          | Branded OTP code delivery                                        |
| IaC       | SAM / CloudFormation         | All infrastructure in `template.yaml`                            |

## Request Flow

1. Browser → CloudFront → S3 (static assets) or API Gateway (API calls)
2. API Gateway validates JWT via Cognito authorizer, then invokes Lambda
3. Lambda validates input, executes business logic, reads/writes DynamoDB
4. Response flows back through API Gateway → CloudFront → Browser

## Authentication

Two methods, one Cognito User Pool:

- **Email OTP**: Custom auth flow with 6 Lambda triggers (PreSignUp, DefineAuthChallenge, CreateAuthChallenge, VerifyAuthChallenge, PostAuthentication, PreTokenGeneration)
- **Google OAuth**: Cognito hosted UI with `signInWithRedirect`
- **Account Linking**: Automatic duplicate detection with user-confirmed merging

## Data Model

Single-table DynamoDB with composite keys (PK/SK) and one GSI:

- **Profiles**: `PK=USER#{sub}, SK=PROFILE` — GSI1 enables email lookup
- **Applications**: `PK=APP#{id}, SK=METADATA` — GSI1 enables user query
- **Pending Links**: `PK=USER#{sub}, SK=PENDING_LINK` — temporary linking records

## Security

- HTTPS everywhere, HSTS with preload
- Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- Least-privilege IAM per Lambda function
- Sanitized error responses (no stack traces to clients)
- PII masking in all logs
- OTP stored only in Cognito session (never in database)
- Row-level authorization enforced in Lambda handlers

## Deployment

- `make deploy-dev` / `make deploy-prod` — SAM build + deploy
- Frontend: `bun run build` → S3 sync → CloudFront invalidation
- Two environments: dev (CloudFront default domain) and prod (custom domain)

For detailed API contracts, data schemas, and implementation specifics, see [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md).
