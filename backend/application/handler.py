"""
Application Lambda Handler
Handles application operations: create, list, query
"""
import json
import os
import boto3
from datetime import datetime
from typing import Dict, Any, List

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME')
table = dynamodb.Table(table_name) if table_name else None


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
    # Placeholder implementation
    return success_response([])


def list_user_applications(user_id: str) -> Dict[str, Any]:
    """List applications for a specific user"""
    # Placeholder implementation
    return success_response([])


def create_application(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new application"""
    # Placeholder implementation
    return error_response(501, 'Not implemented yet')


def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """Extract user ID from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    return claims.get('sub', '')


def format_application(item: Dict[str, Any]) -> Dict[str, Any]:
    """Format DynamoDB item to application response"""
    return {
        'appId': item.get('appId'),
        'userId': item.get('userId'),
        'userName': item.get('userName', ''),
        'name': item.get('name'),
        'description': item.get('description'),
        'appUrl': item.get('appUrl'),
        'githubUrl': item.get('githubUrl'),
        'tags': item.get('tags', []),
        'createdAt': item.get('createdAt')
    }


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
