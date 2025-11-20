# Implementation Plan

- [x] 1. Set up project infrastructure and configuration

  - Create AWS SAM template.yaml with all required resources (Cognito, DynamoDB, Lambda, API Gateway)
  - Create Makefile with install, dev, build, deploy-dev, deploy-prod, logs, clean, and test commands
  - Configure DynamoDB single-table design with GSI
  - Set up Cognito User Pool with appropriate settings
  - Configure API Gateway with Cognito authorizer and CORS
  - Create samconfig.toml for dev and prod environments
  - _Requirements: 7.1, 7.4, 7.5, 8.1, 8.2, 8.3_

- [x] 2. Set up frontend project structure

  - Initialize React project with TypeScript and Vite (already exists)
  - Install dependencies: @tanstack/react-router, @tanstack/react-query, zod, lucide-react
  - Install shadcn/ui CLI and configure
  - Set up folder structure (components, pages, hooks, contexts, services, types, utils, constants)
  - Create environment configuration for API endpoints
  - _Requirements: 1.1, 9.1_

- [ ] 3. Set up backend Python project structure

  - Create backend directory with Lambda function structure
  - Create pyproject.toml with boto3, pydantic, pytest, and moto dependencies
  - Use uv for Python package management (uv pip sync for installation)
  - Set up Python project structure (handlers, models, utils, tests)
  - Create Pydantic models for validation (CreateProfileRequest, UpdateProfileRequest, CreateApplicationRequest)
  - Create DynamoDB utility functions for table operations
  - Configure SAM template to bundle Lambda functions as zip files
  - _Requirements: 1.1, 8.1, 8.2_

- [ ] 4. Implement authentication context and hooks
- [ ] 4.1 Create AuthContext with Cognito integration

  - Implement AuthProvider with user state, isAuthenticated, isLoading
  - Implement signIn function (redirect to Cognito Hosted UI)
  - Implement signOut function
  - Implement getAccessToken function with token refresh logic
  - Store tokens in localStorage and memory
  - _Requirements: 1.1, 10.3_

- [ ]\* 4.2 Write property test for authentication state management

  - **Property 25: Error state preservation**
  - **Validates: Requirements 10.4**

- [ ] 4.3 Create useAuth custom hook

  - Export AuthContext values
  - Provide easy access to authentication state
  - _Requirements: 1.1_

- [ ] 4.4 Create ProtectedRoute component

  - Check authentication status
  - Redirect to sign-in if not authenticated
  - Show loading state during auth check
  - _Requirements: 1.1_

- [ ] 5. Implement profile backend Lambda handler
- [ ] 5.1 Create profile handler Python function

  - Implement GET /profile/{userId} endpoint
  - Implement POST /profile endpoint (authenticated)
  - Implement PUT /profile endpoint (authenticated)
  - Validate requests using Pydantic models
  - Implement DynamoDB operations (get, put, update)
  - Add timestamp generation (createdAt, updatedAt)
  - Return consistent response format
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 8.4, 8.5_

- [ ]\* 5.2 Write property test for profile required fields validation

  - **Property 1: Profile required fields validation**
  - **Validates: Requirements 1.3, 2.3**

- [ ]\* 5.3 Write property test for profile optional fields acceptance

  - **Property 2: Profile optional fields acceptance**
  - **Validates: Requirements 1.4**

- [ ]\* 5.4 Write property test for profile persistence round-trip

  - **Property 3: Profile persistence round-trip**
  - **Validates: Requirements 1.5**

- [ ]\* 5.5 Write property test for profile update persistence

  - **Property 4: Profile update persistence**
  - **Validates: Requirements 2.4**

- [ ]\* 5.6 Write property test for timestamp presence

  - **Property 22: Timestamp presence on entity creation**
  - **Validates: Requirements 8.4**

- [ ]\* 5.7 Write property test for consistent response format

  - **Property 23: Consistent response format**
  - **Validates: Requirements 8.5**

- [ ]\* 5.8 Write unit tests for profile handler

  - Test valid profile creation with all fields
  - Test profile creation with only required fields
  - Test profile update with valid data
  - Test error handling for missing required fields
  - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4_

- [ ] 6. Implement profile frontend components and services
- [ ] 6.1 Create ProfileService for API calls

  - Implement getProfile(userId) function
  - Implement createProfile(profile) function
  - Implement updateProfile(profile) function
  - Add Authorization header with JWT token
  - Handle API errors and return user-friendly messages
  - _Requirements: 1.5, 2.4, 10.1, 10.2_

- [ ] 6.2 Create ProfileForm component

  - Add input fields for all profile attributes
  - Implement client-side validation using zod
  - Show validation errors inline
  - Highlight missing required fields
  - Implement submit and cancel actions
  - Preserve form state on error
  - _Requirements: 1.3, 1.4, 2.2, 2.3, 10.1, 10.5_

- [ ]\* 6.3 Write property test for profile edit cancellation

  - **Property 5: Profile edit cancellation preserves state**
  - **Validates: Requirements 2.5**

- [ ]\* 6.4 Write property test for missing field highlighting

  - **Property 26: Missing field highlighting**
  - **Validates: Requirements 10.5**

- [ ] 6.5 Create ProfileView component

  - Display user information (firstName, lastName, awsBuilderHandle)
  - Show social link buttons (LinkedIn, GitHub, AWS Builder Center)
  - Conditionally render social links based on data
  - Show edit button for own profile
  - Display list of user's applications
  - Show empty state when user has no applications
  - _Requirements: 2.1, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]\* 6.6 Write property test for profile page displays required information

  - **Property 18: Profile page displays required information**
  - **Validates: Requirements 6.1**

- [ ]\* 6.7 Write property test for LinkedIn link conditional rendering

  - **Property 19: LinkedIn link conditional rendering**
  - **Validates: Requirements 6.2**

- [ ]\* 6.8 Write property test for GitHub link conditional rendering

  - **Property 20: GitHub link conditional rendering**
  - **Validates: Requirements 6.3**

- [ ] 6.9 Create profile page route

  - Set up route with Tanstack Router
  - Fetch profile data using Tanstack Query
  - Handle loading and error states
  - Show ProfileView or ProfileForm based on edit mode
  - _Requirements: 2.1, 6.1_

- [ ] 7. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement application backend Lambda handler
- [ ] 8.1 Create application handler Python function

  - Implement GET /applications endpoint (public)
  - Implement GET /applications?userId={userId} endpoint
  - Implement POST /applications endpoint (authenticated)
  - Validate requests using Pydantic models
  - Implement DynamoDB operations (get, put, scan, query GSI)
  - Associate application with authenticated user
  - Add timestamp generation
  - Return consistent response format
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 6.4, 8.4, 8.5_

- [ ]\* 8.2 Write property test for application required fields validation

  - **Property 6: Application required fields validation**
  - **Validates: Requirements 3.1**

- [ ]\* 8.3 Write property test for application optional fields acceptance

  - **Property 7: Application optional fields acceptance**
  - **Validates: Requirements 3.2**

- [ ]\* 8.4 Write property test for application persistence round-trip

  - **Property 8: Application persistence round-trip**
  - **Validates: Requirements 3.3**

- [ ]\* 8.5 Write property test for application user association

  - **Property 9: Application user association**
  - **Validates: Requirements 3.4**

- [ ]\* 8.6 Write property test for URL format validation

  - **Property 10: URL format validation**
  - **Validates: Requirements 3.5**

- [ ]\* 8.7 Write property test for validation error specificity

  - **Property 24: Validation error specificity**
  - **Validates: Requirements 10.1**

- [ ]\* 8.8 Write unit tests for application handler

  - Test valid application creation
  - Test application creation with optional GitHub URL
  - Test URL validation with various formats
  - Test user association
  - Test error handling for missing required fields
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. Implement application frontend components and services
- [ ] 9.1 Create ApplicationService for API calls

  - Implement listApplications() function
  - Implement createApplication(app) function
  - Implement getApplicationsByUser(userId) function
  - Implement filterApplicationsByTags(applications, tags) client-side function
  - Implement extractUniqueTags(applications) client-side function
  - Add Authorization header for authenticated endpoints
  - Handle API errors
  - _Requirements: 3.3, 4.1, 5.1, 5.2, 5.3, 5.4, 6.4, 10.2_

- [ ] 9.2 Create ApplicationCard component

  - Display app name, description, tags
  - Show creator information with profile link
  - Add clickable links to live app and GitHub repo
  - Implement responsive card layout
  - _Requirements: 4.2, 4.3, 4.4_

- [ ]\* 9.3 Write property test for application card contains required information

  - **Property 12: Application card contains required information**
  - **Validates: Requirements 4.2**

- [ ]\* 9.4 Write property test for application card contains valid links

  - **Property 13: Application card contains valid links**
  - **Validates: Requirements 4.3**

- [ ] 9.5 Create ApplicationForm component

  - Add input fields for app details
  - Implement tag input with multi-select
  - Implement URL validation using zod
  - Show validation errors inline
  - Highlight missing required fields
  - Implement submit and cancel actions
  - _Requirements: 3.1, 3.2, 3.5, 10.1, 10.5_

- [ ] 9.6 Create ApplicationGallery component

  - Fetch all applications using Tanstack Query
  - Implement grid layout (responsive: 1 col mobile, 2-3 cols desktop)
  - Extract unique tags from all applications
  - Implement tag filter sidebar
  - Filter applications by selected tags (client-side)
  - Show empty state when no apps
  - Show empty state when no apps match filters
  - _Requirements: 4.1, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 9.3_

- [ ]\* 9.7 Write property test for gallery displays all applications

  - **Property 11: Gallery displays all applications**
  - **Validates: Requirements 4.1**

- [ ]\* 9.8 Write property test for gallery tag extraction

  - **Property 14: Gallery tag extraction**
  - **Validates: Requirements 5.1**

- [ ]\* 9.9 Write property test for single tag filtering

  - **Property 15: Single tag filtering**
  - **Validates: Requirements 5.2**

- [ ]\* 9.10 Write property test for multiple tag filtering

  - **Property 16: Multiple tag filtering (OR logic)**
  - **Validates: Requirements 5.3**

- [ ]\* 9.11 Write property test for tag filter clearing

  - **Property 17: Tag filter clearing**
  - **Validates: Requirements 5.4**

- [ ]\* 9.12 Write property test for user profile displays user's applications

  - **Property 21: User profile displays user's applications**
  - **Validates: Requirements 6.4**

- [ ] 9.13 Create application routes

  - Set up gallery route (public)
  - Set up add application route (protected)
  - Handle loading and error states
  - _Requirements: 4.1, 3.1_

- [ ] 10. Implement navigation and layout components
- [ ] 10.1 Install shadcn/ui components

  - Install Button component
  - Install Card component
  - Install Input component
  - Install Label component
  - Install Select component
  - Install Sheet component (for mobile menu)
  - _Requirements: 9.1, 9.4_

- [ ] 10.2 Create Navigation component

  - Add logo and app name
  - Add links to Gallery, Profile, Add App
  - Add Sign In/Sign Out button
  - Implement mobile hamburger menu using Sheet
  - Ensure touch targets are at least 44x44px
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 10.3 Create Layout component

  - Add consistent header with Navigation
  - Add main content area
  - Add footer
  - Implement mobile-responsive structure
  - _Requirements: 9.1_

- [ ] 10.4 Set up routing with Tanstack Router

  - Create route tree
  - Set up public routes (gallery, profile view)
  - Set up protected routes (profile edit, add app)
  - Implement route-based code splitting
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 11. Implement error handling and loading states
- [ ] 11.1 Create ErrorBoundary component

  - Catch React component errors
  - Display fallback UI
  - Log errors to console
  - Provide "Try Again" action
  - _Requirements: 10.2, 10.4_

- [ ] 11.2 Create error handling utilities

  - Parse API error responses
  - Generate user-friendly error messages
  - Handle network errors
  - Handle authentication errors
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 11.3 Add loading states to all data-fetching components

  - Show loading spinners during API calls
  - Disable form submissions during processing
  - Show skeleton loaders for content
  - _Requirements: 10.4_

- [ ] 12. Implement first-time user flow
- [ ] 12.1 Create profile creation prompt

  - Detect first-time authentication
  - Show profile creation modal/page
  - Redirect to profile form
  - _Requirements: 1.2_

- [ ] 12.2 Handle profile creation completion

  - Redirect to gallery after profile creation
  - Show success message
  - _Requirements: 1.5_

- [ ] 13. Add mobile responsiveness and styling
- [ ] 13.1 Implement mobile-first responsive design

  - Use Tailwind responsive prefixes (sm:, md:, lg:, xl:)
  - Test layouts at 320px minimum width
  - Ensure single column layout on mobile for gallery
  - Ensure forms are readable and tappable on mobile
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 13.2 Style all components with Tailwind CSS

  - Apply consistent spacing and typography
  - Use shadcn/ui design tokens
  - Ensure proper contrast for accessibility
  - Add hover and focus states
  - _Requirements: 9.1_

- [ ] 14. Final checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Deploy to development environment
  - Run `make deploy-dev`
  - Verify all resources are created
  - Test authentication flow
  - Test profile creation and editing
  - Test application creation
  - Test gallery and filtering
  - _Requirements: 7.4, 7.5_
