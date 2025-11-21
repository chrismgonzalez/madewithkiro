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
    
    http_method = event.get('httpMethod')
    path_parameters = event.get('pathParameters') or {}
    query_parameters = event.get('queryStringParameters') or {}
    app_id = path_parameters.get('appId')
    
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
            # For POC: Get userId from body instead of Cognito
            user_id = body.get('userId') or get_user_id_from_event(event)
            
            if not user_id:
                return error_response(401, 'Unauthorized - userId required')
            
            return create_application(user_id, body)
        
        elif http_method == 'PUT':
            # Update application
            if not app_id:
                return error_response(400, 'Application ID required')
            
            body = json.loads(event.get('body', '{}'))
            # For POC: Get userId from body instead of Cognito
            user_id = body.get('userId') or get_user_id_from_event(event)
            
            if not user_id:
                return error_response(401, 'Unauthorized - userId required')
            
            return update_application(app_id, user_id, body)
        
        elif http_method == 'DELETE':
            # Delete application
            if not app_id:
                return error_response(400, 'Application ID required')
            
            # For POC: Get userId from query params instead of Cognito
            user_id = query_parameters.get('userId') or get_user_id_from_event(event)
            
            if not user_id:
                return error_response(401, 'Unauthorized - userId required')
            
            return delete_application(app_id, user_id)
        
        else:
            return error_response(405, f'Method {http_method} not allowed')
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, 'Internal server error')


def list_all_applications() -> Dict[str, Any]:
    """List all applications (public)"""
    try:
        # Scan for all applications
        items = scan_by_entity_type('APPLICATION')
        
        # Clean and format applications
        applications = [clean_dynamodb_item(item) for item in items]
        
        return success_response(applications)
    
    except Exception as e:
        print(f"Error listing applications: {str(e)}")
        return error_response(500, 'Error listing applications')


def list_user_applications(user_id: str) -> Dict[str, Any]:
    """List applications for a specific user"""
    try:
        # Query GSI for user's applications
        items = query_gsi('GSI1', f'USER#{user_id}', 'APP#')
        
        # Clean and format applications
        applications = [clean_dynamodb_item(item) for item in items]
        
        return success_response(applications)
    
    except Exception as e:
        print(f"Error listing user applications: {str(e)}")
        return error_response(500, 'Error listing user applications')


def create_application(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new application"""
    try:
        # Validate request data
        app_request = CreateApplicationRequest(**data)
        
        # Get user profile for userName
        user_profile = get_item(f'USER#{user_id}', 'PROFILE')
        if not user_profile:
            return error_response(404, 'User profile not found. Please create a profile first.')
        
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
        
        # Return cleaned application
        app_data = clean_dynamodb_item(app_item)
        return success_response(app_data, 201)
    
    except ValidationError as e:
        print(f"Validation error: {str(e)}")
        errors = {}
        for error in e.errors():
            field = '.'.join(str(loc) for loc in error['loc'])
            errors[field] = error['msg']
        return error_response(400, 'Validation failed', errors)
    
    except Exception as e:
        print(f"Error creating application: {str(e)}")
        return error_response(500, 'Error creating application')


def get_application(app_id: str) -> Dict[str, Any]:
    """Get a single application by ID"""
    try:
        # Get application from DynamoDB
        app_item = get_item(f'APP#{app_id}', 'METADATA')
        
        if not app_item:
            return error_response(404, 'Application not found')
        
        # Clean and return application
        app_data = clean_dynamodb_item(app_item)
        return success_response(app_data)
    
    except Exception as e:
        print(f"Error getting application: {str(e)}")
        return error_response(500, 'Error getting application')


def update_application(app_id: str, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing application"""
    try:
        # Get existing application
        app_item = get_item(f'APP#{app_id}', 'METADATA')
        
        if not app_item:
            return error_response(404, 'Application not found')
        
        # Check ownership
        if app_item.get('userId') != user_id:
            return error_response(403, 'You do not have permission to update this application')
        
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
        return success_response(app_data)
    
    except ValidationError as e:
        print(f"Validation error: {str(e)}")
        errors = {}
        for error in e.errors():
            field = '.'.join(str(loc) for loc in error['loc'])
            errors[field] = error['msg']
        return error_response(400, 'Validation failed', errors)
    
    except Exception as e:
        print(f"Error updating application: {str(e)}")
        return error_response(500, 'Error updating application')


def delete_application(app_id: str, user_id: str) -> Dict[str, Any]:
    """Delete an application"""
    try:
        # Get existing application
        app_item = get_item(f'APP#{app_id}', 'METADATA')
        
        if not app_item:
            return error_response(404, 'Application not found')
        
        # Check ownership
        if app_item.get('userId') != user_id:
            return error_response(403, 'You do not have permission to delete this application')
        
        # Delete from DynamoDB
        from shared.dynamodb_utils import delete_item
        delete_item(f'APP#{app_id}', 'METADATA')
        
        return success_response({'message': 'Application deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting application: {str(e)}")
        return error_response(500, 'Error deleting application')


def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """Extract user ID from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    return claims.get('sub', '')





def success_response(data: Any, status_code: int = 200) -> Dict[str, Any]:
    """Return a successful API response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps({
            'data': data,
            'error': None
        })
    }


def error_response(status_code: int, message: str, details: Dict[str, Any] = None) -> Dict[str, Any]:
    """Return an error API response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps({
            'data': None,
            'error': {
                'code': f'ERROR_{status_code}',
                'message': message,
                'details': details
            }
        })
    }
