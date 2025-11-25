# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please email chris@cmgsoftwaresolutions.co instead of using the issue tracker.

**Please do not publicly disclose the vulnerability until it has been addressed.**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity

## Security Best Practices

This project follows AWS security best practices:

- All data encrypted in transit (HTTPS/TLS)
- DynamoDB encryption at rest
- Cognito for authentication
- IAM roles with least privilege
- No hardcoded credentials
- Regular dependency updates
