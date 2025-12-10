"""
CreateAuthChallenge Lambda Handler

Cognito trigger that generates and sends OTP codes during custom authentication.
Implements session-based rate limiting and stores OTP in privateChallengeParameters only.

Requirements: 7.1, 7.2, 7.3
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import boto3
from botocore.exceptions import ClientError

from auth.otp_utils import (
    generate_otp_code,
    calculate_expiration_time,
    send_otp_email,
)
from shared.logger import get_logger

logger = get_logger(__name__)

# AWS clients
cognito_client = boto3.client('cognito-idp')

# Rate limiting constants
RATE_LIMIT_COOLDOWN_SECONDS = 60  # 60 second cooldown between OTP requests
OTP_EXPIRATION_SECONDS = 600  # 10 minutes


def create_cognito_user_if_not_exists(user_pool_id: str, email: str) -> None:
    """
    Create a Cognito user if they don't exist yet.
    
    For CUSTOM_WITHOUT_SRP flow, users need to be created before authentication.
    This triggers the PreSignUp Lambda which will auto-confirm the user.
    
    Args:
        user_pool_id: Cognito User Pool ID
        email: User's email address
    """
    try:
        # Try to create the user
        # This will trigger PreSignUp Lambda
        cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'}
            ],
            MessageAction='SUPPRESS',  # Don't send welcome email
            DesiredDeliveryMediums=[]  # No delivery
        )
        logger.info(f"Created new Cognito user for {mask_email(email)}")
        
        # Set permanent password to bypass FORCE_CHANGE_PASSWORD status
        # For OTP authentication, we don't use passwords, but Cognito requires
        # users to be in CONFIRMED status to authenticate with CUSTOM_AUTH
        try:
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits + string.punctuation
            random_password = ''.join(secrets.choice(alphabet) for _ in range(32))
            
            cognito_client.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=email,
                Password=random_password,
                Permanent=True  # Set as permanent to avoid FORCE_CHANGE_PASSWORD
            )
            
            logger.info(f"User password set to permanent (CONFIRMED status): {mask_email(email)}")
        except ClientError as pwd_error:
            # Log but don't fail - PreSignUp trigger should handle auto-confirmation
            logger.warning(f"Failed to set permanent password: {str(pwd_error)}")
            
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'UsernameExistsException':
            # User already exists - this is fine
            logger.info(f"User already exists: {mask_email(email)}")
        else:
            # Other error - log and re-raise
            logger.error(f"Error creating user: {str(e)}")
            raise


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


def get_last_otp_created_at(session: List[Dict[str, Any]]) -> Optional[int]:
    """
    Extract the last OTP creation timestamp from the session.
    
    The session contains previous challenge attempts. We look for the most recent
    CUSTOM_CHALLENGE that has challengeMetadata containing the created_at timestamp.
    
    Args:
        session: List of previous challenge attempts from Cognito
        
    Returns:
        int or None: Unix timestamp of last OTP creation, or None if not found
    """
    if not session:
        return None
    
    # Look through session in reverse order to find the most recent OTP challenge
    for challenge in reversed(session):
        challenge_metadata = challenge.get('challengeMetadata', '')
        # challengeMetadata format: "OTP_CHALLENGE_<created_at>"
        if challenge_metadata and challenge_metadata.startswith('OTP_CHALLENGE_'):
            try:
                created_at_str = challenge_metadata.split('_')[-1]
                return int(created_at_str)
            except (ValueError, IndexError):
                continue
    
    return None


def should_rate_limit(session: List[Dict[str, Any]], current_time: int) -> Tuple[bool, int]:
    """
    Check if the user should be rate limited based on session history.
    
    Implements 60-second cooldown between OTP requests.
    
    Requirements: 7.3
    
    Args:
        session: List of previous challenge attempts from Cognito
        current_time: Current Unix timestamp
        
    Returns:
        Tuple[bool, int]: (should_rate_limit, seconds_until_retry)
    """
    last_created_at = get_last_otp_created_at(session)
    
    if last_created_at is None:
        return False, 0
    
    time_since_last_otp = current_time - last_created_at
    
    if time_since_last_otp < RATE_LIMIT_COOLDOWN_SECONDS:
        retry_after = RATE_LIMIT_COOLDOWN_SECONDS - time_since_last_otp
        return True, retry_after
    
    return False, 0


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    CreateAuthChallenge Lambda handler for Cognito custom authentication.
    
    This function is triggered by Cognito when a custom authentication challenge
    needs to be created. It:
    1. Checks session-based rate limiting (60s cooldown)
    2. Generates a 6-digit OTP using secrets.randbelow()
    3. Sends the OTP via SES
    4. Stores the OTP in privateChallengeParameters only (not DynamoDB)
    5. Sets expiration to 600 seconds from creation
    
    Requirements: 7.1, 7.2, 7.3
    
    Args:
        event: Cognito CreateAuthChallenge event
        context: Lambda context
        
    Returns:
        dict: Modified event with challenge parameters
    """
    try:
        # Extract user attributes and session
        user_attributes = event['request'].get('userAttributes', {})
        session = event['request'].get('session', [])
        user_pool_id = event.get('userPoolId')
        
        # For new users, email comes from userName (top level); for existing users, from userAttributes
        email = user_attributes.get('email') or event.get('userName')
        challenge_name = event['request'].get('challengeName')
        
        # Note: User MUST already exist before CreateAuthChallenge is triggered
        # For CUSTOM_AUTH flow, the user should be created by the client/frontend
        # before calling initiate_auth. If user doesn't exist, Cognito will reject
        # the auth request with "Incorrect username or password" before this Lambda runs.
        # 
        # The create_cognito_user_if_not_exists() function below is kept for backwards
        # compatibility but will rarely execute since auth would have already failed.
        if not user_attributes.get('sub') and email and user_pool_id:
            logger.warning(
                f"User {mask_email(email)} has no sub - this indicates user may not exist. "
                f"For CUSTOM_AUTH, user should be created before initiate_auth is called."
            )
            try:
                create_cognito_user_if_not_exists(user_pool_id, email)
            except Exception as e:
                logger.error(f"Error creating user: {str(e)}", error=e)
                # Continue anyway - user might already exist
        
        # Check email first before using it in logs
        if not email:
            logger.error("No email found in user attributes or userName")
            raise ValueError("User email is required for OTP authentication")
        
        # Safe email display for logging (never log actual email)
        email_display = mask_email(email)
        
        logger.info(
            f"CreateAuthChallenge triggered for user: {email_display}, "
            f"challenge: {challenge_name}, session_length: {len(session)}"
        )
        
        # Only handle CUSTOM_CHALLENGE
        if challenge_name != 'CUSTOM_CHALLENGE':
            logger.warning(f"Unexpected challenge name: {challenge_name}")
            return event
        
        # Get current time for rate limiting and expiration
        current_time = int(datetime.now(timezone.utc).timestamp())
        
        # Check rate limiting (60s cooldown)
        is_rate_limited, retry_after = should_rate_limit(session, current_time)
        
        if is_rate_limited:
            logger.warning(
                f"Rate limit triggered for {email_display}. "
                f"Retry after {retry_after} seconds"
            )
            
            # Return rate limit error via publicChallengeParameters
            event['response']['publicChallengeParameters'] = {
                'error': 'RATE_LIMITED',
                'retryAfter': str(retry_after),
                'email': email_display
            }
            
            # Still need to set privateChallengeParameters with empty/dummy values
            # to maintain Cognito flow
            event['response']['privateChallengeParameters'] = {
                'rate_limited': 'true'
            }
            
            event['response']['challengeMetadata'] = f'OTP_RATE_LIMITED_{current_time}'
            
            return event
        
        # Generate OTP code using cryptographically secure random
        otp_code = generate_otp_code()
        logger.info(f"Generated OTP code for {email_display}")
        
        # Calculate expiration time (600 seconds = 10 minutes)
        created_at = current_time
        expires_at = calculate_expiration_time(created_at)
        expires_in_minutes = OTP_EXPIRATION_SECONDS // 60
        
        # Send OTP via email using SES with magic link
        try:
            email_result = send_otp_email(
                email=email,
                otp_code=otp_code,
                expires_in_minutes=expires_in_minutes
            )
            logger.info(
                f"Magic link OTP email sent successfully. MessageId: {email_result.get('message_id')}"
            )
        except Exception as e:
            logger.error(f"Failed to send OTP email: {str(e)}")
            raise
        
        # Store OTP code and metadata in Cognito session (NOT DynamoDB)
        # privateChallengeParameters: Not visible to client, used for verification
        # Store plain OTP code - Cognito encrypts privateChallengeParameters
        event['response']['privateChallengeParameters'] = {
            'otp_code': otp_code,  # Plain OTP - Cognito handles encryption
            'created_at': str(created_at),
            'expires_at': str(expires_at)
        }
        
        # publicChallengeParameters: Visible to client, used for UI display
        event['response']['publicChallengeParameters'] = {
            'email': email_display,  # Masked email for display
            'expiresIn': str(OTP_EXPIRATION_SECONDS)  # seconds
        }
        
        # Set challenge metadata with timestamp for rate limiting tracking
        event['response']['challengeMetadata'] = f'OTP_CHALLENGE_{created_at}'
        
        logger.info(
            f"CreateAuthChallenge completed successfully for {email_display}"
        )
        
        return event
        
    except Exception as e:
        logger.error(f"Error in CreateAuthChallenge: {str(e)}", error=e)
        # Re-raise to let Cognito handle the error
        raise
