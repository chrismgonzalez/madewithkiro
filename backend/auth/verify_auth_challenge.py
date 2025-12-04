"""
VerifyAuthChallenge Lambda Handler

Cognito trigger that validates OTP codes and handles account linking.
Requirements: 4.4, 5.1, 5.2, 5.3
"""

import os
import secrets
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
        
        # Get email from multiple possible sources
        # For new users: email is in userName or privateChallengeParameters
        # For existing users: email is in userAttributes
        email = (
            user_attributes.get('email') or 
            private_params.get('email') or 
            event.get('userName')
        )
        
        # For new users, the sub might not be in userAttributes yet
        # It will be available after the user is created
        # We'll use the userName as a fallback which contains the email for new users
        user_sub = user_attributes.get('sub')
        
        stored_otp = private_params.get('otp_code')
        expires_at_str = private_params.get('expires_at')
        
        # Log with safe email formatting
        email_display = f"{email[:3]}***@{email.split('@')[1]}" if email and '@' in email else 'unknown'
        logger.info(f"VerifyAuthChallenge triggered for user: {email_display}")
        
        # Validate inputs
        if not email:
            logger.error("Missing email in user attributes, private params, and userName")
            event['response']['answerCorrect'] = False
            return event
            
        if not stored_otp or not expires_at_str:
            logger.error("Missing OTP code or expiration in private parameters")
            event['response']['answerCorrect'] = False
            return event
        
        if not user_answer:
            logger.warning("Empty OTP code submitted")
            event['response']['answerCorrect'] = False
            return event
        
        # Check if OTP has expired (check expiration BEFORE validation per Requirements 4.4)
        expires_at = int(expires_at_str)
        if is_otp_expired(expires_at):
            logger.warning(f"OTP code expired for {email_display}")
            event['response']['answerCorrect'] = False
            return event
        
        # Verify OTP code using timing-safe comparison (Requirements 4.4)
        # secrets.compare_digest prevents timing attacks by ensuring constant-time comparison
        if not secrets.compare_digest(user_answer.encode('utf-8'), stored_otp.encode('utf-8')):
            logger.warning(f"Incorrect OTP code for {email_display}")
            event['response']['answerCorrect'] = False
            return event
        
        # OTP is correct and not expired
        logger.info(f"OTP verified successfully for {email_display}")
        
        # Check for duplicate accounts and link if necessary
        # Only do this for existing users (who have a sub)
        # For new users, profile creation will happen in PostAuthentication trigger
        if user_sub:
            try:
                handle_account_linking(email, user_attributes, user_pool_id)
            except Exception as e:
                logger.error(f"Error during account linking: {str(e)}", error=e)
                # Don't fail authentication due to linking errors
                # User can still authenticate, linking can be retried later
        else:
            logger.info(f"New user detected (no sub yet) - profile will be created in PostAuthentication trigger")
        
        event['response']['answerCorrect'] = True
        return event
        
    except Exception as e:
        logger.error(f"Error in VerifyAuthChallenge: {str(e)}", error=e)
        event['response']['answerCorrect'] = False
        return event


def handle_account_linking(email: str, user_attributes: Dict[str, str], user_pool_id: str) -> None:
    """
    Check for existing accounts and link authentication methods, or create new profile.
    
    Requirements: 5.1, 5.2, 5.3
    
    This function:
    - Queries DynamoDB GSI1 for existing profile by email
    - If existing profile found (e.g., Google OAuth user), updates authMethods to include 'email'
    - If no profile found, creates new profile with Cognito sub as userId
    - Preserves original userId and profile data during linking
    - Logs account linking events to CloudWatch
    
    Args:
        email: User's email address
        user_attributes: Cognito user attributes
        user_pool_id: Cognito User Pool ID
    """
    email_display = f"{email[:3]}***@{email.split('@')[1]}" if email and '@' in email else 'unknown'
    current_user_sub = user_attributes.get('sub')
    
    try:
        # Query DynamoDB GSI1 for existing accounts with this email (Requirements 5.1)
        existing_profile = find_profile_by_email(email)
        
        if existing_profile:
            # Account linking scenario: existing profile found (Requirements 5.2, 5.3)
            original_user_id = existing_profile.get('userId')
            logger.info(
                "Account linking: Found existing profile",
                context={
                    'email': email_display,
                    'original_user_id': original_user_id,
                    'current_cognito_sub': current_user_sub
                }
            )
            
            # Check current auth methods and preserve original data
            current_auth_methods = existing_profile.get('authMethods', [])
            updated_auth_methods = current_auth_methods
            
            # Add 'email' to auth methods if not already present (Requirements 5.2)
            if 'email' not in current_auth_methods:
                updated_auth_methods = current_auth_methods + ['email']
                
                # Update DynamoDB profile with new auth method
                # Preserves original userId and all other profile data (Requirements 5.3)
                update_profile_auth_methods(original_user_id, updated_auth_methods)
                
                # Log account linking event to CloudWatch (Requirements 5.3)
                logger.info(
                    "Account linked: Added email auth method to existing profile",
                    context={
                        'email': email_display,
                        'user_id': original_user_id,
                        'previous_auth_methods': current_auth_methods,
                        'updated_auth_methods': updated_auth_methods
                    }
                )
            else:
                logger.info(
                    "Account already linked: email auth method exists",
                    context={
                        'email': email_display,
                        'user_id': original_user_id,
                        'auth_methods': current_auth_methods
                    }
                )
            
            # Update Cognito user attributes to link accounts
            if current_user_sub and user_pool_id:
                try:
                    update_cognito_user_attributes(
                        user_pool_id,
                        current_user_sub,
                        {
                            'custom:linked_account': original_user_id,
                            'custom:auth_methods': ','.join(updated_auth_methods)
                        }
                    )
                except ClientError as e:
                    # Log but don't fail - Cognito attribute update is optional
                    logger.warning(
                        f"Failed to update Cognito attributes: {str(e)}",
                        context={'user_sub': current_user_sub}
                    )
        else:
            # New user scenario: create profile with Cognito sub as userId (Requirements 3.4, 3.5)
            if current_user_sub:
                logger.info(
                    "New user: Creating profile with Cognito sub",
                    context={
                        'email': email_display,
                        'user_id': current_user_sub
                    }
                )
                
                # Create new profile in DynamoDB
                create_new_profile(current_user_sub, email)
                
                # Log profile creation event
                logger.info(
                    "Profile created for new OTP user",
                    context={
                        'email': email_display,
                        'user_id': current_user_sub,
                        'auth_methods': ['email']
                    }
                )
                
                # Update Cognito user attributes
                if user_pool_id:
                    try:
                        update_cognito_user_attributes(
                            user_pool_id,
                            current_user_sub,
                            {
                                'custom:auth_methods': 'email'
                            }
                        )
                    except ClientError as e:
                        # Log but don't fail - Cognito attribute update is optional
                        logger.warning(
                            f"Failed to update Cognito attributes: {str(e)}",
                            context={'user_sub': current_user_sub}
                        )
            else:
                logger.warning(
                    "Cannot create profile: missing Cognito sub",
                    context={'email': email_display}
                )
        
    except Exception as e:
        logger.error(
            f"Error in handle_account_linking: {str(e)}",
            error=e,
            context={'email': email_display}
        )
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
    
    Requirements: 5.2, 5.3
    
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


def create_new_profile(user_id: str, email: str) -> Dict[str, Any]:
    """
    Create a new user profile in DynamoDB for OTP-authenticated users.
    
    Requirements: 3.4, 3.5
    
    This creates a minimal profile with:
    - userId set to Cognito sub
    - email from authentication
    - authMethods set to ['email']
    - Placeholder values for required fields (user can update later)
    
    Args:
        user_id: Cognito sub (user ID)
        email: User's email address
        
    Returns:
        dict: Created profile item
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Create profile with minimal required fields
        # User will complete profile on first visit to profile page
        profile_item = {
            'PK': f'USER#{user_id}',
            'SK': 'PROFILE',
            'userId': user_id,
            'email': email,
            'firstName': '',  # To be filled by user
            'lastName': '',   # To be filled by user
            'awsBuilderHandle': '',  # To be filled by user
            'linkedInUsername': None,
            'githubUsername': None,
            'authMethods': ['email'],  # Requirements 3.5
            'createdAt': timestamp,
            'updatedAt': timestamp,
            'entityType': 'PROFILE',
            # GSI1 for email lookup
            'GSI1PK': f'EMAIL#{email}',
            'GSI1SK': 'PROFILE'
        }
        
        # Put item in DynamoDB
        table.put_item(Item=profile_item)
        
        logger.info(
            f"Created new profile for user {user_id}",
            context={'email': f"{email[:3]}***@{email.split('@')[1]}" if '@' in email else 'unknown'}
        )
        
        return profile_item
        
    except ClientError as e:
        logger.error(f"DynamoDB put error: {str(e)}")
        raise
