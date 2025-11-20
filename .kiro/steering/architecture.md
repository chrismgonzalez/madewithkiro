# Architecture Overview

## System Architecture

This application follows a serverless architecture pattern using AWS services, with a React frontend and Lambda-based backend.

## High-Level Architecture

```mermaid
graph TB
    User[User Device<br/>Browser]
    CF[CloudFront<br/>CDN]
    S3[S3<br/>Static Assets]
    APIGW[API Gateway<br/>RESTful API]
    Lambda[Lambda Functions<br/>Serverless Compute]
    DDB[(DynamoDB<br/>Database)]
    Cognito[Cognito<br/>Authentication]

    User -->|HTTPS Request| CF
    CF -->|Static Content| S3
    CF -->|API Requests| APIGW
    APIGW -->|Invoke| Lambda
    Lambda -->|Read/Write| DDB
    Lambda -->|Validate Token| Cognito
    Cognito -.->|JWT Tokens| User

    style User fill:#e1f5ff
    style CF fill:#ff9900
    style S3 fill:#569a31
    style APIGW fill:#ff4f8b
    style Lambda fill:#ff9900
    style DDB fill:#4053d6
    style Cognito fill:#dd344c
```

## End-to-End Request Flow

### 1. Initial Page Load (Static Content)

```mermaid
sequenceDiagram
    participant User as User Browser
    participant CF as CloudFront CDN
    participant S3 as S3 Bucket

    User->>CF: Request: https://app.example.com
    alt Cache Hit
        CF->>User: Return cached content
    else Cache Miss
        CF->>S3: Fetch static assets
        S3->>CF: index.html, JS bundles, CSS, images
        CF->>User: Return content
    end
    Note over User: React App Initializes
```

### 2. User Authentication Flow

```mermaid
sequenceDiagram
    participant User as User
    participant App as React App
    participant Cognito as Cognito User Pool

    User->>App: Click "Sign In"
    App->>Cognito: Redirect to Auth (Hosted UI or Custom)
    User->>Cognito: Enter credentials
    Cognito->>Cognito: Validate credentials
    Cognito->>App: Return JWT tokens
    Note over Cognito,App: ID Token (identity)<br/>Access Token (authorization)<br/>Refresh Token (renewal)
    App->>App: Store tokens securely
    App->>App: Update auth state (Context)
    App->>User: Show authenticated UI
```

### 3. API Request Flow (Authenticated)

```mermaid
sequenceDiagram
    participant App as React App
    participant CF as CloudFront
    participant APIGW as API Gateway
    participant Cognito as Cognito
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    App->>App: User action triggers API call
    App->>CF: API Request + Authorization: Bearer token
    alt Cache Hit
        CF->>App: Return cached response
    else Cache Miss
        CF->>APIGW: Forward request
        APIGW->>APIGW: Validate request format
        APIGW->>Cognito: Validate JWT token
        Cognito->>APIGW: Token valid + user context
        APIGW->>Lambda: Invoke with user context
        Lambda->>Lambda: Parse request & execute logic
        Lambda->>DDB: Query/Put/Update/Delete
        DDB->>Lambda: Return data
        Lambda->>Lambda: Format response
        Lambda->>APIGW: Return JSON response
        APIGW->>APIGW: Add CORS headers
        APIGW->>CF: Response
        CF->>CF: Cache if applicable
        CF->>App: Response
    end
    App->>App: Update UI state
    App->>App: Render updated components
```

### 4. File Upload Flow (S3)

```mermaid
sequenceDiagram
    participant User as User
    participant App as React App
    participant Lambda as Lambda Function
    participant S3 as S3 Bucket
    participant Processor as Lambda Processor
    participant DDB as DynamoDB

    User->>App: Select file
    App->>Lambda: Request pre-signed URL
    Lambda->>Lambda: Generate pre-signed S3 URL<br/>(with expiration & permissions)
    Lambda->>App: Return pre-signed URL
    App->>S3: Upload file directly (PUT)
    S3->>App: Upload success
    opt File Processing
        S3->>Processor: Trigger S3 event
        Processor->>S3: Read file
        Processor->>Processor: Process file
        Processor->>DDB: Update metadata
        Processor->>User: Send notification (optional)
    end
    App->>User: Show upload complete
```

## Component Responsibilities

### Frontend (React + TypeScript)

**Responsibilities:**

- User interface rendering
- Client-side routing
- Form validation
- State management
- API communication
- Token management
- Error handling & user feedback

**Key Patterns:**

- Component composition
- Custom hooks for reusable logic
- Context API for global state
- React Query/SWR for data fetching

### CloudFront (CDN)

**Responsibilities:**

- Serve static assets globally
- Cache API responses (when appropriate)
- SSL/TLS termination
- DDoS protection
- Geographic distribution

**Configuration:**

- Origin: S3 bucket for static assets
- Origin: API Gateway for API requests
- Cache behaviors for different paths
- Custom error pages

### API Gateway

**Responsibilities:**

- RESTful API endpoint management
- Request/response transformation
- Rate limiting & throttling
- API versioning
- CORS configuration
- Request validation

**Integration:**

- Lambda proxy integration
- Cognito authorizer for protected routes
- Request/response mapping templates

### Lambda Functions

**Responsibilities:**

- Business logic execution
- Data validation
- Database operations
- External API integration
- File processing
- Background jobs

**Best Practices:**

- Single responsibility per function
- Stateless design
- Environment variable configuration
- Proper error handling
- Logging with CloudWatch

### DynamoDB

**Responsibilities:**

- Persistent data storage
- Fast key-value lookups
- Scalable read/write capacity
- Secondary indexes for queries

**Design Patterns:**

- Single-table design (when appropriate)
- Composite keys (PK + SK)
- GSIs for alternate access patterns
- Optimistic locking with version attributes

### Cognito

**Responsibilities:**

- User registration & authentication
- Password management
- Multi-factor authentication (MFA)
- Social identity federation
- JWT token issuance
- User profile management

**Integration:**

- User Pools for authentication
- Identity Pools for AWS resource access
- Custom attributes for user metadata
- Lambda triggers for custom workflows

### S3

**Responsibilities:**

- Static website hosting
- User-generated content storage
- File uploads/downloads
- Backup storage

**Access Patterns:**

- Public read for static assets
- Pre-signed URLs for secure uploads
- Lifecycle policies for cost optimization
- Versioning for critical data

## Security Flow

### Authentication & Authorization

```mermaid
flowchart TD
    A[User authenticates with Cognito] --> B[Receives JWT tokens]
    B --> C[React app includes token in API requests]
    C --> D[Authorization: Bearer token]
    D --> E[API Gateway validates token with Cognito]
    E --> F[Extracts user identity]
    F --> G[Lambda receives validated user context]
    G --> H[Enforces authorization rules]
    H --> I[DynamoDB access controlled by Lambda]
    I --> J[Row-level security via user ID]

    style A fill:#dd344c
    style C fill:#e1f5ff
    style E fill:#ff4f8b
    style G fill:#ff9900
    style I fill:#4053d6
```

### Data Flow Security

- **In Transit**: All traffic over HTTPS/TLS
- **At Rest**: DynamoDB encryption enabled
- **Secrets**: Stored in AWS Secrets Manager or Parameter Store
- **IAM Roles**: Least privilege for Lambda execution
- **CORS**: Configured on API Gateway for frontend domain

## Deployment Flow

```mermaid
flowchart TD
    Dev[Developer] --> Commit[Commit code to repository]
    Commit --> Pipeline[CI/CD Pipeline]
    Pipeline --> Tests[Run tests]
    Tests --> BuildReact[Build React app with Vite]
    BuildReact --> BuildSAM[Build SAM template]
    BuildSAM --> SAMDeploy[AWS SAM Deploy]

    SAMDeploy --> Package[Package Lambda functions]
    Package --> Upload[Upload to S3 deployment bucket]
    Upload --> CFStack[Deploy CloudFormation stack]

    CFStack --> Lambda[Create/Update Lambda functions]
    CFStack --> APIGW[Configure API Gateway]
    CFStack --> DDB[Set up DynamoDB tables]
    CFStack --> Cognito[Configure Cognito]

    Lambda --> Static[Upload static assets to S3]
    APIGW --> Static
    DDB --> Static
    Cognito --> Static

    Static --> Invalidate[Invalidate CloudFront cache]
    Invalidate --> Prod[Production Environment Ready]

    style Dev fill:#e1f5ff
    style Pipeline fill:#4053d6
    style SAMDeploy fill:#ff9900
    style Prod fill:#569a31
```

## Monitoring & Observability

### CloudWatch Integration

- **Lambda Logs**: Automatic logging to CloudWatch Logs
- **API Gateway Logs**: Request/response logging
- **Metrics**: Custom metrics for business KPIs
- **Alarms**: Automated alerts for errors/latency
- **X-Ray**: Distributed tracing for request flows

### Key Metrics to Monitor

- API response times
- Lambda execution duration
- DynamoDB read/write capacity
- Error rates by endpoint
- Authentication success/failure rates
- CloudFront cache hit ratio

## Scalability Considerations

### Automatic Scaling

- **Lambda**: Scales automatically with concurrent requests
- **DynamoDB**: On-demand or provisioned capacity with auto-scaling
- **CloudFront**: Global edge locations scale automatically
- **API Gateway**: Handles scaling automatically

### Performance Optimization

- CloudFront caching for static assets
- API response caching where appropriate
- DynamoDB query optimization with indexes
- Lambda cold start mitigation (provisioned concurrency)
- React code splitting and lazy loading
