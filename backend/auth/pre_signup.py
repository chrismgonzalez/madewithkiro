"""
PreSignUp Lambda Handler

Cognito trigger that auto-confirms users for custom authentication (OTP).
Also creates user profiles in DynamoDB for new OTP users.

Requirements: 1.4, 1.5, 3.4, 3.5, 5.1, 5.2, 5.3
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import boto3
from botocore.exceptions import ClientError

from shared.logger import get_logger

logger = get_logger(__name__)

# AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PreSignUp Lambda handler for Cognito.
    
    This function is triggered when a new user signs up. For custom auth (OTP),
    we need to auto-confirm the user and their email since they've already
    verified ownership via the OTP code.
    
    Requirements: 1.4, 1.5
    
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
        
        # Safe email display
        email_display = f"{email[:3]}***@{email.split('@')[1]}" if email and '@' in email else email
        
        logger.info(
            f"PreSignUp triggered for user: {email_display}, "
            f"trigger source: {trigger_source}"
        )
        
        # For custom auth (OTP), auto-confirm the user
        # The user has already verified their email by entering the OTP code
        if trigger_source == 'PreSignUp_ExternalProvider':
            # Social provider (Google) - let Cognito handle it normally
            logger.info(f"Social provider signup for {email_display}")
        else:
            # Custom auth (OTP) - auto-confirm user and email
            logger.info(f"Custom auth signup for {email_display} - auto-confirming")
            event['response']['autoConfirmUser'] = True
            event['response']['autoVerifyEmail'] = True
        
        return event
        
    except Exception as e:
        logger.error(f"Error in PreSignUp: {str(e)}", error=e)
        # Don't fail signup on error - let Cognito handle it
        return event
