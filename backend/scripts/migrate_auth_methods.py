"""
Migration script to backfill existing profiles with authMethods field and update GSI1 keys
This script:
1. Scans all user profiles in DynamoDB
2. Adds authMethods: ['google'] to profiles that don't have it
3. Updates GSI1PK to EMAIL#<email> format for email lookups
4. Adds email field if missing (from Cognito)
"""
import os
import sys
import boto3
from typing import Dict, Any, List
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.logger import get_logger

logger = get_logger(__name__)


def get_table_name() -> str:
    """Get DynamoDB table name from environment or use default"""
    return os.environ.get('TABLE_NAME', 'MadeWithKiro-dev')


def get_cognito_user_email(user_pool_id: str, user_id: str) -> str:
    """Get user email from Cognito User Pool"""
    try:
        cognito = boto3.client('cognito-idp')
        response = cognito.admin_get_user(
            UserPoolId=user_pool_id,
            Username=user_id
        )
        
        # Extract email from user attributes
        for attr in response.get('UserAttributes', []):
            if attr['Name'] == 'email':
                return attr['Value']
        
        logger.warning(f"Email not found for user {user_id}")
        return ''
    except Exception as e:
        logger.error(f"Failed to get email for user {user_id}: {str(e)}")
        return ''


def scan_profiles(table_name: str) -> List[Dict[str, Any]]:
    """Scan DynamoDB table for all user profiles"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)
    
    profiles = []
    scan_kwargs = {
        'FilterExpression': 'SK = :sk',
        'ExpressionAttributeValues': {':sk': 'PROFILE'}
    }
    
    logger.info("Scanning for user profiles...")
    
    try:
        done = False
        start_key = None
        
        while not done:
            if start_key:
                scan_kwargs['ExclusiveStartKey'] = start_key
            
            response = table.scan(**scan_kwargs)
            profiles.extend(response.get('Items', []))
            
            start_key = response.get('LastEvaluatedKey', None)
            done = start_key is None
        
        logger.info(f"Found {len(profiles)} profiles")
        return profiles
    
    except Exception as e:
        logger.error(f"Failed to scan profiles: {str(e)}")
        raise


def update_profile(table_name: str, profile: Dict[str, Any], user_pool_id: str, dry_run: bool = False) -> bool:
    """Update a single profile with authMethods and email"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)
    
    pk = profile['PK']
    sk = profile['SK']
    user_id = profile.get('userId', pk.replace('USER#', ''))
    
    # Check what needs to be updated
    needs_auth_methods = 'authMethods' not in profile
    needs_email = 'email' not in profile
    needs_gsi_update = not profile.get('GSI1PK', '').startswith('EMAIL#')
    
    if not (needs_auth_methods or needs_email or needs_gsi_update):
        logger.info(f"Profile {user_id} already up to date")
        return False
    
    # Get email if needed
    email = profile.get('email', '')
    if needs_email or needs_gsi_update:
        if not email:
            email = get_cognito_user_email(user_pool_id, user_id)
            if not email:
                logger.warning(f"Cannot update profile {user_id} - email not found")
                return False
    
    # Prepare update expression
    update_parts = []
    expression_values = {}
    expression_names = {}
    
    if needs_auth_methods:
        update_parts.append('#authMethods = :authMethods')
        expression_values[':authMethods'] = ['google']
        expression_names['#authMethods'] = 'authMethods'
        logger.info(f"Adding authMethods to profile {user_id}")
    
    if needs_email:
        update_parts.append('#email = :email')
        expression_values[':email'] = email
        expression_names['#email'] = 'email'
        logger.info(f"Adding email to profile {user_id}")
    
    if needs_gsi_update:
        update_parts.append('GSI1PK = :gsi1pk')
        expression_values[':gsi1pk'] = f'EMAIL#{email}'
        logger.info(f"Updating GSI1PK for profile {user_id}")
    
    # Always update updatedAt
    update_parts.append('updatedAt = :updatedAt')
    expression_values[':updatedAt'] = datetime.utcnow().isoformat() + 'Z'
    
    update_expression = 'SET ' + ', '.join(update_parts)
    
    if dry_run:
        logger.info(f"[DRY RUN] Would update profile {user_id}")
        logger.info(f"[DRY RUN] Update expression: {update_expression}")
        logger.info(f"[DRY RUN] Values: {expression_values}")
        return True
    
    try:
        table.update_item(
            Key={'PK': pk, 'SK': sk},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names if expression_names else None
        )
        logger.info(f"Successfully updated profile {user_id}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to update profile {user_id}: {str(e)}")
        return False


def migrate_profiles(dry_run: bool = False):
    """Main migration function"""
    table_name = get_table_name()
    user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
    
    if not user_pool_id:
        logger.error("COGNITO_USER_POOL_ID environment variable not set")
        sys.exit(1)
    
    logger.info(f"Starting migration for table: {table_name}")
    logger.info(f"User Pool ID: {user_pool_id}")
    logger.info(f"Dry run: {dry_run}")
    
    # Scan for all profiles
    profiles = scan_profiles(table_name)
    
    if not profiles:
        logger.info("No profiles found to migrate")
        return
    
    # Update each profile
    updated_count = 0
    failed_count = 0
    
    for profile in profiles:
        try:
            if update_profile(table_name, profile, user_pool_id, dry_run):
                updated_count += 1
        except Exception as e:
            logger.error(f"Error updating profile: {str(e)}")
            failed_count += 1
    
    logger.info(f"Migration complete!")
    logger.info(f"Total profiles: {len(profiles)}")
    logger.info(f"Updated: {updated_count}")
    logger.info(f"Failed: {failed_count}")
    logger.info(f"Already up to date: {len(profiles) - updated_count - failed_count}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate user profiles to add authMethods field')
    parser.add_argument('--dry-run', action='store_true', help='Run without making changes')
    parser.add_argument('--table', help='DynamoDB table name (overrides TABLE_NAME env var)')
    parser.add_argument('--user-pool', help='Cognito User Pool ID (overrides COGNITO_USER_POOL_ID env var)')
    
    args = parser.parse_args()
    
    # Override environment variables if provided
    if args.table:
        os.environ['TABLE_NAME'] = args.table
    if args.user_pool:
        os.environ['COGNITO_USER_POOL_ID'] = args.user_pool
    
    migrate_profiles(dry_run=args.dry_run)
