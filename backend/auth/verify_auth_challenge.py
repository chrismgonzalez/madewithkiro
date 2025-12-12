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
        
        # Note: Account linking is handled in PostAuthentication trigger
        # We can't link here because new OTP users don't have a sub yet
        # during VerifyAuthChallenge - the sub is assigned after auth completes
        
        event['response']['answerCorrect'] = True
        return event
        
    except Exception as e:
        logger.error(f"Error in VerifyAuthChallenge: {str(e)}", error=e)
        event['response']['answerCorrect'] = False
        return event





def find_users_by_email(email: str, user_pool_id: str) -> list:
    """
    Find all Cognito users with the given email address.
    
    Args:
        email: Email address to search for
        user_pool_id: Cognito User Pool ID
        
    Returns:
        list: List of Cognito users with matching email
    """
    try:
        response = cognito_client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=10
        )
        
        return response.get('Users', [])
        
    except ClientError as e:
        logger.error(f"Error listing users by email: {str(e)}")
        return []


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


def link_google_to_otp_user(google_sub: str, otp_sub: str, user_pool_id: str) -> Dict[str, Any]:
    """
    Link Google identity to existing OTP user at Cognito level.
    
    AWS Cognito requires that federated identities (Google) be the SourceUser
    and native Cognito users be the DestinationUser. This means the OTP user
    becomes the primary identity and Google becomes a secondary login method.
    
    Args:
        google_sub: Google user's Cognito sub (will be linked as secondary)
        otp_sub: OTP user's Cognito sub (will be the primary identity)
        user_pool_id: Cognito User Pool ID
        
    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        # Link Google identity TO the OTP user
        # After this, the OTP user's sub becomes the primary identity
        # and Google becomes an additional authentication method
        cognito_client.admin_link_provider_for_user(
            UserPoolId=user_pool_id,
            DestinationUser={
                'ProviderName': 'Cognito',
                'ProviderAttributeValue': otp_sub
            },
            SourceUser={
                'ProviderName': 'Google',
                'ProviderAttributeName': 'Cognito_Subject',
                'ProviderAttributeValue': google_sub
            }
        )
        
        logger.info(f"Successfully linked Google user {google_sub} to OTP user {otp_sub}")
        
        return {
            'success': True,
            'message': 'Accounts linked successfully'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        logger.error(
            f"Cognito error linking accounts: {error_code} - {error_message}",
            error=e
        )
        return {
            'success': False,
            'message': f"Failed to link accounts: {error_message}"
        }
    except Exception as e:
        logger.error(f"Unexpected error linking accounts: {str(e)}", error=e)
        return {
            'success': False,
            'message': 'An unexpected error occurred'
        }


def merge_profiles(source_sub: str, destination_sub: str) -> None:
    """
    Merge DynamoDB profiles after successful account linking.
    
    Args:
        source_sub: Source user's Cognito sub (OTP user)
        destination_sub: Destination user's Cognito sub (Google user)
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Get both profiles
        source_profile = table.get_item(
            Key={
                'PK': f'USER#{source_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')
        
        destination_profile = table.get_item(
            Key={
                'PK': f'USER#{destination_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')
        
        if not destination_profile:
            logger.warning(f"Destination profile not found for {destination_sub} - skipping merge")
            return
        
        # Merge authMethods
        source_auth_methods = source_profile.get('authMethods', []) if source_profile else ['email']
        dest_auth_methods = destination_profile.get('authMethods', [])
        
        # Combine and deduplicate
        merged_auth_methods = list(set(source_auth_methods + dest_auth_methods))
        
        # Update destination profile
        table.update_item(
            Key={
                'PK': f'USER#{destination_sub}',
                'SK': 'PROFILE'
            },
            UpdateExpression='SET authMethods = :methods, updatedAt = :updated',
            ExpressionAttributeValues={
                ':methods': merged_auth_methods,
                ':updated': datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(
            f"Merged profiles: {source_sub} -> {destination_sub}",
            context={'merged_auth_methods': merged_auth_methods}
        )
        
        # Delete source profile if it exists
        if source_profile:
            table.delete_item(
                Key={
                    'PK': f'USER#{source_sub}',
                    'SK': 'PROFILE'
                }
            )
            logger.info(f"Deleted source profile {source_sub}")
            
    except ClientError as e:
        logger.error(f"Error merging profiles: {str(e)}", error=e)
        # Don't raise - allow authentication to proceed


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
