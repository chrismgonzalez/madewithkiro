"""
Profile Lambda Handler
Handles profile operations: create, read, update
"""
import json
import os
from typing import Dict, Any
from pydantic import ValidationError

# Import shared modules
from shared.models import CreateProfileRequest, UpdateProfileRequest, UserProfile
from shared.dynamodb_utils import (
    get_item,
    put_item,
    update_item,
    get_timestamp,
    clean_dynamodb_item
)
from shared.error_handler import (
    success_response,
    sanitized_error_response,
    handle_validation_error,
    handle_not_found,
    handle_unauthorized,
    handle_conflict,
    handle_internal_error
)
from shared.logger import get_logger


# Initialize structured logger
logger = get_logger(__name__)


# Store event globally for response functions
_current_event = None


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for profile operations
    
    Routes:
    - GET /profile/{userId} - Get user profile (public)
    - POST /profile - Create profile (authenticated)
    - PUT /profile - Update profile (authenticated)
    
    Requirements: 2.3, 5.3
    """
    global _current_event
    _current_event = event
    
    http_method = event.get('httpMethod')
    path_parameters = event.get('pathParameters') or {}
    request_id = event.get('requestContext', {}).get('requestId')
    
    # Log incoming request
    logger.info(
        message=f"Profile handler invoked: {http_method} {event.get('path')}",
        context={
            'http_method': http_method,
            'path': event.get('path')
        },
        request_id=request_id
    )
    
    try:
        # Handle OPTIONS preflight requests
        if http_method == 'OPTIONS':
            from shared.cors_utils import get_cors_headers
            return {
                'statusCode': 200,
                'headers': get_cors_headers(event),
                'body': ''
            }
        
        if http_method == 'GET':
            # Check if this is a check-email request
            path = event.get('path', '')
            if path.endswith('/check-email'):
                query_params = event.get('queryStringParameters') or {}
                email = query_params.get('email')
                if not email:
                    return sanitized_error_response(
                        status_code=400,
                        user_message='Missing email parameter',
                        event=event
                    )
                return check_profile_by_email(email)
            
            # Get profile by userId
            user_id = path_parameters.get('userId')
            if not user_id:
                return sanitized_error_response(
                    status_code=400,
                    user_message='Missing userId parameter',
                    event=event
                )
            
            return get_profile(user_id)
        
        elif http_method == 'POST':
            # Check if this is a link accounts request
            path = event.get('path', '')
            if path.endswith('/link'):
                body = json.loads(event.get('body', '{}'))
                user_id = get_user_id_from_event(event)
                
                if not user_id:
                    return handle_unauthorized(event=event)
                
                return link_accounts(user_id, body)
            
            # Create new profile
            body = json.loads(event.get('body', '{}'))
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return handle_unauthorized(event=event)
            
            # Check if user has a linked account
            linked_user_id = get_linked_account_from_event(event)
            if linked_user_id:
                # User has a linked account, use that profile instead
                logger.info(
                    message="User has linked account, retrieving existing profile",
                    context={'current_user_id': user_id, 'linked_user_id': linked_user_id},
                    user_id=user_id
                )
                return get_profile(linked_user_id)
            
            return create_profile(user_id, body)
        
        elif http_method == 'PUT':
            # Update existing profile
            body = json.loads(event.get('body', '{}'))
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return handle_unauthorized(event=event)
            
            # Check if user has a linked account
            linked_user_id = get_linked_account_from_event(event)
            if linked_user_id:
                # User has a linked account, update that profile instead
                logger.info(
                    message="User has linked account, updating existing profile",
                    context={'current_user_id': user_id, 'linked_user_id': linked_user_id},
                    user_id=user_id
                )
                return update_profile(linked_user_id, body)
            
            return update_profile(user_id, body)
        
        else:
            return sanitized_error_response(
                status_code=405,
                user_message=f'Method {http_method} not allowed',
                event=event
            )
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=event,
            context={'http_method': http_method, 'path': event.get('path')}
        )


def get_profile(user_id: str) -> Dict[str, Any]:
    """
    Get user profile by ID.
    
    Requirements: 2.3, 5.3
    
    This function retrieves a user profile using the Cognito sub as the primary key.
    It works for both Google OAuth and OTP users, as well as linked accounts.
    
    If the profile is not found for the given userId, checks if this user has a
    linked account and returns that profile instead.
    """
    try:
        # Use Cognito sub as primary key (works for all auth methods)
        item = get_item(f'USER#{user_id}', 'PROFILE')
        
        if not item:
            # Profile not found - check if this user has a linked account
            linked_user_id = get_linked_account_from_event(_current_event)
            
            if linked_user_id:
                logger.info(
                    message="Profile not found for userId, checking linked account",
                    context={'requested_user_id': user_id, 'linked_user_id': linked_user_id},
                    user_id=user_id
                )
                
                # Try to get the linked profile
                linked_item = get_item(f'USER#{linked_user_id}', 'PROFILE')
                
                if linked_item:
                    profile_data = clean_dynamodb_item(linked_item)
                    logger.info(
                        message="Linked profile retrieved successfully",
                        context={
                            'requested_user_id': user_id,
                            'linked_user_id': linked_user_id,
                            'auth_methods': profile_data.get('authMethods', [])
                        },
                        user_id=user_id
                    )
                    return success_response(profile_data, event=_current_event)
            
            # No profile found and no linked account
            return handle_not_found(
                resource_type='Profile',
                event=_current_event,
                user_id=user_id
            )
        
        # Clean and return profile
        profile_data = clean_dynamodb_item(item)
        
        logger.info(
            message="Profile retrieved successfully",
            context={
                'user_id': user_id,
                'auth_methods': profile_data.get('authMethods', [])
            },
            user_id=user_id
        )
        
        return success_response(profile_data, event=_current_event)
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=user_id,
            context={'operation': 'get_profile', 'user_id': user_id}
        )


def create_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new user profile.
    
    Requirements: 1.4, 1.5, 5.3
    """
    try:
        logger.info(
            message="Creating new profile",
            context={'operation': 'create_profile'},
            user_id=user_id
        )
        
        # Validate request data
        profile_request = CreateProfileRequest(**data)
        
        # Get email from Cognito claims
        email = get_email_from_event(_current_event)
        if not email:
            logger.error(
                message="Email not found in Cognito claims",
                context={'operation': 'create_profile'},
                user_id=user_id
            )
            return sanitized_error_response(
                status_code=400,
                user_message='Email is required for profile creation',
                event=_current_event
            )
        
        # Check if profile already exists
        existing = get_item(f'USER#{user_id}', 'PROFILE')
        if existing:
            logger.warning(
                message="Profile already exists",
                context={'operation': 'create_profile'},
                user_id=user_id
            )
            return handle_conflict(
                resource_type='Profile',
                event=_current_event,
                user_id=user_id
            )
        
        # Determine authentication methods from Cognito claims
        auth_methods = get_auth_methods_from_event(_current_event)
        
        # Create profile item
        timestamp = get_timestamp()
        profile_item = {
            'PK': f'USER#{user_id}',
            'SK': 'PROFILE',
            'GSI1PK': f'EMAIL#{email}',
            'GSI1SK': 'PROFILE',
            'entityType': 'PROFILE',
            'userId': user_id,
            'email': email,
            'firstName': profile_request.firstName,
            'lastName': profile_request.lastName,
            'awsBuilderHandle': profile_request.awsBuilderHandle,
            'linkedInUsername': profile_request.linkedInUsername,
            'githubUsername': profile_request.githubUsername,
            'authMethods': auth_methods,
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        # Store in DynamoDB
        put_item(profile_item)
        
        logger.info(
            message=f"Successfully created profile for {profile_request.firstName} {profile_request.lastName}",
            context={
                'first_name': profile_request.firstName,
                'last_name': profile_request.lastName,
                'email': email,
                'auth_methods': auth_methods
            },
            user_id=user_id
        )
        
        # Return cleaned profile
        profile_data = clean_dynamodb_item(profile_item)
        return success_response(profile_data, status_code=201, event=_current_event)
    
    except ValidationError as e:
        logger.warning(
            message="Validation error during profile creation",
            context={'operation': 'create_profile'},
            user_id=user_id
        )
        return handle_validation_error(
            validation_error=e,
            event=_current_event,
            user_id=user_id
        )
    
    except Exception as e:
        logger.error(
            message="Failed to create profile",
            error=e,
            context={'operation': 'create_profile'},
            user_id=user_id
        )
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=user_id,
            context={'operation': 'create_profile'}
        )


def update_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing user profile"""
    try:
        # Validate request data
        profile_request = UpdateProfileRequest(**data)
        
        # Check if profile exists
        existing = get_item(f'USER#{user_id}', 'PROFILE')
        if not existing:
            return handle_not_found(
                resource_type='Profile',
                event=_current_event,
                user_id=user_id
            )
        
        # Update profile
        timestamp = get_timestamp()
        updates = {
            'firstName': profile_request.firstName,
            'lastName': profile_request.lastName,
            'awsBuilderHandle': profile_request.awsBuilderHandle,
            'linkedInUsername': profile_request.linkedInUsername,
            'githubUsername': profile_request.githubUsername,
            'updatedAt': timestamp
        }
        
        updated_item = update_item(f'USER#{user_id}', 'PROFILE', updates)
        
        # Return cleaned profile
        profile_data = clean_dynamodb_item(updated_item)
        return success_response(profile_data, event=_current_event)
    
    except ValidationError as e:
        return handle_validation_error(
            validation_error=e,
            event=_current_event,
            user_id=user_id
        )
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=user_id,
            context={'operation': 'update_profile'}
        )


def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """Extract user ID from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    return claims.get('sub', '')


def get_email_from_event(event: Dict[str, Any]) -> str:
    """Extract email from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    return claims.get('email', '')


def get_auth_methods_from_event(event: Dict[str, Any]) -> list:
    """
    Extract authentication methods from Cognito authorizer context.
    
    Requirements: 1.4, 1.5, 5.3
    
    Returns:
        list: Authentication methods (e.g., ['google'], ['email'], ['google', 'email'])
    """
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    
    # Check for custom:auth_methods attribute
    auth_methods_str = claims.get('custom:auth_methods', '')
    
    if auth_methods_str:
        # Parse comma-separated string or JSON array
        if auth_methods_str.startswith('['):
            # JSON array format
            import json
            try:
                auth_methods = json.loads(auth_methods_str)
                return auth_methods if isinstance(auth_methods, list) else ['email']
            except json.JSONDecodeError:
                pass
        else:
            # Comma-separated format
            auth_methods = [method.strip() for method in auth_methods_str.split(',') if method.strip()]
            if auth_methods:
                return auth_methods
    
    # Check identity provider to determine auth method
    identities = claims.get('identities')
    if identities:
        # User authenticated via social provider (Google)
        return ['google']
    
    # Default to email for custom auth flow
    return ['email']


def get_linked_account_from_event(event: Dict[str, Any]) -> str:
    """
    Extract linked account user ID from Cognito authorizer context.
    
    Requirements: 2.3, 5.3
    
    When a user authenticates with OTP but has an existing Google account,
    the verify_auth_challenge Lambda stores the original user ID in the
    custom:linked_account attribute.
    
    Returns:
        str: Linked account user ID, or empty string if no linked account
    """
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    
    # Check for custom:linked_account attribute
    linked_account = claims.get('custom:linked_account', '')
    
    return linked_account if linked_account else ''


def check_profile_by_email(email: str) -> Dict[str, Any]:
    """
    Check if a profile exists for a given email address.
    
    Uses GSI1 to query profiles by email.
    Returns 404 if no profile found, otherwise returns the profile.
    """
    try:
        from shared.dynamodb_utils import query_profile_by_email
        
        logger.info(
            message="Checking for profile by email",
            context={'email': email}
        )
        
        profile = query_profile_by_email(email)
        
        if not profile:
            return handle_not_found(
                resource_type='Profile',
                event=_current_event
            )
        
        # Clean and return profile
        from shared.dynamodb_utils import clean_dynamodb_item
        profile_data = clean_dynamodb_item(profile)
        
        logger.info(
            message="Profile found by email",
            context={'email': email, 'user_id': profile_data.get('userId')}
        )
        
        return success_response(profile_data, event=_current_event)
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            context={'operation': 'check_profile_by_email', 'email': email}
        )


def migrate_user_applications(source_user_id: str, destination_user_id: str) -> Dict[str, Any]:
    """
    Migrate all applications from source user to destination user.
    
    This function:
    1. Queries all applications owned by source user
    2. Updates userId and GSI1PK to point to destination user
    3. Returns migration results
    
    Args:
        source_user_id: The user ID to migrate applications from
        destination_user_id: The user ID to migrate applications to
        
    Returns:
        dict: {'success': bool, 'apps_reassigned': int, 'message': str}
    """
    try:
        from datetime import datetime, timezone
        import boto3
        
        # Get DynamoDB table
        dynamodb = boto3.resource('dynamodb')
        table_name = os.environ.get('TABLE_NAME')
        table = dynamodb.Table(table_name)
        
        # Query all applications by source user using GSI1
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :user_key',
            ExpressionAttributeValues={
                ':user_key': f'USER#{source_user_id}'
            }
        )
        
        applications = response.get('Items', [])
        
        # Filter to only APPLICATION entities
        applications = [
            app for app in applications 
            if app.get('entityType') == 'APPLICATION'
        ]
        
        if not applications:
            logger.info(
                message="No applications to migrate",
                context={
                    'source_user_id': source_user_id,
                    'destination_user_id': destination_user_id
                },
                user_id=source_user_id
            )
            return {
                'success': True,
                'apps_reassigned': 0,
                'message': 'No applications to migrate'
            }
        
        # Update each application
        timestamp = datetime.now(timezone.utc).isoformat()
        apps_reassigned = 0
        
        for app in applications:
            try:
                app_name = app.get('name', 'Unknown')
                app_id = app.get('appId', 'Unknown')
                
                # Update userId and GSI1PK to point to destination user
                table.update_item(
                    Key={
                        'PK': app['PK'],
                        'SK': app['SK']
                    },
                    UpdateExpression='SET userId = :new_user_id, GSI1PK = :new_gsi1pk, updatedAt = :updated',
                    ExpressionAttributeValues={
                        ':new_user_id': destination_user_id,
                        ':new_gsi1pk': f'USER#{destination_user_id}',
                        ':updated': timestamp
                    }
                )
                apps_reassigned += 1
                
                logger.info(
                    message=f"Migrated application: {app_name}",
                    context={
                        'app_id': app_id,
                        'app_name': app_name,
                        'from_user': source_user_id,
                        'to_user': destination_user_id
                    },
                    user_id=source_user_id
                )
                
            except Exception as app_error:
                logger.error(
                    message=f"Failed to migrate application: {app.get('name', 'Unknown')}",
                    error=app_error,
                    context={
                        'app_id': app.get('appId'),
                        'from_user': source_user_id,
                        'to_user': destination_user_id
                    },
                    user_id=source_user_id
                )
                # Continue with other applications
        
        logger.info(
            message=f"Application migration completed: {apps_reassigned} applications migrated",
            context={
                'source_user_id': source_user_id,
                'destination_user_id': destination_user_id,
                'apps_reassigned': apps_reassigned,
                'total_apps_found': len(applications)
            },
            user_id=source_user_id
        )
        
        return {
            'success': True,
            'apps_reassigned': apps_reassigned,
            'message': f'Successfully migrated {apps_reassigned} applications'
        }
        
    except Exception as e:
        logger.error(
            message="Failed to migrate applications",
            error=e,
            context={
                'source_user_id': source_user_id,
                'destination_user_id': destination_user_id
            },
            user_id=source_user_id
        )
        return {
            'success': False,
            'apps_reassigned': 0,
            'message': f'Failed to migrate applications: {str(e)}'
        }


def link_accounts(current_user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Link current user account to an existing profile.
    
    This function:
    1. Validates the existing profile exists
    2. Migrates applications from current user to existing user
    3. Updates Cognito user attributes to link accounts
    4. Updates the existing profile's authMethods
    5. Returns the linked profile
    """
    try:
        import boto3
        from datetime import datetime, timezone
        
        existing_user_id = data.get('existingUserId')
        if not existing_user_id:
            return sanitized_error_response(
                status_code=400,
                user_message='Missing existingUserId parameter',
                event=_current_event
            )
        
        logger.info(
            message="Linking accounts",
            context={
                'current_user_id': current_user_id,
                'existing_user_id': existing_user_id
            },
            user_id=current_user_id
        )
        
        # Get existing profile
        existing_profile = get_item(f'USER#{existing_user_id}', 'PROFILE')
        if not existing_profile:
            return handle_not_found(
                resource_type='Profile',
                event=_current_event,
                user_id=existing_user_id
            )
        
        # Get current user's auth method
        current_auth_methods = get_auth_methods_from_event(_current_event)
        
        # Merge auth methods
        existing_auth_methods = existing_profile.get('authMethods', [])
        merged_auth_methods = list(set(existing_auth_methods + current_auth_methods))
        
        # Migrate applications from current user to existing user
        apps_migration_result = migrate_user_applications(current_user_id, existing_user_id)
        
        # Update existing profile with merged auth methods
        timestamp = get_timestamp()
        update_item(
            f'USER#{existing_user_id}',
            'PROFILE',
            {
                'authMethods': merged_auth_methods,
                'updatedAt': timestamp
            }
        )
        
        # Update Cognito user attributes to link accounts
        cognito = boto3.client('cognito-idp')
        user_pool_id = os.environ.get('USER_POOL_ID')
        
        try:
            # Update current user's custom:linked_account attribute
            cognito.admin_update_user_attributes(
                UserPoolId=user_pool_id,
                Username=current_user_id,
                UserAttributes=[
                    {
                        'Name': 'custom:linked_account',
                        'Value': existing_user_id
                    }
                ]
            )
            
            logger.info(
                message="Successfully linked accounts and migrated applications",
                context={
                    'current_user_id': current_user_id,
                    'existing_user_id': existing_user_id,
                    'merged_auth_methods': merged_auth_methods,
                    'apps_migrated': apps_migration_result.get('apps_reassigned', 0)
                },
                user_id=current_user_id
            )
        except Exception as cognito_error:
            logger.error(
                message="Failed to update Cognito attributes",
                error=cognito_error,
                context={
                    'current_user_id': current_user_id,
                    'existing_user_id': existing_user_id
                },
                user_id=current_user_id
            )
            # Continue anyway - the profile is updated
        
        # Return the linked profile
        updated_profile = get_item(f'USER#{existing_user_id}', 'PROFILE')
        profile_data = clean_dynamodb_item(updated_profile)
        
        return success_response(profile_data, event=_current_event)
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=current_user_id,
            context={'operation': 'link_accounts'}
        )
