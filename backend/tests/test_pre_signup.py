"""
Unit tests for PreSignUp Lambda trigger

Tests for duplicate detection logging and auto-confirm functionality.
Requirements: 1.1
"""

import sys
import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from auth.pre_signup import lambda_handler


class TestPreSignUpAutoConfirm:
    """Test auto-confirm functionality for different trigger sources"""
    
    def test_custom_auth_auto_confirms_user(self):
        """Test that custom auth (OTP) users are auto-confirmed"""
        event = {
            'triggerSource': 'PreSignUp_SignUp',
            'request': {
                'userAttributes': {
                    'email': 'test@example.com'
                }
            },
            'response': {}
        }
        
        result = lambda_handler(event, None)
        
        assert result['response']['autoConfirmUser'] is True
        assert result['response']['autoVerifyEmail'] is True
    
    def test_external_provider_does_not_auto_confirm(self):
        """Test that external providers (Google) are not auto-confirmed by us"""
        event = {
            'triggerSource': 'PreSignUp_ExternalProvider',
            'request': {
                'userAttributes': {
                    'email': 'test@example.com'
                }
            },
            'response': {}
        }
        
        result = lambda_handler(event, None)
        
        # Should not set auto-confirm for external providers
        assert 'autoConfirmUser' not in result['response']
        assert 'autoVerifyEmail' not in result['response']
    
    def test_admin_create_user_auto_confirms(self):
        """Test that admin-created users are auto-confirmed"""
        event = {
            'triggerSource': 'PreSignUp_AdminCreateUser',
            'request': {
                'userAttributes': {
                    'email': 'admin@example.com'
                }
            },
            'response': {}
        }
        
        result = lambda_handler(event, None)
        
        assert result['response']['autoConfirmUser'] is True
        assert result['response']['autoVerifyEmail'] is True


class TestPreSignUpDuplicateDetection:
    """Test duplicate detection logging when duplicates are found"""
    
    @patch.dict(os.environ, {'USER_POOL_ID': 'test-pool-id'})
    def test_logs_when_duplicate_detected(self):
        """Test that duplicate accounts are logged when detected"""
        # Import after setting env var
        from auth import pre_signup
        
        # Patch the cognito_client's list_users method
        with patch.object(pre_signup.cognito_client, 'list_users') as mock_list_users:
            # Simulate finding an existing user with the same email
            mock_list_users.return_value = {
                'Users': [
                    {
                        'Username': 'existing-user-sub',
                        'Attributes': [
                            {'Name': 'email', 'Value': 'test@example.com'},
                            {'Name': 'sub', 'Value': 'existing-sub-123'}
                        ]
                    }
                ]
            }
            
            event = {
                'triggerSource': 'PreSignUp_ExternalProvider',
                'request': {
                    'userAttributes': {
                        'email': 'test@example.com'
                    }
                },
                'response': {}
            }
            
            with patch('auth.pre_signup.logger') as mock_logger:
                result = lambda_handler(event, None)
                
                # Verify list_users was called
                mock_list_users.assert_called_once()
                
                # Should log that a duplicate was detected
                # Check if any log call mentions duplicate
                log_calls = [str(call) for call in mock_logger.info.call_args_list]
                assert any('duplicate' in str(call).lower() for call in log_calls), \
                    f"Should log when duplicate account detected. Got: {log_calls}"
    
    @patch.dict(os.environ, {'USER_POOL_ID': 'test-pool-id'})
    def test_logs_no_duplicate_when_none_found(self):
        """Test that no duplicate logging occurs when no duplicates exist"""
        from auth import pre_signup
        
        with patch.object(pre_signup.cognito_client, 'list_users') as mock_list_users:
            # Mock Cognito client to return no existing users
            mock_list_users.return_value = {
                'Users': []
            }
            
            event = {
                'triggerSource': 'PreSignUp_ExternalProvider',
                'request': {
                    'userAttributes': {
                        'email': 'unique@example.com'
                    }
                },
                'response': {}
            }
            
            with patch('auth.pre_signup.logger') as mock_logger:
                result = lambda_handler(event, None)
                
                # Should not log duplicate detection
                log_calls = [str(call) for call in mock_logger.info.call_args_list]
                assert not any('duplicate' in str(call).lower() for call in log_calls), \
                    "Should not log duplicate when none found"
    
    @patch.dict(os.environ, {'USER_POOL_ID': 'test-pool-id'})
    def test_continues_signup_even_with_duplicate(self):
        """Test that signup continues even when duplicate is detected"""
        from auth import pre_signup
        
        with patch.object(pre_signup.cognito_client, 'list_users') as mock_list_users:
            # Mock Cognito client to return existing user
            mock_list_users.return_value = {
                'Users': [
                    {
                        'Username': 'existing-user',
                        'Attributes': [
                            {'Name': 'email', 'Value': 'test@example.com'}
                        ]
                    }
                ]
            }
            
            event = {
                'triggerSource': 'PreSignUp_ExternalProvider',
                'request': {
                    'userAttributes': {
                        'email': 'test@example.com'
                    }
                },
                'response': {}
            }
            
            result = lambda_handler(event, None)
            
            # Should return event successfully (not raise exception)
            assert result is not None
            assert 'response' in result


class TestPreSignUpErrorHandling:
    """Test error handling in PreSignUp trigger"""
    
    def test_handles_missing_email_gracefully(self):
        """Test that missing email doesn't crash the handler"""
        event = {
            'triggerSource': 'PreSignUp_SignUp',
            'request': {
                'userAttributes': {}
            },
            'response': {}
        }
        
        result = lambda_handler(event, None)
        
        # Should still return event
        assert result is not None
    
    @patch.dict(os.environ, {'USER_POOL_ID': 'test-pool-id'})
    def test_handles_cognito_api_error_gracefully(self):
        """Test that Cognito API errors don't prevent signup"""
        from auth import pre_signup
        
        with patch.object(pre_signup.cognito_client, 'list_users') as mock_list_users:
            # Mock Cognito client to raise an error
            mock_list_users.side_effect = Exception("Cognito API error")
            
            event = {
                'triggerSource': 'PreSignUp_ExternalProvider',
                'request': {
                    'userAttributes': {
                        'email': 'test@example.com'
                    }
                },
                'response': {}
            }
            
            result = lambda_handler(event, None)
            
            # Should still return event (graceful degradation)
            assert result is not None
            assert 'response' in result
