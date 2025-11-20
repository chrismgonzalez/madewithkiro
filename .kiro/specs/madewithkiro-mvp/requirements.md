# Requirements Document

## Introduction

MadeWithKiro MVP is a showcase platform UI that displays applications built with Kiro. This specification focuses on building all UI components and interactions using mock data, without authentication. The system provides a public gallery, user profile views, and forms for creating profiles and applications. Authentication will be implemented in a separate specification.

## Glossary

- **User**: A person represented by profile data in the system
- **Application Card**: A showcase entry containing details about an application built with Kiro
- **Profile**: A user's public page containing personal information and their application showcases
- **Gallery**: The public view displaying all application cards from all users
- **Tag**: A keyword used to categorize and describe applications
- **AWS Builder Center Handle**: A unique identifier for AWS Builder Center community lookup
- **Mock Data**: Hardcoded sample data used to populate the UI during development
- **System**: The MadeWithKiro platform UI

## Requirements

### Requirement 1

**User Story:** As a developer, I want to create profile forms with proper validation, so that users can input their information correctly.

#### Acceptance Criteria

1. WHEN a user views the profile creation form THEN the System SHALL display input fields for first name, last name, and AWS Builder Center handle
2. WHEN a user views the profile creation form THEN the System SHALL display optional input fields for LinkedIn username and GitHub profile name
3. WHEN a user submits a profile form with missing required fields THEN the System SHALL display validation errors for those specific fields
4. WHEN a user submits a profile form with all required fields THEN the System SHALL accept the form submission
5. WHEN a user submits a valid profile form THEN the System SHALL display a success message

### Requirement 2

**User Story:** As a developer, I want to create an editable profile form, so that users can update their information.

#### Acceptance Criteria

1. WHEN a user views a profile page THEN the System SHALL display an edit button
2. WHEN a user clicks the edit button THEN the System SHALL display the profile form pre-populated with current values
3. WHEN a user modifies profile fields THEN the System SHALL validate that required fields remain populated
4. WHEN a user saves profile changes THEN the System SHALL display a success message
5. WHEN a user cancels profile editing THEN the System SHALL restore the form to its original state

### Requirement 3

**User Story:** As a developer, I want to create an application submission form, so that users can add their projects with visibility control.

#### Acceptance Criteria

1. WHEN a user views the application form THEN the System SHALL display input fields for application name, description, live app URL, tags, and visibility setting
2. WHEN a user views the application form THEN the System SHALL display an optional input field for GitHub repository URL
3. WHEN a user views the visibility setting THEN the System SHALL provide options for "Public" (visible to everyone) and "Private" (visible only to authenticated users)
4. WHEN a user submits an application form with missing required fields THEN the System SHALL display validation errors for those specific fields
5. WHEN a user provides a URL THEN the System SHALL validate that the URL follows proper format
6. WHEN a user submits a valid application form THEN the System SHALL display a success message

### Requirement 4

**User Story:** As a developer, I want to create a gallery view with application cards that respects visibility settings, so that users can browse appropriate projects.

#### Acceptance Criteria

1. WHEN an unauthenticated visitor accesses the gallery THEN the System SHALL display only public application cards from mock data
2. WHEN an authenticated user accesses the gallery THEN the System SHALL display both public and private application cards from mock data
3. WHEN displaying an application card THEN the System SHALL show application name, description, tags, visibility indicator, and creator information
4. WHEN displaying an application card THEN the System SHALL provide clickable links to the live app and GitHub repository
5. WHEN a visitor clicks on a creator name THEN the System SHALL navigate to that user's profile page
6. WHEN the mock data contains no visible applications THEN the System SHALL display an appropriate empty state message

### Requirement 5

**User Story:** As a developer, I want to implement tag filtering in the gallery, so that users can find relevant projects.

#### Acceptance Criteria

1. WHEN a visitor views the gallery THEN the System SHALL display all available tags extracted from mock data
2. WHEN a visitor selects a tag THEN the System SHALL display only application cards containing that tag
3. WHEN a visitor selects multiple tags THEN the System SHALL display application cards containing any of the selected tags
4. WHEN a visitor clears tag filters THEN the System SHALL display all application cards
5. WHEN no applications match selected tags THEN the System SHALL display an appropriate message

### Requirement 6

**User Story:** As a developer, I want to create a profile page view that respects application visibility, so that users can see appropriate creator projects.

#### Acceptance Criteria

1. WHEN a visitor accesses a user profile THEN the System SHALL display the user's first name, last name, and AWS Builder Center handle from mock data
2. WHEN a user profile contains LinkedIn username THEN the System SHALL display a clickable link to the LinkedIn profile
3. WHEN a user profile contains GitHub username THEN the System SHALL display a clickable link to the GitHub profile
4. WHEN an unauthenticated visitor views a user profile THEN the System SHALL display only public application cards created by that user
5. WHEN an authenticated user views a user profile THEN the System SHALL display both public and private application cards created by that user
6. WHEN a user has no visible applications in mock data THEN the System SHALL display an appropriate message on their profile

### Requirement 7

**User Story:** As a developer, I want to create mock data utilities with visibility settings, so that I can test UI components with realistic data.

#### Acceptance Criteria

1. WHEN the System initializes THEN the System SHALL provide mock user profile data with all required and optional fields
2. WHEN the System initializes THEN the System SHALL provide mock application data with various tags, URLs, and visibility settings
3. WHEN the System provides mock data THEN the System SHALL include at least 3 different user profiles
4. WHEN the System provides mock data THEN the System SHALL include at least 10 different applications
5. WHEN the System provides mock data THEN the System SHALL include applications with and without optional GitHub URLs
6. WHEN the System provides mock data THEN the System SHALL include both public and private applications

### Requirement 8

**User Story:** As a developer, I want the interface to work seamlessly on mobile devices, so that users can browse on any device.

#### Acceptance Criteria

1. WHEN a user accesses the System on a mobile device THEN the System SHALL display a responsive layout optimized for the viewport
2. WHEN a user interacts with touch targets THEN the System SHALL ensure all interactive elements are at least 44x44 pixels
3. WHEN displaying the gallery on mobile THEN the System SHALL show application cards in a single column layout
4. WHEN a user navigates on mobile THEN the System SHALL provide an accessible navigation menu
5. WHEN forms are displayed on mobile THEN the System SHALL ensure all fields are easily tappable and readable

### Requirement 9

**User Story:** As a developer, I want clear validation and error handling in forms, so that users understand what's required.

#### Acceptance Criteria

1. WHEN a user submits invalid data THEN the System SHALL display specific validation error messages
2. WHEN a form submission fails THEN the System SHALL display a user-friendly error message
3. WHEN an error occurs THEN the System SHALL maintain form state and allow the user to retry
4. WHEN required fields are missing THEN the System SHALL highlight the specific fields requiring attention
5. WHEN a user corrects validation errors THEN the System SHALL clear error messages for those fields

### Requirement 10

**User Story:** As a developer, I want to implement client-side routing, so that users can navigate between pages smoothly.

#### Acceptance Criteria

1. WHEN a user clicks a navigation link THEN the System SHALL navigate to the target page without a full page reload
2. WHEN a user navigates to a profile page THEN the System SHALL display the correct profile based on the URL parameter
3. WHEN a user uses browser back/forward buttons THEN the System SHALL navigate correctly through the history
4. WHEN a user accesses a direct URL THEN the System SHALL render the correct page
5. WHEN a user navigates between pages THEN the System SHALL maintain scroll position appropriately

### Requirement 11

**User Story:** As a developer, I want to simulate authentication state, so that I can test visibility-based features without implementing full authentication.

#### Acceptance Criteria

1. WHEN the System initializes THEN the System SHALL provide a mock authentication toggle in the UI
2. WHEN a user toggles the authentication state THEN the System SHALL update the visible applications in the gallery
3. WHEN a user is in "authenticated" mode THEN the System SHALL display both public and private applications
4. WHEN a user is in "unauthenticated" mode THEN the System SHALL display only public applications
5. WHEN a user toggles authentication state THEN the System SHALL persist the state across page navigations
