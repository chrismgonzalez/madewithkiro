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
    Detects duplicate accounts and sets custom attributes for linking.
    
    Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3
    
    Args:
        event: Cognito PostAuthentication event
        context: Lambda context
        
    Returns:
        dict: Modified event with custom claims if duplicates found
    """
    try:
        trigger_source = event.get('triggerSource')
        user_attributes = event['request'].get('userAttributes', {})
        user_pool_id = event.get('userPoolId')
        
        email = user_attributes.get('email')
        user_sub = user_attributes.get('sub')
        
        # Safe email display
        email_display = _mask_email(email)
        
        logger.info(
            f"PostAuthentication triggered for user: {email_display}, "
            f"trigger source: {trigger_source}, sub: {user_sub}"
        )
        
        # Only handle PostAuthentication_Authentication trigger
        if trigger_source == 'PostAuthentication_Authentication':
            # Check if this is a federated user (Google) or a user signing in via Google
            identities_str = user_attributes.get('identities')
            username = event.get('userName', '')
            
            # Log for debugging
            logger.info(
                f"Auth check",
                context={
                    'has_identities': bool(identities_str),
                    'username': username,
                    'identities': identities_str[:100] if identities_str else None
                }
            )
            
            # Skip duplicate detection if:
            # 1. User has identities attribute (federated or linked user)
            # 2. Username starts with provider name (e.g., "Google_")
            if identities_str or username.startswith('Google_'):
                logger.info(f"Federated/linked user - skipping duplicate detection")
                return event
            
            # This is an OTP user - handle duplicate detection and profile management
            if email and user_sub:
                try:
                    # Get username from event (for OTP users, this is typically the email or sub)
                    username = event.get('userName', user_sub)
                    # Process OTP user authentication
                    event = _process_otp_user_authentication(event, email, user_sub, username, user_pool_id)
                except Exception as e:
                    logger.error(
                        f"Error processing OTP user authentication: {str(e)}",
                        error=e,
                        context={'email': email_display, 'sub': user_sub}
                    )
                    # Don't fail authentication due to processing errors
            else:
                logger.warning(
                    f"Missing required attributes",
                    context={'has_email': bool(email), 'has_sub': bool(user_sub)}
                )
        
        return event
        
    except Exception as e:
        logger.error(f"Error in PostAuthentication: {str(e)}", error=e)
        # Don't fail authentication on error
        return event


def _process_otp_user_authentication(
    event: Dict[str, Any],
    email: str,
    user_sub: str,
    username: str,
    user_pool_id: str
) -> Dict[str, Any]:
    """
    Process OTP user authentication including duplicate detection and profile management.
    
    Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.3
    
    Args:
        event: Cognito event
        email: User's email address
        user_sub: User's Cognito sub
        username: User's Cognito username
        user_pool_id: Cognito User Pool ID
        
    Returns:
        dict: Modified event with custom claims if duplicates found
    """
    # Validate profile consistency (Requirements 5.1, 5.3)
    validate_profile_consistency(user_sub)
    
    # Check for duplicate Google accounts with same email
    duplicate_google_user = find_duplicate_google_user(email, user_sub, user_pool_id)
    
    if duplicate_google_user:
        # Duplicate Google account detected - store info for user confirmation
        google_username = duplicate_google_user.get('Username')
        google_sub = duplicate_google_user.get('google_sub')
        
        logger.info(
            f"Found duplicate Google account - flagging for user confirmation",
            context={
                'otp_sub': user_sub,
                'otp_username': username,
                'google_username': google_username,
                'google_sub': google_sub,
                'email': _mask_email(email)
            }
        )
        
        # Store pending link information in DynamoDB for the OTP user
        # This will be used by the frontend to prompt the user
        store_pending_link_info(user_sub, google_username, google_sub, email)
        
        # Set custom claims to notify frontend about pending link
        event = _set_pending_link_claims(event, google_username)
    
    # Handle profile creation/linking (Requirements 3.4, 3.5)
    # If there's a pending link, create a new OTP profile (don't update Google profile)
    handle_otp_user_profile(email, user_sub, user_pool_id, has_pending_link=bool(duplicate_google_user))
    
    return event


def _set_linking_custom_attributes(
    event: Dict[str, Any],
    target_sub: str,
    current_sub: str,
    email: str
) -> Dict[str, Any]:
    """
    Set custom attributes for account linking in the event response.
    
    Requirements: 3.3
    
    Args:
        event: Cognito event
        target_sub: Sub of the duplicate user to link with
        current_sub: Current user's sub
        email: User's email address
        
    Returns:
        dict: Modified event with custom claims
    """
    logger.info(
        f"Setting linking flags for duplicate account",
        context={
            'current_sub': current_sub,
            'target_sub': target_sub,
            'email': _mask_email(email)
        }
    )
    
    # Initialize response if not present
    if 'response' not in event:
        event['response'] = {}
    
    # Set custom claims
    event['response']['claimsOverrideDetails'] = {
        'claimsToAddOrOverride': {
            'custom:pending_link': 'true',
            'custom:link_target_sub': target_sub
        }
    }
    
    return event


def _mask_email(email: Optional[str]) -> str:
    """
    Mask email address for logging.
    
    Args:
        email: Email address to mask
        
    Returns:
        str: Masked email or 'unknown'
    """
    if not email or '@' not in email:
        return 'unknown'
    
    parts = email.split('@')
    if len(parts[0]) >= 3:
        return f"{parts[0][:3]}***@{parts[1]}"
    else:
        return f"***@{parts[1]}"


def handle_otp_user_profile(email: str, user_sub: str, user_pool_id: str, has_pending_link: bool = False) -> None:
    """
    Handle profile creation or linking for OTP users.
    
    Requirements: 3.4, 3.5, 5.1, 5.2, 5.3
    
    Args:
        email: User's email address
        user_sub: Cognito user sub (ID)
        user_pool_id: Cognito User Pool ID
        has_pending_link: Whether there's a pending account link (duplicate detected)
    """
    email_display = f"{email[:3]}***@{email.split('@')[1]}" if email and '@' in email else 'unknown'
    
    try:
        # If there's a pending link, always create a new OTP profile
        # The merge will happen after user confirms the link
        if has_pending_link:
            logger.info(
                "Creating new OTP profile (pending link detected)",
                context={
                    'email': email_display,
                    'user_sub': user_sub
                }
            )
            create_new_profile(user_sub, email)
            return
        
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


def detect_duplicate_accounts(email: str, current_user_sub: str) -> Dict[str, Any]:
    """
    Detect duplicate accounts by querying DynamoDB GSI1 for profiles with same email.
    
    Requirements: 3.1, 3.2
    
    Args:
        email: User's email address
        current_user_sub: Current user's Cognito sub
        
    Returns:
        dict: {
            'hasDuplicate': bool,
            'targetUserSub': str or None (sub of duplicate user if found)
        }
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Query GSI1 for all profiles with this email
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :email_key',
            ExpressionAttributeValues={
                ':email_key': f'EMAIL#{email}'
            }
        )
        
        items = response.get('Items', [])
        
        # Check if any profiles belong to different Cognito users
        for item in items:
            profile_user_sub = item.get('userId')
            if profile_user_sub and profile_user_sub != current_user_sub:
                # Found a duplicate - different Cognito user with same email
                logger.info(
                    f"Duplicate account detected",
                    context={
                        'current_sub': current_user_sub,
                        'duplicate_sub': profile_user_sub,
                        'email': f"{email[:3]}***@{email.split('@')[1]}" if '@' in email else 'unknown'
                    }
                )
                return {
                    'hasDuplicate': True,
                    'targetUserSub': profile_user_sub
                }
        
        # No duplicates found
        return {
            'hasDuplicate': False,
            'targetUserSub': None
        }
        
    except ClientError as e:
        logger.error(f"DynamoDB query error in duplicate detection: {str(e)}")
        # Return no duplicate on error to allow authentication to proceed
        return {
            'hasDuplicate': False,
            'targetUserSub': None
        }


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


def validate_profile_consistency(user_sub: str) -> bool:
    """
    Validate that exactly one profile exists per Cognito sub.
    
    Requirements: 5.1, 5.3
    
    This function queries DynamoDB to check if a user has multiple profiles,
    which would indicate a data consistency issue. It logs a warning if
    multiple profiles are found but does not block authentication.
    
    Args:
        user_sub: Cognito user sub (ID)
        
    Returns:
        bool: True if validation passes (0 or 1 profile), False if multiple profiles found
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Query for all profiles with this Cognito sub
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_sub}',
                ':sk': 'PROFILE'
            }
        )
        
        items = response.get('Items', [])
        profile_count = len(items)
        
        if profile_count > 1:
            # Multiple profiles found - log warning with masked emails
            masked_profiles = [
                {
                    'email': _mask_email(item.get('email', '')),
                    'authMethods': item.get('authMethods', [])
                }
                for item in items
            ]
            
            logger.warning(
                "Profile consistency violation: Multiple profiles found for Cognito sub",
                context={
                    'user_sub': user_sub,
                    'profile_count': profile_count,
                    'profiles': masked_profiles
                }
            )
            return False
        
        # 0 or 1 profile is valid
        return True
        
    except ClientError as e:
        logger.error(
            f"Error validating profile consistency: {str(e)}",
            error=e,
            context={'user_sub': user_sub}
        )
        # Return True on error to not block authentication
        return True


def find_duplicate_google_user(email: str, current_sub: str, user_pool_id: str) -> Optional[Dict[str, Any]]:
    """
    Find duplicate Google user with the same email address.
    
    Args:
        email: Email address to search for
        current_sub: Current user's Cognito sub (to exclude from results)
        user_pool_id: Cognito User Pool ID
        
    Returns:
        dict: Google user info with 'Username' and 'google_sub' if found, None otherwise
    """
    try:
        import json
        cognito_client = boto3.client('cognito-idp')
        
        # List all users with this email
        response = cognito_client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=10
        )
        
        users = response.get('Users', [])
        
        # Find Google users (have 'identities' attribute)
        for user in users:
            username = user.get('Username')
            if username == current_sub:
                continue  # Skip current user
            
            # Check if this is a Google user
            attributes = {attr['Name']: attr['Value'] for attr in user.get('Attributes', [])}
            if 'identities' in attributes:
                # Parse identities JSON to get the actual Google sub
                try:
                    identities = json.loads(attributes['identities'])
                    # identities is a list of identity objects
                    for identity in identities:
                        if identity.get('providerName') == 'Google':
                            google_sub = identity.get('userId')
                            logger.info(
                                f"Found duplicate Google user",
                                context={
                                    'cognito_username': username,
                                    'google_sub': google_sub,
                                    'email': _mask_email(email)
                                }
                            )
                            # Return user with extracted Google sub
                            user['google_sub'] = google_sub
                            return user
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse identities JSON: {str(e)}")
                    continue
        
        return None
        
    except ClientError as e:
        logger.error(f"Error finding duplicate Google user: {str(e)}", error=e)
        return None


def link_google_to_otp_user(google_username: str, google_sub: str, otp_username: str, user_pool_id: str) -> Dict[str, Any]:
    """
    Link Google identity to OTP user at Cognito level.
    
    Per AWS docs: "To link a federated user who has previously signed in, 
    you must first delete their existing profile."
    
    Args:
        google_username: Google user's Cognito username (e.g., Google_111435476262127740566)
        google_sub: Google user's actual Google sub/userId
        otp_username: OTP user's Cognito username (becomes primary)
        user_pool_id: Cognito User Pool ID
        
    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        cognito_client = boto3.client('cognito-idp')
        
        # Step 1: Delete the existing Google user profile
        # This is required per AWS docs when linking a federated user who has already signed in
        logger.info(
            f"Deleting existing Google user profile before linking",
            context={'google_username': google_username}
        )
        
        try:
            cognito_client.admin_delete_user(
                UserPoolId=user_pool_id,
                Username=google_username
            )
            logger.info(f"Successfully deleted Google user profile: {google_username}")
        except ClientError as delete_error:
            # If user doesn't exist, that's fine - continue with linking
            if delete_error.response.get('Error', {}).get('Code') != 'UserNotFoundException':
                raise
        
        # Step 2: Link Google identity TO the OTP user
        # Now that the Google profile is deleted, we can link the identity
        cognito_client.admin_link_provider_for_user(
            UserPoolId=user_pool_id,
            DestinationUser={
                'ProviderName': 'Cognito',
                'ProviderAttributeValue': otp_username
            },
            SourceUser={
                'ProviderName': 'Google',
                'ProviderAttributeName': 'Cognito_Subject',
                'ProviderAttributeValue': google_sub
            }
        )
        
        logger.info(
            f"Successfully linked Google identity to OTP user",
            context={
                'google_sub': google_sub,
                'otp_username': otp_username
            }
        )
        
        return {
            'success': True,
            'message': 'Accounts linked successfully'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        logger.error(
            f"Cognito error linking accounts: {error_code} - {error_message}",
            error=e,
            context={
                'google_username': google_username,
                'google_sub': google_sub,
                'otp_username': otp_username
            }
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


def merge_profiles_after_linking(google_sub: str, otp_sub: str) -> None:
    """
    Merge DynamoDB profiles after successful account linking.
    
    Args:
        google_sub: Google user's Cognito sub (source)
        otp_sub: OTP user's Cognito sub (destination/primary)
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Get both profiles
        google_profile = table.get_item(
            Key={
                'PK': f'USER#{google_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')
        
        otp_profile = table.get_item(
            Key={
                'PK': f'USER#{otp_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')
        
        if not otp_profile:
            logger.warning(f"OTP profile not found for {otp_sub} - skipping merge")
            return
        
        # Merge authMethods
        google_auth_methods = google_profile.get('authMethods', ['google']) if google_profile else ['google']
        otp_auth_methods = otp_profile.get('authMethods', ['email'])
        
        # Combine and deduplicate
        merged_auth_methods = list(set(google_auth_methods + otp_auth_methods))
        
        # Update OTP profile with merged authMethods
        from datetime import datetime, timezone
        
        table.update_item(
            Key={
                'PK': f'USER#{otp_sub}',
                'SK': 'PROFILE'
            },
            UpdateExpression='SET authMethods = :methods, updatedAt = :updated',
            ExpressionAttributeValues={
                ':methods': merged_auth_methods,
                ':updated': datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(
            f"Merged profiles: {google_sub} -> {otp_sub}",
            context={'merged_auth_methods': merged_auth_methods}
        )
        
        # Delete Google profile if it exists
        if google_profile:
            table.delete_item(
                Key={
                    'PK': f'USER#{google_sub}',
                    'SK': 'PROFILE'
                }
            )
            logger.info(f"Deleted Google profile {google_sub}")
            
    except ClientError as e:
        logger.error(f"Error merging profiles: {str(e)}", error=e)
        # Don't raise - allow authentication to proceed


def store_pending_link_info(user_sub: str, google_username: str, google_sub: str, email: str) -> None:
    """
    Store pending account link information in DynamoDB.
    
    This information will be used by the frontend to prompt the user
    to confirm whether they want to link their accounts.
    
    Args:
        user_sub: OTP user's Cognito sub
        google_username: Google user's Cognito username
        google_sub: Google user's actual Google sub
        email: User's email address
    """
    try:
        from datetime import datetime, timezone, timedelta
        
        table = dynamodb.Table(TABLE_NAME)
        
        # Store pending link with 24-hour expiration
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        pending_link_item = {
            'PK': f'USER#{user_sub}',
            'SK': 'PENDING_LINK',
            'googleUsername': google_username,
            'googleSub': google_sub,
            'email': email,
            'createdAt': datetime.now(timezone.utc).isoformat(),
            'expiresAt': expires_at.isoformat(),
            'status': 'pending'
        }
        
        table.put_item(Item=pending_link_item)
        
        logger.info(
            f"Stored pending link info for user",
            context={
                'user_sub': user_sub,
                'google_username': google_username
            }
        )
        
    except ClientError as e:
        logger.error(f"Error storing pending link info: {str(e)}", error=e)
        # Don't fail authentication if we can't store the info


def _set_pending_link_claims(event: Dict[str, Any], google_username: str) -> Dict[str, Any]:
    """
    Set custom claims to notify frontend about pending account link.
    
    Args:
        event: Cognito event
        google_username: Google user's Cognito username
        
    Returns:
        dict: Modified event with custom claims
    """
    # Initialize response if not present
    if 'response' not in event:
        event['response'] = {}
    
    # Set custom claims
    event['response']['claimsOverrideDetails'] = {
        'claimsToAddOrOverride': {
            'custom:pending_link': 'true',
            'custom:link_google_user': google_username
        }
    }
    
    logger.info(f"Set pending link claims for frontend notification")
    
    return event
