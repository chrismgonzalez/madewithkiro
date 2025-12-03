"""
Test script to verify GSI1 email lookups work correctly
This script tests:
1. Querying GSI1 by email to find existing profiles
2. Duplicate email detection across authentication methods
"""
import os
import sys
import boto3
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from shared.logger import get_logger

logger = get_logger(__name__)


def get_table_name() -> str:
    """Get DynamoDB table name from environment or use default"""
    return os.environ.get('TABLE_NAME', 'MadeWithKiro-dev')


def query_profile_by_email(table_name: str, email: str) -> List[Dict[str, Any]]:
    """Query GSI1 to find profiles by email"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)
    
    logger.info(f"Querying GSI1 for email: {email}")
    
    try:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
            ExpressionAttributeValues={
                ':gsi1pk': f'EMAIL#{email}',
                ':gsi1sk': 'PROFILE'
            }
        )
        
        items = response.get('Items', [])
        logger.info(f"Found {len(items)} profile(s) for email {email}")
        
        return items
    
    except Exception as e:
        logger.error(f"Failed to query GSI1: {str(e)}")
        raise


def test_duplicate_detection(table_name: str, test_email: str):
    """Test duplicate email detection"""
    logger.info(f"Testing duplicate detection for email: {test_email}")
    
    profiles = query_profile_by_email(table_name, test_email)
    
    if not profiles:
        logger.info(f"✓ No existing profile found for {test_email} (can create new)")
        return True
    
    if len(profiles) == 1:
        profile = profiles[0]
        logger.info(f"✓ Found existing profile:")
        logger.info(f"  User ID: {profile.get('userId')}")
        logger.info(f"  Name: {profile.get('firstName')} {profile.get('lastName')}")
        logger.info(f"  Auth Methods: {profile.get('authMethods', [])}")
        logger.info(f"  Email: {profile.get('email')}")
        return True
    
    if len(profiles) > 1:
        logger.warning(f"⚠ Found {len(profiles)} profiles with same email (should not happen):")
        for i, profile in enumerate(profiles):
            logger.warning(f"  Profile {i+1}: User ID {profile.get('userId')}, Auth Methods: {profile.get('authMethods', [])}")
        return False
    
    return True


def test_gsi1_structure(table_name: str):
    """Test that GSI1 is properly configured"""
    dynamodb = boto3.client('dynamodb')
    
    logger.info(f"Checking GSI1 configuration for table: {table_name}")
    
    try:
        response = dynamodb.describe_table(TableName=table_name)
        table_info = response['Table']
        
        # Check for GSI1
        gsis = table_info.get('GlobalSecondaryIndexes', [])
        gsi1 = None
        
        for gsi in gsis:
            if gsi['IndexName'] == 'GSI1':
                gsi1 = gsi
                break
        
        if not gsi1:
            logger.error("✗ GSI1 not found in table")
            return False
        
        logger.info("✓ GSI1 found")
        
        # Check key schema
        key_schema = gsi1['KeySchema']
        has_gsi1pk = any(k['AttributeName'] == 'GSI1PK' and k['KeyType'] == 'HASH' for k in key_schema)
        has_gsi1sk = any(k['AttributeName'] == 'GSI1SK' and k['KeyType'] == 'RANGE' for k in key_schema)
        
        if has_gsi1pk and has_gsi1sk:
            logger.info("✓ GSI1 has correct key schema (GSI1PK, GSI1SK)")
        else:
            logger.error("✗ GSI1 key schema is incorrect")
            return False
        
        # Check projection
        projection = gsi1.get('Projection', {})
        projection_type = projection.get('ProjectionType')
        
        if projection_type == 'ALL':
            logger.info("✓ GSI1 projects all attributes")
        else:
            logger.warning(f"⚠ GSI1 projection type: {projection_type}")
        
        # Check status
        status = gsi1.get('IndexStatus')
        if status == 'ACTIVE':
            logger.info("✓ GSI1 is ACTIVE")
        else:
            logger.warning(f"⚠ GSI1 status: {status}")
        
        return True
    
    except Exception as e:
        logger.error(f"Failed to check GSI1 configuration: {str(e)}")
        return False


def run_tests(test_email: str = None):
    """Run all GSI1 tests"""
    table_name = get_table_name()
    
    logger.info("=" * 60)
    logger.info("GSI1 Email Lookup Test Suite")
    logger.info("=" * 60)
    logger.info(f"Table: {table_name}")
    logger.info("")
    
    # Test 1: Check GSI1 structure
    logger.info("Test 1: Verify GSI1 Configuration")
    logger.info("-" * 60)
    if not test_gsi1_structure(table_name):
        logger.error("GSI1 configuration test failed")
        return False
    logger.info("")
    
    # Test 2: Test duplicate detection
    if test_email:
        logger.info("Test 2: Test Duplicate Email Detection")
        logger.info("-" * 60)
        if not test_duplicate_detection(table_name, test_email):
            logger.error("Duplicate detection test failed")
            return False
        logger.info("")
    else:
        logger.info("Test 2: Skipped (no test email provided)")
        logger.info("")
    
    logger.info("=" * 60)
    logger.info("All tests passed! ✓")
    logger.info("=" * 60)
    return True


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Test GSI1 email lookup functionality')
    parser.add_argument('--table', help='DynamoDB table name (overrides TABLE_NAME env var)')
    parser.add_argument('--email', help='Test email address for duplicate detection')
    
    args = parser.parse_args()
    
    # Override environment variables if provided
    if args.table:
        os.environ['TABLE_NAME'] = args.table
    
    success = run_tests(test_email=args.email)
    sys.exit(0 if success else 1)
