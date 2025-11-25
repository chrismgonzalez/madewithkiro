"""
Tests for centralized error handling module
Validates Requirements 9.1, 9.2, 9.3, 9.4, 9.5
"""
import json
import pytest
from pydantic import ValidationError, BaseModel, field_validator
from shared.error_handler import (
    sanitized_error_response,
    success_response,
    handle_validation_error,
    handle_not_found,
    handle_unauthorized,
    handle_forbidden,
    handle_conflict,
    handle_internal_error,
    ErrorCode
)


class TestSanitizedErrorResponse:
    """Test sanitized_error_response function"""
    
    def test_returns_generic_message_for_500_error(self):
        """Test that 500 errors return generic message without internal details"""
        response = sanitized_error_response(
            status_code=500,
            internal_error=Exception("Database connection failed at line 42 in db.py")
        )
        
        assert response['statusCode'] == 500
        body = json.loads(response['body'])
        
        # Should return generic message
        assert body['error']['message'] == "An error occurred. Please try again later."
        assert body['error']['code'] == ErrorCode.INTERNAL_ERROR.value
        
        # Should NOT contain internal details
        assert 'Database connection' not in body['error']['message']
        assert 'line 42' not in body['error']['message']
        assert 'db.py' not in body['error']['message']
    
    def test_does_not_expose_stack_traces(self):
        """Test that stack traces are not included in response"""
        try:
            raise ValueError("Internal error with sensitive data")
        except ValueError as e:
            response = sanitized_error_response(
                status_code=500,
                internal_error=e
            )
        
        body = json.loads(response['body'])
        
        # Should not contain stack trace keywords
        assert 'Traceback' not in json.dumps(body)
        assert 'File' not in body['error']['message']
        assert 'line' not in body['error']['message'].lower()
    
    def test_uses_custom_message_when_provided(self):
        """Test that custom user message is used when provided"""
        response = sanitized_error_response(
            status_code=400,
            user_message="Please provide a valid email address"
        )
        
        body = json.loads(response['body'])
        assert body['error']['message'] == "Please provide a valid email address"
    
    def test_includes_cors_headers_when_event_provided(self, monkeypatch):
        """Test that CORS headers are included when event is provided"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        
        event = {
            'headers': {
                'origin': 'https://example.com'
            }
        }
        
        response = sanitized_error_response(
            status_code=404,
            event=event
        )
        
        assert 'Access-Control-Allow-Origin' in response['headers']
        assert response['headers']['Access-Control-Allow-Origin'] == 'https://example.com'
    
    def test_includes_safe_details_when_provided(self):
        """Test that safe details are included in response"""
        details = {
            'field': 'email',
            'constraint': 'must be valid email format'
        }
        
        response = sanitized_error_response(
            status_code=400,
            details=details
        )
        
        body = json.loads(response['body'])
        assert body['error']['details'] == details
    
    def test_maps_status_codes_to_error_codes(self):
        """Test that status codes are mapped to appropriate error codes"""
        test_cases = [
            (400, ErrorCode.BAD_REQUEST),
            (401, ErrorCode.UNAUTHORIZED),
            (403, ErrorCode.FORBIDDEN),
            (404, ErrorCode.NOT_FOUND),
            (405, ErrorCode.METHOD_NOT_ALLOWED),
            (409, ErrorCode.CONFLICT),
            (429, ErrorCode.TOO_MANY_REQUESTS),
            (500, ErrorCode.INTERNAL_ERROR),
        ]
        
        for status_code, expected_code in test_cases:
            response = sanitized_error_response(status_code=status_code)
            body = json.loads(response['body'])
            assert body['error']['code'] == expected_code.value


class TestSuccessResponse:
    """Test success_response function"""
    
    def test_returns_200_by_default(self):
        """Test that success response returns 200 by default"""
        response = success_response(data={'id': '123'})
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['data'] == {'id': '123'}
        assert body['error'] is None
    
    def test_accepts_custom_status_code(self):
        """Test that custom status code can be provided"""
        response = success_response(data={'id': '123'}, status_code=201)
        
        assert response['statusCode'] == 201
    
    def test_includes_cors_headers_when_event_provided(self, monkeypatch):
        """Test that CORS headers are included when event is provided"""
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')
        
        event = {
            'headers': {
                'origin': 'https://example.com'
            }
        }
        
        response = success_response(data={'id': '123'}, event=event)
        
        assert 'Access-Control-Allow-Origin' in response['headers']


class TestHandleValidationError:
    """Test handle_validation_error function"""
    
    def test_extracts_field_level_errors(self):
        """Test that field-level validation errors are extracted"""
        # Create a Pydantic model to generate validation error
        class TestModel(BaseModel):
            email: str
            age: int
            
            @field_validator('email')
            @classmethod
            def validate_email(cls, v):
                if '@' not in v:
                    raise ValueError('must contain @')
                return v
        
        try:
            TestModel(email='invalid', age='not_a_number')
        except ValidationError as e:
            response = handle_validation_error(e)
        
        body = json.loads(response['body'])
        
        assert response['statusCode'] == 400
        assert body['error']['code'] == ErrorCode.VALIDATION_ERROR.value
        assert 'details' in body['error']
        # Should have field-level errors
        assert len(body['error']['details']) > 0
    
    def test_does_not_expose_internal_validation_details(self):
        """Test that internal validation details are not exposed"""
        class TestModel(BaseModel):
            secret_field: str
        
        try:
            TestModel(secret_field=None)
        except ValidationError as e:
            response = handle_validation_error(e)
        
        body = json.loads(response['body'])
        
        # Should not contain internal class names or paths
        response_str = json.dumps(body)
        assert 'TestModel' not in response_str
        assert '__main__' not in response_str


class TestHandleNotFound:
    """Test handle_not_found function"""
    
    def test_returns_404_with_resource_type(self):
        """Test that 404 response includes resource type"""
        response = handle_not_found(resource_type='Profile')
        
        assert response['statusCode'] == 404
        body = json.loads(response['body'])
        assert 'Profile' in body['error']['message']
        assert body['error']['code'] == ErrorCode.NOT_FOUND.value


class TestHandleUnauthorized:
    """Test handle_unauthorized function"""
    
    def test_returns_401_with_default_message(self):
        """Test that 401 response has default auth message"""
        response = handle_unauthorized()
        
        assert response['statusCode'] == 401
        body = json.loads(response['body'])
        assert 'Authentication required' in body['error']['message']
        assert body['error']['code'] == ErrorCode.UNAUTHORIZED.value
    
    def test_accepts_custom_message(self):
        """Test that custom message can be provided"""
        response = handle_unauthorized(message='Invalid token')
        
        body = json.loads(response['body'])
        assert body['error']['message'] == 'Invalid token'


class TestHandleForbidden:
    """Test handle_forbidden function"""
    
    def test_returns_403_with_default_message(self):
        """Test that 403 response has default permission message"""
        response = handle_forbidden()
        
        assert response['statusCode'] == 403
        body = json.loads(response['body'])
        assert 'permission' in body['error']['message'].lower()
        assert body['error']['code'] == ErrorCode.FORBIDDEN.value


class TestHandleConflict:
    """Test handle_conflict function"""
    
    def test_returns_409_with_resource_type(self):
        """Test that 409 response includes resource type"""
        response = handle_conflict(resource_type='Profile')
        
        assert response['statusCode'] == 409
        body = json.loads(response['body'])
        assert 'Profile' in body['error']['message']
        assert 'already exists' in body['error']['message']
        assert body['error']['code'] == ErrorCode.CONFLICT.value


class TestHandleInternalError:
    """Test handle_internal_error function"""
    
    def test_returns_500_with_generic_message(self):
        """Test that internal errors return generic message"""
        error = Exception("Database connection to 192.168.1.100 failed")
        response = handle_internal_error(error)
        
        assert response['statusCode'] == 500
        body = json.loads(response['body'])
        
        # Should return generic message
        assert body['error']['message'] == "An error occurred. Please try again later."
        
        # Should NOT expose internal details
        assert '192.168.1.100' not in body['error']['message']
        assert 'Database connection' not in body['error']['message']
    
    def test_does_not_expose_file_paths(self):
        """Test that file paths are not exposed in error response"""
        error = Exception("/var/www/app/backend/handler.py failed")
        response = handle_internal_error(error)
        
        body = json.loads(response['body'])
        response_str = json.dumps(body)
        
        # Should not contain file paths
        assert '/var/www' not in response_str
        assert 'handler.py' not in response_str
    
    def test_does_not_expose_database_queries(self):
        """Test that database queries are not exposed"""
        error = Exception("SELECT * FROM users WHERE password='secret' failed")
        response = handle_internal_error(error)
        
        body = json.loads(response['body'])
        
        # Should not contain SQL queries
        assert 'SELECT' not in body['error']['message']
        assert 'password' not in body['error']['message']
        assert 'secret' not in body['error']['message']


class TestErrorMessageConsistency:
    """Test that error messages are consistent and don't leak information"""
    
    def test_authentication_errors_do_not_reveal_user_existence(self):
        """Test that auth errors don't reveal if user exists"""
        # Both cases should return same generic message
        response1 = handle_unauthorized(message='Invalid credentials')
        response2 = handle_unauthorized(message='Invalid credentials')
        
        body1 = json.loads(response1['body'])
        body2 = json.loads(response2['body'])
        
        # Messages should be identical
        assert body1['error']['message'] == body2['error']['message']
    
    def test_all_500_errors_return_same_message(self):
        """Test that all internal errors return consistent message"""
        errors = [
            Exception("Database error"),
            Exception("Network timeout"),
            Exception("Memory allocation failed"),
        ]
        
        messages = []
        for error in errors:
            response = handle_internal_error(error)
            body = json.loads(response['body'])
            messages.append(body['error']['message'])
        
        # All messages should be identical
        assert len(set(messages)) == 1
        assert messages[0] == "An error occurred. Please try again later."
