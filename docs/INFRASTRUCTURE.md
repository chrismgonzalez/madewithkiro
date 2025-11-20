# Infrastructure Documentation

This document describes the AWS infrastructure for MadeWithKiro.

## Architecture Overview

MadeWithKiro uses a serverless architecture with the following AWS services:

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌─────────────┐                   ┌──────────────┐
│  S3 Bucket  │                   │ API Gateway  │
│  (Frontend) │                   │   (REST)     │
└─────────────┘                   └──────┬───────┘
                                         │
                                         │ Cognito
                                         │ Authorizer
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │   Lambda     │
                                  │  Functions   │
                                  └──────┬───────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │  DynamoDB    │
                                  │ Single Table │
                                  └──────────────┘
```

## AWS Resources

### 1. DynamoDB Table

**Resource**: `MadeWithKiroTable`

**Configuration**:

- Table Name: `MadeWithKiro-{Environment}`
- Billing Mode: PAY_PER_REQUEST (on-demand)
- Encryption: SSE enabled
- Point-in-Time Recovery: Enabled

**Schema**:

- Primary Key:
  - Partition Key (PK): String
  - Sort Key (SK): String
- Global Secondary Index (GSI1):
  - GSI1PK: String (Partition Key)
  - GSI1SK: String (Sort Key)
  - Projection: ALL

**Access Patterns**:

| Pattern                  | Key Condition                                   | Index   |
| ------------------------ | ----------------------------------------------- | ------- |
| Get user profile         | PK = USER#{userId}, SK = PROFILE                | Primary |
| List all profiles        | GSI1PK = PROFILE                                | GSI1    |
| Get application          | PK = APP#{appId}, SK = METADATA                 | Primary |
| List all applications    | Scan with filter entityType = APPLICATION       | Primary |
| List user's applications | GSI1PK = USER#{userId}, GSI1SK begins_with APP# | GSI1    |

### 2. Cognito User Pool

**Resource**: `CognitoUserPool`

**Configuration**:

- User Pool Name: `MadeWithKiro-{Environment}`
- Username Attributes: email
- Auto-verified Attributes: email
- Case Sensitivity: false

**Password Policy**:

- Minimum Length: 8
- Require Uppercase: Yes
- Require Lowercase: Yes
- Require Numbers: Yes
- Require Symbols: Yes

**Schema**:

- email (required, immutable)
- given_name (optional, mutable)
- family_name (optional, mutable)

**Account Recovery**:

- Method: verified_email
- Priority: 1

### 3. Cognito User Pool Client

**Resource**: `CognitoUserPoolClient`

**Configuration**:

- Client Name: `MadeWithKiro-Client-{Environment}`
- Generate Secret: false
- Prevent User Existence Errors: Enabled

**OAuth Configuration**:

- Allowed Flows: code, implicit
- Allowed Scopes: email, openid, profile
- Callback URLs: Configured per environment
- Logout URLs: Configured per environment

**Token Validity**:

- Refresh Token: 30 days
- Access Token: 60 minutes
- ID Token: 60 minutes

### 4. Cognito User Pool Domain

**Resource**: `CognitoUserPoolDomain`

**Configuration**:

- Domain: `madewithkiro-{Environment}-{AccountId}`
- Hosted UI: Enabled

### 5. API Gateway

**Resource**: `MadeWithKiroApi`

**Configuration**:

- API Name: `MadeWithKiro-API-{Environment}`
- Type: REST API
- Stage: {Environment}

**Authorizer**:

- Type: Cognito User Pool
- User Pool ARN: Reference to CognitoUserPool
- Token Source: Authorization header

**CORS Configuration**:

- Allow Methods: GET, POST, PUT, OPTIONS
- Allow Headers: Content-Type, Authorization
- Allow Origin: \* (configure for production)

**Endpoints**:

| Method | Path              | Auth Required | Lambda              |
| ------ | ----------------- | ------------- | ------------------- |
| GET    | /profile/{userId} | No            | ProfileFunction     |
| POST   | /profile          | Yes           | ProfileFunction     |
| PUT    | /profile          | Yes           | ProfileFunction     |
| GET    | /applications     | No            | ApplicationFunction |
| POST   | /applications     | Yes           | ApplicationFunction |

### 6. Lambda Functions

#### Profile Function

**Resource**: `ProfileFunction`

**Configuration**:

- Function Name: `MadeWithKiro-Profile-{Environment}`
- Runtime: Python 3.13
- Memory: 256 MB
- Timeout: 30 seconds
- Handler: handler.lambda_handler

**Environment Variables**:

- TABLE_NAME: Reference to DynamoDB table
- COGNITO_USER_POOL_ID: Reference to Cognito User Pool
- ENVIRONMENT: {Environment}

**IAM Permissions**:

- DynamoDB: GetItem, PutItem, UpdateItem, Query
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents

**Responsibilities**:

- Get user profile by ID
- Create new user profile
- Update existing user profile
- Validate profile data

#### Application Function

**Resource**: `ApplicationFunction`

**Configuration**:

- Function Name: `MadeWithKiro-Application-{Environment}`
- Runtime: Python 3.13
- Memory: 256 MB
- Timeout: 30 seconds
- Handler: handler.lambda_handler

**Environment Variables**:

- TABLE_NAME: Reference to DynamoDB table
- COGNITO_USER_POOL_ID: Reference to Cognito User Pool
- ENVIRONMENT: {Environment}

**IAM Permissions**:

- DynamoDB: GetItem, PutItem, Query, Scan
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents

**Responsibilities**:

- List all applications
- List user's applications
- Create new application
- Validate application data

### 7. S3 Bucket

**Resource**: `FrontendBucket`

**Configuration**:

- Bucket Name: `madewithkiro-frontend-{Environment}-{AccountId}`
- Public Access: Enabled for website hosting
- Website Hosting: Enabled
- Index Document: index.html
- Error Document: index.html (for SPA routing)

**Bucket Policy**:

- Allow public read access (s3:GetObject)

## Environment Configuration

### Development Environment

**Stack Name**: `madewithkiro-dev`

**Parameters**:

- Environment: dev
- CognitoCallbackURL: http://localhost:5173

**Tags**:

- Environment: dev
- Application: MadeWithKiro

### Production Environment

**Stack Name**: `madewithkiro-prod`

**Parameters**:

- Environment: prod
- CognitoCallbackURL: https://madewithkiro.com

**Tags**:

- Environment: prod
- Application: MadeWithKiro

## CloudFormation Outputs

After deployment, the following outputs are available:

| Output Key         | Description              | Usage                  |
| ------------------ | ------------------------ | ---------------------- |
| ApiUrl             | API Gateway endpoint URL | Frontend API calls     |
| UserPoolId         | Cognito User Pool ID     | Frontend auth config   |
| UserPoolClientId   | Cognito Client ID        | Frontend auth config   |
| UserPoolDomain     | Cognito Hosted UI domain | Frontend auth redirect |
| TableName          | DynamoDB table name      | Backend reference      |
| FrontendBucketName | S3 bucket name           | Frontend deployment    |
| FrontendUrl        | S3 website URL           | Access frontend        |

## Security

### IAM Roles

Each Lambda function has a dedicated IAM role with least-privilege permissions:

**Profile Function Role**:

- DynamoDB: Read/Write access to MadeWithKiro table
- CloudWatch Logs: Write access

**Application Function Role**:

- DynamoDB: Read/Write access to MadeWithKiro table
- CloudWatch Logs: Write access

### Network Security

- All traffic over HTTPS/TLS
- API Gateway validates JWT tokens via Cognito authorizer
- Lambda functions run in AWS-managed VPC
- DynamoDB encryption at rest enabled

### Data Security

- User passwords managed by Cognito (never stored in DynamoDB)
- JWT tokens expire after 60 minutes
- Refresh tokens expire after 30 days
- DynamoDB encryption at rest with AWS-managed keys

## Monitoring

### CloudWatch Logs

Each Lambda function automatically logs to CloudWatch:

- Log Group: `/aws/lambda/MadeWithKiro-{Function}-{Environment}`
- Retention: 7 days (default)

### CloudWatch Metrics

Available metrics:

**Lambda**:

- Invocations
- Duration
- Errors
- Throttles
- Concurrent Executions

**API Gateway**:

- Count (requests)
- Latency
- 4XXError
- 5XXError

**DynamoDB**:

- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- UserErrors
- SystemErrors

### Recommended Alarms

1. **Lambda Errors**: Alert when error rate > 5%
2. **API Gateway 5XX**: Alert when count > 10 in 5 minutes
3. **DynamoDB Throttling**: Alert on any throttling events
4. **Lambda Duration**: Alert when p99 > 5 seconds

## Cost Estimation

### Development Environment (Low Traffic)

| Service     | Usage                      | Cost/Month        |
| ----------- | -------------------------- | ----------------- |
| DynamoDB    | 1M reads, 100K writes      | $0.50             |
| Lambda      | 100K invocations           | $0.00 (free tier) |
| API Gateway | 100K requests              | $0.00 (free tier) |
| Cognito     | < 50K MAUs                 | $0.00 (free tier) |
| S3          | 1 GB storage, 10K requests | $0.05             |
| **Total**   |                            | **~$0.55/month**  |

### Production Environment (Moderate Traffic)

| Service     | Usage                       | Cost/Month        |
| ----------- | --------------------------- | ----------------- |
| DynamoDB    | 10M reads, 1M writes        | $5.00             |
| Lambda      | 1M invocations              | $0.20             |
| API Gateway | 1M requests                 | $3.50             |
| Cognito     | 1K MAUs                     | $0.00 (free tier) |
| S3          | 5 GB storage, 100K requests | $0.15             |
| **Total**   |                             | **~$8.85/month**  |

## Scaling

### Automatic Scaling

All services scale automatically:

- **Lambda**: Up to 1000 concurrent executions (default)
- **DynamoDB**: On-demand billing scales automatically
- **API Gateway**: Scales automatically
- **Cognito**: Scales automatically

### Performance Optimization

**Lambda Cold Starts**:

- Current: ~500ms for Python 3.13
- Mitigation: Provisioned concurrency (if needed)

**DynamoDB Performance**:

- Single-digit millisecond latency
- GSI for efficient queries
- On-demand billing for unpredictable traffic

**API Gateway**:

- Edge-optimized endpoints
- Caching available (not enabled in POC)

## Disaster Recovery

### Backup Strategy

**DynamoDB**:

- Point-in-Time Recovery: Enabled
- Retention: 35 days
- Recovery: Restore to any point in time

**S3**:

- Versioning: Not enabled (can be enabled)
- Replication: Not configured (can be configured)

### Recovery Procedures

**Complete Stack Failure**:

1. Redeploy from SAM template: `make deploy-{env}`
2. Restore DynamoDB from backup
3. Redeploy frontend: `make upload-frontend-{env}`

**Data Loss**:

1. Restore DynamoDB table from point-in-time backup
2. Verify data integrity
3. Resume operations

## Maintenance

### Updates

**Lambda Runtime Updates**:

- Update `Runtime` in template.yaml
- Redeploy: `make deploy-{env}`

**Dependency Updates**:

- Update requirements.txt
- Redeploy: `make deploy-{env}`

**Infrastructure Changes**:

- Update template.yaml
- Validate: `make sam-validate`
- Deploy: `make deploy-{env}`

### Monitoring

- Review CloudWatch logs daily
- Check error rates weekly
- Review costs monthly
- Update dependencies quarterly

## Troubleshooting

### Common Issues

**Deployment Fails**:

- Check AWS credentials
- Verify SAM CLI version
- Review CloudFormation events

**Lambda Timeout**:

- Increase timeout in template.yaml
- Optimize code
- Check DynamoDB query efficiency

**CORS Errors**:

- Verify API Gateway CORS configuration
- Check Cognito callback URLs
- Ensure proper headers in Lambda responses

**Authentication Fails**:

- Verify Cognito configuration
- Check JWT token expiration
- Validate callback URLs

## References

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Cognito Documentation](https://docs.aws.amazon.com/cognito/)
