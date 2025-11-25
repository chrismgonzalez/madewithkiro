# Structured Logging Quick Reference

## Import

```python
from shared.logger import get_logger

logger = get_logger(__name__)
```

## Log Levels

```python
# Debug (dev only)
logger.debug("Detailed info", context={...})

# Info (normal operations)
logger.info("Operation completed", context={...})

# Warning (unexpected but handled)
logger.warning("Unusual condition", context={...})

# Error (operation failed)
logger.error("Operation failed", error=exception, context={...})

# Critical (system failure)
logger.critical("System down", error=exception, context={...})
```

## Common Patterns

### Start of Operation

```python
logger.info(
    message="Starting operation",
    context={'operation': 'create_application'},
    user_id=user_id,
    request_id=request_id
)
```

### Success

```python
logger.info(
    message="Operation completed successfully",
    context={
        'operation': 'create_application',
        'app_id': app_id,
        'app_name': app_name
    },
    user_id=user_id,
    request_id=request_id
)
```

### Error

```python
logger.error(
    message="Operation failed",
    error=exception,
    context={'operation': 'create_application'},
    user_id=user_id,
    request_id=request_id
)
```

## Best Practices

✅ **DO:**

- Always include context
- Use meaningful messages
- Include user_id and request_id
- Log before and after critical operations
- Use appropriate log levels

❌ **DON'T:**

- Log sensitive data (passwords, tokens, etc.)
- Use print() statements
- Log entire request/response bodies
- Over-log (every line of code)
- Use ERROR for warnings

## Sensitive Data

These fields are automatically redacted:

- password, token, secret, api_key
- authorization, credential
- access_token, refresh_token, id_token
- session, cookie
- ssn, credit_card, cvv

## Request ID

Get from Lambda event:

```python
request_id = event.get('requestContext', {}).get('requestId')
```

## Full Example

```python
from shared.logger import get_logger

logger = get_logger(__name__)

def create_application(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    request_id = event.get('requestContext', {}).get('requestId')

    logger.info(
        message="Creating application",
        context={'operation': 'create_application'},
        user_id=user_id,
        request_id=request_id
    )

    try:
        # ... business logic ...

        logger.info(
            message=f"Application created: {app_name}",
            context={'app_id': app_id, 'app_name': app_name},
            user_id=user_id,
            request_id=request_id
        )

        return success_response(app_data)

    except Exception as e:
        logger.error(
            message="Failed to create application",
            error=e,
            context={'operation': 'create_application'},
            user_id=user_id,
            request_id=request_id
        )
        raise
```
