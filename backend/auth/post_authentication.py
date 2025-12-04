"""
PostAuthentication Lambda Handler

Cognito trigger that runs after successful authentication.
Creates user profiles for new OTP users and handles account linking.

Requirements: 3.4, 3.5, 5.1, 5.2, 5.3
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
    PostAuthentication Lambda handler for Cognito.
    
    This function is triggered after successful authentication.
    For OTP users, it creates or links user profiles in DynamoDB.
    
    Requirements: 3.4, 3.5, 5.1, 5.2, 5.3
    
    Args:
        event: Cognito PostAuthentication event
        context: Lambda context
        
    Returns:
        dict: Unmodified event (PostAuthentication doesn't modify response)
    """
    try:
        trigger_source = event.get('triggerSource')
        user_attributes = event['request'].get('userAttributes', {})
        user_pool_id = event.get('userPoolId')
        
        email = user_attributes.get('email')
        user_sub = user_attributes.get('sub')
        
        # Safe email display
        email_display = f"{email[:3]}***@{email.split('@')[1]}" if email and '@' in email else 'unknown'
        
        logger.info(
            f"PostAuthentication triggered for user: {email_display}, "
            f"trigger source: {trigger_source}, sub: {user_sub}"
        )
        
        # Only handle custom auth (OTP) users
        # Google OAuth users are handled separately
        if trigger_source == 'PostAuthentication_Authentication':
            # Check if this is a custom auth user by looking for identities
            identities_str = user_attributes.get('identities')
            
            # If identities exists, this is a federated user (Google) - skip
            if identities_str:
                logger.info(f"Federated user (Google) - skipping profile creation")
                return event
            
            # This is an OTP user - handle profile creation/linking
            if email and user_sub:
                try:
                    handle_otp_user_profile(email, user_sub, user_pool_id)
                except Exception as e:
                    logger.error(f"Error handling OTP user profile: {str(e)}", error=e)
                    # Don't fail authentication due to profile errors
            else:
                logger.warning(f"Missing email or sub for user: {email_display}")
        
        return event
        
    except Exception as e:
        logger.error(f"Error in PostAuthentication: {str(e)}", error=e)
        # Don't fail authentication on error
        return event


def handle_otp_user_profile(email: str, user_sub: str, user_pool_id: str) -> None:
    """
    Handle profile creation or linking for OTP users.
    
    Requirements: 3.4, 3.5, 5.1, 5.2, 5.3
    
    Args:
        email: User's email address
        user_sub: Cognito user sub (ID)
        user_pool_id: Cognito User Pool ID
    """
    email_display = f"{email[:3]}***@{email.split('@')[1]}" if email and '@' in email else 'unknown'
    
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
                    'current_cognito_sub': user_sub
                }
            )
            
            # Check current auth methods and preserve original data
            current_auth_methods = existing_profile.get('authMethods', [])
            
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
        else:
            # New user scenario: create profile with Cognito sub as userId (Requirements 3.4, 3.5)
            logger.info(
                "New user: Creating profile with Cognito sub",
                context={
                    'email': email_display,
                    'user_id': user_sub
                }
            )
            
            # Create new profile in DynamoDB
            create_new_profile(user_sub, email)
            
            # Log profile creation event
            logger.info(
                "Profile created for new OTP user",
                context={
                    'email': email_display,
                    'user_id': user_sub,
                    'auth_methods': ['email']
                }
            )
        
    except Exception as e:
        logger.error(
            f"Error in handle_otp_user_profile: {str(e)}",
            error=e,
            context={'email': email_display}
        )
        raise


def find_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    """
    Query DynamoDB GSI1 to find existing profile by email.
    
    Requirements: 5.1
    
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
    
    Requirements: 5.2, 5.3
    
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
