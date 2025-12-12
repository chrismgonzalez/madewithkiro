"""
Tests for PostAuthentication Lambda Trigger

Tests duplicate detection, custom attribute setting, and error handling
for the Cognito PostAuthentication trigger.

Requirements: 3.1, 3.2, 3.3
"""
import json
import sys
import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from auth.post_authentication import (
    lambda_handler,
    handle_otp_user_profile,
    find_profile_by_email,
    detect_duplicate_accounts,
    update_profile_auth_methods,
    create_new_profile
)


@pytest.fixture
def mock_dynamodb():
    """Mock DynamoDB resource"""
    with patch('auth.post_authentication.dynamodb') as mock:
        yield mock


@pytest.fixture
def mock_cognito_client():
    """Mock Cognito client"""
    with patch('auth.post_authentication.cognito_client') as mock:
        yield mock


@pytest.fixture
def post_auth_event_otp():
    """Sample PostAuthentication event for OTP user"""
    return {
        'version': '1',
        'region': 'us-east-1',
        'userPoolId': 'us-east-1_TEST123',
        'userName': 'test-user-sub-123',
        'triggerSource': 'PostAuthentication_Authentication',
        'request': {
            'userAttributes': {
                'sub': 'test-user-sub-123',
                'email': 'test@example.com',
                'email_verified': 'true'
            }
        },
        'response': {}
    }


@pytest.fixture
def post_auth_event_google():
    """Sample PostAuthentication event for Google user"""
    return {
        'version': '1',
        'region': 'us-east-1',
        'userPoolId': 'us-east-1_TEST123',
        'userName': 'Google_123456789',
        'triggerSource': 'PostAuthentication_Authentication',
        'request': {
            'userAttributes': {
                'sub': 'google-user-sub-456',
                'email': 'test@example.com',
                'email_verified': 'true',
                'identities': '[{"providerName":"Google","userId":"123456789"}]'
            }
        },
        'response': {}
    }


class TestPostAuthenticationDuplicateDetection:
    """Test duplicate account detection logic - Requirements 3.1, 3.2"""
    
    def test_detect_duplicate_with_same_email_different_subs(self, mock_dynamodb):
        """Test duplicate detection when same email has different Cognito subs"""
        # Setup: Mock DynamoDB to return two profiles with same email, different subs
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': 'USER#sub-123',
                    'SK': 'PROFILE',
                    'userId': 'sub-123',
                    'email': 'test@example.com',
                    'authMethods': ['google']
                },
                {
                    'PK': 'USER#sub-456',
                    'SK': 'PROFILE',
                    'userId': 'sub-456',
                    'email': 'test@example.com',
                    'authMethods': ['email']
                }
            ]
        }
        
        # Execute: Detect duplicates for current user sub-456
        result = detect_duplicate_accounts('test@example.com', 'sub-456')
        
        # Verify: Should detect duplicate (sub-123)
        assert result is not None
        assert result['hasDuplicate'] is True
        assert result['targetUserSub'] == 'sub-123'
    
    def test_no_duplicate_with_same_email_same_sub(self, mock_dynamodb):
        """Test no duplicate when same email has same Cognito sub (same user)"""
        # Setup: Mock DynamoDB to return one profile
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': 'USER#sub-123',
                    'SK': 'PROFILE',
                    'userId': 'sub-123',
                    'email': 'test@example.com',
                    'authMethods': ['google', 'email']
                }
            ]
        }
        
        # Execute: Check for duplicates with same sub
        result = detect_duplicate_accounts('test@example.com', 'sub-123')
        
        # Verify: Should not detect duplicate (same user)
        assert result is not None
        assert result['hasDuplicate'] is False
        assert result['targetUserSub'] is None
    
    def test_no_duplicate_with_no_existing_profiles(self, mock_dynamodb):
        """Test no duplicate when no existing profiles found"""
        # Setup: Mock DynamoDB to return empty result
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.query.return_value = {
            'Items': []
        }
        
        # Execute: Check for duplicates
        result = detect_duplicate_accounts('newuser@example.com', 'sub-789')
        
        # Verify: Should not detect duplicate
        assert result is not None
        assert result['hasDuplicate'] is False
        assert result['targetUserSub'] is None
    
    def test_duplicate_detection_with_multiple_profiles(self, mock_dynamodb):
        """Test duplicate detection returns first other user when multiple exist"""
        # Setup: Mock DynamoDB to return three profiles with same email
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': 'USER#sub-111',
                    'SK': 'PROFILE',
                    'userId': 'sub-111',
                    'email': 'test@example.com',
                    'authMethods': ['google']
                },
                {
                    'PK': 'USER#sub-222',
                    'SK': 'PROFILE',
                    'userId': 'sub-222',
                    'email': 'test@example.com',
                    'authMethods': ['email']
                },
                {
                    'PK': 'USER#sub-333',
                    'SK': 'PROFILE',
                    'userId': 'sub-333',
                    'email': 'test@example.com',
                    'authMethods': ['email']
                }
            ]
        }
        
        # Execute: Detect duplicates for sub-333
        result = detect_duplicate_accounts('test@example.com', 'sub-333')
        
        # Verify: Should detect duplicate and return first other user
        assert result is not None
        assert result['hasDuplicate'] is True
        assert result['targetUserSub'] in ['sub-111', 'sub-222']


class TestPostAuthenticationCustomAttributes:
    """Test custom attribute setting when duplicates found - Requirements 3.3"""
    
    def test_set_custom_attributes_when_duplicate_found(self, post_auth_event_otp, mock_dynamodb):
        """Test that custom attributes are set when duplicate is detected"""
        # Setup: Mock duplicate detection
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Return duplicate profile
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': 'USER#existing-sub',
                    'SK': 'PROFILE',
                    'userId': 'existing-sub',
                    'email': 'test@example.com',
                    'authMethods': ['google']
                }
            ]
        }
        
        # Execute: Call lambda handler
        result = lambda_handler(post_auth_event_otp, None)
        
        # Verify: Response should include custom claims
        assert 'response' in result
        assert 'claimsOverrideDetails' in result['response']
        claims = result['response']['claimsOverrideDetails']['claimsToAddOrOverride']
        assert claims['custom:pending_link'] == 'true'
        assert claims['custom:link_target_sub'] == 'existing-sub'
    
    def test_no_custom_attributes_when_no_duplicate(self, post_auth_event_otp, mock_dynamodb):
        """Test that custom attributes are not set when no duplicate exists"""
        # Setup: Mock no duplicate
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.query.return_value = {
            'Items': []
        }
        
        # Execute: Call lambda handler
        result = lambda_handler(post_auth_event_otp, None)
        
        # Verify: Response should not include custom claims
        assert 'response' in result
        # Either no claimsOverrideDetails or empty
        if 'claimsOverrideDetails' in result['response']:
            claims = result['response']['claimsOverrideDetails'].get('claimsToAddOrOverride', {})
            assert 'custom:pending_link' not in claims
    
    def test_custom_attributes_include_target_sub(self, post_auth_event_otp, mock_dynamodb):
        """Test that custom:link_target_sub contains the correct duplicate user sub"""
        # Setup: Mock duplicate detection
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        target_sub = 'target-user-sub-999'
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': f'USER#{target_sub}',
                    'SK': 'PROFILE',
                    'userId': target_sub,
                    'email': 'test@example.com',
                    'authMethods': ['google']
                }
            ]
        }
        
        # Execute: Call lambda handler
        result = lambda_handler(post_auth_event_otp, None)
        
        # Verify: custom:link_target_sub should match target sub
        claims = result['response']['claimsOverrideDetails']['claimsToAddOrOverride']
        assert claims['custom:link_target_sub'] == target_sub


class TestPostAuthenticationErrorHandling:
    """Test error handling for DynamoDB failures - Requirements 3.1, 3.2, 3.3"""
    
    def test_dynamodb_query_failure_does_not_fail_authentication(self, post_auth_event_otp, mock_dynamodb):
        """Test that DynamoDB query failure doesn't prevent authentication"""
        # Setup: Mock DynamoDB to raise error
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.query.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'ServiceUnavailable',
                    'Message': 'Service temporarily unavailable'
                }
            },
            'Query'
        )
        
        # Execute: Call lambda handler
        result = lambda_handler(post_auth_event_otp, None)
        
        # Verify: Should return event without failing
        assert result is not None
        assert result['triggerSource'] == 'PostAuthentication_Authentication'
        # Authentication should succeed even if duplicate detection fails
    
    def test_dynamodb_put_failure_does_not_fail_authentication(self, post_auth_event_otp, mock_dynamodb):
        """Test that DynamoDB put failure doesn't prevent authentication"""
        # Setup: Mock DynamoDB query success but put failure
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # No existing profiles
        mock_table.query.return_value = {'Items': []}
        
        # Put fails
        mock_table.put_item.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'ProvisionedThroughputExceededException',
                    'Message': 'Throughput exceeded'
                }
            },
            'PutItem'
        )
        
        # Execute: Call lambda handler
        result = lambda_handler(post_auth_event_otp, None)
        
        # Verify: Should return event without failing
        assert result is not None
        assert result['triggerSource'] == 'PostAuthentication_Authentication'
    
    def test_missing_email_attribute_handled_gracefully(self, mock_dynamodb):
        """Test that missing email attribute is handled gracefully"""
        # Setup: Event without email
        event = {
            'version': '1',
            'region': 'us-east-1',
            'userPoolId': 'us-east-1_TEST123',
            'userName': 'test-user',
            'triggerSource': 'PostAuthentication_Authentication',
            'request': {
                'userAttributes': {
                    'sub': 'test-sub-123'
                    # Missing email
                }
            },
            'response': {}
        }
        
        # Execute: Call lambda handler
        result = lambda_handler(event, None)
        
        # Verify: Should return event without failing
        assert result is not None
        assert result['triggerSource'] == 'PostAuthentication_Authentication'
    
    def test_missing_sub_attribute_handled_gracefully(self, mock_dynamodb):
        """Test that missing sub attribute is handled gracefully"""
        # Setup: Event without sub
        event = {
            'version': '1',
            'region': 'us-east-1',
            'userPoolId': 'us-east-1_TEST123',
            'userName': 'test-user',
            'triggerSource': 'PostAuthentication_Authentication',
            'request': {
                'userAttributes': {
                    'email': 'test@example.com'
                    # Missing sub
                }
            },
            'response': {}
        }
        
        # Execute: Call lambda handler
        result = lambda_handler(event, None)
        
        # Verify: Should return event without failing
        assert result is not None
        assert result['triggerSource'] == 'PostAuthentication_Authentication'


class TestPostAuthenticationGoogleUserHandling:
    """Test that Google users are handled correctly"""
    
    def test_google_user_skips_duplicate_detection(self, post_auth_event_google, mock_dynamodb):
        """Test that Google users skip duplicate detection logic"""
        # Setup: Mock DynamoDB (should not be called)
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Execute: Call lambda handler with Google user
        result = lambda_handler(post_auth_event_google, None)
        
        # Verify: DynamoDB query should not be called for Google users
        mock_table.query.assert_not_called()
        
        # Verify: No custom attributes set
        assert 'response' in result
        if 'claimsOverrideDetails' in result['response']:
            claims = result['response']['claimsOverrideDetails'].get('claimsToAddOrOverride', {})
            assert 'custom:pending_link' not in claims


class TestProfileConsistencyValidation:
    """Test profile consistency checks - Requirements 5.1, 5.3"""
    
    def test_validate_single_profile_per_cognito_sub_with_one_profile(self, mock_dynamodb):
        """Test validation passes when exactly one profile exists for a Cognito sub"""
        # Setup: Mock DynamoDB to return one profile for the sub
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        user_sub = 'test-sub-123'
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': f'USER#{user_sub}',
                    'SK': 'PROFILE',
                    'userId': user_sub,
                    'email': 'test@example.com',
                    'authMethods': ['email']
                }
            ]
        }
        
        # Execute: Validate profile consistency
        from auth.post_authentication import validate_profile_consistency
        result = validate_profile_consistency(user_sub)
        
        # Verify: Should return True (valid - one profile)
        assert result is True
    
    def test_validate_single_profile_per_cognito_sub_with_multiple_profiles(self, mock_dynamodb):
        """Test validation fails when multiple profiles exist for same Cognito sub"""
        # Setup: Mock DynamoDB to return multiple profiles for the same sub
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        user_sub = 'test-sub-456'
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': f'USER#{user_sub}',
                    'SK': 'PROFILE',
                    'userId': user_sub,
                    'email': 'test1@example.com',
                    'authMethods': ['email']
                },
                {
                    'PK': f'USER#{user_sub}',
                    'SK': 'PROFILE',
                    'userId': user_sub,
                    'email': 'test2@example.com',
                    'authMethods': ['google']
                }
            ]
        }
        
        # Execute: Validate profile consistency
        from auth.post_authentication import validate_profile_consistency
        result = validate_profile_consistency(user_sub)
        
        # Verify: Should return False (invalid - multiple profiles)
        assert result is False
    
    def test_validate_single_profile_per_cognito_sub_with_no_profiles(self, mock_dynamodb):
        """Test validation passes when no profiles exist yet (new user)"""
        # Setup: Mock DynamoDB to return no profiles
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        user_sub = 'new-user-sub-789'
        mock_table.query.return_value = {
            'Items': []
        }
        
        # Execute: Validate profile consistency
        from auth.post_authentication import validate_profile_consistency
        result = validate_profile_consistency(user_sub)
        
        # Verify: Should return True (valid - no profiles yet is acceptable)
        assert result is True
    
    def test_warning_logged_when_multiple_profiles_found(self, mock_dynamodb, caplog):
        """Test that a warning is logged when multiple profiles are found for same sub"""
        # Setup: Mock DynamoDB to return multiple profiles
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        user_sub = 'test-sub-999'
        mock_table.query.return_value = {
            'Items': [
                {
                    'PK': f'USER#{user_sub}',
                    'SK': 'PROFILE',
                    'userId': user_sub,
                    'email': 'test1@example.com',
                    'authMethods': ['email']
                },
                {
                    'PK': f'USER#{user_sub}',
                    'SK': 'PROFILE',
                    'userId': user_sub,
                    'email': 'test2@example.com',
                    'authMethods': ['google']
                }
            ]
        }
        
        # Execute: Validate profile consistency
        import logging
        with caplog.at_level(logging.WARNING):
            from auth.post_authentication import validate_profile_consistency
            validate_profile_consistency(user_sub)
        
        # Verify: Warning should be logged
        assert any('multiple profiles' in record.message.lower() for record in caplog.records)
        assert any(user_sub in record.message for record in caplog.records)
    
    def test_profile_validation_handles_dynamodb_errors_gracefully(self, mock_dynamodb):
        """Test that profile validation handles DynamoDB errors without failing"""
        # Setup: Mock DynamoDB to raise error
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.query.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'ServiceUnavailable',
                    'Message': 'Service temporarily unavailable'
                }
            },
            'Query'
        )
        
        # Execute: Validate profile consistency
        from auth.post_authentication import validate_profile_consistency
        result = validate_profile_consistency('test-sub-error')
        
        # Verify: Should return True (assume valid on error to not block authentication)
        assert result is True

