"""
OTP Utilities Module

Provides utilities for OTP code generation, validation, and email delivery.
Requirements: 1.1, 1.2, 6.1, 6.2
"""

import os
import re
import secrets
from datetime import datetime, timezone
from typing import Dict, Optional

import boto3
from botocore.exceptions import ClientError

from shared.logger import get_logger

logger = get_logger(__name__)

# Constants
OTP_LENGTH = 6
OTP_EXPIRATION_SECONDS = 600  # 10 minutes
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

# AWS clients
ses_client = boto3.client('ses')


def generate_otp_code() -> str:
    """
    Generate a 6-digit OTP code using cryptographically secure random number generation.
    
    Requirements: 1.1
    
    Returns:
        str: A 6-digit OTP code as a string
    """
    # Use secrets.randbelow for cryptographically secure random generation
    # Generate a number between 0 and 999999, then format with leading zeros
    code = secrets.randbelow(1000000)
    return f"{code:06d}"


def calculate_expiration_time(created_at: Optional[int] = None) -> int:
    """
    Calculate the expiration timestamp for an OTP code.
    
    Requirements: 1.2
    
    Args:
        created_at: Unix timestamp of OTP creation (defaults to current time)
        
    Returns:
        int: Unix timestamp when the OTP expires (created_at + 600 seconds)
    """
    if created_at is None:
        created_at = int(datetime.now(timezone.utc).timestamp())
    
    return created_at + OTP_EXPIRATION_SECONDS


def is_valid_email(email: str) -> bool:
    """
    Validate email address format.
    
    Requirements: 1.1
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if email format is valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    
    return bool(EMAIL_REGEX.match(email.strip()))


def send_otp_email(
    email: str,
    otp_code: str,
    expires_in_minutes: int = 10
) -> Dict[str, any]:
    """
    Send OTP code via AWS SES using email template.
    
    Requirements: 6.1, 6.2
    
    Args:
        email: Recipient email address
        otp_code: 6-digit OTP code to send
        expires_in_minutes: Expiration time in minutes (default: 10)
        
    Returns:
        dict: Response from SES with MessageId on success
        
    Raises:
        ValueError: If email is invalid or OTP code is not 6 digits
        ClientError: If SES email sending fails
    """
    # Validate inputs
    if not is_valid_email(email):
        raise ValueError(f"Invalid email address: {email}")
    
    if not otp_code or len(otp_code) != OTP_LENGTH or not otp_code.isdigit():
        raise ValueError(f"Invalid OTP code: must be {OTP_LENGTH} digits")
    
    # Get configuration from environment
    template_name = os.environ.get('SES_TEMPLATE_NAME', 'MadeWithKiro-OTP-dev')
    source_email = os.environ.get('SES_EMAIL_IDENTITY', 'noreply@madewithkiro.com')
    configuration_set = os.environ.get('SES_CONFIGURATION_SET')
    
    try:
        # Prepare template data
        template_data = {
            'code': otp_code,
            'expiresIn': str(expires_in_minutes)
        }
        
        # Build SES request
        send_params = {
            'Source': source_email,
            'Destination': {
                'ToAddresses': [email]
            },
            'Template': template_name,
            'TemplateData': str(template_data).replace("'", '"')  # Convert to JSON string
        }
        
        # Add configuration set if provided
        if configuration_set:
            send_params['ConfigurationSetName'] = configuration_set
        
        # Send email via SES
        logger.info(f"Sending OTP email to {email[:3]}***@{email.split('@')[1]}")
        response = ses_client.send_templated_email(**send_params)
        
        logger.info(f"OTP email sent successfully. MessageId: {response['MessageId']}")
        return {
            'success': True,
            'message_id': response['MessageId']
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        logger.error(
            f"Failed to send OTP email to {email[:3]}***@{email.split('@')[1]}. "
            f"Error: {error_code} - {error_message}"
        )
        
        # Re-raise with more context
        raise ClientError(
            {
                'Error': {
                    'Code': error_code,
                    'Message': f"Email delivery failed: {error_message}"
                }
            },
            'send_templated_email'
        ) from e
    
    except Exception as e:
        logger.error(f"Unexpected error sending OTP email: {str(e)}")
        raise


def is_otp_expired(expiration_timestamp: int) -> bool:
    """
    Check if an OTP code has expired.
    
    Requirements: 1.2
    
    Args:
        expiration_timestamp: Unix timestamp when OTP expires
        
    Returns:
        bool: True if OTP has expired, False otherwise
    """
    current_time = int(datetime.now(timezone.utc).timestamp())
    return current_time > expiration_timestamp


def hash_otp_code(otp_code: str) -> str:
    """
    Hash OTP code for secure storage.
    
    Note: For Cognito custom auth, we store in privateChallengeParameters
    which is already encrypted by Cognito. This is a placeholder for
    additional security if needed.
    
    Args:
        otp_code: Plain text OTP code
        
    Returns:
        str: Hashed OTP code (currently returns plain text as Cognito handles encryption)
    """
    # Cognito privateChallengeParameters are already encrypted
    # Return as-is for now, but this function provides extension point
    # for additional hashing if needed
    return otp_code
