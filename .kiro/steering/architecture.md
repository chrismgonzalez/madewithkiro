---
inclusion: manual
---

# Architecture Overview

## System Architecture

Serverless architecture on AWS: React frontend served via CloudFront/S3, with API Gateway + Lambda backend and DynamoDB for persistence. Cognito handles authentication.

## Request Flow

1. Browser → CloudFront → S3 (static assets) or API Gateway (API calls)
2. API Gateway validates JWT with Cognito, then invokes Lambda
3. Lambda executes business logic, reads/writes DynamoDB, returns JSON
4. CloudFront caches responses where appropriate

## Authentication Flow

1. User signs in via Cognito (hosted UI or custom)
2. Cognito returns JWT tokens (ID, Access, Refresh)
3. React app stores tokens, includes Access token in API requests
4. API Gateway Cognito authorizer validates token before Lambda invocation

## File Upload Flow

1. Client requests pre-signed S3 URL from Lambda
2. Client uploads directly to S3 using pre-signed URL
3. Optional: S3 event triggers processing Lambda

## Component Responsibilities

- **CloudFront**: CDN, SSL termination, caching, DDoS protection. Origins: S3 (static) + API Gateway (API)
- **API Gateway**: REST endpoints, rate limiting, CORS, request validation, Cognito authorizer
- **Lambda**: Business logic, data validation, DB operations. Stateless, single-responsibility per function
- **DynamoDB**: Single-table design, composite keys (PK+SK), GSIs for query flexibility, on-demand capacity
- **Cognito**: User pools for auth, social federation, JWT issuance, Lambda triggers for custom workflows
- **S3**: Static hosting, user content storage, pre-signed URLs for uploads, lifecycle policies

## Security

- All traffic over HTTPS/TLS
- DynamoDB encryption at rest
- Secrets in AWS Secrets Manager or Parameter Store
- IAM roles with least privilege for Lambda
- CORS restricted to frontend domain
- Row-level security via user ID in DynamoDB access patterns

## Deployment

1. Build React app with Vite
2. SAM build packages Lambda functions
3. SAM deploy creates/updates CloudFormation stack (Lambda, API Gateway, DynamoDB, Cognito)
4. Upload static assets to S3
5. Invalidate CloudFront cache

## Monitoring

- CloudWatch Logs for Lambda and API Gateway
- CloudWatch Metrics and Alarms for errors/latency
- X-Ray for distributed tracing
- Key metrics: API response times, Lambda duration, DynamoDB capacity, error rates, cache hit ratio

## Scaling

All components auto-scale: Lambda (concurrent executions), DynamoDB (on-demand), CloudFront (edge locations), API Gateway (managed).
