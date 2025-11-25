# Structured Logging Implementation

## Overview

The MadeWithKiro application uses structured logging with CloudWatch for comprehensive monitoring and security auditing. This implementation follows security requirement 5 for proper logging and monitoring.

## Features

### 1. JSON-Formatted Logs

All logs are output in JSON format for easy parsing with CloudWatch Insights:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "environment": "prod",
  "message": "Successfully created application",
  "user_id": "user-123",
  "request_id": "req-456",
  "context": {
    "app_id": "app-789",
    "app_name": "My Application"
  }
}
```

### 2. Sensitive Data Filtering

The logger automatically filters sensitive information from logs:

- Passwords
- API keys and tokens
- Authentication credentials
- Session data
- Credit card information

Sensitive fields are replaced with `[REDACTED]` in log output.

### 3. Environment-Aware Log Levels

- **Development**: DEBUG level (verbose logging)
- **Production**: INFO level (standard logging)

Stack traces are only included in development environments.

### 4. CloudWatch Integration

Log groups are automatically created with retention policies:

- **Development**: 7 days retention
- **Production**: 30 days retention

## Usage

### Basic Logging

```python
from shared.logger import get_logger

logger = get_logger(__name__)

# Info logging
logger.info(
    message="User profile created",
    context={'profile_id': profile_id},
    user_id=user_id
)

# Error logging
logger.error(
    message="Failed to create application",
    error=exception,
    context={'operation': 'create_application'},
    user_id=user_id
)
```

### Log Levels

```python
# Debug (dev only)
logger.debug("Detailed debugging information", context={...})

# Info
logger.info("Normal operation", context={...})

# Warning
logger.warning("Something unexpected happened", context={...})

# Error
logger.error("An error occurred", error=exception, context={...})

# Critical
logger.critical("System failure", error=exception, context={...})
```

### Including Context

Always include relevant context for troubleshooting:

```python
logger.info(
    message="Application created successfully",
    context={
        'app_id': app_id,
        'app_name': app_name,
        'tags': tags,
        'operation': 'create_application'
    },
    user_id=user_id,
    request_id=request_id
)
```

## CloudWatch Log Groups

### Profile Function

- **Log Group**: `/aws/lambda/MadeWithKiro-Profile-{Environment}`
- **Retention**: 7 days (dev), 30 days (prod)

### Application Function

- **Log Group**: `/aws/lambda/MadeWithKiro-Application-{Environment}`
- **Retention**: 7 days (dev), 30 days (prod)

## CloudWatch Insights Queries

### Find All Errors

```
fields @timestamp, message, error.type, error.message, user_id
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

### Track User Activity

```
fields @timestamp, message, context.operation, user_id
| filter user_id = "specific-user-id"
| sort @timestamp desc
```

### Monitor Application Creation

```
fields @timestamp, message, context.app_name, user_id
| filter message like /created application/
| sort @timestamp desc
```

### Find Authentication Failures

```
fields @timestamp, message, context
| filter level = "WARNING" and message like /authentication/
| sort @timestamp desc
```

## Security Considerations

### What Gets Logged

✅ **Safe to log:**

- User IDs (not PII)
- Operation names
- Resource IDs
- Timestamps
- Error types
- Request IDs

❌ **Never logged:**

- Passwords
- API keys or tokens
- Session tokens
- Credit card numbers
- Full request/response bodies (may contain sensitive data)

### Sensitive Data Protection

The logger automatically filters these field names (case-insensitive):

- password
- token
- secret
- api_key
- authorization
- credential
- access_token
- refresh_token
- id_token
- session
- cookie
- ssn
- credit_card
- cvv

## Best Practices

1. **Always use structured logging** instead of print statements
2. **Include context** for every log entry
3. **Use appropriate log levels** (don't log everything as ERROR)
4. **Include request_id** for request tracing
5. **Log before and after critical operations**
6. **Never log sensitive data** directly
7. **Use meaningful messages** that explain what happened

## Example: Complete Request Flow

```python
from shared.logger import get_logger

logger = get_logger(__name__)

def create_application(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    request_id = event.get('requestContext', {}).get('requestId')

    # Log start of operation
    logger.info(
        message="Creating new application",
        context={'operation': 'create_application'},
        user_id=user_id,
        request_id=request_id
    )

    try:
        # ... business logic ...

        # Log success
        logger.info(
            message=f"Successfully created application: {app_name}",
            context={
                'app_id': app_id,
                'app_name': app_name
            },
            user_id=user_id,
            request_id=request_id
        )

        return success_response(app_data)

    except ValidationError as e:
        # Log validation errors
        logger.warning(
            message="Validation error during application creation",
            context={'operation': 'create_application'},
            user_id=user_id,
            request_id=request_id
        )
        return handle_validation_error(e)

    except Exception as e:
        # Log unexpected errors
        logger.error(
            message="Failed to create application",
            error=e,
            context={'operation': 'create_application'},
            user_id=user_id,
            request_id=request_id
        )
        return handle_internal_error(e)
```

## Monitoring and Alerts

CloudWatch alarms can be configured to alert on:

- High error rates
- Authentication failures
- Unusual activity patterns
- Performance degradation

See the SAM template for alarm configuration (future enhancement).
