"""
VerifyAuthChallenge Lambda Handler

Cognito trigger that validates OTP codes and handles account linking.
Requirements: 1.3, 2.2, 3.1, 3.2, 3.3
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import boto3
from botocore.exceptions import ClientError

from auth.otp_utils import is_otp_expired
from shared.logger import get_logger

logger = get_logger(__name__)

# AWS clients
dynamodb = boto3.resource('dynamodb')
cognito_client = boto3.client('cognito-idp')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    VerifyAuthChallenge Lambda handler for Cognito custom authentication.
    
    This function validates the OTP code submitted by the user, checks for
    duplicate accounts, and links accounts if necessary.
    
    Requirements: 1.3, 2.2, 3.1, 3.2, 3.3
    
    Args:
        event: Cognito VerifyAuthChallenge event
        context: Lambda context
        
    Returns:
        dict: Modified event with verification result
    """
    try:
        # Extract challenge parameters
        private_params = event['request'].get('privateChallengeParameters', {})
        user_answer = event['request'].get('challengeAnswer', '').strip()
        user_attributes = event['request'].get('userAttributes', {})
        user_pool_id = event.get('userPoolId')  # Get from event
        
        email = user_attributes.get('email')
        stored_otp = private_params.get('otp_code')
        expires_at_str = private_params.get('expires_at')
        
        logger.info(
            f"VerifyAuthChallenge triggered for user: {email[:3]}***@{email.split('@')[1] if email else 'unknown'}"
        )
        
        # Validate inputs
        if not stored_otp or not expires_at_str:
            logger.error("Missing OTP code or expiration in private parameters")
            event['response']['answerCorrect'] = False
            return event
        
        if not user_answer:
            logger.warning("Empty OTP code submitted")
            event['response']['answerCorrect'] = False
            return event
        
        # Check if OTP has expired
        expires_at = int(expires_at_str)
        if is_otp_expired(expires_at):
            logger.warning(f"OTP code expired for {email[:3]}***@{email.split('@')[1] if email else 'unknown'}")
            event['response']['answerCorrect'] = False
            return event
        
        # Verify OTP code
        if user_answer != stored_otp:
            logger.warning(f"Incorrect OTP code for {email[:3]}***@{email.split('@')[1] if email else 'unknown'}")
            event['response']['answerCorrect'] = False
            return event
        
        # OTP is correct and not expired
        logger.info(f"OTP verified successfully for {email[:3]}***@{email.split('@')[1] if email else 'unknown'}")
        
        # Check for duplicate accounts and link if necessary
        try:
            handle_account_linking(email, user_attributes, user_pool_id)
        except Exception as e:
            logger.error(f"Error during account linking: {str(e)}", error=e)
            # Don't fail authentication due to linking errors
            # User can still authenticate, linking can be retried later
        
        event['response']['answerCorrect'] = True
        return event
        
    except Exception as e:
        logger.error(f"Error in VerifyAuthChallenge: {str(e)}", error=e)
        event['response']['answerCorrect'] = False
        return event


def handle_account_linking(email: str, user_attributes: Dict[str, str], user_pool_id: str) -> None:
    """
    Check for duplicate accounts and link authentication methods.
    
    Requirements: 3.1, 3.2, 3.3
    
    Args:
        email: User's email address
        user_attributes: Cognito user attributes
        user_pool_id: Cognito User Pool ID
    """
    try:
        # Query DynamoDB GSI1 for existing accounts with this email
        existing_profile = find_profile_by_email(email)
        
        if existing_profile:
            logger.info(
                f"Found existing profile for {email[:3]}***@{email.split('@')[1]}: "
                f"userId={existing_profile.get('userId')}"
            )
            
            # Check current auth methods
            current_auth_methods = existing_profile.get('authMethods', [])
            
            # Add 'email' to auth methods if not already present
            if 'email' not in current_auth_methods:
                updated_auth_methods = current_auth_methods + ['email']
                
                # Update DynamoDB profile with new auth method
                update_profile_auth_methods(
                    existing_profile.get('userId'),
                    updated_auth_methods
                )
                
                logger.info(
                    f"Updated auth methods for {email[:3]}***@{email.split('@')[1]}: "
                    f"{updated_auth_methods}"
                )
            
            # Update Cognito user attributes to link accounts
            # Store the linked account information
            current_user_sub = user_attributes.get('sub')
            if current_user_sub:
                update_cognito_user_attributes(
                    user_pool_id,
                    current_user_sub,
                    {
                        'custom:linked_account': existing_profile.get('userId'),
                        'custom:auth_methods': ','.join(updated_auth_methods)
                    }
                )
        else:
            logger.info(
                f"No existing profile found for {email[:3]}***@{email.split('@')[1]}. "
                "New profile will be created on first login."
            )
            
            # Update Cognito user attributes for new email-only user
            current_user_sub = user_attributes.get('sub')
            if current_user_sub:
                update_cognito_user_attributes(
                    user_pool_id,
                    current_user_sub,
                    {
                        'custom:auth_methods': 'email'
                    }
                )
        
    except Exception as e:
        logger.error(f"Error in handle_account_linking: {str(e)}", error=e)
        raise


def find_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    """
    Query DynamoDB GSI1 to find existing profile by email.
    
    Requirements: 3.1
    
    Args:
        email: User's email address
        
    Returns:
        dict: User profile if found, None otherwise
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Query GSI1 with email
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :email_key',
            ExpressionAttributeValues={
                ':email_key': f'EMAIL#{email}'
            },
            Limit=1
        )
        
        items = response.get('Items', [])
        
        if items:
            return items[0]
        
        return None
        
    except ClientError as e:
        logger.error(f"DynamoDB query error: {str(e)}")
        raise


def update_profile_auth_methods(user_id: str, auth_methods: list) -> None:
    """
    Update user profile with new authentication methods.
    
    Requirements: 3.2, 3.3
    
    Args:
        user_id: User's ID (Cognito sub)
        auth_methods: List of authentication methods
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Update the profile with new auth methods
        table.update_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE'
            },
            UpdateExpression='SET authMethods = :methods, updatedAt = :updated',
            ExpressionAttributeValues={
                ':methods': auth_methods,
                ':updated': datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(f"Updated profile auth methods for user {user_id}")
        
    except ClientError as e:
        logger.error(f"DynamoDB update error: {str(e)}")
        raise


def update_cognito_user_attributes(
    user_pool_id: str,
    user_sub: str,
    attributes: Dict[str, str]
) -> None:
    """
    Update Cognito user attributes.
    
    Requirements: 3.2, 3.3
    
    Args:
        user_pool_id: Cognito User Pool ID
        user_sub: Cognito user sub (ID)
        attributes: Dictionary of attributes to update
    """
    try:
        # Convert attributes dict to Cognito format
        user_attributes = [
            {'Name': key, 'Value': value}
            for key, value in attributes.items()
        ]
        
        # Update user attributes in Cognito
        cognito_client.admin_update_user_attributes(
            UserPoolId=user_pool_id,
            Username=user_sub,
            UserAttributes=user_attributes
        )
        
        logger.info(f"Updated Cognito attributes for user {user_sub}")
        
    except ClientError as e:
        logger.error(f"Cognito update error: {str(e)}")
        raise
