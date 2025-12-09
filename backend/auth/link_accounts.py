"""
Link Accounts Lambda Handler

API endpoint for user-confirmed account linking at the Cognito level.
Executes AdminLinkProviderForUser to merge Google and Email OTP identities.

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
"""
import json
import os
from typing import Dict, Any, Optional

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
    Lambda handler for account linking API endpoint.
    
    POST /auth/link-accounts
    
    Requirements: 7.1, 7.2
    
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
        
        # Extract request context
        request_id = event.get('requestContext', {}).get('requestId')
        
        logger.info(
            "Link accounts API invoked",
            context={'request_id': request_id}
        )
        
        # Validate JWT token and extract user sub (Requirements 7.2)
        current_user_sub, current_user_email, email_verified = _extract_user_from_token(event)
        
        if not current_user_sub:
            return _error_response(
                status_code=401,
                error_code='UNAUTHORIZED',
                message='Missing or invalid authentication token',
                event=event
            )
        
        # Parse request body
        body = _parse_request_body(event)
        if not body:
            return _error_response(
                status_code=400,
                error_code='INVALID_REQUEST',
                message='Invalid or missing request body',
                event=event
            )
        
        target_user_sub = body.get('targetUserSub')
        confirm_link = body.get('confirmLink')
        
        # Validate required fields
        if not target_user_sub:
            return _error_response(
                status_code=400,
                error_code='INVALID_REQUEST',
                message='Missing targetUserSub parameter',
                event=event
            )
        
        if not confirm_link:
            return _error_response(
                status_code=400,
                error_code='INVALID_REQUEST',
                message='User must confirm account linking',
                event=event
            )
        
        # Verify current user's email is verified (Requirements 11.1, 11.2, 11.3, 11.4)
        if not email_verified:
            logger.warning(
                "Account linking rejected: current user email not verified",
                context={
                    'current_user_sub': current_user_sub,
                    'email': _mask_email(current_user_email)
                }
            )
            return _error_response(
                status_code=403,
                error_code='EMAIL_NOT_VERIFIED',
                message='Email address must be verified before linking accounts',
                event=event
            )
        
        # Get target user information and verify email
        target_user_info = _get_user_info(target_user_sub)
        if not target_user_info:
            return _error_response(
                status_code=404,
                error_code='USER_NOT_FOUND',
                message='Target user not found',
                event=event
            )
        
        if not target_user_info['email_verified']:
            logger.warning(
                "Account linking rejected: target user email not verified",
                context={
                    'target_user_sub': target_user_sub,
                    'email': _mask_email(target_user_info['email'])
                }
            )
            return _error_response(
                status_code=403,
                error_code='EMAIL_NOT_VERIFIED',
                message='Target user email must be verified before linking accounts',
                event=event
            )
        
        logger.info(
            "Account linking request validated",
            context={
                'current_user_sub': current_user_sub,
                'target_user_sub': target_user_sub,
                'email': _mask_email(current_user_email)
            }
        )
        
        # Determine link direction and execute linking (Requirements 2.2, 7.3, 7.4)
        current_user_info = {
            'sub': current_user_sub,
            'email': current_user_email,
            'email_verified': email_verified,
            'identities': event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('identities')
        }
        
        link_result = _execute_account_linking(
            current_user_info,
            target_user_info,
            event
        )
        
        if not link_result['success']:
            return _error_response(
                status_code=link_result.get('status_code', 500),
                error_code='LINK_FAILED',
                message=link_result.get('message', 'Account linking failed'),
                event=event
            )
        
        # Merge profiles (Requirements 5.4, 7.5)
        merge_result = _merge_profiles(current_user_sub, target_user_sub)
        
        if not merge_result['success']:
            return _error_response(
                status_code=500,
                error_code='PROFILE_MERGE_FAILED',
                message='Account linking succeeded but profile merge failed',
                event=event
            )
        
        # Delete pending link record to clear custom claims from future tokens
        _delete_pending_link(current_user_sub)
        
        # Return success
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': json.dumps({
                'success': True,
                'message': 'Accounts linked successfully',
                'linkedIdentities': link_result.get('linked_identities', [])
            })
        }
        
    except Exception as e:
        logger.error(f"Error in link accounts handler: {str(e)}", error=e)
        return _error_response(
            status_code=500,
            error_code='INTERNAL_ERROR',
            message='An unexpected error occurred',
            event=event
        )


def _extract_user_from_token(event: Dict[str, Any]) -> tuple[Optional[str], Optional[str], bool]:
    """
    Extract user information from JWT token via API Gateway authorizer.
    
    Requirements: 7.2
    
    Args:
        event: API Gateway event
        
    Returns:
        tuple: (user_sub, email, email_verified)
    """
    try:
        # Check for Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None, None, False
        
        # Extract claims from authorizer context (API Gateway validates JWT)
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        
        if not claims:
            # No authorizer context means token validation failed
            return None, None, False
        
        user_sub = claims.get('sub')
        email = claims.get('email')
        email_verified = claims.get('email_verified') == 'true'
        
        return user_sub, email, email_verified
        
    except Exception as e:
        logger.error(f"Error extracting user from token: {str(e)}", error=e)
        return None, None, False


def _parse_request_body(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parse and validate request body.
    
    Args:
        event: API Gateway event
        
    Returns:
        dict: Parsed body or None if invalid
    """
    try:
        body = event.get('body')
        if not body:
            return None
        
        return json.loads(body)
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request body: {str(e)}")
        return None


def _error_response(
    status_code: int,
    error_code: str,
    message: str,
    event: Dict[str, Any],
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create error response.
    
    Args:
        status_code: HTTP status code
        error_code: Error code
        message: Error message
        event: API Gateway event
        details: Optional error details
        
    Returns:
        dict: API Gateway response
    """
    error_body = {
        'success': False,
        'error': {
            'code': error_code,
            'message': message
        }
    }
    
    if details:
        error_body['error']['details'] = details
    
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(event),
        'body': json.dumps(error_body)
    }


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



def _get_user_info(user_sub: str) -> Optional[Dict[str, Any]]:
    """
    Get user information from Cognito.
    
    Args:
        user_sub: User's Cognito sub
        
    Returns:
        dict: User info with email and email_verified, or None if not found
    """
    try:
        response = cognito_client.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=user_sub
        )
        
        # Extract attributes
        attributes = {attr['Name']: attr['Value'] for attr in response.get('UserAttributes', [])}
        
        return {
            'sub': user_sub,
            'username': response.get('Username'),
            'email': attributes.get('email'),
            'email_verified': attributes.get('email_verified') == 'true',
            'identities': attributes.get('identities')
        }
        
    except ClientError as e:
        logger.error(f"Error getting user info: {str(e)}", error=e)
        return None


def _execute_account_linking(
    current_user: Dict[str, Any],
    target_user: Dict[str, Any],
    event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute account linking using AdminLinkProviderForUser.
    
    Determines link direction (Google->OTP or OTP->Google) and calls appropriate APIs.
    
    Requirements: 2.2, 7.3, 7.4
    
    Args:
        current_user: Current user info
        target_user: Target user info
        event: API Gateway event
        
    Returns:
        dict: {'success': bool, 'message': str, 'linked_identities': list}
    """
    try:
        # Determine if users are Google or OTP
        current_is_google = current_user.get('identities') is not None
        target_is_google = target_user.get('identities') is not None
        
        # Determine link direction
        if current_is_google and not target_is_google:
            # Google -> OTP: Link Google identity to OTP user (Requirements 7.3)
            return _link_google_to_otp(current_user, target_user)
        elif not current_is_google and target_is_google:
            # OTP -> Google: Link OTP identity to Google user (Requirements 7.4)
            return _link_otp_to_google(current_user, target_user)
        else:
            # Both same type - shouldn't happen but handle gracefully
            logger.warning(
                "Account linking attempted between same identity types",
                context={
                    'current_is_google': current_is_google,
                    'target_is_google': target_is_google
                }
            )
            return {
                'success': False,
                'status_code': 400,
                'message': 'Cannot link accounts of the same type'
            }
            
    except ClientError as e:
        logger.error(
            f"Cognito API error during account linking: {str(e)}",
            error=e,
            context={
                'error_code': e.response.get('Error', {}).get('Code'),
                'current_user_sub': current_user.get('sub'),
                'target_user_sub': target_user.get('sub')
            }
        )
        return {
            'success': False,
            'status_code': 500,
            'message': f"Account linking failed: {e.response.get('Error', {}).get('Message', 'Unknown error')}"
        }
    except Exception as e:
        logger.error(f"Unexpected error during account linking: {str(e)}", error=e)
        return {
            'success': False,
            'status_code': 500,
            'message': 'An unexpected error occurred during account linking'
        }


def _link_google_to_otp(
    google_user: Dict[str, Any],
    otp_user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Link Google identity to OTP user.
    
    Requirements: 2.2, 7.3
    
    Args:
        google_user: Google user info (source)
        otp_user: OTP user info (destination)
        
    Returns:
        dict: Result with success status
    """
    try:
        # Call AdminLinkProviderForUser
        cognito_client.admin_link_provider_for_user(
            UserPoolId=USER_POOL_ID,
            DestinationUser={
                'ProviderName': 'Cognito',
                'ProviderAttributeValue': otp_user['sub']
            },
            SourceUser={
                'ProviderName': 'Google',
                'ProviderAttributeName': 'Cognito_Subject',
                'ProviderAttributeValue': google_user['sub']
            }
        )
        
        logger.info(
            "Successfully linked Google identity to OTP user",
            context={
                'google_sub': google_user['sub'],
                'otp_sub': otp_user['sub'],
                'email': _mask_email(google_user['email'])
            }
        )
        
        return {
            'success': True,
            'linked_identities': [
                {'provider': 'Google', 'userId': google_user['sub']},
                {'provider': 'Cognito', 'userId': otp_user['sub']}
            ]
        }
        
    except ClientError as e:
        raise


def _link_otp_to_google(
    otp_user: Dict[str, Any],
    google_user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Link OTP identity to Google user.
    
    Requires setting a password on the Google user first.
    
    Requirements: 2.2, 7.4
    
    Args:
        otp_user: OTP user info (source)
        google_user: Google user info (destination)
        
    Returns:
        dict: Result with success status
    """
    try:
        # Generate secure random password (Requirements 7.4)
        import secrets
        import string
        
        alphabet = string.ascii_letters + string.digits + string.punctuation
        password = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        # Set password on Google user to enable password auth
        cognito_client.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=google_user['username'],
            Password=password,
            Permanent=True
        )
        
        logger.info(
            "Set password on Google user for OTP linking",
            context={
                'google_sub': google_user['sub'],
                'email': _mask_email(google_user['email'])
            }
        )
        
        # Now link the identities
        cognito_client.admin_link_provider_for_user(
            UserPoolId=USER_POOL_ID,
            DestinationUser={
                'ProviderName': 'Google',
                'ProviderAttributeValue': google_user['sub']
            },
            SourceUser={
                'ProviderName': 'Cognito',
                'ProviderAttributeName': 'Cognito_Subject',
                'ProviderAttributeValue': otp_user['sub']
            }
        )
        
        logger.info(
            "Successfully linked OTP identity to Google user",
            context={
                'otp_sub': otp_user['sub'],
                'google_sub': google_user['sub'],
                'email': _mask_email(otp_user['email'])
            }
        )
        
        return {
            'success': True,
            'linked_identities': [
                {'provider': 'Cognito', 'userId': otp_user['sub']},
                {'provider': 'Google', 'userId': google_user['sub']}
            ]
        }
        
    except ClientError as e:
        raise


def _merge_profiles(
    source_user_sub: str,
    destination_user_sub: str
) -> Dict[str, Any]:
    """
    Merge DynamoDB profiles after successful account linking.
    
    Requirements: 5.4, 7.5
    
    Args:
        source_user_sub: Source user's Cognito sub
        destination_user_sub: Destination user's Cognito sub
        
    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        # Get both profiles
        source_profile = table.get_item(
            Key={
                'PK': f'USER#{source_user_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')
        
        destination_profile = table.get_item(
            Key={
                'PK': f'USER#{destination_user_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')
        
        if not destination_profile:
            logger.error(
                "Destination profile not found during merge",
                context={'destination_sub': destination_user_sub}
            )
            return {
                'success': False,
                'message': 'Destination profile not found'
            }
        
        # Merge authMethods (Requirements 5.4)
        source_auth_methods = source_profile.get('authMethods', []) if source_profile else []
        dest_auth_methods = destination_profile.get('authMethods', [])
        
        # Combine and deduplicate
        merged_auth_methods = list(set(source_auth_methods + dest_auth_methods))
        
        # Update destination profile with merged authMethods (Requirements 7.5)
        from datetime import datetime, timezone
        
        table.update_item(
            Key={
                'PK': f'USER#{destination_user_sub}',
                'SK': 'PROFILE'
            },
            UpdateExpression='SET authMethods = :methods, updatedAt = :updated',
            ExpressionAttributeValues={
                ':methods': merged_auth_methods,
                ':updated': datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(
            "Updated destination profile with merged authMethods",
            context={
                'destination_sub': destination_user_sub,
                'merged_auth_methods': merged_auth_methods
            }
        )
        
        # Delete source profile if it exists
        if source_profile:
            table.delete_item(
                Key={
                    'PK': f'USER#{source_user_sub}',
                    'SK': 'PROFILE'
                }
            )
            
            logger.info(
                "Deleted source profile after merge",
                context={'source_sub': source_user_sub}
            )
        
        return {
            'success': True,
            'message': 'Profiles merged successfully'
        }
        
    except ClientError as e:
        logger.error(
            f"DynamoDB error during profile merge: {str(e)}",
            error=e,
            context={
                'source_sub': source_user_sub,
                'destination_sub': destination_user_sub
            }
        )
        return {
            'success': False,
            'message': f"Profile merge failed: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Unexpected error during profile merge: {str(e)}", error=e)
        return {
            'success': False,
            'message': 'An unexpected error occurred during profile merge'
        }


def _delete_pending_link(user_sub: str) -> None:
    """
    Delete pending link record from DynamoDB.
    
    This clears the PENDING_LINK record so that PreTokenGeneration
    won't add custom:pending_link claims to future tokens.
    
    Args:
        user_sub: User's Cognito sub
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        table.delete_item(
            Key={
                'PK': f'USER#{user_sub}',
                'SK': 'PENDING_LINK'
            }
        )
        
        logger.info(
            "Deleted pending link record",
            context={'user_sub': user_sub}
        )
        
    except ClientError as e:
        logger.error(
            f"Error deleting pending link: {str(e)}",
            error=e,
            context={'user_sub': user_sub}
        )
        # Don't fail the linking if we can't delete the record
        # The record will expire after 24 hours anyway
