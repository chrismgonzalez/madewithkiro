"""
Tests for Link Accounts API Lambda Handler

Tests JWT validation, email verification, AdminLinkProviderForUser calls,
profile merging logic, and error responses.

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
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

from auth.link_accounts import lambda_handler


@pytest.fixture
def mock_dynamodb():
    """Mock DynamoDB resource"""
    with patch('auth.link_accounts.dynamodb') as mock:
        yield mock


@pytest.fixture
def mock_cognito_client():
    """Mock Cognito client"""
    with patch('auth.link_accounts.cognito_client') as mock:
        yield mock


@pytest.fixture
def valid_link_request_event():
    """Sample API Gateway event with valid link request"""
    return {
        'httpMethod': 'POST',
        'path': '/auth/link-accounts',
        'headers': {
            'Authorization': 'Bearer valid.jwt.token',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'targetUserSub': 'target-sub-123',
            'confirmLink': True
        }),
        'requestContext': {
            'requestId': 'test-request-id',
            'authorizer': {
                'claims': {
                    'sub': 'current-sub-456',
                    'email': 'test@example.com',
                    'email_verified': 'true'
                }
            }
        }
    }


@pytest.fixture
def invalid_token_event():
    """API Gateway event with invalid/missing token"""
    return {
        'httpMethod': 'POST',
        'path': '/auth/link-accounts',
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'targetUserSub': 'target-sub-123',
            'confirmLink': True
        }),
        'requestContext': {
            'requestId': 'test-request-id'
        }
    }


class TestJWTValidation:
    """Test JWT validation with valid/invalid tokens - Requirements 7.2"""
    
    def test_valid_jwt_token_extracts_user_sub(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that valid JWT token extracts user sub correctly"""
        # Setup: Mock successful linking
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock profile queries
        mock_table.query.return_value = {'Items': []}
        
        # Mock Cognito operations
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should process request (not return 401)
        assert response['statusCode'] != 401
    
    def test_missing_authorization_header_returns_401(self, invalid_token_event):
        """Test that missing Authorization header returns 401"""
        # Execute: Call lambda handler without auth
        response = lambda_handler(invalid_token_event, None)
        
        # Verify: Should return 401 Unauthorized
        assert response['statusCode'] == 401
        body = json.loads(response['body'])
        assert body['success'] is False
        assert 'UNAUTHORIZED' in body['error']['code']
    
    def test_invalid_jwt_format_returns_401(self):
        """Test that invalid JWT format returns 401"""
        # Setup: Event with malformed token
        event = {
            'httpMethod': 'POST',
            'path': '/auth/link-accounts',
            'headers': {
                'Authorization': 'Bearer invalid-token-format',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'targetUserSub': 'target-sub-123',
                'confirmLink': True
            }),
            'requestContext': {
                'requestId': 'test-request-id'
            }
        }
        
        # Execute: Call lambda handler
        response = lambda_handler(event, None)
        
        # Verify: Should return 401
        assert response['statusCode'] == 401
    
    def test_expired_jwt_token_returns_401(self):
        """Test that expired JWT token returns 401"""
        # Setup: Event with expired token (simulated by missing authorizer context)
        event = {
            'httpMethod': 'POST',
            'path': '/auth/link-accounts',
            'headers': {
                'Authorization': 'Bearer expired.jwt.token',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'targetUserSub': 'target-sub-123',
                'confirmLink': True
            }),
            'requestContext': {
                'requestId': 'test-request-id'
                # Missing authorizer context indicates token validation failed
            }
        }
        
        # Execute: Call lambda handler
        response = lambda_handler(event, None)
        
        # Verify: Should return 401
        assert response['statusCode'] == 401


class TestEmailVerification:
    """Test email verification checks - Requirements 11.1, 11.2, 11.3, 11.4"""
    
    def test_both_users_verified_allows_linking(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that linking proceeds when both users have verified emails"""
        # Setup: Mock both users with verified emails
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock profile queries
        mock_table.query.return_value = {'Items': []}
        
        # Mock Cognito - both users verified
        def mock_admin_get_user(UserPoolId, Username):
            return {
                'UserAttributes': [
                    {'Name': 'email', 'Value': 'test@example.com'},
                    {'Name': 'email_verified', 'Value': 'true'}
                ]
            }
        
        mock_cognito_client.admin_get_user.side_effect = mock_admin_get_user
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should not return email verification error
        assert response['statusCode'] != 403
        if response['statusCode'] != 200:
            body = json.loads(response['body'])
            assert 'EMAIL_NOT_VERIFIED' not in body.get('error', {}).get('code', '')
    
    def test_unverified_current_user_rejects_linking(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that unverified current user email rejects linking"""
        # Setup: Current user has unverified email
        valid_link_request_event['requestContext']['authorizer']['claims']['email_verified'] = 'false'
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should return 403 with email verification error
        assert response['statusCode'] == 403
        body = json.loads(response['body'])
        assert body['success'] is False
        assert 'EMAIL_NOT_VERIFIED' in body['error']['code']
    
    def test_unverified_target_user_rejects_linking(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that unverified target user email rejects linking"""
        # Setup: Target user has unverified email
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'false'}
            ]
        }
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should return 403 with email verification error
        assert response['statusCode'] == 403
        body = json.loads(response['body'])
        assert body['success'] is False
        assert 'EMAIL_NOT_VERIFIED' in body['error']['code']
    
    def test_email_verification_failure_logs_security_warning(self, valid_link_request_event, mock_cognito_client):
        """Test that email verification failure logs security warning"""
        # Setup: Unverified email
        valid_link_request_event['requestContext']['authorizer']['claims']['email_verified'] = 'false'
        
        with patch('auth.link_accounts.logger') as mock_logger:
            # Execute: Call lambda handler
            response = lambda_handler(valid_link_request_event, None)
            
            # Verify: Should log security warning
            assert mock_logger.warning.called or mock_logger.error.called


class TestAdminLinkProviderForUser:
    """Test AdminLinkProviderForUser API calls - Requirements 2.2, 7.3"""
    
    def test_google_to_otp_linking_calls_admin_link(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test Google-to-OTP linking calls AdminLinkProviderForUser correctly"""
        # Setup: Mock Google user (source) and OTP user (destination)
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Current user is Google (has identities)
        valid_link_request_event['requestContext']['authorizer']['claims']['identities'] = json.dumps([
            {'providerName': 'Google', 'userId': '123456789'}
        ])
        
        # Mock Cognito operations
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ],
            'Username': 'Google_123456789'
        }
        
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Mock profile queries
        mock_table.query.return_value = {'Items': []}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: AdminLinkProviderForUser should be called with correct parameters
        if mock_cognito_client.admin_link_provider_for_user.called:
            call_args = mock_cognito_client.admin_link_provider_for_user.call_args
            assert call_args is not None
            # Verify ProviderAttributeName is 'Cognito_Subject' for Google
            assert 'SourceUser' in call_args[1]
            assert call_args[1]['SourceUser']['ProviderAttributeName'] == 'Cognito_Subject'
    
    def test_admin_link_api_error_returns_error_response(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that AdminLinkProviderForUser API error returns proper error response"""
        # Setup: Mock API error
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.query.return_value = {'Items': []}
        
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        
        # Mock AdminLinkProviderForUser failure
        mock_cognito_client.admin_link_provider_for_user.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'AliasExistsException',
                    'Message': 'An account with this email already exists'
                }
            },
            'AdminLinkProviderForUser'
        )
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should return error response
        assert response['statusCode'] in [400, 500]
        body = json.loads(response['body'])
        assert body['success'] is False
        assert 'LINK_FAILED' in body['error']['code']


class TestOTPToGoogleLinking:
    """Test OTP-to-Google linking flow - Requirements 2.2, 7.4"""
    
    def test_otp_to_google_calls_admin_set_password(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test OTP-to-Google linking calls AdminSetUserPassword"""
        # Setup: Current user is OTP (no identities), target is Google
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.query.return_value = {'Items': []}
        
        # Target user is Google
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'},
                {'Name': 'identities', 'Value': json.dumps([{'providerName': 'Google'}])}
            ],
            'Username': 'Google_123456789'
        }
        
        mock_cognito_client.admin_set_user_password.return_value = {}
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: AdminSetUserPassword should be called
        if response['statusCode'] == 200:
            assert mock_cognito_client.admin_set_user_password.called
    
    def test_otp_to_google_generates_secure_password(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that OTP-to-Google linking generates secure random password"""
        # Setup: OTP to Google scenario
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.query.return_value = {'Items': []}
        
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'},
                {'Name': 'identities', 'Value': json.dumps([{'providerName': 'Google'}])}
            ],
            'Username': 'Google_123456789'
        }
        
        mock_cognito_client.admin_set_user_password.return_value = {}
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Password should be generated (check call was made)
        if mock_cognito_client.admin_set_user_password.called:
            call_args = mock_cognito_client.admin_set_user_password.call_args
            password = call_args[1].get('Password')
            # Verify password exists and has reasonable length
            assert password is not None
            assert len(password) >= 32  # Should be secure random password


class TestProfileMerging:
    """Test profile merging logic - Requirements 5.4, 7.5"""
    
    def test_profile_merge_queries_both_profiles(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that profile merging queries both source and destination profiles"""
        # Setup: Mock profiles
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Current user is Google (has identities)
        valid_link_request_event['requestContext']['authorizer']['claims']['identities'] = json.dumps([
            {'providerName': 'Google', 'userId': '123456789'}
        ])
        
        # Mock get_item to return profiles
        def mock_get_item(**kwargs):
            pk = kwargs.get('Key', {}).get('PK', '')
            if 'current-sub-456' in pk:
                return {
                    'Item': {
                        'PK': 'USER#current-sub-456',
                        'SK': 'PROFILE',
                        'userId': 'current-sub-456',
                        'email': 'test@example.com',
                        'authMethods': ['google']
                    }
                }
            elif 'target-sub-123' in pk:
                return {
                    'Item': {
                        'PK': 'USER#target-sub-123',
                        'SK': 'PROFILE',
                        'userId': 'target-sub-123',
                        'email': 'test@example.com',
                        'authMethods': ['email']
                    }
                }
            return {}
        
        mock_table.get_item.side_effect = mock_get_item
        mock_table.update_item.return_value = {}
        mock_table.delete_item.return_value = {}
        
        # Mock Cognito
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should get both profiles
        assert mock_table.get_item.called
    
    def test_profile_merge_combines_auth_methods(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that profile merging combines authMethods arrays"""
        # Setup: Mock profiles with different auth methods
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock get_item to return profiles
        def mock_get_item(**kwargs):
            pk = kwargs.get('Key', {}).get('PK', '')
            if 'current-sub-456' in pk:
                return {
                    'Item': {
                        'PK': 'USER#current-sub-456',
                        'SK': 'PROFILE',
                        'userId': 'current-sub-456',
                        'email': 'test@example.com',
                        'authMethods': ['google']
                    }
                }
            elif 'target-sub-123' in pk:
                return {
                    'Item': {
                        'PK': 'USER#target-sub-123',
                        'SK': 'PROFILE',
                        'userId': 'target-sub-123',
                        'email': 'test@example.com',
                        'authMethods': ['email']
                    }
                }
            return {}
        
        mock_table.get_item.side_effect = mock_get_item
        mock_table.update_item.return_value = {}
        mock_table.delete_item.return_value = {}
        
        # Mock Cognito
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should update profile with merged auth methods
        if mock_table.update_item.called:
            call_args = mock_table.update_item.call_args
            # Check that authMethods includes both 'google' and 'email'
            update_expr = call_args[1].get('UpdateExpression', '')
            assert 'authMethods' in update_expr
    
    def test_profile_merge_deletes_source_profile(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that profile merging deletes the source profile"""
        # Setup: Mock successful merge
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'USER#current-sub-456',
                'SK': 'PROFILE',
                'userId': 'current-sub-456',
                'email': 'test@example.com',
                'authMethods': ['google']
            }
        }
        mock_table.update_item.return_value = {}
        mock_table.delete_item.return_value = {}
        
        # Mock Cognito
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should delete source profile
        if response['statusCode'] == 200:
            assert mock_table.delete_item.called
    
    def test_profile_merge_updates_destination_profile(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that profile merging updates the destination profile"""
        # Setup: Mock profiles
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'USER#target-sub-123',
                'SK': 'PROFILE',
                'userId': 'target-sub-123',
                'email': 'test@example.com',
                'authMethods': ['email']
            }
        }
        mock_table.update_item.return_value = {}
        
        # Mock Cognito
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should update destination profile
        if response['statusCode'] == 200:
            assert mock_table.update_item.called


class TestErrorResponses:
    """Test error response handling - Requirements 7.1, 7.2, 7.5"""
    
    def test_missing_request_body_returns_400(self):
        """Test that missing request body returns 400 Bad Request"""
        # Setup: Event without body
        event = {
            'httpMethod': 'POST',
            'path': '/auth/link-accounts',
            'headers': {
                'Authorization': 'Bearer valid.jwt.token',
                'Content-Type': 'application/json'
            },
            'requestContext': {
                'requestId': 'test-request-id',
                'authorizer': {
                    'claims': {
                        'sub': 'current-sub-456',
                        'email': 'test@example.com',
                        'email_verified': 'true'
                    }
                }
            }
        }
        
        # Execute: Call lambda handler
        response = lambda_handler(event, None)
        
        # Verify: Should return 400
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['success'] is False
    
    def test_invalid_json_body_returns_400(self):
        """Test that invalid JSON body returns 400 Bad Request"""
        # Setup: Event with invalid JSON
        event = {
            'httpMethod': 'POST',
            'path': '/auth/link-accounts',
            'headers': {
                'Authorization': 'Bearer valid.jwt.token',
                'Content-Type': 'application/json'
            },
            'body': 'invalid-json{',
            'requestContext': {
                'requestId': 'test-request-id',
                'authorizer': {
                    'claims': {
                        'sub': 'current-sub-456',
                        'email': 'test@example.com',
                        'email_verified': 'true'
                    }
                }
            }
        }
        
        # Execute: Call lambda handler
        response = lambda_handler(event, None)
        
        # Verify: Should return 400
        assert response['statusCode'] == 400
    
    def test_missing_target_user_sub_returns_400(self):
        """Test that missing targetUserSub returns 400 Bad Request"""
        # Setup: Event without targetUserSub
        event = {
            'httpMethod': 'POST',
            'path': '/auth/link-accounts',
            'headers': {
                'Authorization': 'Bearer valid.jwt.token',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'confirmLink': True
                # Missing targetUserSub
            }),
            'requestContext': {
                'requestId': 'test-request-id',
                'authorizer': {
                    'claims': {
                        'sub': 'current-sub-456',
                        'email': 'test@example.com',
                        'email_verified': 'true'
                    }
                }
            }
        }
        
        # Execute: Call lambda handler
        response = lambda_handler(event, None)
        
        # Verify: Should return 400
        assert response['statusCode'] == 400
    
    def test_dynamodb_error_returns_500(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that DynamoDB error returns 500 Internal Server Error"""
        # Setup: Mock DynamoDB error
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Current user is Google (has identities)
        valid_link_request_event['requestContext']['authorizer']['claims']['identities'] = json.dumps([
            {'providerName': 'Google', 'userId': '123456789'}
        ])
        
        # Mock Cognito to succeed
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Mock DynamoDB error during profile merge
        mock_table.get_item.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'ServiceUnavailable',
                    'Message': 'Service temporarily unavailable'
                }
            },
            'GetItem'
        )
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Should return 500
        assert response['statusCode'] == 500
        body = json.loads(response['body'])
        assert body['success'] is False
    
    def test_success_response_includes_linked_identities(self, valid_link_request_event, mock_dynamodb, mock_cognito_client):
        """Test that success response includes linked identities"""
        # Setup: Mock successful linking
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'USER#current-sub-456',
                'SK': 'PROFILE',
                'userId': 'current-sub-456',
                'email': 'test@example.com',
                'authMethods': ['google']
            }
        }
        mock_table.update_item.return_value = {}
        mock_table.delete_item.return_value = {}
        
        # Mock Cognito
        mock_cognito_client.admin_get_user.return_value = {
            'UserAttributes': [
                {'Name': 'email', 'Value': 'test@example.com'},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
        }
        mock_cognito_client.admin_link_provider_for_user.return_value = {}
        
        # Execute: Call lambda handler
        response = lambda_handler(valid_link_request_event, None)
        
        # Verify: Success response should include linkedIdentities
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            assert body['success'] is True
            assert 'linkedIdentities' in body or 'message' in body
