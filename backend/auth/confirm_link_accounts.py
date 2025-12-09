"""
Confirm Link Accounts Lambda Handler

API endpoint for user-confirmed account linking.
Executes the link only after explicit user confirmation.

Requirements: User consent, security
"""
import json
import os
from typing import Dict, Any

import boto3
from botocore.exceptions import ClientError

from shared.logger import get_logger
from shared.cors_utils import get_cors_headers

logger = get_logger(__name__)

# AWS clients
dynamodb = boto3.resource('dynamodb')
cognito_client = boto3.client('cognito-idp')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')
USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID') or os.environ.get('USER_POOL_ID')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for confirming account linking.
    
    POST /auth/confirm-link
    
    Body: {
        "confirm": true
    }
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        dict: API Gateway response
    """
    try:
        # Handle OPTIONS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': get_cors_headers(event),
                'body': ''
            }
        
        # Extract user from JWT token
        user_sub, email = _extract_user_from_token(event)
        
        if not user_sub:
            return _error_response(
                status_code=401,
                error_code='UNAUTHORIZED',
                message='Missing or invalid authentication token',
                event=event
            )
        
        # Parse request body
        body = _parse_request_body(event)
        if not body or not body.get('confirm'):
            return _error_response(
                status_code=400,
                error_code='INVALID_REQUEST',
                message='User must confirm account linking',
                event=event
            )
        
        # Get pending link info from DynamoDB
        pending_link = _get_pending_link(user_sub)
        
        if not pending_link:
            return _error_response(
                status_code=404,
                error_code='NO_PENDING_LINK',
                message='No pending account link found',
                event=event
            )
        
        google_username = pending_link.get('googleUsername')
        google_sub = pending_link.get('googleSub')
        
        # For OTP users, the username is the email address
        # We already have it from the token
        otp_username = email
        
        if not otp_username:
            return _error_response(
                status_code=500,
                error_code='USER_NOT_FOUND',
                message='Could not find user information',
                event=event
            )
        
        logger.info(
            f"User confirmed account linking",
            context={
                'user_sub': user_sub,
                'google_username': google_username
            }
        )
        
        # Execute the account linking
        link_result = _link_google_to_otp_user(
            google_username,
            google_sub,
            otp_username,
            USER_POOL_ID
        )
        
        if not link_result['success']:
            return _error_response(
                status_code=500,
                error_code='LINK_FAILED',
                message=link_result.get('message', 'Account linking failed'),
                event=event
            )
        
        # Merge profiles in DynamoDB
        _merge_profiles(google_username, user_sub)
        
        # Delete pending link record
        _delete_pending_link(user_sub)
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': json.dumps({
                'success': True,
                'message': 'Accounts linked successfully'
            })
        }
        
    except Exception as e:
        logger.error(f"Error in confirm link handler: {str(e)}", error=e)
        return _error_response(
            status_code=500,
            error_code='INTERNAL_ERROR',
            message='An unexpected error occurred',
            event=event
        )


def _extract_user_from_token(event: Dict[str, Any]) -> tuple:
    """Extract user sub and email from JWT token."""
    try:
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        
        user_sub = claims.get('sub')
        email = claims.get('email')
        
        return user_sub, email
        
    except Exception as e:
        logger.error(f"Error extracting user from token: {str(e)}", error=e)
        return None, None


def _parse_request_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse request body."""
    try:
        body = event.get('body')
        if not body:
            return None
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def _get_pending_link(user_sub: str) -> Dict[str, Any]:
    """Get pending link info from DynamoDB."""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        response = table.get_item(
            Key={
                'PK': f'USER#{user_sub}',
                'SK': 'PENDING_LINK'
            }
        )
        
        return response.get('Item')
        
    except ClientError as e:
        logger.error(f"Error getting pending link: {str(e)}", error=e)
        return None


def _get_user_username(user_sub: str) -> str:
    """Get user's Cognito username."""
    try:
        response = cognito_client.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=user_sub
        )
        
        return response.get('Username')
        
    except ClientError as e:
        logger.error(f"Error getting user username: {str(e)}", error=e)
        return None


def _link_google_to_otp_user(
    google_username: str,
    google_sub: str,
    otp_username: str,
    user_pool_id: str
) -> Dict[str, Any]:
    """Link Google identity to OTP user."""
    try:
        # Delete existing Google user profile
        logger.info(f"Deleting Google user profile: {google_username}")
        
        try:
            cognito_client.admin_delete_user(
                UserPoolId=user_pool_id,
                Username=google_username
            )
        except ClientError as delete_error:
            if delete_error.response.get('Error', {}).get('Code') != 'UserNotFoundException':
                raise
        
        # Link Google identity to OTP user
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
        
        # Ensure OTP user is in CONFIRMED status (not FORCE_CHANGE_PASSWORD)
        # This is required for both OTP and Google authentication to work
        try:
            import secrets
            import string
            
            # Generate a random permanent password
            alphabet = string.ascii_letters + string.digits + string.punctuation
            random_password = ''.join(secrets.choice(alphabet) for _ in range(32))
            
            cognito_client.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=otp_username,
                Password=random_password,
                Permanent=True
            )
            
            logger.info(f"Set permanent password on OTP user to ensure CONFIRMED status")
        except ClientError as pwd_error:
            # Log but don't fail - user might already be confirmed
            logger.warning(f"Could not set password: {pwd_error}")
        
        logger.info(f"Successfully linked Google to OTP user")
        
        return {'success': True, 'message': 'Linked successfully'}
        
    except ClientError as e:
        error_message = e.response.get('Error', {}).get('Message')
        logger.error(f"Cognito error: {error_message}", error=e)
        return {'success': False, 'message': error_message}


def _merge_profiles(google_username: str, otp_sub: str) -> None:
    """
    Merge Google and OTP profiles in DynamoDB.
    
    After account linking, the OTP user becomes the primary user.
    We need to find the Google user's profile (by email via GSI1) and either:
    1. If OTP profile exists: merge authMethods and keep OTP profile
    2. If OTP profile doesn't exist: copy Google profile to OTP user's key
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        from datetime import datetime, timezone
        
        # Get OTP profile
        otp_profile = table.get_item(
            Key={'PK': f'USER#{otp_sub}', 'SK': 'PROFILE'}
        ).get('Item')
        
        # Find Google profile by querying GSI1 with email
        # (We can't use google_username as PK because the profile was created with Google's Cognito sub)
        if otp_profile:
            email = otp_profile.get('email')
            
            # Query GSI1 to find all profiles with this email
            response = table.query(
                IndexName='GSI1',
                KeyConditionExpression='GSI1PK = :email_key',
                ExpressionAttributeValues={
                    ':email_key': f'EMAIL#{email}'
                }
            )
            
            profiles = response.get('Items', [])
            
            # Find the Google profile (not the OTP one)
            google_profile = None
            for profile in profiles:
                profile_user_id = profile.get('userId')
                if profile_user_id != otp_sub:
                    google_profile = profile
                    break
            
            if google_profile:
                # Merge authMethods
                google_methods = google_profile.get('authMethods', ['google'])
                otp_methods = otp_profile.get('authMethods', ['email'])
                merged_methods = list(set(google_methods + otp_methods))
                
                # Copy any additional data from Google profile that OTP profile doesn't have
                update_expression_parts = ['authMethods = :methods', 'updatedAt = :updated']
                expression_values = {
                    ':methods': merged_methods,
                    ':updated': datetime.now(timezone.utc).isoformat()
                }
                
                # Copy profile fields if they're empty in OTP profile
                if not otp_profile.get('firstName') and google_profile.get('firstName'):
                    update_expression_parts.append('firstName = :firstName')
                    expression_values[':firstName'] = google_profile['firstName']
                
                if not otp_profile.get('lastName') and google_profile.get('lastName'):
                    update_expression_parts.append('lastName = :lastName')
                    expression_values[':lastName'] = google_profile['lastName']
                
                if not otp_profile.get('awsBuilderHandle') and google_profile.get('awsBuilderHandle'):
                    update_expression_parts.append('awsBuilderHandle = :awsBuilderHandle')
                    expression_values[':awsBuilderHandle'] = google_profile['awsBuilderHandle']
                
                if not otp_profile.get('linkedInUsername') and google_profile.get('linkedInUsername'):
                    update_expression_parts.append('linkedInUsername = :linkedInUsername')
                    expression_values[':linkedInUsername'] = google_profile['linkedInUsername']
                
                if not otp_profile.get('githubUsername') and google_profile.get('githubUsername'):
                    update_expression_parts.append('githubUsername = :githubUsername')
                    expression_values[':githubUsername'] = google_profile['githubUsername']
                
                # Update OTP profile with merged data
                table.update_item(
                    Key={'PK': f'USER#{otp_sub}', 'SK': 'PROFILE'},
                    UpdateExpression='SET ' + ', '.join(update_expression_parts),
                    ExpressionAttributeValues=expression_values
                )
                
                # Delete old Google profile
                google_user_id = google_profile.get('userId')
                table.delete_item(
                    Key={'PK': f'USER#{google_user_id}', 'SK': 'PROFILE'}
                )
                
                logger.info(
                    f"Merged profiles successfully",
                    context={
                        'otp_sub': otp_sub,
                        'google_user_id': google_user_id,
                        'merged_methods': merged_methods
                    }
                )
            else:
                # No Google profile found, just update authMethods
                table.update_item(
                    Key={'PK': f'USER#{otp_sub}', 'SK': 'PROFILE'},
                    UpdateExpression='SET authMethods = :methods, updatedAt = :updated',
                    ExpressionAttributeValues={
                        ':methods': ['google', 'email'],
                        ':updated': datetime.now(timezone.utc).isoformat()
                    }
                )
                logger.info(f"No Google profile found, updated OTP profile authMethods")
        else:
            logger.warning(f"OTP profile not found for {otp_sub}, cannot merge")
            
    except ClientError as e:
        logger.error(f"Error merging profiles: {str(e)}", error=e)


def _delete_pending_link(user_sub: str) -> None:
    """Delete pending link record."""
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        table.delete_item(
            Key={
                'PK': f'USER#{user_sub}',
                'SK': 'PENDING_LINK'
            }
        )
        
        logger.info(f"Deleted pending link record")
        
    except ClientError as e:
        logger.error(f"Error deleting pending link: {str(e)}", error=e)


def _error_response(
    status_code: int,
    error_code: str,
    message: str,
    event: Dict[str, Any]
) -> Dict[str, Any]:
    """Create error response."""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(event),
        'body': json.dumps({
            'success': False,
            'error': {
                'code': error_code,
                'message': message
            }
        })
    }
