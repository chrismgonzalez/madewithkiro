## Auth Handler

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand, 
  GetUserCommand,
  InitiateAuthCommandOutput
} from '@aws-sdk/client-cognito-identity-provider';

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const AWS_REGION = process.env.AWS_REGION!; // Automatically provided by Lambda runtime

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

// Interfaces for request/response types
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface RefreshRequest {
  refreshToken: string;
}

interface ValidationResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  expiresAt?: number;
}

interface ErrorResponse {
  message: string;
  code?: string;
}

// Structured logging utility
function log(level: string, message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId: Math.random().toString(36).substring(7),
    ...data
  };
  console.log(JSON.stringify(logEntry));
}

// Create standardized response
function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// Login endpoint handler
async function handleLogin(body: LoginRequest): Promise<APIGatewayProxyResult> {
  try {
    log('INFO', 'Processing login request', { email: body.email });

    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: body.email,
        PASSWORD: body.password
      }
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      log('ERROR', 'Authentication failed - no result returned');
      return createResponse(401, { message: 'Invalid credentials' });
    }

    const { AccessToken, IdToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

    if (!AccessToken || !IdToken || !RefreshToken) {
      log('ERROR', 'Authentication failed - missing tokens');
      return createResponse(401, { message: 'Invalid credentials' });
    }

    const loginResponse: LoginResponse = {
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: RefreshToken,
      expiresIn: ExpiresIn || 3600,
      tokenType: 'Bearer'
    };

    log('INFO', 'Login successful', { email: body.email });
    return createResponse(200, loginResponse);

  } catch (error: any) {
    log('ERROR', 'Login error', { error: error.message, code: error.name });

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, { message: 'Invalid credentials' });
    }
    if (error.name === 'UserNotFoundException') {
      return createResponse(401, { message: 'Invalid credentials' });
    }
    if (error.name === 'UserNotConfirmedException') {
      return createResponse(403, { message: 'Account not confirmed' });
    }
    if (error.name === 'PasswordResetRequiredException') {
      return createResponse(403, { message: 'Password reset required' });
    }
    if (error.name === 'TooManyRequestsException') {
      return createResponse(429, { message: 'Too many requests, please try again later' });
    }

    return createResponse(500, { message: 'Internal server error' });
  }
}

// Refresh token endpoint handler
async function handleRefresh(body: RefreshRequest): Promise<APIGatewayProxyResult> {
  try {
    log('INFO', 'Processing token refresh request');

    const command = new InitiateAuthCommand({
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: {
        REFRESH_TOKEN: body.refreshToken
      }
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      log('ERROR', 'Token refresh failed - no result returned');
      return createResponse(401, { message: 'Invalid refresh token' });
    }

    const { AccessToken, IdToken, ExpiresIn } = response.AuthenticationResult;

    if (!AccessToken || !IdToken) {
      log('ERROR', 'Token refresh failed - missing tokens');
      return createResponse(401, { message: 'Invalid refresh token' });
    }

    const refreshResponse = {
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: body.refreshToken, // Refresh token stays the same
      expiresIn: ExpiresIn || 3600,
      tokenType: 'Bearer' as const
    };

    log('INFO', 'Token refresh successful');
    return createResponse(200, refreshResponse);

  } catch (error: any) {
    log('ERROR', 'Token refresh error', { error: error.message, code: error.name });

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, { message: 'Invalid refresh token' });
    }
    if (error.name === 'TooManyRequestsException') {
      return createResponse(429, { message: 'Too many requests, please try again later' });
    }

    return createResponse(500, { message: 'Internal server error' });
  }
}

// Validate token endpoint handler
async function handleValidate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    log('INFO', 'Processing token validation request');

    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createResponse(401, { 
        valid: false, 
        message: 'Missing or invalid authorization header' 
      });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    const command = new GetUserCommand({
      AccessToken: accessToken
    });

    const response = await cognitoClient.send(command);

    const email = response.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
    const userId = response.Username;

    // Calculate expiration time (tokens typically expire in 1 hour)
    const expiresAt = Date.now() + (3600 * 1000); // 1 hour from now

    const validationResponse: ValidationResponse = {
      valid: true,
      userId,
      email,
      expiresAt
    };

    log('INFO', 'Token validation successful', { userId, email });
    return createResponse(200, validationResponse);

  } catch (error: any) {
    log('ERROR', 'Token validation error', { error: error.message, code: error.name });

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, { 
        valid: false, 
        message: 'Invalid or expired token' 
      });
    }

    return createResponse(500, { 
      valid: false, 
      message: 'Internal server error' 
    });
  }
}

// Main Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  log('INFO', 'Auth handler invoked', {
    path: event.path,
    method: event.httpMethod,
    requestId: context.awsRequestId
  });

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    // Route based on path and method
    if (event.path === '/api/auth/login' && event.httpMethod === 'POST') {
      if (!event.body) {
        return createResponse(400, { message: 'Request body is required' });
      }

      const body: LoginRequest = JSON.parse(event.body);
      
      // Validate required fields
      if (!body.email || !body.password) {
        return createResponse(400, { message: 'Email and password are required' });
      }

      return await handleLogin(body);
    }

    if (event.path === '/api/auth/refresh' && event.httpMethod === 'POST') {
      if (!event.body) {
        return createResponse(400, { message: 'Request body is required' });
      }

      const body: RefreshRequest = JSON.parse(event.body);
      
      // Validate required fields
      if (!body.refreshToken) {
        return createResponse(400, { message: 'Refresh token is required' });
      }

      return await handleRefresh(body);
    }

    if (event.path === '/api/auth/validate' && event.httpMethod === 'GET') {
      return await handleValidate(event);
    }

    // Route not found
    return createResponse(404, { message: 'Endpoint not found' });

  } catch (error: any) {
    log('ERROR', 'Unhandled error in auth handler', { 
      error: error.message, 
      stack: error.stack 
    });
    
    return createResponse(500, { message: 'Internal server error' });
  }
};
```

## JWT authorizer

```typescript
import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  Context,
} from 'aws-lambda';
import jwt, { JwtPayload } from 'jsonwebtoken';

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;

interface TokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role?: string;
  type?: string;
}

const log = (level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: Record<string, unknown>) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(payload));
};

const buildStageWildcardArn = (methodArn: string): string => {
  const arnParts = methodArn.split('/');
  if (arnParts.length < 4) {
    return methodArn;
  }

  const colonIndex = methodArn.indexOf(':');
  const arnPrefix = methodArn.substring(0, colonIndex + 1);
  const arnSuffix = methodArn.substring(colonIndex + 1);
  const suffixParts = arnSuffix.split('/');
  
  if (suffixParts.length < 2) {
    return methodArn;
  }
  
  return `${arnPrefix}${suffixParts[0]}/${suffixParts[1]}/*/*`;
};

const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context: Record<string, string>
): APIGatewayAuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  },
  context,
});

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  _context: Context
): Promise<APIGatewayAuthorizerResult> => {
  if (!AUTH_JWT_SECRET) {
    log('ERROR', 'JWT authorizer misconfiguration: missing AUTH_JWT_SECRET', {
      methodArn: event.methodArn,
    });
    throw new Error('JWT authorizer is not configured properly');
  }

  try {
    if (!event.authorizationToken) {
      log('WARN', 'Authorization header missing', { methodArn: event.methodArn });
      throw new Error('Missing authorization token');
    }

    const token = event.authorizationToken.replace(/^Bearer\s+/i, '');

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, AUTH_JWT_SECRET) as TokenPayload;
    } catch (verifyError: any) {
      log('ERROR', 'JWT verification failed', {
        methodArn: event.methodArn,
        reason: verifyError?.message ?? 'Unknown verification error',
      });
      throw verifyError;
    }

    if (decoded.type && decoded.type !== 'access') {
      log('WARN', 'Rejected token with invalid type', {
        methodArn: event.methodArn,
        tokenType: decoded.type,
      });
      throw new Error('Invalid token type');
    }

    const role = decoded.role || 'user';

    log('INFO', 'JWT authorizer granted access', {
      methodArn: event.methodArn,
      principal: decoded.sub || decoded.email,
      role,
    });

    const resourceArn = buildStageWildcardArn(event.methodArn);

    return generatePolicy(decoded.sub || decoded.email, 'Allow', resourceArn, {
      email: decoded.email,
      role,
      isAdmin: role === 'admin' ? 'true' : 'false',
    });
  } catch (error: any) {
    log('ERROR', 'JWT authorizer denying request', {
      methodArn: event.methodArn,
      reason: error?.message ?? 'Unknown error',
    });
    return generatePolicy('anonymous', 'Deny', buildStageWildcardArn(event.methodArn), {
      email: '',
      role: 'anonymous',
      isAdmin: 'false',
      error: error?.message ?? 'UNKNOWN',
    });
  }
};
```

## OTP handler

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { renderOtpEmail, renderOtpEmailPlainText } from './templates/email-template-renderer';

const ACCOUNTS_TABLE_NAME = process.env.ACCOUNTS_TABLE_NAME!;
const ADMINS_TABLE_NAME = process.env.ADMINS_TABLE_NAME!;
const SES_FROM_ADDRESS = process.env.SES_FROM_ADDRESS!;
const SES_FROM_NAME = process.env.SES_FROM_NAME || 'Caylent Cards';
const SES_REPLY_TO_ADDRESS = process.env.SES_REPLY_TO_ADDRESS!;
const SES_REGION = process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
if (!FRONTEND_BASE_URL) {
  throw new Error('FRONTEND_BASE_URL environment variable is not set. Please set it in your infrastructure/environment configuration.');
}
if (!FRONTEND_BASE_URL || !FRONTEND_BASE_URL.startsWith('https://')) {
  throw new Error('FRONTEND_BASE_URL must be a valid HTTPS URL');
}
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET!;
const ACCESS_TOKEN_TTL_MINUTES = parseInt(process.env.AUTH_ACCESS_TOKEN_TTL_MINUTES || '1440', 10); // 24 hours
const REFRESH_TOKEN_TTL_MINUTES = parseInt(process.env.AUTH_REFRESH_TOKEN_TTL_MINUTES || '43200', 10); // 30 days
const OTP_CODE_TTL_MINUTES = parseInt(process.env.OTP_CODE_TTL_MINUTES || '10', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const MAX_ATTEMPTS = 5;

const dynamoClient = new DynamoDBClient({});
const sesClient = new SESClient({ region: SES_REGION });

interface RequestCodeBody {
  email: string;
}

interface VerifyCodeBody {
  email: string;
  code: string;
}

interface RefreshBody {
  refreshToken: string;
}

const respond = (statusCode: number, body: Record<string, unknown>): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  },
  body: JSON.stringify(body),
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generateOtp = (): string => crypto.randomInt(100000, 1000000).toString();

const hashOtpCode = (code: string, email: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(`${email}:${code}:${AUTH_JWT_SECRET}`);
  return hash.digest('hex');
};

const timingSafeCompare = (hashA: string, hashB: string): boolean => {
  if (hashA.length !== hashB.length) {
    return false;
  }
  const bufferA = Buffer.from(hashA, 'hex');
  const bufferB = Buffer.from(hashB, 'hex');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};

const sendOtpEmail = async (email: string, code: string): Promise<void> => {
  const encodedEmail = encodeURIComponent(email);
  const magicLink = `${FRONTEND_BASE_URL}/verify?email=${encodedEmail}&otp=${code}`;
  
  // Prepare template variables
  const templateVariables = {
    OTP_CODE: code,
    EXPIRY_MINUTES: OTP_CODE_TTL_MINUTES,
    MAGIC_LINK: magicLink,
    REPLY_TO_EMAIL: SES_REPLY_TO_ADDRESS,
    CURRENT_YEAR: new Date().getFullYear(),
  };

  // Render HTML and plain text versions
  const htmlBody = renderOtpEmail(templateVariables);
  const textBody = renderOtpEmailPlainText(templateVariables);
  
  await sesClient.send(
    new SendEmailCommand({
      Source: `"${SES_FROM_NAME}" <${SES_FROM_ADDRESS}>`,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: { Data: 'Your verification code - Caylent Cards', Charset: 'UTF-8' },
        Body: {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: [SES_REPLY_TO_ADDRESS],
    })
  );
};

const isAdminEmail = async (email: string): Promise<boolean> => {
  if (!ADMINS_TABLE_NAME) {
    return false;
  }
  const existing = await dynamoClient.send(
    new GetItemCommand({
      TableName: ADMINS_TABLE_NAME,
      Key: { email: { S: email } },
      ProjectionExpression: 'email',
    })
  );
  return !!existing.Item;
};

const handleRequestCode = async (body: RequestCodeBody): Promise<APIGatewayProxyResult> => {
  if (!body?.email) {
    return respond(400, { message: 'Email is required' });
  }

  const email = normalizeEmail(body.email);

  if (!validateEmail(email)) {
    return respond(400, { message: 'Invalid email address' });
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS * 1000;

  const existing = await dynamoClient.send(
    new GetItemCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      Key: { email: { S: email } },
      ProjectionExpression: 'otpRequestedAt',
    })
  );

  const lastRequestedAt = existing.Item?.otpRequestedAt?.N ? Number(existing.Item.otpRequestedAt.N) : 0;

  if (lastRequestedAt && now - lastRequestedAt < cooldownMs) {
    const retryIn = Math.ceil((cooldownMs - (now - lastRequestedAt)) / 1000);
    return respond(429, { message: `Please wait ${retryIn} seconds before requesting another code.` });
  }

  const otpCode = generateOtp();
  const hashedCode = hashOtpCode(otpCode, email);
  const expiresAt = now + OTP_CODE_TTL_MINUTES * 60 * 1000;

  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      Key: { email: { S: email } },
      UpdateExpression:
        'SET otpCodeHash = :hash, otpExpiresAt = :expires, otpRequestedAt = :requested, otpAttemptCount = :attempts, updatedAt = :updated, createdAt = if_not_exists(createdAt, :created)',
      ExpressionAttributeValues: {
        ':hash': { S: hashedCode },
        ':expires': { N: expiresAt.toString() },
        ':requested': { N: now.toString() },
        ':attempts': { N: '0' },
        ':updated': { S: nowIso },
        ':created': { S: nowIso },
      },
    })
  );

  await sendOtpEmail(email, otpCode);

  return respond(200, {
    success: true,
    message: 'Verification code sent.',
  });
};

const handleVerifyCode = async (body: VerifyCodeBody): Promise<APIGatewayProxyResult> => {
  if (!body?.email || !body?.code) {
    return respond(400, { message: 'Email and code are required' });
  }

  const email = normalizeEmail(body.email);
  const code = body.code.trim();

  if (!validateEmail(email)) {
    return respond(400, { message: 'Invalid email address' });
  }

  if (!/^\d{6}$/.test(code)) {
    return respond(400, { message: 'Verification code must be 6 digits' });
  }

  const accountResult = await dynamoClient.send(
    new GetItemCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      Key: { email: { S: email } },
    })
  );

  const item = accountResult.Item;

  if (!item || !item.otpCodeHash?.S || !item.otpExpiresAt?.N) {
    return respond(400, { message: 'No active verification code. Request a new one.' });
  }

  const attemptCount = item.otpAttemptCount?.N ? Number(item.otpAttemptCount.N) : 0;
  if (attemptCount >= MAX_ATTEMPTS) {
    return respond(429, { message: 'Too many invalid attempts. Request a new code.' });
  }

  const expiresAt = Number(item.otpExpiresAt.N);
  if (Date.now() > expiresAt) {
    return respond(400, { message: 'Code has expired. Request a new one.' });
  }

  const providedHash = hashOtpCode(code, email);
  if (!timingSafeCompare(providedHash, item.otpCodeHash.S)) {
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: ACCOUNTS_TABLE_NAME,
        Key: { email: { S: email } },
        UpdateExpression: 'SET otpAttemptCount = if_not_exists(otpAttemptCount, :zero) + :one, updatedAt = :updated',
        ExpressionAttributeValues: {
          ':one': { N: '1' },
          ':zero': { N: '0' },
          ':updated': { S: new Date().toISOString() },
        },
      })
    );
    return respond(401, { message: 'Invalid code. Please try again.' });
  }

  const admin = await isAdminEmail(email);

  const accessToken = jwt.sign(
    {
      sub: email,
      email,
      role: admin ? 'admin' : 'user',
      type: 'access',
    },
    AUTH_JWT_SECRET,
    {
      expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m`,
    }
  );

  const refreshToken = jwt.sign(
    {
      sub: email,
      email,
      role: admin ? 'admin' : 'user',
      type: 'refresh',
    },
    AUTH_JWT_SECRET,
    {
      expiresIn: `${REFRESH_TOKEN_TTL_MINUTES}m`,
    }
  );

  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: ACCOUNTS_TABLE_NAME,
      Key: { email: { S: email } },
      UpdateExpression: 'SET lastLoginAt = :lastLogin, updatedAt = :updated REMOVE otpCodeHash, otpExpiresAt, otpRequestedAt, otpAttemptCount',
      ExpressionAttributeValues: {
        ':lastLogin': { S: new Date().toISOString() },
        ':updated': { S: new Date().toISOString() },
      },
    })
  );

  return respond(200, {
    success: true,
    tokens: {
      accessToken,
      refreshToken,
      expiresInSeconds: ACCESS_TOKEN_TTL_MINUTES * 60,
    },
    user: {
      email,
      role: admin ? 'admin' : 'user',
      isAdmin: admin,
    },
  });
};

const handleRefresh = async (body: RefreshBody): Promise<APIGatewayProxyResult> => {
  if (!body?.refreshToken) {
    return respond(400, { message: 'Refresh token is required' });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(body.refreshToken, AUTH_JWT_SECRET) as {
      sub: string;
      email: string;
      role: string;
      type: string;
    };

    // Ensure it's actually a refresh token, not an access token
    if (decoded.type !== 'refresh') {
      return respond(401, { message: 'Invalid token type' });
    }

    const email = decoded.email;
    const admin = await isAdminEmail(email);

    // Issue new access token
    const accessToken = jwt.sign(
      {
        sub: email,
        email,
        role: admin ? 'admin' : 'user',
        type: 'access',
      },
      AUTH_JWT_SECRET,
      {
        expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m`,
      }
    );

    // Optionally issue a new refresh token (token rotation)
    const newRefreshToken = jwt.sign(
      {
        sub: email,
        email,
        role: admin ? 'admin' : 'user',
        type: 'refresh',
      },
      AUTH_JWT_SECRET,
      {
        expiresIn: `${REFRESH_TOKEN_TTL_MINUTES}m`,
      }
    );

    return respond(200, {
      success: true,
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresInSeconds: ACCESS_TOKEN_TTL_MINUTES * 60,
      },
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return respond(401, { message: 'Refresh token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return respond(401, { message: 'Invalid refresh token' });
    }
    console.error('Refresh error:', error);
    return respond(500, { message: 'Internal server error' });
  }
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(
    JSON.stringify({
      message: 'OTP auth handler invoked',
      path: event.path,
      resource: event.resource,
      requestId: context.awsRequestId,
    })
  );

  if (event.httpMethod === 'OPTIONS') {
    return respond(200, { success: true });
  }

  if (!event.body) {
    return respond(400, { message: 'Request body is required' });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (error) {
    return respond(400, { message: 'Invalid JSON payload' });
  }

  const normalizedPath = event.resource || event.path;

  try {
    if (normalizedPath?.endsWith('/request-code')) {
      return await handleRequestCode(parsedBody as RequestCodeBody);
    }

    if (normalizedPath?.endsWith('/verify-code')) {
      return await handleVerifyCode(parsedBody as VerifyCodeBody);
    }

    if (normalizedPath?.endsWith('/refresh')) {
      return await handleRefresh(parsedBody as RefreshBody);
    }

    return respond(404, { message: 'Endpoint not found' });
  } catch (error: any) {
    console.error('OTP handler error', {
      message: error?.message,
      stack: error?.stack,
    });
    return respond(500, { message: 'Internal server error' });
  }
};
```

## Authentication construct

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';
import { shouldUseDockerBundling } from '../utils/bundling-utils';

export interface AuthenticationConstructProps {
  config: EnvironmentConfig;
}

export class AuthenticationConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly authHandler: lambda.Function;
  public readonly otpAuthHandler: lambda.Function;
  public readonly jwtAuthorizerLambda: lambda.Function;
  public readonly jwtAuthorizer: apigateway.TokenAuthorizer;
  public readonly accountsTable: dynamodb.Table;
  public readonly adminsTable: dynamodb.Table;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: AuthenticationConstructProps) {
    super(scope, id);

    const { config } = props;

    // Create Cognito User Pool with email sign-in and password policy
    this.userPool = new cognito.UserPool(this, 'UserPoolV2', {
      userPoolName: `${config.envPrefix}-users-pool`,
      signInAliases: { 
        email: true 
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      selfSignUpEnabled: false, // Admin-managed users only
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Apply mandatory Caylent tags to User Pool
    Object.entries(config.caylentTags).forEach(([key, value]) => {
      cdk.Tags.of(this.userPool).add(key, value);
    });

    // Create User Pool Client for frontend integration
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClientV2', {
      userPool: this.userPool,
      userPoolClientName: `${config.envPrefix}-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true // Add this for admin operations
      },
      generateSecret: false, // For frontend use - no client secret
      preventUserExistenceErrors: true,
      // Remove OAuth flows that might be causing issues
      oAuth: undefined
    });

    // Apply mandatory Caylent tags to User Pool Client
    Object.entries(config.caylentTags).forEach(([key, value]) => {
      cdk.Tags.of(this.userPoolClient).add(key, value);
    });

    // Import existing log group or create if it doesn't exist
    const authLogGroup = logs.LogGroup.fromLogGroupName(
      this,
      'AuthHandlerLogGroup',
      `/aws/lambda/${config.envPrefix}-auth-handler`
    );

    // Create authentication Lambda function
    this.authHandler = new NodejsFunction(this, 'AuthHandler', {
      functionName: `${config.envPrefix}-auth-handler`,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '..', 'lambda', 'auth-handler.ts'),
      handler: 'handler',
      bundling: {
        nodeModules: ['@aws-sdk/client-cognito-identity-provider'],
        forceDockerBundling: shouldUseDockerBundling(),
      },
      depsLockFilePath: path.join(__dirname, '..', '..', 'package-lock.json'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        USER_POOL_ID: this.userPool.userPoolId,
        USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId
        // AWS_REGION is automatically provided by Lambda runtime
      },
      logGroup: authLogGroup
    });

    // Apply mandatory Caylent tags to Lambda function
    Object.entries(config.caylentTags).forEach(([key, value]) => {
      cdk.Tags.of(this.authHandler).add(key, value);
    });

    // Apply additional project tags
    Object.entries(config.projectTags).forEach(([key, value]) => {
      cdk.Tags.of(this.authHandler).add(key, value);
    });

    // Grant Cognito permissions to the auth handler
    this.authHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:InitiateAuth',
        'cognito-idp:GetUser'
      ],
      resources: [this.userPool.userPoolArn]
    }));

    // Create API Gateway for all API endpoints
    this.api = new apigateway.RestApi(this, 'AuthApi', {
      restApiName: `${config.envPrefix}-api`,
      description: 'Main API for Pokemon Trainer Cards - handles authentication and user data'
    });

    // Passwordless accounts table
    this.accountsTable = new dynamodb.Table(this, 'AccountsTable', {
      tableName: `${config.envPrefix}-accounts`,
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });

    this.adminsTable = new dynamodb.Table(this, 'AdminsTable', {
      tableName: `${config.envPrefix}-admins`,
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });

    Object.entries(config.caylentTags).forEach(([key, value]) => {
      cdk.Tags.of(this.accountsTable).add(key, value);
      cdk.Tags.of(this.adminsTable).add(key, value);
    });
    Object.entries(config.projectTags).forEach(([key, value]) => {
      cdk.Tags.of(this.accountsTable).add(key, value);
      cdk.Tags.of(this.adminsTable).add(key, value);
    });

    const otpLogGroup = logs.LogGroup.fromLogGroupName(
      this,
      'OtpAuthHandlerLogGroup',
      `/aws/lambda/${config.envPrefix}-otp-auth-handler`
    );

    this.otpAuthHandler = new NodejsFunction(this, 'OtpAuthHandler', {
      functionName: `${config.envPrefix}-otp-auth-handler`,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '..', 'lambda', 'otp-auth-handler.ts'),
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      logGroup: otpLogGroup,
      bundling: {
        nodeModules: ['jsonwebtoken'],
        forceDockerBundling: shouldUseDockerBundling(),
        commandHooks: {
          beforeBundling() {
            return [];
          },
          beforeInstall() {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string) {
            const templatesSource = path.posix.join(inputDir, 'lib', 'lambda', 'templates', '*.html');
            return [
              `cp ${templatesSource} ${outputDir}/`
            ];
          }
        }
      },
      depsLockFilePath: path.join(__dirname, '..', '..', 'package-lock.json'),
      environment: {
        ACCOUNTS_TABLE_NAME: this.accountsTable.tableName,
        ADMINS_TABLE_NAME: this.adminsTable.tableName,
        SES_FROM_ADDRESS: config.email.fromAddress,
        SES_FROM_NAME: config.email.fromName,
        SES_REPLY_TO_ADDRESS: config.email.replyToAddress,
        SES_REGION: config.email.region,
        AUTH_JWT_SECRET: config.auth.jwtSecret,
        AUTH_ACCESS_TOKEN_TTL_MINUTES: config.auth.accessTokenTtlMinutes.toString(),
        AUTH_REFRESH_TOKEN_TTL_MINUTES: config.auth.refreshTokenTtlMinutes.toString(),
        OTP_CODE_TTL_MINUTES: config.auth.otpCodeTtlMinutes.toString(),
        OTP_RESEND_COOLDOWN_SECONDS: config.auth.otpResendCooldownSeconds.toString(),
        FRONTEND_BASE_URL: config.frontendBaseUrl,
      },
    });

    this.accountsTable.grantReadWriteData(this.otpAuthHandler);
    this.adminsTable.grantReadData(this.otpAuthHandler);
    this.otpAuthHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      })
    );

    const jwtAuthorizerLogGroup = logs.LogGroup.fromLogGroupName(
      this,
      'JwtAuthorizerLogGroup',
      `/aws/lambda/${config.envPrefix}-jwt-authorizer`
    );

    this.jwtAuthorizerLambda = new NodejsFunction(this, 'JwtAuthorizerLambda', {
      functionName: `${config.envPrefix}-jwt-authorizer`,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '..', 'lambda', 'jwt-authorizer.ts'),
      handler: 'handler',
      bundling: {
        nodeModules: ['jsonwebtoken'],
        forceDockerBundling: shouldUseDockerBundling(),
      },
      depsLockFilePath: path.join(__dirname, '..', '..', 'package-lock.json'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      logGroup: jwtAuthorizerLogGroup,
      environment: {
        AUTH_JWT_SECRET: config.auth.jwtSecret,
      },
    });

    this.jwtAuthorizer = new apigateway.TokenAuthorizer(this, 'JwtTokenAuthorizer', {
      handler: this.jwtAuthorizerLambda,
      authorizerName: `${config.envPrefix}-jwt-authorizer`,
      identitySource: apigateway.IdentitySource.header('Authorization'),
      resultsCacheTtl: cdk.Duration.minutes(5),
    });
    this.jwtAuthorizer._attachToApi(this.api);

    // Create authentication endpoints
    this.createAuthenticationEndpoints();
  }

  private createAuthenticationEndpoints(): void {
    // Create /api resource
    const apiResource = this.api.root.addResource('api');
    
    // Create /auth resource under /api
    const authResource = apiResource.addResource('auth');

    // Create Lambda integration for authentication endpoints
    const authIntegration = new apigateway.LambdaIntegration(this.authHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
          }
        },
        {
          statusCode: '400',
          selectionPattern: '.*"statusCode":400.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
          }
        },
        {
          statusCode: '401',
          selectionPattern: '.*"statusCode":401.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
          }
        },
        {
          statusCode: '403',
          selectionPattern: '.*"statusCode":403.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
          }
        },
        {
          statusCode: '429',
          selectionPattern: '.*"statusCode":429.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
          }
        },
        {
          statusCode: '500',
          selectionPattern: '.*"statusCode":500.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
          }
        }
      ]
    });

    // OTP/passwordless integration
    const otpIntegration = new apigateway.LambdaIntegration(this.otpAuthHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
          },
        },
        {
          statusCode: '400',
          selectionPattern: '.*"statusCode":400.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
          },
        },
        {
          statusCode: '401',
          selectionPattern: '.*"statusCode":401.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
          },
        },
        {
          statusCode: '429',
          selectionPattern: '.*"statusCode":429.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
          },
        },
        {
          statusCode: '500',
          selectionPattern: '.*"statusCode":500.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
          },
        },
      ],
    });

    // Create /login endpoint
    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', authIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '403',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '429',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        }
      ]
    });

    // Create /refresh endpoint - use OTP handler for JWT refresh
    const refreshResource = authResource.addResource('refresh');
    refreshResource.addMethod('POST', otpIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '429',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        }
      ]
    });

    // Create /validate endpoint
    const validateResource = authResource.addResource('validate');
    validateResource.addMethod('GET', authIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        }
      ]
    });

    // OTP endpoints (passwordless auth)
    const requestCodeResource = authResource.addResource('request-code');
    requestCodeResource.addMethod('POST', otpIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
        },
        { statusCode: '400' },
        { statusCode: '401' },
        { statusCode: '429' },
        { statusCode: '500' },
      ],
    });
    this.addCorsSupport(requestCodeResource);

    const verifyCodeResource = authResource.addResource('verify-code');
    verifyCodeResource.addMethod('POST', otpIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
        },
        { statusCode: '400' },
        { statusCode: '401' },
        { statusCode: '429' },
        { statusCode: '500' },
      ],
    });
    this.addCorsSupport(verifyCodeResource);

    // Add CORS preflight support for all auth endpoints
    this.addCorsSupport(loginResource);
    this.addCorsSupport(refreshResource);
    this.addCorsSupport(validateResource);

    // Add health check endpoint at /api (no authorization required)
    apiResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
        },
        responseTemplates: {
          'application/json': JSON.stringify({
            status: 'healthy',
            service: 'Caylent PokeTrainers API',
            timestamp: '$context.requestTime',
            version: '1.0.0'
          })
        }
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }), {
      // No authorization required for health check
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });

    // Add dedicated health endpoint at /api/health (no authorization required)
    const healthResource = apiResource.addResource('health');
    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
        },
        responseTemplates: {
          'application/json': JSON.stringify({
            status: 'healthy',
            service: 'Caylent PokeTrainers API',
            timestamp: '$context.requestTime',
            version: '1.0.0'
          })
        }
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }), {
      // No authorization required for health check
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });

    // Add CORS support for health check endpoints
    this.addCorsSupport(apiResource);
    this.addCorsSupport(healthResource);
  }

  private addCorsSupport(resource: apigateway.Resource): void {
    resource.addMethod('OPTIONS', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'"
        }
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });
  }
}
```