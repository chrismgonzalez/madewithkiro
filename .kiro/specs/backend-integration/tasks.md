# Implementation Plan

## BDD/TDD Approach

This implementation follows Behavior-Driven Development (BDD) and Test-Driven Development (TDD) methodology:

1. **Write Acceptance Tests First** - Given-When-Then format describing expected behavior
2. **Red** - Run tests and watch them fail
3. **Green** - Write minimal code to make tests pass
4. **Refactor** - Improve code quality while keeping tests green

Each task follows this pattern to ensure proper SDLC practices.

---

- [x] 1. Set up infrastructure and dependencies

  - Install @tanstack/react-query and configure QueryClient
  - Install fast-check for property-based testing
  - Add environment variables for API configuration (.env.development, .env.production)
  - Create environment configuration module with validation
  - Configure test scripts in package.json
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Create API client foundation (BDD/TDD)
- [x] 2.1 Write acceptance tests for API client

  - **GIVEN** the API client is initialized
  - **WHEN** I make any request
  - **THEN** the request should include Content-Type and Accept headers
  - **GIVEN** the API client receives a valid JSON response
  - **WHEN** the response is processed
  - **THEN** the response body should be automatically parsed into a JavaScript object
  - **GIVEN** the API client encounters a network error
  - **WHEN** the error occurs
  - **THEN** a descriptive error with the failure reason should be thrown
  - **GIVEN** the API client receives a non-2xx status code
  - **WHEN** the response is processed
  - **THEN** an error containing the status code and error message should be thrown
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]\* 2.2 Write property test for standard headers inclusion

  - **Property 1: Standard headers inclusion**
  - **Validates: Requirements 1.2**

- [ ]\* 2.3 Write property test for JSON response parsing

  - **Property 2: JSON response parsing**
  - **Validates: Requirements 1.3**

- [ ]\* 2.4 Write property test for error status code handling

  - **Property 3: Error status code handling**
  - **Validates: Requirements 1.5**

- [x] 2.5 Implement core API client (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create ApiClient class with base configuration from environment variables
  - **GREEN**: Implement request method with standard headers (Content-Type, Accept)
  - **GREEN**: Add JSON response parsing
  - **GREEN**: Add error handling for network errors
  - **GREEN**: Add error handling for non-2xx responses
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Note: Authentication not yet implemented

  - All API endpoints are public for this phase
  - Use hardcoded test user ID (test-user-001) for development
  - Authentication will be added in a future spec

- [x] 4. Implement response interceptors and error handling (BDD/TDD)
- [x] 4.1 Write acceptance tests for response interceptor

  - **GIVEN** the API returns a 404 Not Found response
  - **WHEN** the response is processed
  - **THEN** the system should display an error message indicating the resource was not found
  - **GIVEN** the API returns a 500 Internal Server Error response
  - **WHEN** the response is processed
  - **THEN** the system should display a generic error message and log the error details
  - **GIVEN** the API returns validation errors in a 400 Bad Request response
  - **WHEN** the response is processed
  - **THEN** the system should extract and display field-specific error messages
  - **GIVEN** the API returns a 503 Service Unavailable response
  - **WHEN** the response is processed
  - **THEN** the system should display a message indicating the service is temporarily unavailable
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.2 Write acceptance tests for retry logic

  - **GIVEN** an API request fails with a network error
  - **WHEN** the error occurs
  - **THEN** the system should automatically retry the request up to 3 times with exponential backoff
  - **GIVEN** an API request fails with a 5xx server error
  - **WHEN** the error occurs
  - **THEN** the system should automatically retry the request up to 2 times
  - **GIVEN** an API request fails with a 4xx client error
  - **WHEN** the error occurs
  - **THEN** the system should NOT retry the request automatically
  - **GIVEN** all retry attempts fail
  - **WHEN** the final attempt completes
  - **THEN** the system should display an error message to the user
  - **GIVEN** a retry succeeds
  - **WHEN** the request completes
  - **THEN** the system should process the response normally without indicating that retries occurred
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 4.3 Implement response interceptor (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Handle 404 Not Found (show not found message)
  - **GREEN**: Handle 500 Internal Server Error (show generic error)
  - **GREEN**: Handle 400 Bad Request validation errors
  - **GREEN**: Handle 503 Service Unavailable (show service unavailable message)
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.4 Implement retry logic with exponential backoff (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Retry network errors up to 3 times
  - **GREEN**: Retry 5xx errors up to 2 times
  - **GREEN**: Skip retry for 4xx errors
  - **GREEN**: Implement exponential backoff with jitter (1s, 2s, 4s)
  - **GREEN**: Display error message after all retries fail
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 5. Create profile service (BDD/TDD)
- [x] 5.1 Write acceptance tests for profile service

  - **GIVEN** I call getProfile with a valid userId
  - **WHEN** the request is made
  - **THEN** a GET request should be sent to the profile endpoint and return the user profile data
  - **GIVEN** I call createProfile with valid profile data
  - **WHEN** the request is made
  - **THEN** a POST request should be sent and return the created profile
  - **GIVEN** I call updateProfile with userId and valid updated data
  - **WHEN** the request is made
  - **THEN** a PUT request should be sent and return the updated profile
  - **GIVEN** a profile API call fails with validation errors
  - **WHEN** the error response is processed
  - **THEN** the system should return an object mapping field names to error messages
  - **GIVEN** a profile API call succeeds
  - **WHEN** the response is processed
  - **THEN** the system should return the profile data in a consistent format matching the UserProfile type
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]\* 5.2 Write property test for profile API request correctness

  - **Property 5: Profile API request correctness**
  - **Validates: Requirements 4.1**

- [ ]\* 5.3 Write property test for profile creation request correctness

  - **Property 6: Profile creation request correctness**
  - **Validates: Requirements 4.2**

- [ ]\* 5.4 Write property test for profile update request correctness

  - **Property 7: Profile update request correctness**
  - **Validates: Requirements 4.3**

- [ ]\* 5.5 Write property test for validation error parsing

  - **Property 8: Validation error parsing**
  - **Validates: Requirements 4.4**

- [ ]\* 5.6 Write property test for profile response type consistency

  - **Property 9: Profile response type consistency**
  - **Validates: Requirements 4.5**

- [x] 5.7 Implement profile API service (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement getProfile function
  - **GREEN**: Implement createProfile function
  - **GREEN**: Implement updateProfile function
  - **GREEN**: Add validation error parsing
  - **GREEN**: Ensure response types match UserProfile interface
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Create application service (BDD/TDD)
- [x] 6.1 Write acceptance tests for application service

  - **GIVEN** I call listApplications without parameters
  - **WHEN** the request is made
  - **THEN** a GET request should be sent to the applications endpoint and return all public applications
  - **GIVEN** I call listApplications with a userId parameter
  - **WHEN** the request is made
  - **THEN** a GET request should be sent with the userId query parameter and return that user's applications
  - **GIVEN** I call createApplication with valid application data and userId
  - **WHEN** the request is made
  - **THEN** a POST request should be sent and return the created application
  - **GIVEN** an application API call fails with validation errors
  - **WHEN** the error response is processed
  - **THEN** the system should return an object mapping field names to error messages
  - **GIVEN** an application API call succeeds
  - **WHEN** the response is processed
  - **THEN** the system should return the application data in a consistent format matching the Application type
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]\* 6.2 Write property test for user applications query correctness

  - **Property 10: User applications query correctness**
  - **Validates: Requirements 5.2**

- [ ]\* 6.3 Write property test for application creation request correctness

  - **Property 11: Application creation request correctness**
  - **Validates: Requirements 5.3**

- [ ]\* 6.4 Write property test for application response type consistency

  - **Property 12: Application response type consistency**
  - **Validates: Requirements 5.5**

- [x] 6.5 Implement application API service (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement listApplications function (with optional userId)
  - **GREEN**: Implement createApplication function
  - **GREEN**: Add validation error parsing
  - **GREEN**: Ensure response types match Application interface
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Set up TanStack Query and create hooks (BDD/TDD)
- [x] 7.1 Write acceptance tests for TanStack Query configuration

  - **GIVEN** the application initializes
  - **WHEN** TanStack Query is configured
  - **THEN** the QueryClient should have a stale time of 5 minutes
  - **GIVEN** the application initializes
  - **WHEN** TanStack Query is configured
  - **THEN** the QueryClient should have a cache time of 10 minutes
  - **GIVEN** the application initializes
  - **WHEN** TanStack Query is configured
  - **THEN** the QueryClient should retry failed requests 2 times
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 7.2 Write acceptance tests for useProfile hook

  - **GIVEN** I use the useProfile hook with a userId
  - **WHEN** the hook initializes
  - **THEN** it should fetch the profile data from the API
  - **GIVEN** I call updateProfile with new data
  - **WHEN** the mutation executes
  - **THEN** the UI should immediately update with the new values (optimistic update)
  - **GIVEN** a profile update API call succeeds
  - **WHEN** the response is received
  - **THEN** the optimistically updated UI state should be kept
  - **GIVEN** a profile update API call fails
  - **WHEN** the error is received
  - **THEN** the UI should revert to the previous state and display an error message
  - _Requirements: 7.1, 7.2, 7.3, 10.1, 10.2, 10.3_

- [x] 7.3 Write acceptance tests for useApplications hook

  - **GIVEN** I use the useApplications hook
  - **WHEN** the hook initializes
  - **THEN** it should fetch all applications from the API
  - **GIVEN** I use the useApplications hook with a userId
  - **WHEN** the hook initializes
  - **THEN** it should fetch that user's applications from the API
  - **GIVEN** I call createApplication with new data
  - **WHEN** the mutation executes
  - **THEN** the application should be added to the gallery immediately with a pending indicator
  - **GIVEN** an application creation API call succeeds
  - **WHEN** the response is received
  - **THEN** the pending application should be replaced with the confirmed data from the server
  - **GIVEN** an application creation API call fails
  - **WHEN** the error is received
  - **THEN** the optimistic application should be removed and an error message should be displayed
  - _Requirements: 7.1, 7.2, 7.3, 10.4, 10.5_

- [x] 7.4 Configure QueryClient and provider (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create QueryClient with staleTime: 5 minutes
  - **GREEN**: Set cacheTime: 10 minutes
  - **GREEN**: Set retry: 2
  - **GREEN**: Set refetchOnWindowFocus: false
  - **GREEN**: Wrap app with QueryClientProvider
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 7.5 Create useProfile hook (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement useQuery for profile fetching with query key ['profile', userId]
  - **GREEN**: Implement useMutation for profile updates
  - **GREEN**: Add optimistic updates with onMutate
  - **GREEN**: Add rollback on error with onError
  - **GREEN**: Add cache invalidation on success with onSettled
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 7.1, 7.2, 7.3, 10.1, 10.2, 10.3_

- [x] 7.6 Create useApplications hook (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement useQuery for applications fetching with dynamic query key
  - **GREEN**: Implement useMutation for application creation
  - **GREEN**: Add optimistic updates with temporary ID and pending indicator
  - **GREEN**: Replace temp app with real one on success
  - **GREEN**: Remove optimistic app on error
  - **GREEN**: Invalidate all application queries on success
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 7.1, 7.2, 7.3, 10.4, 10.5_

- [ ] 8. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement request cancellation (BDD/TDD)
- [x] 9.1 Write acceptance tests for request cancellation

  - **GIVEN** a component unmounts during an API request
  - **WHEN** the unmount occurs
  - **THEN** the pending request should be cancelled using AbortController
  - **GIVEN** a user navigates away from a page with pending requests
  - **WHEN** the navigation occurs
  - **THEN** all pending requests for that page should be cancelled
  - **GIVEN** a new search or filter is applied before the previous request completes
  - **WHEN** the new request starts
  - **THEN** the previous request should be cancelled
  - **GIVEN** a cancelled request completes
  - **WHEN** the response arrives
  - **THEN** the response should be ignored and component state should not update
  - **GIVEN** a request is cancelled
  - **WHEN** the cancellation occurs
  - **THEN** no error messages should be displayed to the user
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 9.2 Add AbortController support to API client (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Accept signal parameter in request options
  - **GREEN**: Pass signal to fetch call
  - **GREEN**: Handle AbortError gracefully (don't show error to user)
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 9.3 Implement request cancellation in hooks (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Cancel requests on component unmount using useEffect cleanup
  - **GREEN**: Cancel previous requests on new requests
  - **GREEN**: Ignore cancelled request responses
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 10. Add TypeScript type safety (BDD/TDD)
- [x] 10.1 Write acceptance tests for TypeScript types

  - **GIVEN** I define API service functions
  - **WHEN** I use TypeScript interfaces
  - **THEN** the interfaces should match the backend Pydantic models
  - **GIVEN** an API response is received
  - **WHEN** the response is processed
  - **THEN** the system should validate that the response structure matches the expected TypeScript type
  - **GIVEN** API response validation fails
  - **WHEN** the validation error occurs
  - **THEN** the system should throw a type error with details about the mismatch
  - _Requirements: 14.1, 14.2, 14.3_

- [ ]\* 10.2 Write property test for response type validation

  - **Property 15: Response type validation**
  - **Validates: Requirements 14.2**

- [x] 10.3 Create TypeScript interfaces (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Define UserProfile interface matching backend
  - **GREEN**: Define CreateProfileData interface matching backend
  - **GREEN**: Define UpdateProfileData interface matching backend
  - **GREEN**: Define Application interface matching backend
  - **GREEN**: Define CreateApplicationData interface matching backend
  - **GREEN**: Define ApiResponse and ApiError interfaces
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 14.1_

- [x] 10.4 Implement runtime type validation (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add response validation using Zod schemas
  - **GREEN**: Throw type errors on validation failure
  - **GREEN**: Log validation errors in development
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 14.2, 14.3_

- [ ] 11. Implement API request logging (BDD/TDD)
- [ ] 11.1 Write acceptance tests for API logging

  - **GIVEN** an API request is made in development mode
  - **WHEN** the request is sent
  - **THEN** the system should log the request method, URL, and headers (with tokens redacted) to the console
  - **GIVEN** an API response is received in development mode
  - **WHEN** the response arrives
  - **THEN** the system should log the status code, response time, and response body to the console
  - **GIVEN** an API request fails in development mode
  - **WHEN** the error occurs
  - **THEN** the system should log the error details including stack trace to the console
  - **GIVEN** the application is running in production mode
  - **WHEN** API requests are made
  - **THEN** the system should NOT log detailed API information to the console
  - **GIVEN** API requests are logged
  - **WHEN** logging occurs
  - **THEN** the system should redact sensitive information such as authentication tokens
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 11.2 Add development logging to API client (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Log request method, URL, and headers in development
  - **GREEN**: Redact Authorization header tokens
  - **GREEN**: Log response status, time, and body in development
  - **GREEN**: Log errors with stack traces in development
  - **GREEN**: Skip logging in production mode
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 12. Replace mock services in components (BDD/TDD)
- [x] 12.1 Write acceptance tests for component API integration

  - **GIVEN** the ProfilePage loads
  - **WHEN** the page renders
  - **THEN** it should fetch the user profile from the backend API instead of mock data
  - **GIVEN** the GalleryPage loads
  - **WHEN** the page renders
  - **THEN** it should fetch applications from the backend API instead of mock data
  - **GIVEN** a user submits the profile form
  - **WHEN** the form is submitted
  - **THEN** the data should be sent to the backend API instead of simulating success with mock data
  - **GIVEN** a user submits the application form
  - **WHEN** the form is submitted
  - **THEN** the data should be sent to the backend API instead of simulating success with mock data
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]\* 12.2 Write property test for service signature compatibility

  - **Property 13: Service signature compatibility**
  - **Validates: Requirements 6.5**

- [x] 12.3 Update ProfilePage to use real API (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Replace mock data service with useProfile hook
  - **GREEN**: Update loading state handling
  - **GREEN**: Update error display
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.2_

- [x] 12.4 Update GalleryPage to use real API (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Replace mock data service with useApplications hook
  - **GREEN**: Update loading state handling
  - **GREEN**: Update error display
  - **GREEN**: Update empty state handling
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.1_

- [x] 12.5 Update ProfileForm to use real API (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Replace mock submission with useProfile mutation
  - **GREEN**: Update success/error handling
  - **GREEN**: Add optimistic updates
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.3_

- [x] 12.6 Update ApplicationForm to use real API (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Replace mock submission with useApplications mutation
  - **GREEN**: Update success/error handling
  - **GREEN**: Add optimistic updates
  - **GREEN**: Redirect to gallery on success
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.4_

- [x] 13. Implement toast notifications (BDD/TDD)
- [x] 13.1 Write acceptance tests for toast notifications

  - **GIVEN** a user successfully creates a profile
  - **WHEN** the creation completes
  - **THEN** the system should display a success toast notification
  - **GIVEN** a user successfully updates a profile
  - **WHEN** the update completes
  - **THEN** the system should display a success toast notification
  - **GIVEN** a user successfully creates an application
  - **WHEN** the creation completes
  - **THEN** the system should display a success toast notification and redirect to the gallery
  - **GIVEN** an API operation fails
  - **WHEN** the error occurs
  - **THEN** the system should display an error toast notification with the error message
  - **GIVEN** a toast notification is displayed
  - **WHEN** 5 seconds pass
  - **THEN** the system should automatically dismiss the notification
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 13.2 Add toast notification library (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Install react-hot-toast or similar
  - **GREEN**: Configure toast provider
  - **GREEN**: Create toast utility functions
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 13.3 Add success and error notifications (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Show toast on profile create success
  - **GREEN**: Show toast on profile update success
  - **GREEN**: Show toast on application create success
  - **GREEN**: Show toast on API errors with error message
  - **GREEN**: Auto-dismiss after 5 seconds
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 14. Implement pagination support (BDD/TDD)
- [x] 14.1 Write acceptance tests for pagination

  - **GIVEN** the applications list exceeds 50 items
  - **WHEN** the gallery loads
  - **THEN** the system should request paginated results from the backend API
  - **GIVEN** paginated results are displayed
  - **WHEN** the gallery renders
  - **THEN** the system should show page navigation controls in the UI
  - **GIVEN** a user clicks the next page button
  - **WHEN** the button is clicked
  - **THEN** the system should fetch the next batch of results using the pagination token
  - **GIVEN** a user clicks the previous page button
  - **WHEN** the button is clicked
  - **THEN** the system should display the previously loaded results from cache
  - **GIVEN** the last page is reached
  - **WHEN** the page renders
  - **THEN** the system should disable the next page navigation control
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 14.2 Add pagination to applications list (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Update listApplications to accept pagination params
  - **GREEN**: Implement page navigation controls
  - **GREEN**: Cache paginated results using TanStack Query
  - **GREEN**: Disable navigation at boundaries
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 15. Create DynamoDB seed script (BDD/TDD)
- [x] 15.1 Write acceptance tests for seed script

  - **GIVEN** I run the seed script on an empty database
  - **WHEN** the script executes
  - **THEN** it should create exactly 1 user profile with userId "test-user-001" and complete profile information in DynamoDB
  - **GIVEN** I run the seed script on an empty database
  - **WHEN** the script executes
  - **THEN** it should create at least 10 applications associated with test-user-001 in DynamoDB
  - **GIVEN** I run the seed script on an empty database
  - **WHEN** the script executes
  - **THEN** it should include applications with various tags for testing filtering functionality
  - **GIVEN** I run the seed script on an empty database
  - **WHEN** the script executes
  - **THEN** it should include applications with and without optional GitHub URLs
  - **GIVEN** I run the seed script on a database with existing data
  - **WHEN** the script executes without the clean flag
  - **THEN** it should check for existing data and skip seeding to prevent duplicates
  - **GIVEN** the seed script completes
  - **WHEN** execution finishes
  - **THEN** it should output a summary of created profile and applications
  - **GIVEN** I run the seed script with the clean flag
  - **WHEN** the script executes
  - **THEN** it should delete all existing data before seeding new data
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

- [x] 15.2 Implement seed script in Python (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create seed_db.py script with boto3
  - **GREEN**: Define seed data for 1 test user (test-user-001) with all fields
  - **GREEN**: Define seed data for 10+ applications associated with test user
  - **GREEN**: Implement check for existing data (skip if exists)
  - **GREEN**: Implement clean flag to delete existing data
  - **GREEN**: Output summary of created items
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

- [x] 15.3 Add Makefile commands for seeding

  - Add `make seed-db` command
  - Add `make seed-db-clean` command
  - _Requirements: 20.1-20.8_

- [x] 15.4 Add test user ID constant to frontend

  - Create constant TEST_USER_ID = "test-user-001" in src/constants/api.ts
  - Use this constant throughout the application for creating/updating data
  - _Requirements: 20.8_

- [x] 16. Add environment-specific configuration (BDD/TDD)
- [x] 16.1 Write acceptance tests for environment configuration

  - **GIVEN** the frontend application builds for development
  - **WHEN** the build process runs
  - **THEN** the system should use the API Gateway URL from the development environment variables
  - **GIVEN** the frontend application builds for production
  - **WHEN** the build process runs
  - **THEN** the system should use the API Gateway URL from the production environment variables
  - **GIVEN** an environment variable is missing
  - **WHEN** the application initializes
  - **THEN** the system should throw a clear error during application initialization
  - _Requirements: 11.1, 11.2, 11.3_

- [ ]\* 16.2 Write property test for centralized API base URL

  - **Property 14: Centralized API base URL**
  - **Validates: Requirements 11.5**

- [x] 16.3 Create environment files (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create .env.development with API URL and test user ID
  - **GREEN**: Create .env.production with API URL and test user ID
  - **GREEN**: Update .env.example with all required variables
  - **GREEN**: Add environment variable validation on app init
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 17. Implement memory leak prevention (BDD/TDD)
- [ ] 17.1 Write acceptance tests for memory leak prevention

  - **GIVEN** a component with API subscriptions unmounts
  - **WHEN** the unmount occurs
  - **THEN** the system should clean up all active subscriptions
  - **GIVEN** React hooks are used for API calls
  - **WHEN** the component lifecycle executes
  - **THEN** the system should properly handle cleanup in useEffect return functions
  - **GIVEN** a component re-renders with different dependencies
  - **WHEN** the re-render occurs
  - **THEN** the system should cancel previous API requests before making new ones
  - **GIVEN** the application runs for extended periods
  - **WHEN** monitoring memory usage
  - **THEN** the system should maintain stable memory usage without leaks
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 17.2 Add cleanup to all hooks (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement useEffect cleanup functions
  - **GREEN**: Cancel requests on unmount
  - **GREEN**: Clear subscriptions on unmount
  - **GREEN**: Test component mount/unmount cycles
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 18. Final checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Documentation and cleanup

  - [x] 19.1 Update README with API integration details

    - Document environment variables
    - Document seed script usage
    - Document TanStack Query setup
    - _Requirements: All_

  - [x] 19.2 Remove mock data services

    - Delete mock data service files
    - Remove mock data imports
    - Clean up unused code
    - _Requirements: 6.5_

  - [x] 19.3 Add JSDoc comments to API services
    - Document all service functions
    - Document parameters and return types
    - Add usage examples
    - _Requirements: All_
