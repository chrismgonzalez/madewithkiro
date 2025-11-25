"""
Structured logging utility module for CloudWatch
Implements security requirement 5: Proper logging and monitoring
"""
import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum


class LogLevel(Enum):
    """Log levels for structured logging"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class StructuredLogger:
    """
    Structured logger for CloudWatch with sensitive data filtering
    
    Features:
    - JSON-formatted log entries for CloudWatch Insights
    - Automatic sensitive data filtering
    - Environment-aware log levels
    - Contextual information (request ID, user ID, etc.)
    """
    
    # Sensitive field names to filter from logs
    SENSITIVE_FIELDS = {
        'password', 'token', 'secret', 'api_key', 'apikey',
        'authorization', 'auth', 'credential', 'private_key',
        'access_token', 'refresh_token', 'id_token', 'session',
        'cookie', 'ssn', 'credit_card', 'cvv'
    }
    
    def __init__(self, name: str = __name__):
        """
        Initialize structured logger
        
        Args:
            name: Logger name (typically module name)
        """
        self.logger = logging.getLogger(name)
        self.environment = os.environ.get('ENVIRONMENT', 'dev')
        
        # Set log level based on environment
        if self.environment == 'prod':
            self.logger.setLevel(logging.INFO)
        else:
            self.logger.setLevel(logging.DEBUG)
        
        # Ensure handler is configured
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter('%(message)s'))
            self.logger.addHandler(handler)
    
    def _filter_sensitive_data(self, data: Any) -> Any:
        """
        Recursively filter sensitive data from log entries
        
        Args:
            data: Data to filter (dict, list, or primitive)
        
        Returns:
            Filtered data with sensitive fields redacted
        """
        if isinstance(data, dict):
            filtered = {}
            for key, value in data.items():
                # Check if key is sensitive (case-insensitive)
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_FIELDS):
                    filtered[key] = '[REDACTED]'
                else:
                    filtered[key] = self._filter_sensitive_data(value)
            return filtered
        elif isinstance(data, list):
            return [self._filter_sensitive_data(item) for item in data]
        else:
            return data
    
    def _create_log_entry(
        self,
        level: LogLevel,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        error: Optional[Exception] = None
    ) -> Dict[str, Any]:
        """
        Create structured log entry
        
        Args:
            level: Log level
            message: Log message
            context: Additional context data
            user_id: User ID if available
            request_id: Request ID for tracing
            error: Exception if logging an error
        
        Returns:
            Structured log entry as dictionary
        """
        from datetime import timezone
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'level': level.value,
            'environment': self.environment,
            'message': message
        }
        
        # Add optional fields
        if user_id:
            log_entry['user_id'] = user_id
        
        if request_id:
            log_entry['request_id'] = request_id
        
        if context:
            # Filter sensitive data from context
            filtered_context = self._filter_sensitive_data(context)
            log_entry['context'] = filtered_context
        
        if error:
            log_entry['error'] = {
                'type': type(error).__name__,
                'message': str(error)
            }
            # Only include stack trace in dev environment
            if self.environment == 'dev':
                import traceback
                log_entry['error']['stack_trace'] = traceback.format_exc()
        
        return log_entry
    
    def _log(
        self,
        level: LogLevel,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        error: Optional[Exception] = None
    ) -> None:
        """
        Internal logging method
        
        Args:
            level: Log level
            message: Log message
            context: Additional context
            user_id: User ID
            request_id: Request ID
            error: Exception
        """
        log_entry = self._create_log_entry(
            level=level,
            message=message,
            context=context,
            user_id=user_id,
            request_id=request_id,
            error=error
        )
        
        # Convert to JSON string
        log_string = json.dumps(log_entry)
        
        # Log at appropriate level
        if level == LogLevel.DEBUG:
            self.logger.debug(log_string)
        elif level == LogLevel.INFO:
            self.logger.info(log_string)
        elif level == LogLevel.WARNING:
            self.logger.warning(log_string)
        elif level == LogLevel.ERROR:
            self.logger.error(log_string)
        elif level == LogLevel.CRITICAL:
            self.logger.critical(log_string)
    
    def debug(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> None:
        """Log debug message"""
        self._log(LogLevel.DEBUG, message, context, user_id, request_id)
    
    def info(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> None:
        """Log info message"""
        self._log(LogLevel.INFO, message, context, user_id, request_id)
    
    def warning(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> None:
        """Log warning message"""
        self._log(LogLevel.WARNING, message, context, user_id, request_id)
    
    def error(
        self,
        message: str,
        error: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> None:
        """Log error message"""
        self._log(LogLevel.ERROR, message, context, user_id, request_id, error)
    
    def critical(
        self,
        message: str,
        error: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> None:
        """Log critical message"""
        self._log(LogLevel.CRITICAL, message, context, user_id, request_id, error)


# Global logger instance
logger = StructuredLogger(__name__)


def get_logger(name: str = __name__) -> StructuredLogger:
    """
    Get a structured logger instance
    
    Args:
        name: Logger name (typically module name)
    
    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(name)
