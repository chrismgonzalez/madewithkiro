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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for profile operations
    
    Routes:
    - GET /profile/{userId} - Get user profile (public)
    - POST /profile - Create profile (authenticated)
    - PUT /profile - Update profile (authenticated)
    """
    
    http_method = event.get('httpMethod')
    path_parameters = event.get('pathParameters') or {}
    
    try:
        if http_method == 'GET':
            # Get profile by userId
            user_id = path_parameters.get('userId')
            if not user_id:
                return error_response(400, 'Missing userId parameter')
            
            return get_profile(user_id)
        
        elif http_method == 'POST':
            # Create new profile
            body = json.loads(event.get('body', '{}'))
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return error_response(401, 'Unauthorized')
            
            return create_profile(user_id, body)
        
        elif http_method == 'PUT':
            # Update existing profile
            body = json.loads(event.get('body', '{}'))
            user_id = get_user_id_from_event(event)
            
            if not user_id:
                return error_response(401, 'Unauthorized')
            
            return update_profile(user_id, body)
        
        else:
            return error_response(405, f'Method {http_method} not allowed')
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, 'Internal server error')


def get_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile by ID"""
    try:
        item = get_item(f'USER#{user_id}', 'PROFILE')
        
        if not item:
            return error_response(404, 'Profile not found')
        
        # Clean and return profile
        profile_data = clean_dynamodb_item(item)
        return success_response(profile_data)
    
    except Exception as e:
        print(f"Error getting profile: {str(e)}")
        return error_response(500, 'Error retrieving profile')


def create_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new user profile"""
    try:
        # Validate request data
        profile_request = CreateProfileRequest(**data)
        
        # Check if profile already exists
        existing = get_item(f'USER#{user_id}', 'PROFILE')
        if existing:
            return error_response(409, 'Profile already exists')
        
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
        
        # Return cleaned profile
        profile_data = clean_dynamodb_item(profile_item)
        return success_response(profile_data, 201)
    
    except ValidationError as e:
        print(f"Validation error: {str(e)}")
        errors = {}
        for error in e.errors():
            field = '.'.join(str(loc) for loc in error['loc'])
            errors[field] = error['msg']
        return error_response(400, 'Validation failed', errors)
    
    except Exception as e:
        print(f"Error creating profile: {str(e)}")
        return error_response(500, 'Error creating profile')


def update_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing user profile"""
    try:
        # Validate request data
        profile_request = UpdateProfileRequest(**data)
        
        # Check if profile exists
        existing = get_item(f'USER#{user_id}', 'PROFILE')
        if not existing:
            return error_response(404, 'Profile not found')
        
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
        return success_response(profile_data)
    
    except ValidationError as e:
        print(f"Validation error: {str(e)}")
        errors = {}
        for error in e.errors():
            field = '.'.join(str(loc) for loc in error['loc'])
            errors[field] = error['msg']
        return error_response(400, 'Validation failed', errors)
    
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        return error_response(500, 'Error updating profile')


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
            'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
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
            'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
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
