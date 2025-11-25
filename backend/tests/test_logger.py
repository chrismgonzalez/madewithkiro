"""
Tests for structured logging utility
"""
import json
import os
from unittest.mock import patch, MagicMock
import pytest

from shared.logger import StructuredLogger, LogLevel, get_logger


class TestStructuredLogger:
    """Test structured logging functionality"""
    
    def test_logger_initialization(self):
        """Test logger initializes with correct environment"""
        logger = StructuredLogger('test_logger')
        assert logger.environment == os.environ.get('ENVIRONMENT', 'dev')
    
    def test_sensitive_data_filtering_dict(self):
        """Test sensitive data is filtered from dictionaries"""
        logger = StructuredLogger('test_logger')
        
        data = {
            'username': 'testuser',
            'password': 'secret123',
            'api_key': 'abc123',
            'email': 'test@example.com',
            'token': 'xyz789'
        }
        
        filtered = logger._filter_sensitive_data(data)
        
        assert filtered['username'] == 'testuser'
        assert filtered['email'] == 'test@example.com'
        assert filtered['password'] == '[REDACTED]'
        assert filtered['api_key'] == '[REDACTED]'
        assert filtered['token'] == '[REDACTED]'
    
    def test_sensitive_data_filtering_nested(self):
        """Test sensitive data is filtered from nested structures"""
        logger = StructuredLogger('test_logger')
        
        data = {
            'user': {
                'name': 'John',
                'password': 'secret',
                'profile': {
                    'email': 'john@example.com',
                    'access_token': 'token123'
                }
            },
            'metadata': {
                'timestamp': '2024-01-01',
                'api_key': 'key123'
            }
        }
        
        filtered = logger._filter_sensitive_data(data)
        
        assert filtered['user']['name'] == 'John'
        assert filtered['user']['password'] == '[REDACTED]'
        assert filtered['user']['profile']['email'] == 'john@example.com'
        assert filtered['user']['profile']['access_token'] == '[REDACTED]'
        assert filtered['metadata']['timestamp'] == '2024-01-01'
        assert filtered['metadata']['api_key'] == '[REDACTED]'
    
    def test_sensitive_data_filtering_list(self):
        """Test sensitive data is filtered from lists"""
        logger = StructuredLogger('test_logger')
        
        data = [
            {'username': 'user1', 'password': 'pass1'},
            {'username': 'user2', 'token': 'token2'}
        ]
        
        filtered = logger._filter_sensitive_data(data)
        
        assert filtered[0]['username'] == 'user1'
        assert filtered[0]['password'] == '[REDACTED]'
        assert filtered[1]['username'] == 'user2'
        assert filtered[1]['token'] == '[REDACTED]'
    
    def test_log_entry_structure(self):
        """Test log entry has correct structure"""
        logger = StructuredLogger('test_logger')
        
        entry = logger._create_log_entry(
            level=LogLevel.INFO,
            message='Test message',
            context={'key': 'value'},
            user_id='user123',
            request_id='req456'
        )
        
        assert entry['level'] == 'INFO'
        assert entry['message'] == 'Test message'
        assert entry['environment'] == logger.environment
        assert entry['user_id'] == 'user123'
        assert entry['request_id'] == 'req456'
        assert entry['context']['key'] == 'value'
        assert 'timestamp' in entry
    
    def test_log_entry_with_error(self):
        """Test log entry includes error information"""
        logger = StructuredLogger('test_logger')
        
        error = ValueError('Test error')
        entry = logger._create_log_entry(
            level=LogLevel.ERROR,
            message='Error occurred',
            error=error
        )
        
        assert entry['error']['type'] == 'ValueError'
        assert entry['error']['message'] == 'Test error'
        
        # Stack trace only in dev
        if logger.environment == 'dev':
            assert 'stack_trace' in entry['error']
        else:
            assert 'stack_trace' not in entry['error']
    
    @patch('shared.logger.logging.Logger.info')
    def test_info_logging(self, mock_log):
        """Test info level logging"""
        logger = StructuredLogger('test_logger')
        
        logger.info(
            message='Info message',
            context={'key': 'value'},
            user_id='user123'
        )
        
        # Verify logging was called
        assert mock_log.called
        
        # Parse the logged JSON
        log_call = mock_log.call_args[0][0]
        log_entry = json.loads(log_call)
        
        assert log_entry['level'] == 'INFO'
        assert log_entry['message'] == 'Info message'
        assert log_entry['user_id'] == 'user123'
    
    @patch('shared.logger.logging.Logger.error')
    def test_error_logging(self, mock_log):
        """Test error level logging"""
        logger = StructuredLogger('test_logger')
        
        error = RuntimeError('Test error')
        logger.error(
            message='Error message',
            error=error,
            context={'operation': 'test_op'}
        )
        
        # Verify logging was called
        assert mock_log.called
        
        # Parse the logged JSON
        log_call = mock_log.call_args[0][0]
        log_entry = json.loads(log_call)
        
        assert log_entry['level'] == 'ERROR'
        assert log_entry['message'] == 'Error message'
        assert log_entry['error']['type'] == 'RuntimeError'
    
    def test_get_logger_function(self):
        """Test get_logger returns StructuredLogger instance"""
        logger = get_logger('test_module')
        assert isinstance(logger, StructuredLogger)
    
    def test_case_insensitive_sensitive_field_detection(self):
        """Test sensitive fields are detected case-insensitively"""
        logger = StructuredLogger('test_logger')
        
        data = {
            'Password': 'secret',
            'API_KEY': 'key123',
            'AccessToken': 'token456',
            'normal_field': 'value'
        }
        
        filtered = logger._filter_sensitive_data(data)
        
        assert filtered['Password'] == '[REDACTED]'
        assert filtered['API_KEY'] == '[REDACTED]'
        assert filtered['AccessToken'] == '[REDACTED]'
        assert filtered['normal_field'] == 'value'
    
    @patch.dict(os.environ, {'ENVIRONMENT': 'prod'})
    def test_prod_log_level(self):
        """Test production environment uses INFO log level"""
        logger = StructuredLogger('test_logger')
        assert logger.logger.level == 20  # logging.INFO
    
    @patch.dict(os.environ, {'ENVIRONMENT': 'dev'})
    def test_dev_log_level(self):
        """Test development environment uses DEBUG log level"""
        logger = StructuredLogger('test_logger')
        assert logger.logger.level == 10  # logging.DEBUG
