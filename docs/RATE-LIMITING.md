# API Gateway Rate Limiting Configuration

## Overview

Rate limiting and throttling have been configured on the API Gateway to protect the application from abuse and ensure fair resource usage across all users. The configuration uses environment-specific limits with higher thresholds for development and stricter limits for production.

## Rate Limiting Strategy

### Throttling Metrics

- **Rate Limit**: Maximum number of requests per second (steady-state)
- **Burst Limit**: Maximum number of concurrent requests allowed

### Environment-Specific Configuration

#### Production Environment

- Conservative limits to prevent abuse
- Protects backend resources from overload
- Ensures fair usage across all users

#### Development Environment

- Higher limits (5x production) for testing
- Allows rapid iteration during development
- Facilitates load testing and performance validation

## Configured Limits

### Default Throttling (All Endpoints)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 100                  | 200                      |
| Development | 500                  | 1000                     |

### Public Read Endpoints (Higher Limits)

#### GET /applications (Gallery Browsing)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 200                  | 400                      |
| Development | 1000                 | 2000                     |

**Rationale**: Public gallery is the most frequently accessed endpoint. Higher limits ensure smooth browsing experience.

#### GET /applications/{appId} (View Application)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 200                  | 400                      |
| Development | 1000                 | 2000                     |

**Rationale**: Individual application views are common when users browse the gallery. Higher limits support this use case.

#### GET /profile/{userId} (View Profile)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 150                  | 300                      |
| Development | 750                  | 1500                     |

**Rationale**: Profile viewing is frequent but less common than application browsing. Moderate-high limits.

### Create Operations (Lower Limits)

#### POST /applications (Create Application)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 10                   | 20                       |
| Development | 50                   | 100                      |

**Rationale**: Creating applications is a write operation that should be rate-limited to prevent spam and abuse.

#### POST /profile (Create Profile)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 5                    | 10                       |
| Development | 25                   | 50                       |

**Rationale**: Profile creation happens once per user. Very low limits prevent automated account creation.

### Update Operations (Standard Limits)

#### PUT /applications/{appId} (Update Application)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 50                   | 100                      |
| Development | 250                  | 500                      |

**Rationale**: Updates are less frequent than reads but more common than creates. Standard limits.

#### PUT /profile (Update Profile)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 50                   | 100                      |
| Development | 250                  | 500                      |

**Rationale**: Profile updates are infrequent. Standard limits are sufficient.

### Delete Operations (Lower Limits)

#### DELETE /applications/{appId} (Delete Application)

| Environment | Rate Limit (req/sec) | Burst Limit (concurrent) |
| ----------- | -------------------- | ------------------------ |
| Production  | 20                   | 40                       |
| Development | 100                  | 200                      |

**Rationale**: Deletions are destructive operations. Lower limits provide safety against accidental bulk deletions.

## Error Responses

When rate limits are exceeded, API Gateway returns:

```json
{
  "message": "Too Many Requests"
}
```

**HTTP Status Code**: `429 Too Many Requests`

**Headers**:

- `Retry-After`: Indicates when the client can retry (in seconds)

## Client-Side Handling

### Recommended Retry Strategy

1. **Detect 429 Response**: Check for HTTP 429 status code
2. **Exponential Backoff**: Wait progressively longer between retries
3. **Respect Retry-After**: Use the `Retry-After` header if present
4. **Maximum Retries**: Limit to 3-5 retry attempts
5. **User Feedback**: Show appropriate message to users

### Example Implementation

```typescript
async function apiCallWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      if (attempt === maxRetries) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt) * 1000; // Exponential backoff

      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }
}
```

## Monitoring

### CloudWatch Metrics

The following metrics are automatically collected (MetricsEnabled: true):

- **Count**: Total number of API requests
- **4XXError**: Number of client errors (including 429)
- **5XXError**: Number of server errors
- **Latency**: Request processing time
- **IntegrationLatency**: Backend processing time

**Note**: API Gateway access logging is not enabled by default as it requires additional IAM role configuration at the AWS account level. To enable logging:

1. Create an IAM role with CloudWatch Logs write permissions
2. Set the role ARN in API Gateway account settings
3. Add `LoggingLevel: INFO` to MethodSettings in template.yaml
4. Redeploy the stack

### Recommended Alarms

1. **High 429 Rate**: Alert when throttling affects >5% of requests
2. **Sustained High Traffic**: Alert when approaching rate limits
3. **Unusual Patterns**: Detect potential abuse or DDoS attempts

## Adjusting Limits

### When to Increase Limits

- Legitimate traffic patterns exceed current limits
- User complaints about rate limiting
- Business growth requires higher throughput
- Load testing reveals bottlenecks

### When to Decrease Limits

- Detecting abuse patterns
- Cost optimization requirements
- Backend capacity constraints
- Security concerns

### How to Adjust

Edit `template.yaml` and modify the `MethodSettings` section:

```yaml
MethodSettings:
  - ResourcePath: "/applications"
    HttpMethod: "POST"
    ThrottlingRateLimit: !If [IsProduction, 20, 100] # Increased from 10 to 20
    ThrottlingBurstLimit: !If [IsProduction, 40, 200] # Increased from 20 to 40
```

Then redeploy:

```bash
make deploy-prod
```

## Best Practices

1. **Monitor Regularly**: Review CloudWatch metrics weekly
2. **Test Limits**: Validate limits during load testing
3. **Document Changes**: Record reasons for limit adjustments
4. **User Communication**: Inform users of rate limits in API documentation
5. **Graceful Degradation**: Implement proper error handling in clients
6. **Cache Responses**: Reduce API calls by caching on client side
7. **Batch Operations**: Combine multiple operations when possible

## Security Considerations

- Rate limiting is a defense-in-depth measure, not the only security control
- Combine with authentication, authorization, and input validation
- Monitor for patterns indicating abuse or attacks
- Consider IP-based rate limiting for additional protection
- Review and adjust limits based on actual usage patterns

## Related Requirements

This configuration satisfies:

- **Requirement 3.5**: API Gateway rate limiting for production traffic
- **Design Property 2**: Environment-specific configuration
- **Security Best Practice**: Protection against abuse and DDoS

## Additional Resources

- [AWS API Gateway Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [AWS SAM MethodSettings](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-methodsetting.html)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
