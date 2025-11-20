"""
Profile Lambda Handler
Handles profile operations: create, read, update
"""
import json
import os
import boto3
from datetime import datetime
from typing import Dict, Any

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME')
table = dynamodb.Table(table_name) if table_name else None


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
        response = table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE'
            }
        )
        
        item = response.get('Item')
        if not item:
            return error_response(404, 'Profile not found')
        
        return success_response(format_profile(item))
    
    except Exception as e:
        print(f"Error getting profile: {str(e)}")
        return error_response(500, 'Error retrieving profile')


def create_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new user profile"""
    # Placeholder implementation
    return error_response(501, 'Not implemented yet')


def update_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing user profile"""
    # Placeholder implementation
    return error_response(501, 'Not implemented yet')


def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """Extract user ID from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    return claims.get('sub', '')


def format_profile(item: Dict[str, Any]) -> Dict[str, Any]:
    """Format DynamoDB item to profile response"""
    return {
        'userId': item.get('userId'),
        'firstName': item.get('firstName'),
        'lastName': item.get('lastName'),
        'awsBuilderHandle': item.get('awsBuilderHandle'),
        'linkedInUsername': item.get('linkedInUsername'),
        'githubUsername': item.get('githubUsername'),
        'createdAt': item.get('createdAt'),
        'updatedAt': item.get('updatedAt')
    }


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
