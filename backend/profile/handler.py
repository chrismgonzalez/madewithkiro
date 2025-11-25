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
        if http_method == 'GET':
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
            # Create new profile
            body = json.loads(event.get('body', '{}'))
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return handle_unauthorized(event=event)
            
            return create_profile(user_id, body)
        
        elif http_method == 'PUT':
            # Update existing profile
            body = json.loads(event.get('body', '{}'))
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return handle_unauthorized(event=event)
            
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
    """Get user profile by ID"""
    try:
        item = get_item(f'USER#{user_id}', 'PROFILE')
        
        if not item:
            return handle_not_found(
                resource_type='Profile',
                event=_current_event,
                user_id=user_id
            )
        
        # Clean and return profile
        profile_data = clean_dynamodb_item(item)
        return success_response(profile_data, event=_current_event)
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=user_id,
            context={'operation': 'get_profile', 'user_id': user_id}
        )


def create_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new user profile"""
    try:
        logger.info(
            message="Creating new profile",
            context={'operation': 'create_profile'},
            user_id=user_id
        )
        
        # Validate request data
        profile_request = CreateProfileRequest(**data)
        
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
        
        # Create profile item
        timestamp = get_timestamp()
        profile_item = {
            'PK': f'USER#{user_id}',
            'SK': 'PROFILE',
            'GSI1PK': 'PROFILE',
            'GSI1SK': f'USER#{user_id}',
            'entityType': 'PROFILE',
            'userId': user_id,
            'firstName': profile_request.firstName,
            'lastName': profile_request.lastName,
            'awsBuilderHandle': profile_request.awsBuilderHandle,
            'linkedInUsername': profile_request.linkedInUsername,
            'githubUsername': profile_request.githubUsername,
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        # Store in DynamoDB
        put_item(profile_item)
        
        logger.info(
            message=f"Successfully created profile for {profile_request.firstName} {profile_request.lastName}",
            context={
                'first_name': profile_request.firstName,
                'last_name': profile_request.lastName
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
