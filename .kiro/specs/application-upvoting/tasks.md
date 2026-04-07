# Implementation Plan: Application Upvoting

## Overview

This implementation plan breaks down the application upvoting feature into discrete coding tasks. The feature enables authenticated users to upvote applications, with upvote counts stored in DynamoDB and exposed via REST API endpoints. The implementation follows test-first development using the 4-layer acceptance testing framework (DSL + Protocol Driver).

## Tasks

- [ ] 1. Set up test infrastructure for upvoting feature
  - Create `backend/tests/shared/upvoting_dsl.py` with `given`, `when`, `then` contexts
  - Create `backend/tests/shared/upvoting_protocol_driver.py` with DynamoDB and JWT mocking
  - Create `backend/tests/acceptance/test_upvoting.py` for acceptance tests
  - Update `backend/tests/acceptance/conftest.py` to reset DSL state between tests
  - _Requirements: All (testing foundation)_

- [ ]\* 2. Write acceptance tests for upvote creation
  - **Scenario: User upvotes an application**
  - **Scenario: Duplicate upvote is rejected**
  - **Scenario: Unauthenticated user cannot upvote**
  - **Scenario: Upvoting non-existent application fails**
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.4, 6.1, 6.2, 6.3_

- [ ] 3. Implement upvote creation endpoint
  - [ ] 3.1 Add POST /applications/{appId}/upvote route to `backend/application/handler.py`
    - Extract user ID from JWT token
    - Validate authentication
    - Route to `upvote_application()` function
    - _Requirements: 1.4, 6.1, 6.5, 8.1_
  - [ ] 3.2 Implement `upvote_application(app_id: str, user_id: str)` function
    - Verify application exists using `get_item()`
    - Check for existing upvote record
    - Return 409 Conflict if already upvoted
    - Create upvote record with PK=USER#{userId}, SK=UPVOTE#{appId}
    - Set GSI1PK=APP#{appId}, GSI1SK=UPVOTE#{userId}
    - Include entityType=UPVOTE, timestamp, userId, appId attributes
    - Atomically increment application's upvoteCount using ADD operation
    - Return 201 Created with upvote data and new count
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.5_

- [ ]\* 4. Write property tests for upvote creation
  - **Property 1: Upvote Record Creation** - Validates Requirements 1.1, 7.1
  - **Property 2: Upvote Count Increment** - Validates Requirements 1.2, 7.2
  - **Property 3: Duplicate Upvote Rejection** - Validates Requirements 1.3
  - **Property 4: Authentication Required** - Validates Requirements 1.4, 2.4, 6.1
  - **Property 16: Application Existence Validation** - Validates Requirements 5.4
  - **Property 17: GSI1 Key Pattern** - Validates Requirements 7.3
  - **Property 18: Upvote Timestamp Presence** - Validates Requirements 7.4
  - **Property 19: Entity Type Attribute** - Validates Requirements 7.5

- [ ] 5. Checkpoint - Ensure upvote creation tests pass
  - Run acceptance tests for upvote creation scenarios
  - Run property tests for upvote creation properties
  - Verify all tests pass, ask the user if questions arise

- [ ]\* 6. Write acceptance tests for upvote removal
  - **Scenario: User removes their upvote**
  - **Scenario: Removing non-existent upvote fails**
  - **Scenario: Unauthenticated user cannot remove upvote**
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2_

- [ ] 7. Implement upvote removal endpoint
  - [ ] 7.1 Add DELETE /applications/{appId}/upvote route to `backend/application/handler.py`
    - Extract user ID from JWT token
    - Validate authentication
    - Route to `remove_upvote()` function
    - _Requirements: 2.4, 6.1, 6.5, 8.2_
  - [ ] 7.2 Implement `remove_upvote(app_id: str, user_id: str)` function
    - Verify application exists
    - Check if upvote record exists
    - Return 404 Not Found if no upvote exists
    - Delete upvote record using `delete_item()`
    - Atomically decrement application's upvoteCount with minimum value of 0
    - Return 200 OK with new upvote count
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 8.5_

- [ ]\* 8. Write property tests for upvote removal
  - **Property 5: Upvote Record Deletion** - Validates Requirements 2.1
  - **Property 6: Upvote Count Decrement** - Validates Requirements 2.2
  - **Property 7: Non-Existent Upvote Removal Error** - Validates Requirements 2.3

- [ ] 9. Checkpoint - Ensure upvote removal tests pass
  - Run acceptance tests for upvote removal scenarios
  - Run property tests for upvote removal properties
  - Verify all tests pass, ask the user if questions arise

- [ ]\* 10. Write acceptance tests for upvote status queries
  - **Scenario: Check if user has upvoted an application**
  - **Scenario: Query upvote status for non-existent application fails**
  - **Scenario: List applications includes upvote counts**
  - **Scenario: Authenticated user sees hasUpvoted status**
  - **Scenario: Unauthenticated user does not see hasUpvoted status**
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 11. Implement upvote status query endpoint
  - [ ] 11.1 Add GET /applications/{appId}/upvote route to `backend/application/handler.py`
    - Extract user ID from JWT token
    - Validate authentication
    - Route to `check_upvote_status()` function
    - _Requirements: 3.1, 6.1, 6.5, 8.3_
  - [ ] 11.2 Implement `check_upvote_status(app_id: str, user_id: str)` function
    - Verify application exists
    - Query for upvote record using `get_item(PK=USER#{userId}, SK=UPVOTE#{appId})`
    - Return hasUpvoted boolean and upvotedAt timestamp if exists
    - Return 200 OK with upvote status
    - _Requirements: 3.1, 3.5, 8.5_

- [ ] 12. Enhance application list/get endpoints with upvote data
  - [ ] 12.1 Implement `enrich_applications_with_upvotes()` utility function
    - Add upvoteCount to each application (default to 0 if not present)
    - If user_id provided, batch query user's upvote records
    - Add hasUpvoted field to each application for authenticated users
    - Return enriched application list
    - _Requirements: 3.2, 3.3, 3.4_
  - [ ] 12.2 Update `list_all_applications()` to include upvote data
    - Call `enrich_applications_with_upvotes()` with optional user_id
    - Return applications with upvoteCount and hasUpvoted (if authenticated)
    - _Requirements: 3.2, 3.3, 3.4, 8.4_
  - [ ] 12.3 Update `list_user_applications()` to include upvote data
    - Call `enrich_applications_with_upvotes()` with optional user_id
    - Return applications with upvoteCount and hasUpvoted (if authenticated)
    - _Requirements: 3.2, 3.3, 3.4, 8.4_
  - [ ] 12.4 Update `get_application()` to include upvote data
    - Add upvoteCount to response (default to 0)
    - If authenticated, check if user has upvoted and add hasUpvoted field
    - Return application with upvote data
    - _Requirements: 3.2, 3.3, 3.4, 8.4_

- [ ]\* 13. Write property tests for upvote status queries
  - **Property 8: Upvote Status Query Accuracy** - Validates Requirements 3.1
  - **Property 9: Upvote Count Inclusion** - Validates Requirements 3.2, 4.3, 8.4
  - **Property 10: Authenticated User Upvote Status** - Validates Requirements 3.3
  - **Property 11: Unauthenticated Response Exclusion** - Validates Requirements 3.4

- [ ] 14. Checkpoint - Ensure upvote query tests pass
  - Run acceptance tests for upvote status query scenarios
  - Run property tests for upvote query properties
  - Verify all tests pass, ask the user if questions arise

- [ ]\* 15. Write acceptance tests for sorting and pagination
  - **Scenario: Applications sorted by upvote count descending**
  - **Scenario: Result limit is enforced**
  - **Scenario: Applications with same upvote count sorted by creation date**
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ] 16. Implement sorting by upvote count (future enhancement placeholder)
  - Add GSI2 with GSI2PK=APP_LIST, GSI2SK=upvoteCount#{timestamp}#{appId} for efficient sorting
  - Implement query endpoint for sorted applications
  - Support limit parameter for pagination
  - Apply secondary sort by createdAt for ties
  - _Requirements: 4.1, 4.2, 4.4, 4.5_
  - _Note: This task is marked for future implementation and can be deferred_

- [ ]\* 17. Write property tests for sorting and pagination
  - **Property 12: Upvote Count Sort Order** - Validates Requirements 4.1
  - **Property 13: Result Limit Enforcement** - Validates Requirements 4.2
  - **Property 14: Secondary Sort by Creation Date** - Validates Requirements 4.5

- [ ] 18. Update AWS SAM template for upvote endpoints
  - [ ] 18.1 Add API Gateway routes to `template.yaml`
    - Add POST /applications/{appId}/upvote event to ApplicationFunction
    - Add DELETE /applications/{appId}/upvote event to ApplicationFunction
    - Add GET /applications/{appId}/upvote event to ApplicationFunction
    - Configure Cognito authorizer for all three endpoints
    - _Requirements: 6.1, 8.1, 8.2, 8.3_
  - [ ] 18.2 Update ApplicationFunction IAM permissions
    - Ensure DynamoDB permissions include Query, GetItem, PutItem, UpdateItem, DeleteItem
    - Ensure permissions cover both main table and GSI1
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 19. Add error handling for data consistency scenarios
  - [ ] 19.1 Implement orphaned upvote detection in `check_upvote_status()`
    - If upvote record exists but application doesn't, return 404 Not Found
    - Log warning for orphaned upvote records
    - _Requirements: 5.3, 8.5_
  - [ ] 19.2 Add transaction rollback handling for partial failures
    - Ensure atomic operations use proper error handling
    - Log errors with full context for debugging
    - Return appropriate error responses (500 Internal Server Error)
    - _Requirements: 5.1, 5.2, 8.5_

- [ ]\* 20. Write property tests for data consistency
  - **Property 15: Orphaned Upvote Error Handling** - Validates Requirements 5.3

- [ ] 21. Frontend: Set up test infrastructure for upvoting UI
  - Create `src/__tests__/shared/upvoting_dsl.ts` with `given`, `when`, `then` contexts
  - Create `src/__tests__/shared/upvoting_protocol_driver.ts` with API mocking
  - Create `src/__tests__/acceptance/test_upvoting_ui.test.tsx` for acceptance tests
  - _Requirements: All (frontend testing foundation)_

- [ ]\* 22. Frontend: Write acceptance tests for upvote UI interactions
  - **Scenario: User clicks upvote button and count increases**
  - **Scenario: User removes upvote and count decreases**
  - **Scenario: Upvote button shows correct state (upvoted/not upvoted)**
  - **Scenario: Unauthenticated user sees upvote count but cannot upvote**

- [ ] 23. Frontend: Create upvote service methods
  - [ ] 23.1 Add upvote methods to `src/services/applicationService.ts`
    - `upvoteApplication(appId: string): Promise<ApiResponse<UpvoteResponse>>`
    - `removeUpvote(appId: string): Promise<ApiResponse<UpvoteResponse>>`
    - `checkUpvoteStatus(appId: string): Promise<ApiResponse<UpvoteStatusResponse>>`
    - Use `apiClient` for HTTP requests with proper error handling
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 24. Frontend: Create upvote hook
  - [ ] 24.1 Create `src/hooks/useUpvote.ts` with TanStack Query
    - `useUpvote(appId: string)` - Query hook for upvote status
    - `useUpvoteMutation(appId: string)` - Mutation hook for creating upvote
    - `useRemoveUpvoteMutation(appId: string)` - Mutation hook for removing upvote
    - Implement optimistic updates for instant UI feedback
    - Invalidate application queries on mutation success
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1_

- [ ] 25. Frontend: Add upvote button to ApplicationCard component
  - [ ] 25.1 Update `src/components/ApplicationCard.tsx`
    - Add upvote button with heart icon (lucide-react)
    - Display upvote count next to button
    - Show filled heart if user has upvoted, outline if not
    - Disable button for unauthenticated users with tooltip
    - Handle click to toggle upvote/remove upvote
    - Show loading state during mutation
    - Display error toast on failure
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 6.3_

- [ ] 26. Frontend: Update TypeScript types for upvote data
  - [ ] 26.1 Add upvote types to `src/types/index.ts`
    - `UpvoteResponse` interface with appId, userId, upvotedAt, upvoteCount
    - `UpvoteStatusResponse` interface with appId, hasUpvoted, upvotedAt
    - Update `Application` interface to include upvoteCount and hasUpvoted fields
    - _Requirements: 3.2, 3.3, 8.1, 8.2, 8.3_

- [ ] 27. Frontend: Update ApplicationGallery to display upvote counts
  - [ ] 27.1 Update `src/components/ApplicationGallery.tsx`
    - Ensure upvote data is passed to ApplicationCard components
    - Add optional sorting by upvote count (client-side for now)
    - _Requirements: 3.2, 3.3, 3.4_

- [ ]\* 28. Frontend: Write unit tests for upvote hook
  - Test optimistic updates work correctly
  - Test query invalidation on mutation success
  - Test error handling for failed mutations

- [ ] 29. Checkpoint - Ensure all tests pass
  - Run all backend acceptance tests
  - Run all backend property tests
  - Run all frontend acceptance tests
  - Run all frontend unit tests
  - Verify end-to-end upvote flow works
  - Ensure all tests pass, ask the user if questions arise

- [ ] 30. Integration and final validation
  - [ ] 30.1 Deploy to dev environment and test manually
    - Test upvote creation via API and UI
    - Test upvote removal via API and UI
    - Test upvote status queries
    - Verify upvote counts display correctly
    - Test authentication requirements
    - _Requirements: All_
  - [ ] 30.2 Verify data consistency in DynamoDB
    - Check upvote records have correct PK/SK structure
    - Check GSI1 keys are properly set
    - Verify upvoteCount increments/decrements correctly
    - Check for orphaned records
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ] 30.3 Performance testing
    - Verify upvote status queries return within 500ms
    - Test concurrent upvote operations
    - Verify atomic counter operations work correctly
    - _Requirements: 3.5, 5.2_

## Notes

- Tasks marked with `*` are optional test-related sub-tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties using Hypothesis
- Acceptance tests describe complete user-observable behaviors in Given-When-Then format
- The 4-layer testing architecture (Scenarios → DSL → Protocol Driver → System) ensures tests run real business logic while mocking only external I/O
- Task 16 (sorting by upvote count) is marked as a future enhancement and can be deferred
- All implementation follows existing architectural patterns (single-table DynamoDB, Python Lambda handlers, React + TypeScript frontend)
