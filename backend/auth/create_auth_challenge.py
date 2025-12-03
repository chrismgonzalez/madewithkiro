"""
CreateAuthChallenge Lambda Handler

Cognito trigger that generates and sends OTP codes during custom authentication.
Requirements: 1.1, 1.2, 6.1, 6.2
"""

from datetime import datetime, timezone
from typing import Dict, Any

from auth.otp_utils import (
    generate_otp_code,
    calculate_expiration_time,
    send_otp_email,
    hash_otp_code
)
from shared.logger import get_logger

logger = get_logger(__name__)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    CreateAuthChallenge Lambda handler for Cognito custom authentication.
    
    This function is triggered by Cognito when a custom authentication challenge
    needs to be created. It generates an OTP code, sends it via email, and stores
    the code in the Cognito session for later verification.
    
    Requirements: 1.1, 1.2, 6.1, 6.2
    
    Args:
        event: Cognito CreateAuthChallenge event
        context: Lambda context
        
    Returns:
        dict: Modified event with challenge parameters
    """
    try:
        # Extract user attributes and username
        user_attributes = event['request'].get('userAttributes', {})
        
        # For new users, email comes from userName (top level); for existing users, from userAttributes
        email = user_attributes.get('email') or event.get('userName')
        challenge_name = event['request'].get('challengeName')
        
        # Check email first before using it in logs
        if not email:
            logger.error("No email found in user attributes or userName")
            raise ValueError("User email is required for OTP authentication")
        
        # Safe email display
        email_display = f"{email[:3]}***@{email.split('@')[1]}" if '@' in email else email
        
        logger.info(
            f"CreateAuthChallenge triggered for user: {email_display}, "
            f"challenge: {challenge_name}"
        )
        
        # Only handle CUSTOM_CHALLENGE
        if challenge_name != 'CUSTOM_CHALLENGE':
            logger.warning(f"Unexpected challenge name: {challenge_name}")
            return event
        
        # Generate OTP code
        otp_code = generate_otp_code()
        logger.info(f"Generated OTP code for {email_display}")
        
        # Calculate expiration time
        created_at = int(datetime.now(timezone.utc).timestamp())
        expires_at = calculate_expiration_time(created_at)
        expires_in_minutes = 10
        
        # Send OTP via email
        try:
            email_result = send_otp_email(
                email=email,
                otp_code=otp_code,
                expires_in_minutes=expires_in_minutes
            )
            logger.info(
                f"OTP email sent successfully. MessageId: {email_result.get('message_id')}"
            )
        except Exception as e:
            logger.error(f"Failed to send OTP email: {str(e)}")
            # Log error to CloudWatch but don't fail the challenge creation
            # User will see a generic error message
            raise
        
        # Store OTP code and metadata in Cognito session
        # privateChallengeParameters: Not visible to client, used for verification
        # publicChallengeParameters: Visible to client, used for UI display
        event['response']['privateChallengeParameters'] = {
            'otp_code': hash_otp_code(otp_code),
            'email': email,
            'created_at': str(created_at),
            'expires_at': str(expires_at)
        }
        
        event['response']['publicChallengeParameters'] = {
            'email': email,
            'expires_in': str(expires_in_minutes * 60)  # seconds
        }
        
        # Set challenge metadata
        event['response']['challengeMetadata'] = 'OTP_CHALLENGE'
        
        logger.info(
            f"CreateAuthChallenge completed successfully for {email_display}"
        )
        
        return event
        
    except Exception as e:
        logger.error(f"Error in CreateAuthChallenge: {str(e)}", error=e)
        # Re-raise to let Cognito handle the error
        raise
