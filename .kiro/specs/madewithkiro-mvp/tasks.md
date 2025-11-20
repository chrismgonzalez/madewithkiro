# Implementation Plan

## BDD/TDD Approach

This implementation follows Behavior-Driven Development (BDD) and Test-Driven Development (TDD) methodology:

1. **Write Acceptance Tests First** - Given-When-Then format describing expected behavior
2. **Red** - Run tests and watch them fail
3. **Green** - Write minimal code to make tests pass
4. **Refactor** - Improve code quality while keeping tests green

Each task follows this pattern to ensure proper SDLC practices.

---

- [ ] 1. Set up frontend project dependencies and structure

  - Install dependencies: @tanstack/react-router, @tanstack/react-query, zod, lucide-react
  - Install shadcn/ui CLI and configure
  - Set up folder structure (components, pages, hooks, contexts, services, types, utils, **tests**)
  - Configure Vitest for testing with React Testing Library
  - Install fast-check for property-based testing
  - Configure test scripts in package.json
  - _Requirements: 1.1, 8.1_

- [x] 2. Create mock data layer (BDD/TDD)
- [x] 2.1 Write acceptance tests for mock data

  - **GIVEN** the system initializes
  - **WHEN** I request all users
  - **THEN** I should receive at least 3 user profiles with all required fields
  - **GIVEN** the system initializes
  - **WHEN** I request all applications
  - **THEN** I should receive at least 10 applications with mix of public/private visibility
  - **GIVEN** a user ID exists in mock data
  - **WHEN** I request that user's profile
  - **THEN** I should receive the correct user profile
  - **GIVEN** applications exist for a user
  - **WHEN** I request applications by user ID with authentication
  - **THEN** I should receive both public and private applications for that user
  - **GIVEN** applications exist for a user
  - **WHEN** I request applications by user ID without authentication
  - **THEN** I should receive only public applications for that user
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]\* 2.2 Write property test for mock data structure

  - **Property 22: Mock data contains required user fields**
  - **Validates: Requirements 7.1**

- [ ]\* 2.3 Write property test for mock data structure

  - **Property 23: Mock data contains required application fields**
  - **Validates: Requirements 7.2**

- [x] 2.4 Implement mock data utilities (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create mockData.ts with at least 3 user profiles
  - **GREEN**: Create at least 10 application entries with mix of public/private visibility
  - **GREEN**: Include applications with and without optional GitHub URLs
  - **GREEN**: Add helper functions (getUserById, getApplicationsByUserId, getAllApplications, getAllTags)
  - **GREEN**: Implement visibility filtering based on authentication state
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 3. Create MockAuthContext (BDD/TDD)
- [x] 3.1 Write acceptance tests for mock authentication

  - **GIVEN** the application starts
  - **WHEN** I check authentication state
  - **THEN** I should see the default unauthenticated state
  - **GIVEN** I am unauthenticated
  - **WHEN** I toggle authentication
  - **THEN** I should become authenticated
  - **GIVEN** I am authenticated
  - **WHEN** I toggle authentication
  - **THEN** I should become unauthenticated
  - **GIVEN** I toggle authentication state
  - **WHEN** I refresh the page
  - **THEN** my authentication state should persist
  - _Requirements: 11.1, 11.2, 11.5_

- [x] 3.2 Implement MockAuthContext (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement MockAuthProvider with isAuthenticated state
  - **GREEN**: Implement toggleAuth function
  - **GREEN**: Store authentication state in localStorage
  - **GREEN**: Provide useMockAuth custom hook
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 11.1, 11.2, 11.5_

- [ ] 4. Create data service layer with Tanstack Query (BDD/TDD)
- [x] 4.1 Write acceptance tests for data service

  - **GIVEN** I am authenticated
  - **WHEN** I fetch all applications
  - **THEN** I should receive both public and private applications
  - **GIVEN** I am unauthenticated
  - **WHEN** I fetch all applications
  - **THEN** I should receive only public applications
  - **GIVEN** applications exist with various tags
  - **WHEN** I extract unique tags
  - **THEN** I should receive all unique tags from visible applications
  - **GIVEN** applications with multiple tags
  - **WHEN** I filter by a single tag
  - **THEN** I should receive only applications containing that tag
  - **GIVEN** applications with multiple tags
  - **WHEN** I filter by multiple tags
  - **THEN** I should receive applications containing any of those tags (OR logic)
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3_

- [ ]\* 4.2 Write unit tests for data service

  - Test visibility filtering for authenticated users
  - Test visibility filtering for unauthenticated users
  - Test tag extraction from applications
  - Test tag filtering logic
  - _Requirements: 4.1, 4.2, 5.1_

- [x] 4.3 Implement mockDataService (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement getProfile(userId) returning Promise
  - **GREEN**: Implement getAllProfiles() returning Promise
  - **GREEN**: Implement getAllApplications(isAuthenticated) with visibility filtering
  - **GREEN**: Implement getApplicationsByUserId(userId, isAuthenticated) with visibility filtering
  - **GREEN**: Implement getAllTags(isAuthenticated) extracting from visible apps
  - **GREEN**: Implement filterApplicationsByTags(applications, tags) for client-side filtering
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 4.1, 4.2, 5.1, 6.4, 6.5_

- [x] 4.4 Create Tanstack Query hooks (RED → GREEN → REFACTOR)

  - **RED**: Write tests for hooks behavior
  - **GREEN**: Create useApplications hook with authentication-aware query key
  - **GREEN**: Create useProfile hook
  - **GREEN**: Create useUserApplications hook with authentication-aware query key
  - **GREEN**: Configure staleTime: Infinity for mock data
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 4.1, 6.1, 6.4_

- [ ] 5. Implement ProfileForm component (BDD/TDD)
- [x] 5.1 Write acceptance tests for ProfileForm

  - **GIVEN** I view the profile form
  - **WHEN** the form renders
  - **THEN** I should see input fields for firstName, lastName, awsBuilderHandle, linkedInUsername, githubUsername
  - **GIVEN** I submit the form with missing required fields
  - **WHEN** I click submit
  - **THEN** I should see validation errors for those specific fields
  - **GIVEN** I submit the form with all required fields
  - **WHEN** I click submit
  - **THEN** I should see a success message
  - **GIVEN** I am editing a profile and make changes
  - **WHEN** I click cancel
  - **THEN** the form should restore to its original state
  - **GIVEN** I have a validation error on a field
  - **WHEN** I correct that field
  - **THEN** the error message for that field should clear
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.5, 9.1, 9.4, 9.5_

- [ ]\* 5.2 Write property test for profile required fields validation

  - **Property 1: Profile required fields validation**
  - **Validates: Requirements 1.3, 2.3**

- [ ]\* 5.3 Write property test for profile optional fields acceptance

  - **Property 2: Profile optional fields acceptance**
  - **Validates: Requirements 1.4**

- [ ]\* 5.4 Write property test for profile edit cancellation

  - **Property 5: Profile edit cancellation preserves state**
  - **Validates: Requirements 2.5**

- [ ]\* 5.5 Write property test for missing field highlighting

  - **Property 26: Missing field highlighting**
  - **Validates: Requirements 9.4**

- [ ]\* 5.6 Write property test for error message clearing

  - **Property 27: Error message clearing**
  - **Validates: Requirements 9.5**

- [x] 5.7 Implement ProfileForm component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add input fields for all profile attributes
  - **GREEN**: Implement client-side validation using zod profileSchema
  - **GREEN**: Show validation errors inline below fields
  - **GREEN**: Highlight missing required fields with red border
  - **GREEN**: Implement submit handler (shows success message, no persistence)
  - **GREEN**: Implement cancel handler (restores original state)
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.5, 9.1, 9.4, 9.5_

- [ ] 6. Implement ProfileView component (BDD/TDD)
- [x] 6.1 Write acceptance tests for ProfileView

  - **GIVEN** I view a user profile
  - **WHEN** the profile renders
  - **THEN** I should see firstName, lastName, and awsBuilderHandle
  - **GIVEN** a profile has a LinkedIn username
  - **WHEN** the profile renders
  - **THEN** I should see a clickable LinkedIn link with correct URL
  - **GIVEN** a profile has a GitHub username
  - **WHEN** the profile renders
  - **THEN** I should see a clickable GitHub link with correct URL
  - **GIVEN** a profile has no LinkedIn username
  - **WHEN** the profile renders
  - **THEN** I should not see a LinkedIn link
  - **GIVEN** a user has applications
  - **WHEN** I view their profile
  - **THEN** I should see all their visible applications
  - **GIVEN** a user has no visible applications
  - **WHEN** I view their profile
  - **THEN** I should see an empty state message
  - _Requirements: 2.1, 2.2, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]\* 6.2 Write property test for profile page displays required information

  - **Property 18: Profile page displays required information**
  - **Validates: Requirements 6.1**

- [ ]\* 6.3 Write property test for LinkedIn link conditional rendering

  - **Property 19: LinkedIn link conditional rendering**
  - **Validates: Requirements 6.2**

- [ ]\* 6.4 Write property test for GitHub link conditional rendering

  - **Property 20: GitHub link conditional rendering**
  - **Validates: Requirements 6.3**

- [ ]\* 6.5 Write property test for user profile displays user's applications

  - **Property 21: User profile displays user's applications**
  - **Validates: Requirements 6.4**

- [ ]\* 6.6 Write property test for edit button shown only on own profile

  - **Property 22: Edit button shown only on own profile**
  - **Validates: Requirements 6.7**

- [ ]\* 6.7 Write property test for edit button hidden on other profiles

  - **Property 23: Edit button hidden on other profiles**
  - **Validates: Requirements 6.8**

- [x] 6.8 Implement ProfileView component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Display user information from mock data
  - **GREEN**: Show social link buttons with proper URLs
  - **GREEN**: Conditionally render social links only when data exists
  - **GREEN**: Show edit button that toggles to ProfileForm
  - **GREEN**: Display list of user's applications using useUserApplications hook
  - **GREEN**: Show empty state when user has no visible applications
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 2.1, 2.2, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6.9 Update ProfileView to distinguish between own and other profiles (BDD/TDD)

  - **RED**: Write acceptance tests for profile view distinction
  - **GIVEN** I am authenticated and viewing my own profile
  - **WHEN** the profile renders
  - **THEN** I should see an Edit Profile button
  - **GIVEN** I am authenticated and viewing another user's profile
  - **WHEN** the profile renders
  - **THEN** I should NOT see an Edit Profile button
  - **GREEN**: Get current authenticated user ID from MockAuthContext
  - **GREEN**: Compare userId prop with authenticated user ID
  - **GREEN**: Conditionally render Edit button only when viewing own profile
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.7, 6.8_

- [x] 7. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement ApplicationCard component (BDD/TDD)
- [x] 8.1 Write acceptance tests for ApplicationCard

  - **GIVEN** an application card is rendered
  - **WHEN** I view the card
  - **THEN** I should see app name, description, and tags
  - **GIVEN** an application card is rendered
  - **WHEN** I view the card
  - **THEN** I should see a visibility badge (Public or Private)
  - **GIVEN** an application card is rendered
  - **WHEN** I view the card
  - **THEN** I should see creator information with a clickable profile link
  - **GIVEN** an application has a live app URL
  - **WHEN** I view the card
  - **THEN** I should see a clickable link that opens in a new tab
  - **GIVEN** an application has a GitHub URL
  - **WHEN** I view the card
  - **THEN** I should see a clickable GitHub link that opens in a new tab
  - _Requirements: 4.2, 4.3, 4.4_

- [ ]\* 8.2 Write property test for application card contains required information

  - **Property 12: Application card contains required information**
  - **Validates: Requirements 4.3**

- [ ]\* 8.3 Write property test for application card contains valid links

  - **Property 13: Application card contains valid links**
  - **Validates: Requirements 4.4**

- [x] 8.4 Implement ApplicationCard component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Display app name, description, tags
  - **GREEN**: Show visibility badge using shadcn/ui Badge
  - **GREEN**: Show creator information with clickable profile link
  - **GREEN**: Add clickable links to live app and GitHub repo (open in new tab)
  - **GREEN**: Implement responsive card layout using shadcn/ui Card
  - **GREEN**: Add hover effects for interactivity
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 9. Implement ApplicationForm component (BDD/TDD)
- [x] 9.1 Write acceptance tests for ApplicationForm

  - **GIVEN** I view the application form
  - **WHEN** the form renders
  - **THEN** I should see input fields for name, description, appUrl, githubUrl, tags, and visibility
  - **GIVEN** I submit the form with missing required fields
  - **WHEN** I click submit
  - **THEN** I should see validation errors for those specific fields
  - **GIVEN** I submit the form with an invalid URL
  - **WHEN** I click submit
  - **THEN** I should see a URL validation error
  - **GIVEN** I submit the form with all required fields
  - **WHEN** I click submit
  - **THEN** I should see a success message
  - **GIVEN** I have a validation error
  - **WHEN** an error occurs
  - **THEN** the form state should be preserved for retry
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.1, 9.3, 9.4, 9.5_

- [ ]\* 9.2 Write property test for application required fields validation

  - **Property 6: Application required fields validation**
  - **Validates: Requirements 3.4**

- [ ]\* 9.3 Write property test for application optional fields acceptance

  - **Property 7: Application optional fields acceptance**
  - **Validates: Requirements 3.2**

- [ ]\* 9.4 Write property test for URL format validation

  - **Property 10: URL format validation**
  - **Validates: Requirements 3.5**

- [ ]\* 9.5 Write property test for validation error specificity

  - **Property 24: Validation error specificity**
  - **Validates: Requirements 9.1**

- [ ]\* 9.6 Write property test for error state preservation

  - **Property 25: Error state preservation**
  - **Validates: Requirements 9.3**

- [x] 9.7 Implement ApplicationForm component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add input fields for app details
  - **GREEN**: Add visibility selector (radio buttons or select: Public/Private)
  - **GREEN**: Implement tag input with multi-select or comma-separated input
  - **GREEN**: Implement URL validation using zod applicationSchema
  - **GREEN**: Show validation errors inline below fields
  - **GREEN**: Highlight missing required fields with red border
  - **GREEN**: Implement submit handler (shows success message, no persistence)
  - **GREEN**: Implement cancel handler
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.1, 9.4, 9.5_

- [x] 10. Implement ApplicationGallery component (BDD/TDD)
- [x] 10.1 Write acceptance tests for ApplicationGallery

  - **GIVEN** I am unauthenticated
  - **WHEN** I view the gallery
  - **THEN** I should see only public applications
  - **GIVEN** I am authenticated
  - **WHEN** I view the gallery
  - **THEN** I should see both public and private applications
  - **GIVEN** applications exist with tags
  - **WHEN** I view the gallery
  - **THEN** I should see all unique tags in the filter sidebar
  - **GIVEN** I select a single tag filter
  - **WHEN** the filter is applied
  - **THEN** I should see only applications with that tag
  - **GIVEN** I select multiple tag filters
  - **WHEN** the filters are applied
  - **THEN** I should see applications with any of those tags
  - **GIVEN** I have active tag filters
  - **WHEN** I click clear filters
  - **THEN** I should see all visible applications again
  - **GIVEN** no applications match my filters
  - **WHEN** the gallery renders
  - **THEN** I should see an empty state message
  - _Requirements: 4.1, 4.2, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 8.3_

- [ ]\* 10.2 Write property test for gallery displays all applications

  - **Property 11: Gallery displays all applications**
  - **Validates: Requirements 4.1**

- [ ]\* 10.3 Write property test for gallery tag extraction

  - **Property 14: Gallery tag extraction**
  - **Validates: Requirements 5.1**

- [ ]\* 10.4 Write property test for single tag filtering

  - **Property 15: Single tag filtering**
  - **Validates: Requirements 5.2**

- [ ]\* 10.5 Write property test for multiple tag filtering

  - **Property 16: Multiple tag filtering (OR logic)**
  - **Validates: Requirements 5.3**

- [ ]\* 10.6 Write property test for tag filter clearing

  - **Property 17: Tag filter clearing**
  - **Validates: Requirements 5.4**

- [x] 10.7 Implement ApplicationGallery component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Fetch applications using useApplications hook (respects authentication)
  - **GREEN**: Implement responsive grid layout (1 col mobile, 2-3 cols desktop)
  - **GREEN**: Extract unique tags from visible applications
  - **GREEN**: Implement tag filter sidebar with checkboxes
  - **GREEN**: Filter applications by selected tags client-side (OR logic)
  - **GREEN**: Add clear filters button
  - **GREEN**: Show empty state when no apps visible
  - **GREEN**: Show empty state when no apps match filters
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 4.1, 4.2, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 8.3_

- [x] 11. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Install shadcn/ui components

  - Install Button component
  - Install Card component
  - Install Badge component
  - Install Input component
  - Install Label component
  - Install Select component
  - Install Sheet component (for mobile menu)
  - Install Checkbox component (for tag filters)
  - _Requirements: 8.2_

- [x] 13. Implement Navigation component (BDD/TDD)
- [x] 13.1 Write acceptance tests for Navigation

  - **GIVEN** I view the navigation
  - **WHEN** the component renders
  - **THEN** I should see logo, app name, and links to Gallery, Profile, Add App
  - **GIVEN** I view the navigation
  - **WHEN** the component renders
  - **THEN** I should see a mock authentication toggle button showing current state
  - **GIVEN** I am on mobile
  - **WHEN** I view the navigation
  - **THEN** I should see a hamburger menu button
  - **GIVEN** I click the hamburger menu
  - **WHEN** the menu opens
  - **THEN** I should see all navigation links
  - **GIVEN** I am on a specific route
  - **WHEN** I view the navigation
  - **THEN** the active route should be highlighted
  - _Requirements: 8.2, 8.4, 11.1_

- [x] 13.2 Implement Navigation component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add logo and app name
  - **GREEN**: Add links to Gallery, Profile, Add App
  - **GREEN**: Add mock authentication toggle button (shows current state)
  - **GREEN**: Implement mobile hamburger menu using Sheet
  - **GREEN**: Ensure touch targets are at least 44x44px
  - **GREEN**: Highlight active route
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 8.2, 8.4, 11.1_

- [x] 14. Implement Layout and Routing (BDD/TDD)
- [x] 14.1 Write acceptance tests for Layout and Routing

  - **GIVEN** I navigate to any page
  - **WHEN** the page renders
  - **THEN** I should see consistent header with Navigation
  - **GIVEN** I click a navigation link
  - **WHEN** the link is clicked
  - **THEN** I should navigate without a full page reload
  - **GIVEN** I navigate to a profile page
  - **WHEN** the URL contains a userId
  - **THEN** I should see the correct profile
  - **GIVEN** I use browser back/forward buttons
  - **WHEN** I navigate
  - **THEN** the correct page should render
  - **GIVEN** I access a direct URL
  - **WHEN** the page loads
  - **THEN** the correct page should render
  - _Requirements: 8.1, 8.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 14.2 Implement Layout component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add consistent header with Navigation
  - **GREEN**: Add main content area with max-width container
  - **GREEN**: Add footer with links
  - **GREEN**: Implement mobile-responsive structure
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 8.1, 8.4_

- [x] 14.3 Set up routing with Tanstack Router (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create route tree
  - **GREEN**: Set up gallery route (/)
  - **GREEN**: Set up profile view route (/profile/:userId)
  - **GREEN**: Set up profile edit route (/profile/:userId/edit)
  - **GREEN**: Set up add application route (/add-app)
  - **GREEN**: Implement route-based code splitting
  - **GREEN**: Handle loading and error states
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. Implement error handling and empty states (BDD/TDD)
- [x] 15.1 Write acceptance tests for error handling

  - **GIVEN** a React component throws an error
  - **WHEN** the error occurs
  - **THEN** I should see a fallback UI with error message
  - **GIVEN** an error boundary is displayed
  - **WHEN** I click "Try Again"
  - **THEN** the error boundary should reset
  - **GIVEN** the gallery has no applications
  - **WHEN** I view the gallery
  - **THEN** I should see an empty state message
  - **GIVEN** a user has no applications
  - **WHEN** I view their profile
  - **THEN** I should see an empty state message
  - _Requirements: 4.6, 5.5, 6.6, 9.2, 9.3_

- [x] 15.2 Implement ErrorBoundary component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Catch React component errors
  - **GREEN**: Display fallback UI with error message
  - **GREEN**: Log errors to console for debugging
  - **GREEN**: Provide "Try Again" button to reset error boundary
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 9.2, 9.3_

- [x] 15.3 Implement empty state components (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create EmptyGallery component (no applications)
  - **GREEN**: Create EmptyFilterResults component (no matches)
  - **GREEN**: Create EmptyProfile component (no applications on profile)
  - **GREEN**: Each with descriptive message and optional action
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 4.6, 5.5, 6.6_

- [x] 15.4 Add loading states to data-fetching components

  - Show loading spinners during query fetches
  - Disable form submissions during processing
  - Use Tanstack Query's isLoading state
  - _Requirements: 9.3_

- [x] 16. Add mobile responsiveness and styling (BDD/TDD)
- [x] 16.1 Write acceptance tests for mobile responsiveness

  - **GIVEN** I view the app on a 320px viewport
  - **WHEN** the page renders
  - **THEN** all content should be readable and accessible
  - **GIVEN** I view the gallery on mobile
  - **WHEN** the page renders
  - **THEN** I should see a single column layout
  - **GIVEN** I interact with touch targets on mobile
  - **WHEN** I tap elements
  - **THEN** all interactive elements should be at least 44x44px
  - **GIVEN** I view forms on mobile
  - **WHEN** the form renders
  - **THEN** all fields should be easily tappable and readable
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 16.2 Implement mobile-first responsive design (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Use Tailwind responsive prefixes (sm:, md:, lg:, xl:)
  - **GREEN**: Test layouts at 320px minimum width
  - **GREEN**: Ensure single column layout on mobile for gallery
  - **GREEN**: Ensure forms are readable and tappable on mobile
  - **GREEN**: Ensure touch targets are at least 44x44px
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 16.3 Style all components with Tailwind CSS

  - Apply consistent spacing and typography
  - Use shadcn/ui design tokens
  - Ensure proper contrast for accessibility
  - Add hover and focus states
  - Style validation errors (red border, error text)
  - _Requirements: 8.1, 9.1_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
