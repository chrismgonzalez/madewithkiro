"""
Application Lambda Handler
Handles application operations: create, list, query
"""
import json
import os
import uuid
from typing import Dict, Any, List
from pydantic import ValidationError

# Import shared modules
from shared.models import CreateApplicationRequest, Application
from shared.dynamodb_utils import (
    get_item,
    put_item,
    query_gsi,
    scan_by_entity_type,
    get_timestamp,
    clean_dynamodb_item
)
from shared.error_handler import (
    success_response,
    sanitized_error_response,
    handle_validation_error,
    handle_not_found,
    handle_unauthorized,
    handle_forbidden,
    handle_internal_error,
    ErrorCode
)
from shared.logger import get_logger


# Initialize structured logger
logger = get_logger(__name__)


# Store event globally for response functions
_current_event = None


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for application operations
    
    Routes:
    - GET /applications - List all applications (public)
    - GET /applications?userId={userId} - List user's applications (public)
    - GET /applications/{appId} - Get single application (public)
    - POST /applications - Create application (authenticated)
    - PUT /applications/{appId} - Update application (authenticated, owner only)
    - DELETE /applications/{appId} - Delete application (authenticated, owner only)
    """
    global _current_event
    _current_event = event
    
    http_method = event.get('httpMethod')
    path_parameters = event.get('pathParameters') or {}
    query_parameters = event.get('queryStringParameters') or {}
    app_id = path_parameters.get('appId')
    request_id = event.get('requestContext', {}).get('requestId')
    
    # Log incoming request
    logger.info(
        message=f"Application handler invoked: {http_method} {event.get('path')}",
        context={
            'http_method': http_method,
            'path': event.get('path'),
            'app_id': app_id
        },
        request_id=request_id
    )
    
    try:
        if http_method == 'GET':
            if app_id:
                # Get single application
                return get_application(app_id)
            else:
                # List applications
                user_id = query_parameters.get('userId')
                
                if user_id:
                    return list_user_applications(user_id)
                else:
                    return list_all_applications()
        
        elif http_method == 'POST':
            # Create new application
            body = json.loads(event.get('body', '{}'))
            # Get userId from Cognito claims
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return handle_unauthorized(
                    message='Authentication required',
                    event=event
                )
            
            return create_application(user_id, body)
        
        elif http_method == 'PUT':
            # Update application
            if not app_id:
                return sanitized_error_response(
                    status_code=400,
                    user_message='Application ID required',
                    event=event
                )
            
            body = json.loads(event.get('body', '{}'))
            # Get userId from Cognito claims
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return handle_unauthorized(
                    message='Authentication required',
                    event=event
                )
            
            return update_application(app_id, user_id, body)
        
        elif http_method == 'DELETE':
            # Delete application
            if not app_id:
                return sanitized_error_response(
                    status_code=400,
                    user_message='Application ID required',
                    event=event
                )
            
            # Get userId from Cognito claims
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return handle_unauthorized(
                    message='Authentication required',
                    event=event
                )
            
            return delete_application(app_id, user_id)
        
        else:
            return sanitized_error_response(
                status_code=405,
                user_message=f'Method {http_method} not allowed',
                error_code=ErrorCode.METHOD_NOT_ALLOWED,
                event=event
            )
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=event,
            context={'http_method': http_method, 'path': event.get('path')}
        )


def list_all_applications() -> Dict[str, Any]:
    """List all applications (public)"""
    try:
        logger.debug(
            message="Listing all applications",
            context={'operation': 'list_all_applications'}
        )
        
        # Scan for all applications
        items = scan_by_entity_type('APPLICATION')
        
        # Clean and format applications
        applications = [clean_dynamodb_item(item) for item in items]
        
        logger.info(
            message=f"Successfully listed {len(applications)} applications",
            context={'count': len(applications)}
        )
        
        return success_response(applications, event=_current_event)
    
    except Exception as e:
        logger.error(
            message="Failed to list all applications",
            error=e,
            context={'operation': 'list_all_applications'}
        )
        return handle_internal_error(
            error=e,
            event=_current_event,
            context={'operation': 'list_all_applications'}
        )


def list_user_applications(user_id: str) -> Dict[str, Any]:
    """List applications for a specific user"""
    try:
        # Query GSI for user's applications
        items = query_gsi('GSI1', f'USER#{user_id}', 'APP#')
        
        # Clean and format applications
        applications = [clean_dynamodb_item(item) for item in items]
        
        return success_response(applications, event=_current_event)
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=user_id,
            context={'operation': 'list_user_applications', 'user_id': user_id}
        )


def create_application(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new application"""
    try:
        logger.info(
            message="Creating new application",
            context={'operation': 'create_application'},
            user_id=user_id
        )
        
        # Validate request data
        app_request = CreateApplicationRequest(**data)
        
        # Get user profile for userName
        user_profile = get_item(f'USER#{user_id}', 'PROFILE')
        if not user_profile:
            logger.warning(
                message="User profile not found during application creation",
                context={'operation': 'create_application'},
                user_id=user_id
            )
            return handle_not_found(
                resource_type='User profile',
                event=_current_event,
                user_id=user_id
            )
        
        user_name = f"{user_profile.get('firstName', '')} {user_profile.get('lastName', '')}".strip()
        
        # Generate application ID
        app_id = str(uuid.uuid4())
        timestamp = get_timestamp()
        
        # Create application item
        app_item = {
            'PK': f'APP#{app_id}',
            'SK': 'METADATA',
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'APP#{timestamp}#{app_id}',
            'entityType': 'APPLICATION',
            'appId': app_id,
            'userId': user_id,
            'userName': user_name,
            'name': app_request.name,
            'description': app_request.description,
            'appUrl': str(app_request.appUrl),
            'githubUrl': str(app_request.githubUrl) if app_request.githubUrl else None,
            'tags': app_request.tags,
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        # Store in DynamoDB
        put_item(app_item)
        
        logger.info(
            message=f"Successfully created application: {app_request.name}",
            context={
                'app_id': app_id,
                'app_name': app_request.name
            },
            user_id=user_id
        )
        
        # Return cleaned application
        app_data = clean_dynamodb_item(app_item)
        return success_response(app_data, status_code=201, event=_current_event)
    
    except ValidationError as e:
        logger.warning(
            message="Validation error during application creation",
            context={'operation': 'create_application'},
            user_id=user_id
        )
        return handle_validation_error(
            validation_error=e,
            event=_current_event,
            user_id=user_id
        )
    
    except Exception as e:
        logger.error(
            message="Failed to create application",
            error=e,
            context={'operation': 'create_application'},
            user_id=user_id
        )
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=user_id,
            context={'operation': 'create_application'}
        )


def get_application(app_id: str) -> Dict[str, Any]:
    """Get a single application by ID"""
    try:
        # Get application from DynamoDB
        app_item = get_item(f'APP#{app_id}', 'METADATA')
        
        if not app_item:
            return handle_not_found(
                resource_type='Application',
                event=_current_event
            )
        
        # Clean and return application
        app_data = clean_dynamodb_item(app_item)
        return success_response(app_data, event=_current_event)
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            context={'operation': 'get_application', 'app_id': app_id}
        )


def update_application(app_id: str, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing application"""
    try:
        # Get existing application
        app_item = get_item(f'APP#{app_id}', 'METADATA')
        
        if not app_item:
            return handle_not_found(
                resource_type='Application',
                event=_current_event,
                user_id=user_id
            )
        
        # Check ownership
        if app_item.get('userId') != user_id:
            return handle_forbidden(
                message='You do not have permission to update this application.',
                event=_current_event,
                user_id=user_id
            )
        
        # Validate request data (partial update)
        app_request = CreateApplicationRequest(**data)
        
        # Update fields
        timestamp = get_timestamp()
        app_item.update({
            'name': app_request.name,
            'description': app_request.description,
            'appUrl': str(app_request.appUrl),
            'githubUrl': str(app_request.githubUrl) if app_request.githubUrl else None,
            'tags': app_request.tags,
            'updatedAt': timestamp
        })
        
        # Save to DynamoDB
        put_item(app_item)
        
        # Return cleaned application
        app_data = clean_dynamodb_item(app_item)
        return success_response(app_data, event=_current_event)
    
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
            context={'operation': 'update_application', 'app_id': app_id}
        )


def delete_application(app_id: str, user_id: str) -> Dict[str, Any]:
    """Delete an application"""
    try:
        # Get existing application
        app_item = get_item(f'APP#{app_id}', 'METADATA')
        
        if not app_item:
            return handle_not_found(
                resource_type='Application',
                event=_current_event,
                user_id=user_id
            )
        
        # Check ownership
        if app_item.get('userId') != user_id:
            return handle_forbidden(
                message='You do not have permission to delete this application.',
                event=_current_event,
                user_id=user_id
            )
        
        # Delete from DynamoDB
        from shared.dynamodb_utils import delete_item
        delete_item(f'APP#{app_id}', 'METADATA')
        
        return success_response(
            {'message': 'Application deleted successfully'},
            event=_current_event
        )
    
    except Exception as e:
        return handle_internal_error(
            error=e,
            event=_current_event,
            user_id=user_id,
            context={'operation': 'delete_application', 'app_id': app_id}
        )


def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """Extract user ID from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    return claims.get('sub', '')
