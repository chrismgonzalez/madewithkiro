"""
CORS utility functions for validating and handling CORS headers
"""
import os
from typing import Dict, Any, Optional


def get_allowed_origins() -> list[str]:
    """
    Get list of allowed origins from environment variable
    
    Returns:
        List of allowed origin URLs
    """
    allowed_origins_str = os.environ.get('ALLOWED_ORIGINS', '')
    if not allowed_origins_str:
        return []
    
    # Split by comma and strip whitespace
    origins = [origin.strip() for origin in allowed_origins_str.split(',')]
    return [origin for origin in origins if origin]


def validate_origin(origin: Optional[str]) -> Optional[str]:
    """
    Validate Origin header against allowed origins list
    
    Args:
        origin: Origin header value from request
    
    Returns:
        The origin if valid, None otherwise
    """
    if not origin:
        return None
    
    allowed_origins = get_allowed_origins()
    
    # If no allowed origins configured, deny all
    if not allowed_origins:
        return None
    
    # Check if origin is in allowed list
    if origin in allowed_origins:
        return origin
    
    return None


def get_cors_headers(event: Dict[str, Any]) -> Dict[str, str]:
    """
    Get CORS headers for response based on request origin
    
    Args:
        event: Lambda event containing request headers
    
    Returns:
        Dictionary of CORS headers to include in response
    """
    headers = event.get('headers') or {}
    origin = headers.get('origin') or headers.get('Origin')
    
    # Validate origin
    validated_origin = validate_origin(origin)
    
    # If origin is valid, use it; otherwise use first allowed origin as fallback
    allowed_origins = get_allowed_origins()
    cors_origin = validated_origin if validated_origin else (allowed_origins[0] if allowed_origins else '*')
    
    return {
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true' if validated_origin else 'false'
    }
