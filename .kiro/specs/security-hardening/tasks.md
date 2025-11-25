q# Implementation Plan

- [x] 1. Remove hardcoded secrets and credentials from repository

  - Remove OAuth client IDs and secrets from samconfig.toml
  - Update samconfig.toml to reference SSM parameter paths instead of values
  - Verify .env.example contains only placeholder values
  - Add documentation for SSM parameter setup
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Update SAM template for environment-specific secrets

  - Modify template.yaml to use environment-prefixed SSM parameters
  - Update parameter definitions to include environment in SSM paths
  - Add conditions for dev vs prod secret resolution
  - Remove default values for sensitive parameters
  - _Requirements: 1.3, 3.1, 3.2_

- [x] 3. Implement environment-specific CORS configuration

  - Add CORS allowed origins as environment variables in SAM template
  - Update Lambda functions to validate Origin header against allowed list
  - Replace wildcard CORS with environment-specific origins
  - Add CORS helper function to shared utilities
  - _Requirements: 3.4, 7.1, 7.2, 7.3_

- [x] 4. Add API Gateway rate limiting and throttling

  - Configure throttle settings in SAM template for API Gateway
  - Set rate limits per environment (dev: higher, prod: standard)
  - Add per-method throttling for sensitive operations
  - Document rate limit values in template comments
  - _Requirements: 3.5_

- [x] 5. Implement sanitized error handling

  - Create centralized error handling module in shared utilities
  - Replace all error responses to use sanitized error function
  - Add internal logging for detailed errors
  - Map exception types to user-friendly messages
  - Remove stack traces from client responses
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. Add structured logging with CloudWatch

  - Create logging utility module with structured logging
  - Add CloudWatch log groups with retention policies in SAM template
  - Replace print statements with structured logger calls
  - Add log filtering to prevent sensitive data in logs
  - Configure different log levels for dev vs prod
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Implement security headers in CloudFront

  - Add ResponseHeadersPolicy to SAM template
  - Configure HSTS, X-Frame-Options, X-Content-Type-Options
  - Add Content-Security-Policy header
  - Set XSS Protection header
  - Configure Referrer-Policy
  - _Requirements: 7.4, 7.5_

- [x] 8. Enforce HTTPS everywhere

  - Update CloudFront to redirect HTTP to HTTPS
  - Verify API Gateway uses HTTPS endpoints
  - Update OAuth callback URLs to use HTTPS only
  - Add HTTPS enforcement to viewer protocol policy
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 9. Refine IAM permissions to least privilege

  - Review and restrict Lambda execution role permissions
  - Add resource-level restrictions to DynamoDB policies
  - Remove unnecessary permissions from IAM roles
  - Add condition keys for user-specific access
  - Document permission rationale in template comments
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 10. Enforce authentication on protected endpoints

  - Review all API Gateway endpoints and add Cognito authorizer
  - Remove development-only authentication bypass code
  - Update application handler to require authentication for mutations
  - Remove userId from request body (use Cognito claims)
  - Test authentication enforcement on all protected routes
  - _Requirements: 4.5_

- [x] 11. Remove development artifacts from codebase

  - Search and remove all TODO comments
  - Remove console.log statements from frontend code
  - Remove print statements from Lambda functions (keep structured logging)
  - Remove commented-out code blocks
  - Remove development-only code paths
  - Remove test credentials and mock data from production code
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 12. Clean up unused dependencies

  - Run npm audit and remove unused frontend packages
  - Review Python requirements and remove unused packages
  - Update package.json to remove dev-only dependencies from production
  - Run dependency vulnerability scans
  - _Requirements: 8.1, 8.2_

- [x] 13. Remove unused code and imports

  - Search for unused utility functions and remove them
  - Remove unused import statements
  - Remove unused components
  - Run linter to identify dead code
  - _Requirements: 8.3, 8.4_

- [ ] 14. Update documentation for production deployment

  - Update deployment guide with security considerations
  - Document SSM parameter setup process
  - Add OAuth provider configuration security notes
  - Document environment separation strategy
  - Add security best practices section to README
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 15. Configure CloudWatch alarms for security events

  - Add CloudWatch alarms for authentication failures
  - Create alarm for rate limit violations
  - Add alarm for Lambda error rates
  - Configure SNS topic for security alerts
  - _Requirements: 5.5_

- [ ]\* 16. Write property-based tests for security properties
- [ ]\* 16.1 Write property test for secrets detection

  - **Property 1: No secrets in repository**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
  - Generate random file contents and verify no secret patterns detected
  - Test with various secret formats (API keys, tokens, credentials)

- [ ]\* 16.2 Write property test for CORS validation

  - **Property 3: CORS origin validation**
  - **Validates: Requirements 7.1, 7.2, 7.3**
  - Generate random origin headers and verify only allowed origins accepted
  - Test with various origin formats and edge cases

- [ ]\* 16.3 Write property test for error sanitization

  - **Property 4: Error message sanitization**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
  - Generate random exceptions and verify responses don't leak internals
  - Test with various error types and messages

- [ ]\* 16.4 Write property test for HTTPS enforcement

  - **Property 5: HTTPS enforcement**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
  - Generate random HTTP requests and verify HTTPS redirect
  - Test with various URL formats and protocols

- [ ]\* 16.5 Write property test for authentication enforcement

  - **Property 7: Authentication enforcement**
  - **Validates: Requirements 4.5**
  - Generate random requests to protected endpoints without tokens
  - Verify all return 401 status

- [ ]\* 17. Write unit tests for security utilities

  - Test CORS origin validation function
  - Test error sanitization function
  - Test structured logging function
  - Test security header generation
  - _Requirements: All security-related requirements_

- [ ]\* 18. Run security scanning tools

  - Run npm audit for frontend vulnerabilities
  - Run pip-audit for Python vulnerabilities
  - Run trufflehog to scan for secrets in git history
  - Run cfn-lint on SAM template
  - Run bandit for Python security issues
  - _Requirements: 1.4, 8.1, 8.2_

- [x] 19. Perform manual security review

  - Review all environment variables and parameters
  - Verify no secrets in git history
  - Test authentication flows manually
  - Review CloudWatch logs for sensitive data
  - Verify CORS configuration in browser
  - Test rate limiting with load testing
  - Review IAM policies for least privilege
  - Verify security headers with online checker
  - Test error responses don't leak information
  - Verify HTTPS enforcement
  - _Requirements: All requirements_

- [x] 20. Update .gitignore for security

  - Ensure all environment files are ignored
  - Add patterns for AWS credentials
  - Add patterns for local secrets
  - Verify samconfig.toml is tracked but secrets are not
  - _Requirements: 1.1, 1.2_

- [x] 21. Final checkpoint - Verify all security measures
  - Ensure all tests pass
  - Verify no secrets in repository
  - Confirm CORS is properly configured
  - Validate error messages are sanitized
  - Check security headers are present
  - Verify HTTPS enforcement
  - Confirm authentication is enforced
  - Validate IAM permissions are least privilege
  - Review CloudWatch logs and alarms
  - Ask the user if questions arise
