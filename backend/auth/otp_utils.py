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
    Send OTP code via AWS SES with magic link functionality.
    
    Creates an email with:
    1. Prominent OTP code display for manual entry
    2. "Login Instantly" button that redirects to verify page
    3. Copy/paste link as backup option
    
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
    source_email = os.environ.get('SES_EMAIL_IDENTITY', 'noreply@madewithkiro.com')
    configuration_set = os.environ.get('SES_CONFIGURATION_SET')
    app_url = os.environ.get('APP_URL', 'http://localhost:5173')
    
    try:
        # No magic link - users will manually enter the OTP code
        
        # Format OTP code with spaces for better readability
        formatted_otp = ' '.join(otp_code)
        
        # Create the HTML email content with MadeWithKiro purple branding
        html_body = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
                <!-- Header with MadeWithKiro Purple Branding -->
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%); 
                            color: white; text-align: center; padding: 48px 20px;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">MadeWithKiro</h1>
                    <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9; font-weight: 500;">Secure Authentication</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 48px 40px;">
                    <h2 style="color: #1f2937; font-size: 28px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.5px;">Your Verification Code</h2>
                    <!-- OTP Code Display with Purple Accent -->
                    <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
                               border: 3px solid #8b5cf6; border-radius: 16px; 
                               padding: 32px; text-align: center; margin: 0 0 24px 0;
                               box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);">
                        <div style="font-size: 16px; font-weight: 800; color: #8b5cf6; 
                                   letter-spacing: 8px; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
                                   text-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);">
                            {formatted_otp}
                        </div>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 15px; text-align: center; margin: 0 0 40px 0; font-weight: 500;">
                        This code will expire in <strong style="color: #8b5cf6;">{expires_in_minutes} minutes</strong>
                    </p>
                    
                    <p style="color: #6b7280; font-size: 16px; text-align: center; margin: 0 0 32px 0; font-weight: 500;">
                        Enter this code in the MadeWithKiro app to complete your sign-in.
                    </p>
                    
                    <!-- Security Notice -->
                    <div style="border-top: 2px solid #f3f4f6; padding-top: 24px;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="color: #f59e0b; font-size: 20px; margin-right: 10px;">🔒</span>
                            <span style="color: #f59e0b; font-weight: 700; font-size: 16px;">Security Notice</span>
                        </div>
                        <p style="color: #6b7280; font-size: 15px; margin: 0; line-height: 1.5; font-weight: 500;">
                            If you didn't request this code, please ignore this email. This verification code will expire automatically.
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 14px; margin: 0; font-weight: 500;">
                        Built with ❤️ using Kiro • <a href="{app_url}" style="color: #8b5cf6; text-decoration: none;">MadeWithKiro</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        # Create plain text version
        text_body = f'''
Your MadeWithKiro Verification Code

Thank you for signing in! Use this verification code: {formatted_otp}

This code expires in {expires_in_minutes} minutes.

Enter this code in the MadeWithKiro app to complete your sign-in.

If you didn't request this code, please ignore this email.

---
MadeWithKiro - Showcase your Kiro creations
{app_url}
        '''
        
        # Build SES request
        send_params = {
            'Source': source_email,
            'Destination': {
                'ToAddresses': [email]
            },
            'Message': {
                'Subject': {'Data': 'Your MadeWithKiro verification code'},
                'Body': {
                    'Html': {'Data': html_body},
                    'Text': {'Data': text_body}
                }
            }
        }
        
        # Add configuration set if provided
        if configuration_set:
            send_params['ConfigurationSetName'] = configuration_set
        
        # Send email via SES
        logger.info(f"Sending magic link OTP email to {email[:3]}***@{email.split('@')[1]}")
        response = ses_client.send_email(**send_params)
        
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
            'send_email'
        ) from e
    
    except Exception as e:
        logger.error(f"Unexpected error sending magic link OTP email: {str(e)}")
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
