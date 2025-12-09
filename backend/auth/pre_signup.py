"""
PreSignUp Lambda Handler

Cognito trigger that auto-confirms users for custom authentication (OTP).
Also creates user profiles in DynamoDB for new OTP users.

Requirements: 1.1, 1.4, 1.5, 3.4, 3.5, 5.1, 5.2, 5.3
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

import boto3
from botocore.exceptions import ClientError

from shared.logger import get_logger

logger = get_logger(__name__)

# AWS clients
dynamodb = boto3.resource('dynamodb')
cognito_client = boto3.client('cognito-idp')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')
USER_POOL_ID = os.environ.get('USER_POOL_ID')


def check_for_duplicate_users(email: str) -> List[Dict[str, Any]]:
    """
    Check if users with the same email already exist in Cognito.
    
    Requirements: 1.1
    
    Args:
        email: Email address to check
        
    Returns:
        list: List of existing users with the same email
    """
    try:
        # Read USER_POOL_ID from environment at runtime
        user_pool_id = os.environ.get('USER_POOL_ID')
        if not user_pool_id:
            logger.warning("USER_POOL_ID not set, skipping duplicate check")
            return []
        
        response = cognito_client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=10
        )
        
        return response.get('Users', [])
        
    except ClientError as e:
        logger.error(f"Error checking for duplicate users: {str(e)}", error=e)
        return []
    except Exception as e:
        logger.error(f"Unexpected error checking duplicates: {str(e)}", error=e)
        return []


def mask_email(email: str) -> str:
    """
    Mask email address for safe logging.
    
    Args:
        email: Email address to mask
        
    Returns:
        str: Masked email address
    """
    if not email or '@' not in email:
        return email
    
    local, domain = email.split('@', 1)
    if len(local) <= 3:
        masked_local = local[0] + '***'
    else:
        masked_local = local[:3] + '***'
    
    return f"{masked_local}@{domain}"


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PreSignUp Lambda handler for Cognito.
    
    This function is triggered when a new user signs up. For custom auth (OTP),
    we need to auto-confirm the user and their email since they've already
    verified ownership via the OTP code.
    
    Also checks for duplicate accounts with the same email and logs them
    for monitoring purposes.
    
    Requirements: 1.1, 1.4, 1.5
    
    Args:
        event: Cognito PreSignUp event
        context: Lambda context
        
    Returns:
        dict: Modified event with auto-confirm settings
    """
    try:
        trigger_source = event.get('triggerSource')
        user_attributes = event['request'].get('userAttributes', {})
        email = user_attributes.get('email', 'unknown')
        email_display = mask_email(email)
        
        logger.info(
            f"PreSignUp triggered: email={email_display}, trigger_source={trigger_source}"
        )
        
        # Check for duplicate accounts with the same email
        if email and email != 'unknown':
            existing_users = check_for_duplicate_users(email)
            if existing_users:
                logger.info(
                    f"Duplicate account detected for {email_display}: "
                    f"{len(existing_users)} existing user(s) found. "
                    f"New user will be created and can be linked later."
                )
        
        # Auto-confirm users based on trigger source
        if trigger_source == 'PreSignUp_ExternalProvider':
            # Social provider (Google) - let Cognito handle confirmation
            logger.info(f"Social provider signup for {email_display} - Cognito will handle confirmation")
        else:
            # Custom auth (OTP) - auto-confirm since email was verified via OTP
            logger.info(f"Custom auth signup for {email_display} - auto-confirming user")
            event['response']['autoConfirmUser'] = True
            event['response']['autoVerifyEmail'] = True
        
        return event
        
    except Exception as e:
        logger.error(f"Error in PreSignUp trigger: {str(e)}", error=e)
        # Don't fail signup on error - allow Cognito to proceed
        return event
