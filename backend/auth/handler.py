"""
OTP Authentication Lambda Handler (DynamoDB-based approach)

Handles OTP authentication API endpoints:
- POST /auth/otp/request - Request OTP code
- POST /auth/otp/verify - Verify OTP code and get JWT tokens
- POST /auth/otp/refresh - Refresh access token

Based on the reference implementation that stores OTP in DynamoDB
and issues self-signed JWT tokens.
"""
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import boto3
import jwt
from botocore.exceptions import ClientError
from pydantic import BaseModel, EmailStr, Field, ValidationError

from shared.cors_utils import get_cors_headers
from shared.logger import get_logger

logger = get_logger(__name__)

# AWS clients
dynamodb = boto3.resource('dynamodb')
ses_client = boto3.client('ses')
cognito_client = boto3.client('cognito-idp')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
AUTH_JWT_SECRET = os.environ.get('AUTH_JWT_SECRET')
SES_EMAIL_IDENTITY = os.environ.get('SES_EMAIL_IDENTITY', 'noreply@madewithkiro.com')
SES_TEMPLATE_NAME = os.environ.get('SES_TEMPLATE_NAME')
SES_CONFIGURATION_SET = os.environ.get('SES_CONFIGURATION_SET')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')

# Token configuration
ACCESS_TOKEN_TTL_MINUTES = int(os.environ.get('ACCESS_TOKEN_TTL_MINUTES', '60'))  # 1 hour
REFRESH_TOKEN_TTL_MINUTES = int(os.environ.get('REFRESH_TOKEN_TTL_MINUTES', '43200'))  # 30 days
OTP_CODE_TTL_MINUTES = int(os.environ.get('OTP_CODE_TTL_MINUTES', '10'))
OTP_RESEND_COOLDOWN_SECONDS = int(os.environ.get('OTP_RESEND_COOLDOWN_SECONDS', '60'))
MAX_OTP_ATTEMPTS = 5


# Request/Response Models
class OTPRequestBody(BaseModel):
    """Request body for OTP request endpoint"""
    email: EmailStr = Field(..., description="User email address")


class OTPVerifyBody(BaseModel):
    """Request body for OTP verify endpoint"""
    email: EmailStr = Field(..., description="User email address")
    code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$', description="6-digit OTP code")


class RefreshTokenBody(BaseModel):
    """Request body for token refresh endpoint"""
    refreshToken: str = Field(..., description="Refresh token")


def respond(status_code: int, body: Dict[str, Any], event: Optional[Dict] = None) -> Dict[str, Any]:
    """Create standardized API response with CORS headers"""
    cors_headers = get_cors_headers(event) if event else {}
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            **cors_headers
        },
        'body': json.dumps(body)
    }


def normalize_email(email: str) -> str:
    """Normalize email to lowercase and strip whitespace"""
    return email.strip().lower()


def generate_otp() -> str:
    """Generate a 6-digit OTP code using cryptographically secure random"""
    return f"{secrets.randbelow(1000000):06d}"


def hash_otp_code(code: str, email: str) -> str:
    """Hash OTP code with email and secret for secure storage"""
    if not AUTH_JWT_SECRET:
        raise ValueError("AUTH_JWT_SECRET not configured")
    data = f"{email}:{code}:{AUTH_JWT_SECRET}"
    return hashlib.sha256(data.encode()).hexdigest()


def timing_safe_compare(hash_a: str, hash_b: str) -> bool:
    """Timing-safe comparison of two hashes to prevent timing attacks"""
    if len(hash_a) != len(hash_b):
        return False
    return hmac.compare_digest(hash_a.encode(), hash_b.encode())


def mask_email(email: str) -> str:
    """Mask email for logging (show first 3 chars and domain)"""
    if '@' in email:
        local, domain = email.split('@', 1)
        return f"{local[:3]}***@{domain}"
    return email[:3] + '***'


def send_otp_email(email: str, code: str) -> Dict[str, Any]:
    """Send OTP code via AWS SES using template"""
    template_data = {
        'code': code,
        'expiresIn': str(OTP_CODE_TTL_MINUTES)
    }
    
    send_params = {
        'Source': SES_EMAIL_IDENTITY,
        'Destination': {'ToAddresses': [email]},
        'Template': SES_TEMPLATE_NAME,
        'TemplateData': json.dumps(template_data)
    }
    
    if SES_CONFIGURATION_SET:
        send_params['ConfigurationSetName'] = SES_CONFIGURATION_SET
    
    logger.info(f"Sending OTP email to {mask_email(email)}")
    response = ses_client.send_templated_email(**send_params)
    logger.info(f"OTP email sent. MessageId: {response['MessageId']}")
    
    return {'success': True, 'message_id': response['MessageId']}


def create_tokens(email: str, is_admin: bool = False) -> Dict[str, Any]:
    """Create JWT access and refresh tokens"""
    if not AUTH_JWT_SECRET:
        raise ValueError("AUTH_JWT_SECRET not configured")
    
    role = 'admin' if is_admin else 'user'
    now = datetime.now(timezone.utc)
    
    # Access token
    access_payload = {
        'sub': email,
        'email': email,
        'role': role,
        'type': 'access',
        'iat': now,
        'exp': now.timestamp() + (ACCESS_TOKEN_TTL_MINUTES * 60)
    }
    access_token = jwt.encode(access_payload, AUTH_JWT_SECRET, algorithm='HS256')
    
    # Refresh token
    refresh_payload = {
        'sub': email,
        'email': email,
        'role': role,
        'type': 'refresh',
        'iat': now,
        'exp': now.timestamp() + (REFRESH_TOKEN_TTL_MINUTES * 60)
    }
    refresh_token = jwt.encode(refresh_payload, AUTH_JWT_SECRET, algorithm='HS256')
    
    return {
        'accessToken': access_token,
        'refreshToken': refresh_token,
        'expiresInSeconds': ACCESS_TOKEN_TTL_MINUTES * 60
    }


def find_or_create_cognito_user(email: str) -> tuple[str, bool]:
    """
    Find existing Cognito user by email or create a new one.
    Returns (user_id, is_new_user) tuple.
    
    Requirements: 1.4, 3.1, 3.2
    """
    if not COGNITO_USER_POOL_ID:
        logger.warning("COGNITO_USER_POOL_ID not configured, skipping Cognito user creation")
        return (email, True)  # Fall back to email as user ID
    
    email_display = mask_email(email)
    
    try:
        # First, try to find existing user by email
        response = cognito_client.list_users(
            UserPoolId=COGNITO_USER_POOL_ID,
            Filter=f'email = "{email}"',
            Limit=1
        )
        
        users = response.get('Users', [])
        
        if users:
            # User exists - get their sub (user ID)
            user = users[0]
            user_sub = None
            for attr in user.get('Attributes', []):
                if attr['Name'] == 'sub':
                    user_sub = attr['Value']
                    break
            
            if user_sub:
                logger.info(f"Found existing Cognito user for {email_display}: {user_sub}")
                
                # Update auth_methods to include 'email' if not already
                try:
                    cognito_client.admin_update_user_attributes(
                        UserPoolId=COGNITO_USER_POOL_ID,
                        Username=user_sub,
                        UserAttributes=[
                            {'Name': 'custom:auth_methods', 'Value': 'google,email'}
                        ]
                    )
                except ClientError as e:
                    logger.warning(f"Could not update auth_methods: {e}")
                
                return (user_sub, False)
        
        # No existing user - create new one
        logger.info(f"Creating new Cognito user for {email_display}")
        
        # Generate a random password (user won't use it - they use OTP)
        temp_password = secrets.token_urlsafe(32)
        
        create_response = cognito_client.admin_create_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'},
                {'Name': 'custom:auth_methods', 'Value': 'email'}
            ],
            MessageAction='SUPPRESS',  # Don't send welcome email
            TemporaryPassword=temp_password
        )
        
        # Get the sub from the created user
        user_sub = None
        for attr in create_response['User'].get('Attributes', []):
            if attr['Name'] == 'sub':
                user_sub = attr['Value']
                break
        
        if not user_sub:
            logger.error("Created user but could not get sub")
            return (email, True)
        
        # Set permanent password to confirm the user
        cognito_client.admin_set_user_password(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
            Password=temp_password,
            Permanent=True
        )
        
        logger.info(f"Created new Cognito user for {email_display}: {user_sub}")
        return (user_sub, True)
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'UsernameExistsException':
            # User already exists, try to get their sub
            logger.info(f"User already exists for {email_display}, fetching details")
            try:
                user_response = cognito_client.admin_get_user(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=email
                )
                for attr in user_response.get('UserAttributes', []):
                    if attr['Name'] == 'sub':
                        return (attr['Value'], False)
            except ClientError:
                pass
        
        logger.error(f"Cognito error for {email_display}: {e}")
        # Fall back to email as user ID
        return (email, True)


def find_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Find existing profile by email using GSI1."""
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :email_key',
            ExpressionAttributeValues={
                ':email_key': f'EMAIL#{email}'
            },
            Limit=1
        )
        items = response.get('Items', [])
        return items[0] if items else None
    except ClientError as e:
        logger.error(f"Error querying profile by email: {e}")
        return None


def create_user_profile(user_id: str, email: str) -> bool:
    """
    Create a new user profile in DynamoDB.
    
    Requirements: 1.5
    """
    email_display = mask_email(email)
    
    try:
        table = dynamodb.Table(TABLE_NAME)
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Check if profile already exists
        existing = find_profile_by_email(email)
        if existing:
            logger.info(f"Profile already exists for {email_display}")
            return False
        
        # Create minimal profile - user will complete it on /create-profile page
        profile_item = {
            'PK': f'USER#{user_id}',
            'SK': 'PROFILE',
            'userId': user_id,
            'email': email,
            'firstName': '',  # Will be filled in by user
            'lastName': '',   # Will be filled in by user
            'authMethods': ['email'],
            'createdAt': now_iso,
            'updatedAt': now_iso,
            'GSI1PK': f'EMAIL#{email}',
            'GSI1SK': 'PROFILE'
        }
        
        table.put_item(
            Item=profile_item,
            ConditionExpression='attribute_not_exists(PK)'
        )
        
        logger.info(f"Created profile for {email_display}: {user_id}")
        return True
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'ConditionalCheckFailedException':
            logger.info(f"Profile already exists for {email_display}")
            return False
        logger.error(f"Error creating profile for {email_display}: {e}")
        return False


def handle_request_code(body: Dict[str, Any], event: Dict) -> Dict[str, Any]:
    """
    Request OTP code for email address.
    Stores hashed OTP in DynamoDB and sends via email.
    """
    try:
        # Validate request
        try:
            otp_request = OTPRequestBody(**body)
        except ValidationError as e:
            errors = {'.'.join(str(loc) for loc in err['loc']): err['msg'] for err in e.errors()}
            return respond(400, {'message': 'Validation failed', 'errors': errors}, event)
        
        email = normalize_email(otp_request.email)
        email_display = mask_email(email)
        
        logger.info(f"OTP request for {email_display}")
        
        table = dynamodb.Table(TABLE_NAME)
        now = int(datetime.now(timezone.utc).timestamp() * 1000)  # milliseconds
        now_iso = datetime.now(timezone.utc).isoformat()
        cooldown_ms = OTP_RESEND_COOLDOWN_SECONDS * 1000
        
        # Check rate limiting - get existing account
        try:
            existing = table.get_item(
                Key={'PK': f'ACCOUNT#{email}', 'SK': 'OTP'},
                ProjectionExpression='otpRequestedAt'
            )
            
            last_requested_at = existing.get('Item', {}).get('otpRequestedAt', 0)
            if last_requested_at and now - last_requested_at < cooldown_ms:
                retry_in = int((cooldown_ms - (now - last_requested_at)) / 1000)
                return respond(429, {
                    'message': f'Please wait {retry_in} seconds before requesting another code.'
                }, event)
        except ClientError as e:
            logger.error(f"DynamoDB error checking rate limit: {e}")
            # Continue anyway - don't block auth on rate limit check failure
        
        # Generate OTP and hash it
        otp_code = generate_otp()
        hashed_code = hash_otp_code(otp_code, email)
        expires_at = now + (OTP_CODE_TTL_MINUTES * 60 * 1000)
        
        # Store OTP in DynamoDB
        table.update_item(
            Key={'PK': f'ACCOUNT#{email}', 'SK': 'OTP'},
            UpdateExpression='''
                SET otpCodeHash = :hash,
                    otpExpiresAt = :expires,
                    otpRequestedAt = :requested,
                    otpAttemptCount = :attempts,
                    updatedAt = :updated,
                    createdAt = if_not_exists(createdAt, :created)
            ''',
            ExpressionAttributeValues={
                ':hash': hashed_code,
                ':expires': expires_at,
                ':requested': now,
                ':attempts': 0,
                ':updated': now_iso,
                ':created': now_iso
            }
        )
        
        # Send OTP email
        try:
            send_otp_email(email, otp_code)
        except ClientError as e:
            logger.error(f"Failed to send OTP email: {e}")
            return respond(500, {'message': 'Failed to send verification code. Please try again.'}, event)
        
        return respond(200, {
            'success': True,
            'message': 'Verification code sent.',
            'expiresIn': OTP_CODE_TTL_MINUTES * 60
        }, event)
        
    except Exception as e:
        logger.error(f"Error in handle_request_code: {e}", error=e)
        return respond(500, {'message': 'Internal server error'}, event)


def handle_verify_code(body: Dict[str, Any], event: Dict) -> Dict[str, Any]:
    """
    Verify OTP code and return JWT tokens.
    """
    try:
        # Validate request
        try:
            otp_verify = OTPVerifyBody(**body)
        except ValidationError as e:
            errors = {'.'.join(str(loc) for loc in err['loc']): err['msg'] for err in e.errors()}
            return respond(400, {'message': 'Validation failed', 'errors': errors}, event)
        
        email = normalize_email(otp_verify.email)
        code = otp_verify.code.strip()
        email_display = mask_email(email)
        
        logger.info(f"OTP verification for {email_display}")
        
        table = dynamodb.Table(TABLE_NAME)
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        
        # Get stored OTP data
        try:
            result = table.get_item(
                Key={'PK': f'ACCOUNT#{email}', 'SK': 'OTP'}
            )
        except ClientError as e:
            logger.error(f"DynamoDB error getting OTP: {e}")
            return respond(500, {'message': 'Internal server error'}, event)
        
        item = result.get('Item')
        
        if not item or not item.get('otpCodeHash') or not item.get('otpExpiresAt'):
            return respond(400, {'message': 'No active verification code. Request a new one.'}, event)
        
        # Check attempt count
        attempt_count = item.get('otpAttemptCount', 0)
        if attempt_count >= MAX_OTP_ATTEMPTS:
            return respond(429, {'message': 'Too many invalid attempts. Request a new code.'}, event)
        
        # Check expiration
        expires_at = item.get('otpExpiresAt', 0)
        if now > expires_at:
            return respond(400, {'message': 'Code has expired. Request a new one.'}, event)
        
        # Verify OTP code (timing-safe comparison)
        provided_hash = hash_otp_code(code, email)
        if not timing_safe_compare(provided_hash, item['otpCodeHash']):
            # Increment attempt count
            try:
                table.update_item(
                    Key={'PK': f'ACCOUNT#{email}', 'SK': 'OTP'},
                    UpdateExpression='SET otpAttemptCount = if_not_exists(otpAttemptCount, :zero) + :one, updatedAt = :updated',
                    ExpressionAttributeValues={
                        ':one': 1,
                        ':zero': 0,
                        ':updated': datetime.now(timezone.utc).isoformat()
                    }
                )
            except ClientError:
                pass  # Don't fail on counter update
            
            logger.warning(f"Invalid OTP code for {email_display}")
            return respond(401, {'message': 'Invalid code. Please try again.'}, event)
        
        # Find or create Cognito user (Requirements: 1.4, 3.1, 3.2)
        user_id, is_new_user = find_or_create_cognito_user(email)
        
        # For new users, create a profile in DynamoDB (Requirement: 1.5)
        # Profile will have empty firstName/lastName - user completes on /create-profile
        if is_new_user:
            create_user_profile(user_id, email)
        
        # OTP verified - clear OTP data and update last login
        try:
            table.update_item(
                Key={'PK': f'ACCOUNT#{email}', 'SK': 'OTP'},
                UpdateExpression='''
                    SET lastLoginAt = :lastLogin, updatedAt = :updated
                    REMOVE otpCodeHash, otpExpiresAt, otpRequestedAt, otpAttemptCount
                ''',
                ExpressionAttributeValues={
                    ':lastLogin': datetime.now(timezone.utc).isoformat(),
                    ':updated': datetime.now(timezone.utc).isoformat()
                }
            )
        except ClientError as e:
            logger.error(f"Failed to clear OTP data: {e}")
            # Continue anyway - tokens should still be issued
        
        # Create JWT tokens
        tokens = create_tokens(email, is_admin=False)
        
        logger.info(f"OTP verification successful for {email_display}, userId={user_id}, isNewUser={is_new_user}")
        
        return respond(200, {
            'success': True,
            'tokens': tokens,
            'user': {
                'userId': user_id,
                'email': email,
                'role': 'user',
                'isAdmin': False,
                'authMethods': 'email'
            },
            'isNewUser': is_new_user,
            'linkedAccount': not is_new_user  # True if we found existing account
        }, event)
        
    except Exception as e:
        logger.error(f"Error in handle_verify_code: {e}", error=e)
        return respond(500, {'message': 'Internal server error'}, event)


def handle_refresh(body: Dict[str, Any], event: Dict) -> Dict[str, Any]:
    """
    Refresh access token using refresh token.
    """
    try:
        # Validate request
        try:
            refresh_request = RefreshTokenBody(**body)
        except ValidationError as e:
            errors = {'.'.join(str(loc) for loc in err['loc']): err['msg'] for err in e.errors()}
            return respond(400, {'message': 'Validation failed', 'errors': errors}, event)
        
        if not AUTH_JWT_SECRET:
            logger.error("AUTH_JWT_SECRET not configured")
            return respond(500, {'message': 'Internal server error'}, event)
        
        # Verify refresh token
        try:
            decoded = jwt.decode(
                refresh_request.refreshToken,
                AUTH_JWT_SECRET,
                algorithms=['HS256']
            )
        except jwt.ExpiredSignatureError:
            return respond(401, {'message': 'Refresh token has expired'}, event)
        except jwt.InvalidTokenError:
            return respond(401, {'message': 'Invalid refresh token'}, event)
        
        # Ensure it's a refresh token
        if decoded.get('type') != 'refresh':
            return respond(401, {'message': 'Invalid token type'}, event)
        
        email = decoded.get('email')
        if not email:
            return respond(401, {'message': 'Invalid refresh token'}, event)
        
        # Create new tokens
        tokens = create_tokens(email, is_admin=decoded.get('role') == 'admin')
        
        logger.info(f"Token refresh successful for {mask_email(email)}")
        
        return respond(200, {
            'success': True,
            'tokens': tokens
        }, event)
        
    except Exception as e:
        logger.error(f"Error in handle_refresh: {e}", error=e)
        return respond(500, {'message': 'Internal server error'}, event)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for OTP authentication operations.
    
    Routes:
    - POST /auth/otp/request - Request OTP code
    - POST /auth/otp/verify - Verify OTP code and get tokens
    - POST /auth/otp/refresh - Refresh access token
    """
    logger.info(
        message="OTP auth handler invoked",
        context={
            'path': event.get('path'),
            'resource': event.get('resource'),
            'httpMethod': event.get('httpMethod'),
            'requestId': event.get('requestContext', {}).get('requestId')
        }
    )
    
    http_method = event.get('httpMethod')
    
    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return respond(200, {'success': True}, event)
    
    # Parse request body
    if not event.get('body'):
        return respond(400, {'message': 'Request body is required'}, event)
    
    try:
        body = json.loads(event['body'])
    except json.JSONDecodeError:
        return respond(400, {'message': 'Invalid JSON payload'}, event)
    
    # Route based on path
    path = event.get('resource') or event.get('path', '')
    
    try:
        if path.endswith('/request') or '/otp/request' in path:
            return handle_request_code(body, event)
        
        if path.endswith('/verify') or '/otp/verify' in path:
            return handle_verify_code(body, event)
        
        if path.endswith('/refresh') or '/otp/refresh' in path:
            return handle_refresh(body, event)
        
        return respond(404, {'message': 'Endpoint not found'}, event)
        
    except Exception as e:
        logger.error(f"Unhandled error in OTP handler: {e}", error=e)
        return respond(500, {'message': 'Internal server error'}, event)
