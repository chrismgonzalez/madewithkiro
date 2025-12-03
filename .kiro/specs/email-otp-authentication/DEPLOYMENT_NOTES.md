# OTP Authentication Deployment Notes

## Circular Dependency Resolution

### Issue

Initial deployment failed with circular dependency error between CognitoUserPool and Lambda functions.

### Root Cause

The circular dependency was caused by:

1. **Globals section** had `COGNITO_USER_POOL_ID: !Ref CognitoUserPool` which was inherited by ALL Lambda functions
2. **CognitoUserPool** referenced Lambda functions via `LambdaConfig` using `!GetAtt`
3. **Lambda Permissions** referenced CognitoUserPool via `SourceArn`

This created a cycle: Lambda → UserPool → Lambda

### Solution

1. **Removed** `COGNITO_USER_POOL_ID` from Globals section
2. **Added** `COGNITO_USER_POOL_ID` explicitly only to ProfileFunction and ApplicationFunction (which actually need it)
3. **Removed** `SourceArn` from Lambda Permissions (optional security feature, not required)
4. **OTP Lambda functions** don't reference UserPool - they get UserPoolId from the Cognito event at runtime

### Result

- No circular dependencies
- Template validates successfully
- OTP Lambda functions are independent and can be created before UserPool
- UserPool can reference Lambda functions via LambdaConfig
- ProfileFunction and ApplicationFunction still have access to UserPoolId

## Deployment Steps

### Prerequisites

1. SES domain verification completed (madewithkiro.com)
2. SES email identity verified (noreply@madewithkiro.com)
3. SES production access granted
4. DNS records configured (SPF, DKIM, DMARC)

### Deploy Command

```bash
sam build
sam deploy --config-env dev
```

### Post-Deployment Verification

1. Check Lambda functions are created:

   - MadeWithKiro-DefineAuthChallenge-dev
   - MadeWithKiro-CreateAuthChallenge-dev
   - MadeWithKiro-VerifyAuthChallenge-dev

2. Verify Cognito User Pool has Lambda triggers configured:

   - DefineAuthChallenge
   - CreateAuthChallenge
   - VerifyAuthChallengeResponse

3. Test OTP flow:
   - Request OTP code
   - Check email delivery
   - Verify OTP code
   - Confirm authentication succeeds

## Environment Variables

### OTP Lambda Functions

- `TABLE_NAME` - DynamoDB table name (from Globals)
- `ENVIRONMENT` - Environment name (from Globals)
- `SES_EMAIL_IDENTITY` - Email sender (CreateAuthChallenge only)
- `SES_TEMPLATE_NAME` - Email template (CreateAuthChallenge only)
- `SES_CONFIGURATION_SET` - SES config set (CreateAuthChallenge only)

### Profile/Application Functions

- `TABLE_NAME` - DynamoDB table name (from Globals)
- `ENVIRONMENT` - Environment name (from Globals)
- `COGNITO_USER_POOL_ID` - User Pool ID (explicit)
- `ALLOWED_ORIGINS` - CORS origins (from Globals)

## Known Issues

### SAM Validate Warnings

The following warnings are expected and can be ignored:

- W3005: CloudFrontDistribution dependency warning (cosmetic)
- W8001: HasCognitoCertificate condition not used (optional feature)

## Rollback Plan

If deployment fails:

1. Check CloudFormation stack events for specific error
2. If Lambda functions fail to create, check IAM permissions
3. If UserPool fails to create, check Lambda function ARNs
4. Rollback: `sam delete --stack-name madewithkiro-dev`

## Testing Checklist

- [ ] Lambda functions deployed successfully
- [ ] Cognito User Pool has Lambda triggers
- [ ] SES email template exists
- [ ] OTP request generates and sends email
- [ ] OTP verification works correctly
- [ ] Rate limiting enforced (60 seconds)
- [ ] Account linking works for duplicate emails
- [ ] Error handling works (expired codes, invalid codes)
- [ ] CloudWatch logs show proper logging
