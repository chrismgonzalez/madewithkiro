"""
Tests for OTP Authentication Handler
"""
import json
import sys
import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the handler
from auth.handler import lambda_handler, request_otp, verify_otp


@pytest.fixture
def mock_cognito_client():
    """Mock Cognito client"""
    with patch('auth.handler.cognito_client') as mock:
        yield mock


@pytest.fixture
def request_otp_event():
    """Sample event for OTP request"""
    return {
        'httpMethod': 'POST',
        'path': '/auth/otp/request',
        'body': json.dumps({'email': 'test@example.com'}),
        'requestContext': {
            'requestId': 'test-request-id'
        }
    }


@pytest.fixture
def verify_otp_event():
    """Sample event for OTP verification"""
    return {
        'httpMethod': 'POST',
        'path': '/auth/otp/verify',
        'body': json.dumps({
            'email': 'test@example.com',
            'code': '123456'
        }),
        'requestContext': {
            'requestId': 'test-request-id'
        }
    }


class TestOTPAuthHandler:
    """Test OTP authentication handler"""
    
    def test_request_otp_success(self, request_otp_event, mock_cognito_client):
        """Test successful OTP request"""
        # Mock Cognito response
        mock_cognito_client.initiate_auth.return_value = {
            'ChallengeName': 'CUSTOM_CHALLENGE',
            'Session': 'test-session-token'
        }
        
        # Call handler
        response = lambda_handler(request_otp_event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['data'] is not None
        assert body['error'] is None
        assert 'expiresIn' in body['data']
        assert body['data']['expiresIn'] == 600
        
        # Verify Cognito was called
        mock_cognito_client.initiate_auth.assert_called_once()
    
    def test_request_otp_invalid_email(self, request_otp_event):
        """Test OTP request with invalid email"""
        # Modify event with invalid email
        request_otp_event['body'] = json.dumps({'email': 'invalid-email'})
        
        # Call handler
        response = lambda_handler(request_otp_event, None)
        
        # Verify error response
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
    
    def test_request_otp_missing_email(self, request_otp_event):
        """Test OTP request with missing email"""
        # Modify event with missing email
        request_otp_event['body'] = json.dumps({})
        
        # Call handler
        response = lambda_handler(request_otp_event, None)
        
        # Verify error response
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
    
    def test_request_otp_rate_limit(self, request_otp_event, mock_cognito_client):
        """Test OTP request rate limiting"""
        # Mock Cognito rate limit error
        mock_cognito_client.initiate_auth.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'TooManyRequestsException',
                    'Message': 'Too many requests'
                }
            },
            'initiate_auth'
        )
        
        # Call handler
        response = lambda_handler(request_otp_event, None)
        
        # Verify rate limit response
        assert response['statusCode'] == 429
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
        assert body['error']['code'] == 'TOO_MANY_REQUESTS'
    
    def test_verify_otp_invalid_code_format(self, verify_otp_event):
        """Test OTP verification with invalid code format"""
        # Modify event with invalid code
        verify_otp_event['body'] = json.dumps({
            'email': 'test@example.com',
            'code': '12345'  # Only 5 digits
        })
        
        # Call handler
        response = lambda_handler(verify_otp_event, None)
        
        # Verify error response
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
    
    def test_verify_otp_non_numeric_code(self, verify_otp_event):
        """Test OTP verification with non-numeric code"""
        # Modify event with non-numeric code
        verify_otp_event['body'] = json.dumps({
            'email': 'test@example.com',
            'code': 'abcdef'
        })
        
        # Call handler
        response = lambda_handler(verify_otp_event, None)
        
        # Verify error response
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
    
    def test_invalid_http_method(self):
        """Test handler with invalid HTTP method"""
        event = {
            'httpMethod': 'GET',
            'path': '/auth/otp/request',
            'requestContext': {'requestId': 'test'}
        }
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 405
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
    
    def test_invalid_path(self):
        """Test handler with invalid path"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth/otp/invalid',
            'body': json.dumps({'email': 'test@example.com'}),
            'requestContext': {'requestId': 'test'}
        }
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 404
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
    
    def test_invalid_json_body(self):
        """Test handler with invalid JSON body"""
        event = {
            'httpMethod': 'POST',
            'path': '/auth/otp/request',
            'body': 'invalid json',
            'requestContext': {'requestId': 'test'}
        }
        
        response = lambda_handler(event, None)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['data'] is None
        assert body['error'] is not None
