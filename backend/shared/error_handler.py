"""
Centralized error handling module for sanitized error responses
Implements security requirement 9: Proper error handling without exposing internals
"""
import json
from typing import Dict, Any, Optional
from enum import Enum

from shared.cors_utils import get_cors_headers
from shared.logger import get_logger


# Get structured logger
logger = get_logger(__name__)


class ErrorCode(Enum):
    """Standard error codes for the application"""
    BAD_REQUEST = "BAD_REQUEST"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS"


# Mapping of status codes to user-friendly messages
ERROR_MESSAGES = {
    400: "Invalid request data. Please check your input.",
    401: "Authentication required. Please sign in.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    405: "This method is not allowed for this resource.",
    409: "This resource already exists.",
    429: "Too many requests. Please try again in a moment.",
    500: "An error occurred. Please try again later.",
}


def log_error(
    error: Exception,
    context: Dict[str, Any],
    user_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> None:
    """
    Log detailed error information internally to CloudWatch
    
    Args:
        error: The exception that occurred
        context: Additional context about the error
        user_id: User ID if available (for tracking)
        request_id: Request ID for tracing
    """
    logger.error(
        message=f"Error occurred: {type(error).__name__}",
        error=error,
        context=context,
        user_id=user_id,
        request_id=request_id
    )


def sanitized_error_response(
    status_code: int,
    user_message: Optional[str] = None,
    error_code: Optional[ErrorCode] = None,
    details: Optional[Dict[str, Any]] = None,
    internal_error: Optional[Exception] = None,
    event: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Return a sanitized error response without exposing internal details
    
    Args:
        status_code: HTTP status code
        user_message: Optional custom user-friendly message
        error_code: Optional error code enum
        details: Optional additional details (must be safe for client)
        internal_error: Optional exception for internal logging
        event: Lambda event for CORS headers
        user_id: User ID for logging context
    
    Returns:
        Lambda response dictionary with sanitized error
    """
    # Log detailed error internally if provided
    if internal_error:
        log_error(
            internal_error,
            context={
                "status_code": status_code,
                "user_message": user_message,
                "details": details
            },
            user_id=user_id
        )
    
    # Get user-friendly message
    message = user_message or ERROR_MESSAGES.get(status_code, ERROR_MESSAGES[500])
    
    # Determine error code
    if not error_code:
        error_code_map = {
            400: ErrorCode.BAD_REQUEST,
            401: ErrorCode.UNAUTHORIZED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.NOT_FOUND,
            405: ErrorCode.METHOD_NOT_ALLOWED,
            409: ErrorCode.CONFLICT,
            429: ErrorCode.TOO_MANY_REQUESTS,
            500: ErrorCode.INTERNAL_ERROR,
        }
        error_code = error_code_map.get(status_code, ErrorCode.INTERNAL_ERROR)
    
    # Get CORS headers
    cors_headers = get_cors_headers(event) if event else {}
    
    # Build sanitized response
    error_body = {
        "data": None,
        "error": {
            "code": error_code.value,
            "message": message
        }
    }
    
    # Only include details if they are safe (no internal info)
    if details:
        error_body["error"]["details"] = details
    
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            **cors_headers
        },
        "body": json.dumps(error_body)
    }


def success_response(
    data: Any,
    status_code: int = 200,
    event: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Return a successful API response with proper CORS headers
    
    Args:
        data: Response data
        status_code: HTTP status code (default 200)
        event: Lambda event for CORS headers
    
    Returns:
        Lambda response dictionary
    """
    cors_headers = get_cors_headers(event) if event else {}
    
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            **cors_headers
        },
        "body": json.dumps({
            "data": data,
            "error": None
        })
    }


def handle_validation_error(
    validation_error: Exception,
    event: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle Pydantic validation errors with sanitized field-level details
    
    Args:
        validation_error: Pydantic ValidationError
        event: Lambda event for CORS headers
        user_id: User ID for logging
    
    Returns:
        Lambda response dictionary with validation errors
    """
    # Log the validation error internally
    log_error(
        validation_error,
        context={"error_type": "validation"},
        user_id=user_id
    )
    
    # Extract field-level errors (safe to expose)
    errors = {}
    if hasattr(validation_error, 'errors'):
        for error in validation_error.errors():
            field = '.'.join(str(loc) for loc in error['loc'])
            # Only include the message, not internal details
            errors[field] = error['msg']
    
    return sanitized_error_response(
        status_code=400,
        user_message="Validation failed. Please check your input.",
        error_code=ErrorCode.VALIDATION_ERROR,
        details=errors,
        event=event,
        user_id=user_id
    )


def handle_not_found(
    resource_type: str,
    event: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle resource not found errors
    
    Args:
        resource_type: Type of resource (e.g., "Profile", "Application")
        event: Lambda event for CORS headers
        user_id: User ID for logging
    
    Returns:
        Lambda response dictionary
    """
    return sanitized_error_response(
        status_code=404,
        user_message=f"{resource_type} not found.",
        error_code=ErrorCode.NOT_FOUND,
        event=event,
        user_id=user_id
    )


def handle_unauthorized(
    message: Optional[str] = None,
    event: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Handle unauthorized access errors
    
    Args:
        message: Optional custom message
        event: Lambda event for CORS headers
    
    Returns:
        Lambda response dictionary
    """
    return sanitized_error_response(
        status_code=401,
        user_message=message,
        error_code=ErrorCode.UNAUTHORIZED,
        event=event
    )


def handle_forbidden(
    message: Optional[str] = None,
    event: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle forbidden access errors
    
    Args:
        message: Optional custom message
        event: Lambda event for CORS headers
        user_id: User ID for logging
    
    Returns:
        Lambda response dictionary
    """
    return sanitized_error_response(
        status_code=403,
        user_message=message,
        error_code=ErrorCode.FORBIDDEN,
        event=event,
        user_id=user_id
    )


def handle_conflict(
    resource_type: str,
    event: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle resource conflict errors (e.g., already exists)
    
    Args:
        resource_type: Type of resource
        event: Lambda event for CORS headers
        user_id: User ID for logging
    
    Returns:
        Lambda response dictionary
    """
    return sanitized_error_response(
        status_code=409,
        user_message=f"{resource_type} already exists.",
        error_code=ErrorCode.CONFLICT,
        event=event,
        user_id=user_id
    )


def handle_internal_error(
    error: Exception,
    event: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Handle unexpected internal errors
    
    Args:
        error: The exception that occurred
        event: Lambda event for CORS headers
        user_id: User ID for logging
        context: Additional context for logging
    
    Returns:
        Lambda response dictionary with generic error message
    """
    # Log detailed error internally
    log_error(
        error,
        context=context or {},
        user_id=user_id
    )
    
    return sanitized_error_response(
        status_code=500,
        error_code=ErrorCode.INTERNAL_ERROR,
        internal_error=error,
        event=event,
        user_id=user_id
    )
