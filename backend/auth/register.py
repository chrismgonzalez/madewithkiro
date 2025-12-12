"""
Register Lambda Handler

API endpoint for registering new users for OTP authentication.
This creates the Cognito user before authentication is initiated.

Requirements: 1.1, 1.2, 1.4, 1.5
"""

import json
import os
from typing import Dict, Any

import boto3
from botocore.exceptions import ClientError

from shared.logger import get_logger
from shared.error_handler import success_response, sanitized_error_response, ErrorCode

logger = get_logger(__name__)

# AWS clients
cognito_client = boto3.client('cognito-idp')

# Environment variables
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Register a new user for OTP authentication.
    
    This endpoint creates a Cognito user account before authentication.
    The user is auto-confirmed via the PreSignUp Lambda trigger.
    
    Requirements: 1.1, 1.2, 1.4, 1.5
    
    Request Body:
        {
            "email": "user@example.com"
        }
    
    Response:
        {
            "message": "User registered successfully",
            "email": "use***@example.com",
            "userExists": false
        }
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        dict: API Gateway response
    """
    # Handle OPTIONS preflight requests
    if event.get('httpMethod') == 'OPTIONS':
        from shared.cors_utils import get_cors_headers
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': ''
        }
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip().lower()
        
        # Validate email
        if not email:
            return sanitized_error_response(
                400,
                'Email address is required',
                ErrorCode.VALIDATION_ERROR,
                event=event
            )
        
        if '@' not in email or '.' not in email.split('@')[1]:
            return sanitized_error_response(
                400,
                'Invalid email address format',
                ErrorCode.VALIDATION_ERROR,
                event=event
            )
        
        # Mask email for logging
        email_display = mask_email(email)
        logger.info(f"Registration request for: {email_display}")
        
        # Check if user already exists
        user_exists = False
        try:
            cognito_client.admin_get_user(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=email
            )
            user_exists = True
            logger.info(f"User already exists: {email_display}")
            
            return success_response(
                {
                    'message': 'User already registered',
                    'email': email_display,
                    'userExists': True
                },
                200,
                event
            )
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code != 'UserNotFoundException':
                # Unexpected error
                logger.error(f"Error checking user existence: {str(e)}")
                raise
            # User doesn't exist - continue with creation
        
        # Create new user
        try:
            cognito_client.admin_create_user(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=email,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'}
                ],
                MessageAction='SUPPRESS',  # Don't send welcome email
                DesiredDeliveryMediums=[]  # No delivery
            )
            
            logger.info(f"User created successfully: {email_display}")
            
            # Set permanent password to bypass FORCE_CHANGE_PASSWORD status
            # For OTP authentication, we don't use passwords, but Cognito requires
            # users to be in CONFIRMED status to authenticate with CUSTOM_AUTH
            try:
                # Generate a random secure password (user will never need it)
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits + string.punctuation
                random_password = ''.join(secrets.choice(alphabet) for _ in range(32))
                
                cognito_client.admin_set_user_password(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=email,
                    Password=random_password,
                    Permanent=True  # Set as permanent to avoid FORCE_CHANGE_PASSWORD
                )
                
                logger.info(f"User password set to permanent (CONFIRMED status): {email_display}")
            except ClientError as pwd_error:
                # Log but don't fail - PreSignUp trigger should handle auto-confirmation
                logger.warning(f"Failed to set permanent password: {str(pwd_error)}")
                # Continue anyway - PreSignUp should auto-confirm the user
            
            return success_response(
                {
                    'message': 'User registered successfully',
                    'email': email_display,
                    'userExists': False
                },
                201,
                event
            )
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            
            if error_code == 'UsernameExistsException':
                # Race condition - user was created between check and create
                logger.info(f"User already exists (race condition): {email_display}")
                return success_response(
                    {
                        'message': 'User already registered',
                        'email': email_display,
                        'userExists': True
                    },
                    200,
                    event
                )
            
            # Other Cognito errors
            logger.error(f"Cognito error creating user: {str(e)}")
            return sanitized_error_response(
                500,
                'Failed to register user. Please try again.',
                ErrorCode.INTERNAL_ERROR,
                internal_error=e,
                event=event
            )
        
    except json.JSONDecodeError:
        return sanitized_error_response(
            400,
            'Invalid JSON in request body',
            ErrorCode.BAD_REQUEST,
            event=event
        )
    
    except Exception as e:
        logger.error(f"Unexpected error in register: {str(e)}", error=e)
        return sanitized_error_response(
            500,
            'An unexpected error occurred',
            ErrorCode.INTERNAL_ERROR,
            internal_error=e,
            event=event
        )


def mask_email(email: str) -> str:
    """
    Mask email address for display (e.g., use***@domain.com).
    
    Args:
        email: Full email address
        
    Returns:
        str: Masked email address
    """
    if not email or '@' not in email:
        return email
    
    local_part, domain = email.split('@', 1)
    if len(local_part) <= 3:
        masked_local = local_part[0] + '***'
    else:
        masked_local = local_part[:3] + '***'
    
    return f"{masked_local}@{domain}"
