# Implementation Plan

## BDD/TDD Approach

This implementation follows Behavior-Driven Development (BDD) and Test-Driven Development (TDD) methodology:

1. **Write Acceptance Tests First** - Given-When-Then format describing expected behavior
2. **Red** - Run tests and watch them fail
3. **Green** - Write minimal code to make tests pass
4. **Refactor** - Improve code quality while keeping tests green

Each task follows this pattern to ensure proper SDLC practices.

---

- [x] 1. Extend mock data service with update operations (BDD/TDD)
- [x] 1.1 Write acceptance tests for application update service

  - **GIVEN** an application exists in mock data
  - **WHEN** I request that application by ID
  - **THEN** I should receive the correct application
  - **GIVEN** I am the owner of an application
  - **WHEN** I update the application with valid data
  - **THEN** the application should be updated successfully
  - **GIVEN** I am not the owner of an application
  - **WHEN** I attempt to update the application
  - **THEN** I should receive an authorization error
  - **GIVEN** I update an application
  - **WHEN** the update succeeds
  - **THEN** the createdAt timestamp should remain unchanged
  - **GIVEN** I update an application
  - **WHEN** the update succeeds
  - **THEN** the updatedAt timestamp should be newer than before
  - **GIVEN** I update an application
  - **WHEN** the update succeeds
  - **THEN** the userId should remain unchanged
  - _Requirements: 3.1, 7.1, 7.2, 7.3, 7.4, 10.2, 10.3, 10.4_

- [ ]\* 1.2 Write property test for owner authorization check

  - **Property 18: Owner authorization check**
  - **Validates: Requirements 7.1, 10.2, 10.3, 10.4**

- [ ]\* 1.3 Write property test for creation timestamp preservation

  - **Property 19: Creation timestamp preservation**
  - **Validates: Requirements 7.2**

- [ ]\* 1.4 Write property test for update timestamp modification

  - **Property 20: Update timestamp modification**
  - **Validates: Requirements 7.3**

- [ ]\* 1.5 Write property test for user ID immutability

  - **Property 21: User ID immutability**
  - **Validates: Requirements 7.4**

- [x] 1.6 Implement mock data service update operations (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement getApplicationById(appId) in mockData.ts
  - **GREEN**: Implement updateApplicationInStore(appId, data) in mockData.ts
  - **GREEN**: Preserve immutable fields (appId, userId, createdAt)
  - **GREEN**: Update updatedAt timestamp to current time
  - **GREEN**: Implement updateApplication(appId, data, userId) in mockDataService.ts
  - **GREEN**: Add ownership validation (throw error if userId doesn't match)
  - **GREEN**: Return Promise with updated application
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 3.1, 7.1, 7.2, 7.3, 7.4, 10.2, 10.3, 10.4_

- [x] 2. Add Tanstack Query mutation hook for updates (BDD/TDD)
- [x] 2.1 Write acceptance tests for update mutation hook

  - **GIVEN** I have an application to update
  - **WHEN** I call the update mutation with valid data
  - **THEN** the mutation should succeed and return updated application
  - **GIVEN** an application is updated successfully
  - **WHEN** the mutation completes
  - **THEN** relevant queries should be invalidated
  - **GIVEN** an application update fails
  - **WHEN** the mutation completes
  - **THEN** I should receive an error
  - _Requirements: 3.1, 3.5, 7.5_

- [ ]\* 2.2 Write property test for cache invalidation

  - **Property 22: Cache invalidation**
  - **Validates: Requirements 7.5**

- [x] 2.3 Implement useUpdateApplication mutation hook (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create useUpdateApplication hook using useMutation
  - **GREEN**: Call mockDataService.updateApplication in mutationFn
  - **GREEN**: Invalidate ["applications"] query on success
  - **GREEN**: Invalidate ["applications", "user", userId] query on success
  - **GREEN**: Invalidate ["application", appId] query on success
  - **GREEN**: Handle errors in onError callback
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 3.1, 3.5, 7.5_

- [x] 2.4 Implement useApplication query hook (RED → GREEN → REFACTOR)

  - **RED**: Write tests for single application query
  - **GREEN**: Create useApplication(appId) hook using useQuery
  - **GREEN**: Call mockDataService.getApplicationById in queryFn
  - **GREEN**: Configure staleTime: Infinity for mock data
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.5_

- [x] 3. Add edit button to ApplicationCard (BDD/TDD)
- [x] 3.1 Write acceptance tests for edit button visibility

  - **GIVEN** I am authenticated and viewing my own application card
  - **WHEN** the card renders
  - **THEN** I should see an edit button
  - **GIVEN** I am authenticated and viewing another user's application card
  - **WHEN** the card renders
  - **THEN** I should NOT see an edit button
  - **GIVEN** I am unauthenticated
  - **WHEN** I view any application card
  - **THEN** I should NOT see an edit button
  - **GIVEN** I click the edit button on my application
  - **WHEN** the button is clicked
  - **THEN** I should navigate to the edit form page
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]\* 3.2 Write property test for edit button visibility for owners

  - **Property 1: Edit button visibility for owners**
  - **Validates: Requirements 1.1**

- [ ]\* 3.3 Write property test for edit button hidden for non-owners

  - **Property 2: Edit button hidden for non-owners**
  - **Validates: Requirements 1.2, 1.3**

- [x] 3.4 Update ApplicationCard component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add currentUserId prop to ApplicationCard
  - **GREEN**: Get currentUserId from useMockAuth hook
  - **GREEN**: Conditionally render edit button when currentUserId === application.userId
  - **GREEN**: Edit button navigates to /edit/:appId
  - **GREEN**: Ensure edit button is 44x44px minimum (mobile-friendly)
  - **GREEN**: Use Edit icon from lucide-react
  - **GREEN**: Show icon only on mobile, icon + text on desktop
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.2_

- [x] 4. Create EditApplicationPage component (BDD/TDD)
- [x] 4.1 Write acceptance tests for EditApplicationPage

  - **GIVEN** I navigate to an edit page with a valid appId
  - **WHEN** the page loads
  - **THEN** I should see a loading state while fetching application data
  - **GIVEN** I am the owner of the application
  - **WHEN** the application data loads
  - **THEN** I should see the edit form pre-populated with current data
  - **GIVEN** I am not the owner of the application
  - **WHEN** the page loads
  - **THEN** I should see an authorization error message
  - **GIVEN** I am unauthenticated
  - **WHEN** I try to access the edit page
  - **THEN** I should be redirected to login
  - **GIVEN** the application does not exist
  - **WHEN** the page loads
  - **THEN** I should see an error message
  - _Requirements: 1.4, 1.5, 10.1, 10.2, 10.3_

- [ ]\* 4.2 Write property test for edit form pre-population

  - **Property 3: Edit form pre-population**
  - **Validates: Requirements 1.5**

- [x] 4.3 Implement EditApplicationPage component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Get appId from route params
  - **GREEN**: Fetch application using useApplication(appId) hook
  - **GREEN**: Get currentUserId from useMockAuth hook
  - **GREEN**: Show loading spinner while fetching
  - **GREEN**: Verify ownership (currentUserId === application.userId)
  - **GREEN**: Show error if not authorized
  - **GREEN**: Show error if application not found
  - **GREEN**: Render ApplicationForm with initialData when authorized
  - **GREEN**: Handle form submission with useUpdateApplication mutation
  - **GREEN**: Navigate to gallery on success
  - **GREEN**: Handle cancel by navigating back
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.4, 1.5, 3.1, 3.4, 4.3, 10.1, 10.2, 10.3_

- [x] 5. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Enhance ApplicationForm for edit mode (BDD/TDD)
- [x] 6.1 Write acceptance tests for ApplicationForm edit mode

  - **GIVEN** I view the edit form with initialData
  - **WHEN** the form renders
  - **THEN** all fields should be pre-populated with the application data
  - **GIVEN** I modify a field in edit mode
  - **WHEN** I change the value
  - **THEN** the form should validate the new value
  - **GIVEN** I submit the edit form with valid changes
  - **WHEN** I click save
  - **THEN** I should see a success message
  - **GIVEN** I submit the edit form with invalid data
  - **WHEN** I click save
  - **THEN** I should see validation errors
  - **GIVEN** I make changes in edit mode
  - **WHEN** I click cancel
  - **THEN** the changes should be discarded
  - _Requirements: 1.5, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2_

- [ ]\* 6.2 Write property test for required field validation on edit

  - **Property 4: Required field validation on edit**
  - **Validates: Requirements 2.2**

- [ ]\* 6.3 Write property test for name length validation

  - **Property 5: Name length validation**
  - **Validates: Requirements 2.3**

- [ ]\* 6.4 Write property test for description length validation

  - **Property 6: Description length validation**
  - **Validates: Requirements 2.4**

- [ ]\* 6.5 Write property test for URL format validation

  - **Property 7: URL format validation**
  - **Validates: Requirements 2.5**

- [ ]\* 6.6 Write property test for invalid data rejection

  - **Property 9: Invalid data rejection**
  - **Validates: Requirements 3.2**

- [x] 6.7 Enhance ApplicationForm component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add mode prop ("create" | "edit") to ApplicationForm
  - **GREEN**: Update button text based on mode ("Save Application" vs "Update Application")
  - **GREEN**: Ensure initialData prop properly pre-populates all fields
  - **GREEN**: Ensure validation works the same in edit mode
  - **GREEN**: Ensure cancel restores original data in edit mode
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.2_

- [x] 7. Implement update persistence and feedback (BDD/TDD)
- [x] 7.1 Write acceptance tests for update persistence

  - **GIVEN** I submit valid changes to an application
  - **WHEN** the update succeeds
  - **THEN** the application should be updated in mock data
  - **GIVEN** I submit valid changes to an application
  - **WHEN** the update succeeds
  - **THEN** I should see a success message
  - **GIVEN** I submit valid changes to an application
  - **WHEN** the update succeeds
  - **THEN** I should be navigated back to the gallery
  - **GIVEN** I update an application
  - **WHEN** I view the gallery
  - **THEN** I should see the updated information immediately
  - **GIVEN** I update an application
  - **WHEN** I view the user profile
  - **THEN** I should see the updated information immediately
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [ ]\* 7.2 Write property test for update persistence round-trip

  - **Property 8: Update persistence round-trip**
  - **Validates: Requirements 3.1, 3.5**

- [ ]\* 7.3 Write property test for success feedback display

  - **Property 10: Success feedback display**
  - **Validates: Requirements 3.3**

- [x] 7.4 Implement update persistence (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Wire up EditApplicationPage onSubmit to useUpdateApplication mutation
  - **GREEN**: Show success message on successful update
  - **GREEN**: Navigate to gallery after successful update
  - **GREEN**: Verify gallery shows updated data (cache invalidation working)
  - **GREEN**: Verify profile page shows updated data
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [x] 8. Implement cancel functionality (BDD/TDD)
- [x] 8.1 Write acceptance tests for cancel functionality

  - **GIVEN** I make changes in the edit form
  - **WHEN** I click cancel
  - **THEN** the changes should be discarded
  - **GIVEN** I make changes in the edit form
  - **WHEN** I click cancel
  - **THEN** I should be navigated back to the previous page
  - **GIVEN** I make changes in the edit form
  - **WHEN** I click cancel
  - **THEN** the application data should remain unchanged
  - **GIVEN** I make changes in the edit form
  - **WHEN** I try to navigate away
  - **THEN** I should see a confirmation prompt
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5_

- [ ]\* 8.2 Write property test for cancel preserves original data

  - **Property 11: Cancel preserves original data**
  - **Validates: Requirements 4.2, 4.4**

- [ ]\* 8.3 Write property test for unsaved changes warning

  - **Property 12: Unsaved changes warning**
  - **Validates: Requirements 4.5, 9.5**

- [x] 8.4 Implement cancel functionality (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Ensure ApplicationForm cancel button calls onCancel prop
  - **GREEN**: EditApplicationPage onCancel navigates back to previous page
  - **GREEN**: Verify application data unchanged after cancel
  - **GREEN**: Add unsaved changes detection (compare current form state to initialData)
  - **GREEN**: Show browser confirmation prompt on navigation if form is dirty
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5_

- [x] 9. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement visibility change functionality (BDD/TDD)
- [ ] 10.1 Write acceptance tests for visibility changes

  - **GIVEN** I change an application from public to private
  - **WHEN** I save the changes
  - **THEN** unauthenticated users should not see the application in the gallery
  - **GIVEN** I change an application from private to public
  - **WHEN** I save the changes
  - **THEN** unauthenticated users should see the application in the gallery
  - **GIVEN** I change an application's visibility
  - **WHEN** I save the changes
  - **THEN** the gallery filtering should immediately reflect the new setting
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [ ]\* 10.2 Write property test for visibility change to private

  - **Property 13: Visibility change to private**
  - **Validates: Requirements 5.2, 5.5**

- [ ]\* 10.3 Write property test for visibility change to public

  - **Property 14: Visibility change to public**
  - **Validates: Requirements 5.3**

- [ ]\* 10.4 Write property test for visibility filtering after update

  - **Property 15: Visibility filtering after update**
  - **Validates: Requirements 5.4**

- [ ] 10.5 Implement visibility change functionality (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Ensure ApplicationForm visibility selector works in edit mode
  - **GREEN**: Verify visibility field is included in update request
  - **GREEN**: Test changing from public to private
  - **GREEN**: Verify unauthenticated users can't see private apps in gallery
  - **GREEN**: Test changing from private to public
  - **GREEN**: Verify unauthenticated users can see public apps in gallery
  - **GREEN**: Verify cache invalidation updates gallery immediately
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Implement tag update functionality (BDD/TDD)
- [x] 11.1 Write acceptance tests for tag updates

  - **GIVEN** I view the edit form
  - **WHEN** the form renders
  - **THEN** I should see the current tags
  - **GIVEN** I add new tags to an application
  - **WHEN** I save the changes
  - **THEN** the application should have the new tags
  - **GIVEN** I try to remove all tags
  - **WHEN** I submit the form
  - **THEN** I should see a validation error
  - **GIVEN** I update an application's tags
  - **WHEN** I save the changes
  - **THEN** the gallery tag filter should include the new tags
  - **GIVEN** I update an application's tags
  - **WHEN** I filter by a new tag
  - **THEN** the application should appear in the filtered results
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]\* 11.2 Write property test for tag validation

  - **Property 16: Tag validation**
  - **Validates: Requirements 6.2**

- [ ]\* 11.3 Write property test for tag filtering after update

  - **Property 17: Tag filtering after update**
  - **Validates: Requirements 6.4, 6.5**

- [x] 11.4 Implement tag update functionality (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Ensure ApplicationForm tags field works in edit mode
  - **GREEN**: Verify tags are pre-populated from initialData
  - **GREEN**: Test adding new tags
  - **GREEN**: Test validation error when removing all tags
  - **GREEN**: Verify updated tags appear in gallery tag filter
  - **GREEN**: Verify application appears when filtering by new tags
  - **GREEN**: Verify cache invalidation updates tag list
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 12. Implement error handling and feedback (BDD/TDD)
- [x] 12.1 Write acceptance tests for error handling

  - **GIVEN** I submit the edit form
  - **WHEN** the form is processing
  - **THEN** I should see a loading indicator
  - **GIVEN** an update operation fails
  - **WHEN** the error occurs
  - **THEN** I should see a user-friendly error message
  - **GIVEN** an update operation fails
  - **WHEN** the error occurs
  - **THEN** the form state should be preserved
  - **GIVEN** I have validation errors
  - **WHEN** the errors are displayed
  - **THEN** the specific fields should be highlighted
  - **GIVEN** I have a validation error on a field
  - **WHEN** I correct that field
  - **THEN** the error message should be cleared
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]\* 12.2 Write property test for loading state display

  - **Property 23: Loading state display**
  - **Validates: Requirements 8.1**

- [ ]\* 12.3 Write property test for error message display

  - **Property 24: Error message display**
  - **Validates: Requirements 8.2**

- [ ]\* 12.4 Write property test for error state preservation

  - **Property 25: Error state preservation**
  - **Validates: Requirements 8.3**

- [ ]\* 12.5 Write property test for field error highlighting

  - **Property 26: Field error highlighting**
  - **Validates: Requirements 8.4**

- [ ]\* 12.6 Write property test for error message clearing

  - **Property 27: Error message clearing**
  - **Validates: Requirements 8.5**

- [x] 12.7 Implement error handling and feedback (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Show loading indicator during form submission (already in ApplicationForm)
  - **GREEN**: Display error message on update failure
  - **GREEN**: Preserve form state on error (already in ApplicationForm)
  - **GREEN**: Highlight fields with validation errors (already in ApplicationForm)
  - **GREEN**: Clear error messages when fields are corrected (already in ApplicationForm)
  - **GREEN**: Add error handling in EditApplicationPage for authorization errors
  - **GREEN**: Add error handling for application not found
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13. Add routing for edit page (BDD/TDD)
- [x] 13.1 Write acceptance tests for edit routing

  - **GIVEN** I click an edit button
  - **WHEN** the button is clicked
  - **THEN** I should navigate to /edit/:appId
  - **GIVEN** I access /edit/:appId directly
  - **WHEN** the URL is loaded
  - **THEN** the edit page should render
  - **GIVEN** I am on the edit page
  - **WHEN** I use browser back button
  - **THEN** I should navigate to the previous page
  - _Requirements: 1.4, 10.1_

- [x] 13.2 Add edit route to router configuration (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add /edit/:appId route to Tanstack Router configuration
  - **GREEN**: Map route to EditApplicationPage component
  - **GREEN**: Ensure route params (appId) are passed correctly
  - **GREEN**: Test direct URL access
  - **GREEN**: Test browser navigation (back/forward)
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 1.4, 10.1_

- [x] 14. Ensure mobile responsiveness for edit features (BDD/TDD)
- [x] 14.1 Write acceptance tests for mobile edit experience

  - **GIVEN** I view the edit form on a 320px viewport
  - **WHEN** the form renders
  - **THEN** all fields should be readable and tappable
  - **GIVEN** I view an application card on mobile
  - **WHEN** the card renders with an edit button
  - **THEN** the edit button should be at least 44x44px
  - **GIVEN** I tap the edit button on mobile
  - **WHEN** the button is tapped
  - **THEN** I should see appropriate touch feedback
  - **GIVEN** I view the edit form on mobile
  - **WHEN** the form renders
  - **THEN** fields should be in a single column layout
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 14.2 Implement mobile responsiveness (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Ensure edit button on ApplicationCard is 44x44px minimum
  - **GREEN**: Test edit form on 320px viewport
  - **GREEN**: Verify single column layout on mobile
  - **GREEN**: Verify all touch targets meet 44x44px requirement
  - **GREEN**: Test touch feedback on buttons
  - **GREEN**: Ensure unsaved changes warning works on mobile back button
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 15. Final checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Extend mock data service with delete operations (BDD/TDD)
- [x] 16.1 Write acceptance tests for application deletion service

  - **GIVEN** I am the owner of an application
  - **WHEN** I request to delete the application
  - **THEN** the application should be removed from mock data
  - **GIVEN** I am not the owner of an application
  - **WHEN** I attempt to delete the application
  - **THEN** I should receive an authorization error
  - **GIVEN** I delete an application
  - **WHEN** the deletion succeeds
  - **THEN** subsequent queries for that application should return null
  - **GIVEN** I delete an application
  - **WHEN** the deletion succeeds
  - **THEN** the application should not appear in any user's application list
  - _Requirements: 11.5, 14.1, 14.2, 14.5, 15.2, 15.3, 15.4_

- [ ]\* 16.2 Write property test for delete authorization check

  - **Property 37: Delete authorization check**
  - **Validates: Requirements 14.1, 15.2, 15.3, 15.4**

- [ ]\* 16.3 Write property test for deletion cache invalidation

  - **Property 38: Deletion cache invalidation**
  - **Validates: Requirements 14.3, 14.5**

- [x] 16.4 Implement mock data service delete operations (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Implement deleteApplicationFromStore(appId) in mockData.ts
  - **GREEN**: Find application by ID and remove from array using splice
  - **GREEN**: Throw error if application not found
  - **GREEN**: Implement deleteApplication(appId, userId) in mockDataService.ts
  - **GREEN**: Add ownership validation (throw error if userId doesn't match)
  - **GREEN**: Call deleteApplicationFromStore after validation
  - **GREEN**: Return Promise<void>
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 11.5, 14.1, 14.2, 14.5, 15.2, 15.3, 15.4_

- [x] 17. Add Tanstack Query mutation hook for deletion (BDD/TDD)
- [x] 17.1 Write acceptance tests for delete mutation hook

  - **GIVEN** I have an application to delete
  - **WHEN** I call the delete mutation
  - **THEN** the mutation should succeed
  - **GIVEN** an application is deleted successfully
  - **WHEN** the mutation completes
  - **THEN** relevant queries should be invalidated
  - **GIVEN** an application is deleted successfully
  - **WHEN** the mutation completes
  - **THEN** the specific application query should be removed from cache
  - **GIVEN** an application deletion fails
  - **WHEN** the mutation completes
  - **THEN** I should receive an error
  - _Requirements: 11.5, 13.2, 13.3, 14.3_

- [x] 17.2 Implement useDeleteApplication mutation hook (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create useDeleteApplication hook using useMutation
  - **GREEN**: Call mockDataService.deleteApplication in mutationFn
  - **GREEN**: Invalidate ["applications"] query on success
  - **GREEN**: Invalidate ["applications", "user", userId] query on success
  - **GREEN**: Remove ["application", appId] query from cache on success
  - **GREEN**: Handle errors in onError callback
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 11.5, 13.2, 13.3, 14.3_

- [x] 18. Create DeleteConfirmDialog component (BDD/TDD)
- [x] 18.1 Write acceptance tests for DeleteConfirmDialog

  - **GIVEN** the delete confirmation dialog is open
  - **WHEN** the dialog renders
  - **THEN** I should see the application name in the message
  - **GIVEN** the delete confirmation dialog is open
  - **WHEN** the dialog renders
  - **THEN** I should see a warning about permanent deletion
  - **GIVEN** I click cancel in the confirmation dialog
  - **WHEN** the button is clicked
  - **THEN** the dialog should close without deleting
  - **GIVEN** I click confirm in the confirmation dialog
  - **WHEN** the button is clicked
  - **THEN** the onConfirm callback should be called
  - **GIVEN** deletion is in progress
  - **WHEN** the dialog renders
  - **THEN** the confirm button should be disabled and show loading state
  - _Requirements: 11.4, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]\* 18.2 Write property test for delete confirmation display

  - **Property 30: Delete confirmation display**
  - **Validates: Requirements 11.4, 12.1**

- [x] 18.3 Implement DeleteConfirmDialog component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Create DeleteConfirmDialog component using shadcn/ui AlertDialog
  - **GREEN**: Accept isOpen, onClose, onConfirm, applicationName, isDeleting props
  - **GREEN**: Display application name in dialog description
  - **GREEN**: Display warning text about permanent deletion
  - **GREEN**: Render Cancel button that calls onClose
  - **GREEN**: Render Confirm button that calls onConfirm
  - **GREEN**: Disable Confirm button when isDeleting is true
  - **GREEN**: Show "Deleting..." text when isDeleting is true
  - **GREEN**: Ensure all buttons are 44x44px minimum (mobile-friendly)
  - **GREEN**: Use destructive variant for Confirm button
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 16.2, 16.3_

- [x] 19. Add delete button to ApplicationCard (BDD/TDD)
- [x] 19.1 Write acceptance tests for delete button visibility

  - **GIVEN** I am authenticated and viewing my own application card
  - **WHEN** the card renders
  - **THEN** I should see a delete button
  - **GIVEN** I am authenticated and viewing another user's application card
  - **WHEN** the card renders
  - **THEN** I should NOT see a delete button
  - **GIVEN** I am unauthenticated
  - **WHEN** I view any application card
  - **THEN** I should NOT see a delete button
  - **GIVEN** I click the delete button on my application
  - **WHEN** the button is clicked
  - **THEN** I should see a confirmation dialog
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]\* 19.2 Write property test for delete button visibility for owners

  - **Property 28: Delete button visibility for owners**
  - **Validates: Requirements 11.1**

- [ ]\* 19.3 Write property test for delete button hidden for non-owners

  - **Property 29: Delete button hidden for non-owners**
  - **Validates: Requirements 11.2, 11.3**

- [x] 19.4 Update ApplicationCard component (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Add state for delete confirmation dialog (showDeleteDialog)
  - **GREEN**: Conditionally render delete button when currentUserId === application.userId
  - **GREEN**: Delete button opens confirmation dialog (setShowDeleteDialog(true))
  - **GREEN**: Ensure delete button is 44x44px minimum (mobile-friendly)
  - **GREEN**: Use Trash2 icon from lucide-react
  - **GREEN**: Show icon only on mobile, icon + text on desktop
  - **GREEN**: Use destructive variant for delete button
  - **GREEN**: Group edit and delete buttons together with 8px gap
  - **GREEN**: Render DeleteConfirmDialog component
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 16.1_

- [ ] 20. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Implement delete confirmation and execution (BDD/TDD)
- [x] 21.1 Write acceptance tests for delete confirmation flow

  - **GIVEN** I click delete on my application
  - **WHEN** the confirmation dialog opens
  - **THEN** I should see the application name
  - **GIVEN** I click cancel in the confirmation dialog
  - **WHEN** the button is clicked
  - **THEN** the dialog should close and the application should remain
  - **GIVEN** I click confirm in the confirmation dialog
  - **WHEN** the button is clicked
  - **THEN** the application should be deleted
  - **GIVEN** I confirm deletion
  - **WHEN** the deletion is processing
  - **THEN** I should see a loading indicator
  - _Requirements: 11.4, 11.5, 12.1, 12.3, 12.4, 12.5_

- [ ]\* 21.2 Write property test for deletion with confirmation

  - **Property 31: Deletion with confirmation**
  - **Validates: Requirements 11.5, 12.3**

- [ ]\* 21.3 Write property test for deletion cancellation

  - **Property 32: Deletion cancellation**
  - **Validates: Requirements 12.4**

- [x] 21.4 Implement delete confirmation flow (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Wire up useDeleteApplication mutation in ApplicationCard
  - **GREEN**: Implement handleDeleteConfirm that calls mutation
  - **GREEN**: Pass isDeleting state to DeleteConfirmDialog
  - **GREEN**: Close dialog on successful deletion
  - **GREEN**: Keep dialog open on error and show error message
  - **GREEN**: Verify application remains when cancel is clicked
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 11.4, 11.5, 12.1, 12.3, 12.4, 12.5_

- [x] 22. Implement deletion feedback and UI updates (BDD/TDD)
- [x] 22.1 Write acceptance tests for deletion feedback

  - **GIVEN** I successfully delete an application
  - **WHEN** the deletion completes
  - **THEN** I should see a success message
  - **GIVEN** I successfully delete an application
  - **WHEN** I view the gallery
  - **THEN** the application should no longer appear
  - **GIVEN** I successfully delete an application
  - **WHEN** I view my profile page
  - **THEN** the application should no longer appear
  - **GIVEN** a deletion fails
  - **WHEN** the error occurs
  - **THEN** I should see an error message
  - **GIVEN** a deletion fails
  - **WHEN** the error occurs
  - **THEN** the application should still appear in the gallery
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]\* 22.2 Write property test for deletion success feedback

  - **Property 33: Deletion success feedback**
  - **Validates: Requirements 13.1**

- [ ]\* 22.3 Write property test for deletion removes from gallery

  - **Property 34: Deletion removes from gallery**
  - **Validates: Requirements 13.2**

- [ ]\* 22.4 Write property test for deletion removes from profile

  - **Property 35: Deletion removes from profile**
  - **Validates: Requirements 13.3**

- [ ]\* 22.5 Write property test for deletion error handling

  - **Property 36: Deletion error handling**
  - **Validates: Requirements 13.4, 13.5**

- [x] 22.6 Implement deletion feedback (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Show success toast/message on successful deletion
  - **GREEN**: Verify cache invalidation removes app from gallery immediately
  - **GREEN**: Verify cache invalidation removes app from profile immediately
  - **GREEN**: Show error message on deletion failure
  - **GREEN**: Verify application remains in gallery on error
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 23. Ensure mobile responsiveness for delete features (BDD/TDD)
- [x] 23.1 Write acceptance tests for mobile delete experience

  - **GIVEN** I view my application card on a 320px viewport
  - **WHEN** the card renders
  - **THEN** the delete button should be at least 44x44px
  - **GIVEN** I tap the delete button on mobile
  - **WHEN** the button is tapped
  - **THEN** I should see appropriate touch feedback
  - **GIVEN** I view the delete confirmation dialog on mobile
  - **WHEN** the dialog renders
  - **THEN** all buttons should be at least 44x44px
  - **GIVEN** I view the delete confirmation dialog on mobile
  - **WHEN** the dialog renders
  - **THEN** the application name and warning should be easily readable
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 23.2 Implement mobile responsiveness for deletion (RED → GREEN → REFACTOR)

  - **RED**: Run acceptance tests and watch them fail
  - **GREEN**: Ensure delete button on ApplicationCard is 44x44px minimum
  - **GREEN**: Test delete button on 320px viewport
  - **GREEN**: Verify touch feedback on delete button
  - **GREEN**: Test DeleteConfirmDialog on 320px viewport
  - **GREEN**: Verify all dialog buttons meet 44x44px requirement
  - **GREEN**: Verify text readability on mobile
  - **GREEN**: Test button spacing (8px minimum between edit and delete)
  - **REFACTOR**: Ensure all tests pass, improve code quality
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
