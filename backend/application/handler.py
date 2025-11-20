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
    - POST /applications - Create application (authenticated)
    """
    
    http_method = event.get('httpMethod')
    query_parameters = event.get('queryStringParameters') or {}
    
    try:
        if http_method == 'GET':
            # List applications
            user_id = query_parameters.get('userId')
            
            if user_id:
                return list_user_applications(user_id)
            else:
                return list_all_applications()
        
        elif http_method == 'POST':
            # Create new application
            body = json.loads(event.get('body', '{}'))
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return error_response(401, 'Unauthorized')
            
            return create_application(user_id, body)
        
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
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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
