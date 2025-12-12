"""
PreTokenGeneration Lambda Handler

Cognito trigger that runs before generating JWT tokens.
Adds custom claims for account linking based on PENDING_LINK records.

Requirements: Account linking user confirmation
"""

import os
from typing import Dict, Any

import boto3
from botocore.exceptions import ClientError

from shared.logger import get_logger

logger = get_logger(__name__)

# AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PreTokenGeneration Lambda handler for Cognito.
    
    This function is triggered before JWT token generation.
    It checks for pending account links and adds custom claims to the token.
    
    Args:
        event: Cognito PreTokenGeneration event
        context: Lambda context
        
    Returns:
        dict: Modified event with custom claims
    """
    try:
        trigger_source = event.get('triggerSource')
        user_sub = event['request']['userAttributes'].get('sub')
        
        logger.info(
            f"PreTokenGeneration triggered",
            context={
                'trigger_source': trigger_source,
                'user_sub': user_sub
            }
        )
        
        # Check for pending link in DynamoDB
        pending_link = get_pending_link(user_sub)
        
        if pending_link:
            google_username = pending_link.get('googleUsername')
            
            logger.info(
                f"Adding pending link claims to token",
                context={
                    'user_sub': user_sub,
                    'google_username': google_username
                }
            )
            
            # Add custom claims to the token
            if 'response' not in event:
                event['response'] = {}
            
            event['response']['claimsOverrideDetails'] = {
                'claimsToAddOrOverride': {
                    'custom:pending_link': 'true',
                    'custom:link_google_user': google_username
                }
            }
        
        return event
        
    except Exception as e:
        logger.error(f"Error in PreTokenGeneration: {str(e)}", error=e)
        # Don't fail token generation on error
        return event


def get_pending_link(user_sub: str) -> Dict[str, Any] | None:
    """
    Get pending link info from DynamoDB.
    
    Args:
        user_sub: User's Cognito sub
        
    Returns:
        dict: Pending link info if found, None otherwise
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        response = table.get_item(
            Key={
                'PK': f'USER#{user_sub}',
                'SK': 'PENDING_LINK'
            }
        )
        
        item = response.get('Item')
        
        if item:
            # Check if expired
            from datetime import datetime, timezone
            expires_at = item.get('expiresAt')
            if expires_at:
                expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_dt:
                    logger.info(f"Pending link expired for user {user_sub}")
                    # Delete expired record
                    table.delete_item(
                        Key={
                            'PK': f'USER#{user_sub}',
                            'SK': 'PENDING_LINK'
                        }
                    )
                    return None
            
            return item
        
        return None
        
    except ClientError as e:
        logger.error(f"Error getting pending link: {str(e)}", error=e)
        return None
