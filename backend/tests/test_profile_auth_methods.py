"""
Tests for profile handler authentication methods handling.

Requirements: 1.4, 1.5, 2.3, 5.3
"""
import json
import sys
import os
import pytest
from unittest.mock import Mock, patch, MagicMock

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import from backend modules
import backend.profile.handler as profile_handler
from backend.profile.handler import (
    get_auth_methods_from_event,
    get_linked_account_from_event,
    create_profile
)


class TestAuthMethodsExtraction:
    """Tests for extracting auth methods from Cognito claims"""
    
    def test_extracts_email_auth_method_from_custom_attribute(self):
        """Test extracting email auth method from custom:auth_methods"""
        event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'custom:auth_methods': 'email'
                    }
                }
            }
        }
        
        auth_methods = get_auth_methods_from_event(event)
        assert auth_methods == ['email']
    
    def test_extracts_google_auth_method_from_identities(self):
        """Test extracting Google auth method from identities claim"""
        event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'identities': '[{"providerName":"Google"}]'
                    }
                }
            }
        }
        
        auth_methods = get_auth_methods_from_event(event)
        assert auth_methods == ['google']
    
    def test_extracts_multiple_auth_methods_from_comma_separated(self):
        """Test extracting multiple auth methods from comma-separated string"""
        event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'custom:auth_methods': 'google,email'
                    }
                }
            }
        }
        
        auth_methods = get_auth_methods_from_event(event)
        assert 'google' in auth_methods
        assert 'email' in auth_methods
    
    def test_extracts_multiple_auth_methods_from_json_array(self):
        """Test extracting multiple auth methods from JSON array"""
        event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'custom:auth_methods': '["google","email"]'
                    }
                }
            }
        }
        
        auth_methods = get_auth_methods_from_event(event)
        assert 'google' in auth_methods
        assert 'email' in auth_methods
    
    def test_defaults_to_email_when_no_auth_method_found(self):
        """Test defaulting to email when no auth method is found"""
        event = {
            'requestContext': {
                'authorizer': {
                    'claims': {}
                }
            }
        }
        
        auth_methods = get_auth_methods_from_event(event)
        assert auth_methods == ['email']
    
    def test_handles_missing_request_context(self):
        """Test handling missing request context"""
        event = {}
        
        auth_methods = get_auth_methods_from_event(event)
        assert auth_methods == ['email']


class TestLinkedAccountExtraction:
    """Tests for extracting linked account from Cognito claims"""
    
    def test_extracts_linked_account_id(self):
        """Test extracting linked account user ID"""
        event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'custom:linked_account': 'original-user-123'
                    }
                }
            }
        }
        
        linked_account = get_linked_account_from_event(event)
        assert linked_account == 'original-user-123'
    
    def test_returns_empty_string_when_no_linked_account(self):
        """Test returning empty string when no linked account"""
        event = {
            'requestContext': {
                'authorizer': {
                    'claims': {}
                }
            }
        }
        
        linked_account = get_linked_account_from_event(event)
        assert linked_account == ''
    
    def test_handles_missing_request_context(self):
        """Test handling missing request context"""
        event = {}
        
        linked_account = get_linked_account_from_event(event)
        assert linked_account == ''


class TestProfileCreationWithAuthMethods:
    """Tests for profile creation with different auth methods"""
    
    @patch('backend.profile.handler.get_item')
    @patch('backend.profile.handler.put_item')
    @patch('backend.profile.handler._current_event')
    def test_creates_profile_with_email_auth_method(self, mock_event, mock_put, mock_get):
        """Test creating profile with email auth method"""
        # Setup
        mock_get.return_value = None  # No existing profile
        mock_event.get.return_value = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'email': 'test@example.com',
                        'custom:auth_methods': 'email'
                    }
                }
            }
        }
        
        # Mock the global event
        profile_handler._current_event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'email': 'test@example.com',
                        'custom:auth_methods': 'email'
                    }
                }
            }
        }
        
        data = {
            'firstName': 'John',
            'lastName': 'Doe',
            'awsBuilderHandle': 'johndoe'
        }
        
        # Execute
        result = create_profile('user-123', data)
        
        # Verify
        assert result['statusCode'] == 201
        
        # Check that put_item was called with correct auth methods
        put_call_args = mock_put.call_args
        profile_item = put_call_args[0][0]
        assert profile_item['authMethods'] == ['email']
        assert profile_item['userId'] == 'user-123'
        assert profile_item['email'] == 'test@example.com'
    
    @patch('backend.profile.handler.get_item')
    @patch('backend.profile.handler.put_item')
    @patch('backend.profile.handler._current_event')
    def test_creates_profile_with_google_auth_method(self, mock_event, mock_put, mock_get):
        """Test creating profile with Google auth method"""
        # Setup
        mock_get.return_value = None  # No existing profile
        
        # Mock the global event
        profile_handler._current_event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'email': 'test@example.com',
                        'identities': '[{"providerName":"Google"}]'
                    }
                }
            }
        }
        
        data = {
            'firstName': 'Jane',
            'lastName': 'Smith',
            'awsBuilderHandle': 'janesmith'
        }
        
        # Execute
        result = create_profile('user-456', data)
        
        # Verify
        assert result['statusCode'] == 201
        
        # Check that put_item was called with correct auth methods
        put_call_args = mock_put.call_args
        profile_item = put_call_args[0][0]
        assert profile_item['authMethods'] == ['google']
    
    @patch('backend.profile.handler.get_item')
    @patch('backend.profile.handler.put_item')
    @patch('backend.profile.handler._current_event')
    def test_creates_profile_with_multiple_auth_methods(self, mock_event, mock_put, mock_get):
        """Test creating profile with multiple auth methods (linked account)"""
        # Setup
        mock_get.return_value = None  # No existing profile
        
        # Mock the global event
        profile_handler._current_event = {
            'requestContext': {
                'authorizer': {
                    'claims': {
                        'email': 'test@example.com',
                        'custom:auth_methods': 'google,email'
                    }
                }
            }
        }
        
        data = {
            'firstName': 'Bob',
            'lastName': 'Johnson',
            'awsBuilderHandle': 'bobjohnson'
        }
        
        # Execute
        result = create_profile('user-789', data)
        
        # Verify
        assert result['statusCode'] == 201
        
        # Check that put_item was called with correct auth methods
        put_call_args = mock_put.call_args
        profile_item = put_call_args[0][0]
        assert 'google' in profile_item['authMethods']
        assert 'email' in profile_item['authMethods']
