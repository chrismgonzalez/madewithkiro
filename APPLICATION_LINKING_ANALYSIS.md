# Application Linking During Account Merge - Analysis & Solution

## Problem Statement

When linking Google and OTP accounts, applications created by the source user are not reassigned to the destination user, causing them to become orphaned.

## Current Data Model

### User Profile

```
PK: USER#{userId}
SK: PROFILE
userId: <cognito-sub>
authMethods: ['email'] or ['google'] or ['email', 'google']
```

### Application

```
PK: APP#{appId}
SK: METADATA
userId: <cognito-sub>          # Links to creator
GSI1PK: USER#{userId}          # For querying user's apps
GSI1SK: APP#{timestamp}#{appId}
```

## Account Linking Scenarios

### Scenario 1: Google → OTP Linking

1. User creates apps with Google account (userId = google_sub)
2. User creates OTP account with same email
3. User links accounts → OTP becomes primary
4. **Issue**: Apps still have userId = google_sub, but user now uses otp_sub

### Scenario 2: OTP → Google Linking

1. User creates apps with OTP account (userId = otp_sub)
2. User signs in with Google (same email)
3. User links accounts → Google becomes primary
4. **Issue**: Apps still have userId = otp_sub, but user now uses google_sub

## Current Merge Logic (link_accounts.py)

```python
def _merge_profiles(source_user_sub, destination_user_sub):
    # ✅ Merges authMethods
    # ✅ Deletes source profile
    # ❌ Does NOT reassign applications
```

## Solution: Reassign Applications During Merge

### Implementation Plan

Add application reassignment to `_merge_profiles()` function:

```python
def _merge_profiles(source_user_sub, destination_user_sub):
    # 1. Merge authMethods (existing)
    # 2. Reassign applications from source to destination
    # 3. Delete source profile (existing)
```

### Detailed Steps

1. **Query all applications by source user**

   ```python
   # Query GSI1 for all apps created by source user
   response = table.query(
       IndexName='GSI1',
       KeyConditionExpression='GSI1PK = :user_key',
       ExpressionAttributeValues={
           ':user_key': f'USER#{source_user_sub}'
       }
   )
   ```

2. **Update each application**

   ```python
   for app in applications:
       table.update_item(
           Key={
               'PK': app['PK'],
               'SK': app['SK']
           },
           UpdateExpression='SET userId = :new_user_id, GSI1PK = :new_gsi1pk, updatedAt = :updated',
           ExpressionAttributeValues={
               ':new_user_id': destination_user_sub,
               ':new_gsi1pk': f'USER#{destination_user_sub}',
               ':updated': timestamp
           }
       )
   ```

3. **Log the reassignment**
   ```python
   logger.info(
       f"Reassigned {len(applications)} applications",
       context={
           'source_sub': source_user_sub,
           'destination_sub': destination_user_sub,
           'app_count': len(applications)
       }
   )
   ```

## Edge Cases to Handle

### 1. No Applications

- Source user has no applications
- **Solution**: Skip reassignment, log info message

### 2. DynamoDB Throttling

- Many applications to reassign
- **Solution**: Use batch operations or exponential backoff

### 3. Partial Failure

- Some apps reassigned, then error occurs
- **Solution**: Log which apps were reassigned, allow retry

### 4. Application Name Conflicts

- Not applicable (appId is unique)

## Testing Strategy

### Unit Tests

1. Test reassignment with 0 applications
2. Test reassignment with 1 application
3. Test reassignment with multiple applications
4. Test DynamoDB errors during reassignment
5. Test logging of reassignment

### Integration Tests

1. Create apps with Google user
2. Link to OTP user
3. Verify apps appear in OTP user's profile
4. Verify apps no longer appear in Google user's profile

### Property Tests

- **Property**: After linking, all applications should belong to destination user
- **Property**: No applications should reference the source user after merge

## Implementation Code

```python
def _reassign_applications(
    source_user_sub: str,
    destination_user_sub: str,
    table
) -> Dict[str, Any]:
    """
    Reassign all applications from source user to destination user.

    Args:
        source_user_sub: Source user's Cognito sub
        destination_user_sub: Destination user's Cognito sub
        table: DynamoDB table resource

    Returns:
        dict: {'success': bool, 'apps_reassigned': int, 'message': str}
    """
    try:
        from datetime import datetime, timezone

        # Query all applications by source user
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :user_key',
            ExpressionAttributeValues={
                ':user_key': f'USER#{source_user_sub}'
            }
        )

        applications = response.get('Items', [])

        if not applications:
            logger.info(
                "No applications to reassign",
                context={'source_sub': source_user_sub}
            )
            return {
                'success': True,
                'apps_reassigned': 0,
                'message': 'No applications to reassign'
            }

        # Update each application
        timestamp = datetime.now(timezone.utc).isoformat()
        apps_reassigned = 0

        for app in applications:
            try:
                table.update_item(
                    Key={
                        'PK': app['PK'],
                        'SK': app['SK']
                    },
                    UpdateExpression='SET userId = :new_user_id, GSI1PK = :new_gsi1pk, updatedAt = :updated',
                    ExpressionAttributeValues={
                        ':new_user_id': destination_user_sub,
                        ':new_gsi1pk': f'USER#{destination_user_sub}',
                        ':updated': timestamp
                    }
                )
                apps_reassigned += 1

                logger.info(
                    f"Reassigned application",
                    context={
                        'app_id': app.get('appId'),
                        'app_name': app.get('name'),
                        'from_user': source_user_sub,
                        'to_user': destination_user_sub
                    }
                )

            except ClientError as e:
                logger.error(
                    f"Failed to reassign application: {str(e)}",
                    error=e,
                    context={
                        'app_id': app.get('appId'),
                        'source_sub': source_user_sub,
                        'destination_sub': destination_user_sub
                    }
                )
                # Continue with other apps even if one fails

        logger.info(
            f"Application reassignment complete",
            context={
                'source_sub': source_user_sub,
                'destination_sub': destination_user_sub,
                'total_apps': len(applications),
                'apps_reassigned': apps_reassigned
            }
        )

        return {
            'success': True,
            'apps_reassigned': apps_reassigned,
            'message': f'Reassigned {apps_reassigned} applications'
        }

    except ClientError as e:
        logger.error(
            f"DynamoDB error during application reassignment: {str(e)}",
            error=e,
            context={
                'source_sub': source_user_sub,
                'destination_sub': destination_user_sub
            }
        )
        return {
            'success': False,
            'apps_reassigned': 0,
            'message': f"Application reassignment failed: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Unexpected error during application reassignment: {str(e)}", error=e)
        return {
            'success': False,
            'apps_reassigned': 0,
            'message': 'An unexpected error occurred during application reassignment'
        }


def _merge_profiles(
    source_user_sub: str,
    destination_user_sub: str
) -> Dict[str, Any]:
    """
    Merge DynamoDB profiles after successful account linking.

    This includes:
    1. Merging authMethods
    2. Reassigning applications from source to destination
    3. Deleting source profile

    Requirements: 5.4, 7.5

    Args:
        source_user_sub: Source user's Cognito sub
        destination_user_sub: Destination user's Cognito sub

    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        table = dynamodb.Table(TABLE_NAME)

        # Get both profiles
        source_profile = table.get_item(
            Key={
                'PK': f'USER#{source_user_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')

        destination_profile = table.get_item(
            Key={
                'PK': f'USER#{destination_user_sub}',
                'SK': 'PROFILE'
            }
        ).get('Item')

        if not destination_profile:
            logger.error(
                "Destination profile not found during merge",
                context={'destination_sub': destination_user_sub}
            )
            return {
                'success': False,
                'message': 'Destination profile not found'
            }

        # Step 1: Merge authMethods (Requirements 5.4)
        source_auth_methods = source_profile.get('authMethods', []) if source_profile else []
        dest_auth_methods = destination_profile.get('authMethods', [])

        # Combine and deduplicate
        merged_auth_methods = list(set(source_auth_methods + dest_auth_methods))

        # Update destination profile with merged authMethods (Requirements 7.5)
        from datetime import datetime, timezone

        table.update_item(
            Key={
                'PK': f'USER#{destination_user_sub}',
                'SK': 'PROFILE'
            },
            UpdateExpression='SET authMethods = :methods, updatedAt = :updated',
            ExpressionAttributeValues={
                ':methods': merged_auth_methods,
                ':updated': datetime.now(timezone.utc).isoformat()
            }
        )

        logger.info(
            "Updated destination profile with merged authMethods",
            context={
                'destination_sub': destination_user_sub,
                'merged_auth_methods': merged_auth_methods
            }
        )

        # Step 2: Reassign applications from source to destination
        reassign_result = _reassign_applications(source_user_sub, destination_user_sub, table)

        if not reassign_result['success']:
            logger.warning(
                "Application reassignment failed during profile merge",
                context={
                    'source_sub': source_user_sub,
                    'destination_sub': destination_user_sub,
                    'error': reassign_result.get('message')
                }
            )
            # Don't fail the entire merge if app reassignment fails
            # The profile merge can still succeed

        # Step 3: Delete source profile if it exists
        if source_profile:
            table.delete_item(
                Key={
                    'PK': f'USER#{source_user_sub}',
                    'SK': 'PROFILE'
                }
            )

            logger.info(
                "Deleted source profile after merge",
                context={'source_sub': source_user_sub}
            )

        return {
            'success': True,
            'message': f"Profiles merged successfully. {reassign_result.get('message', '')}"
        }

    except ClientError as e:
        logger.error(
            f"DynamoDB error during profile merge: {str(e)}",
            error=e,
            context={
                'source_sub': source_user_sub,
                'destination_sub': destination_user_sub
            }
        )
        return {
            'success': False,
            'message': f"Profile merge failed: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Unexpected error during profile merge: {str(e)}", error=e)
        return {
            'success': False,
            'message': 'An unexpected error occurred during profile merge'
        }
```

## Monitoring & Observability

### CloudWatch Metrics

- `ApplicationsReassigned` - Count of apps reassigned per merge
- `ApplicationReassignmentErrors` - Count of failed reassignments

### CloudWatch Logs

- Log each application reassignment with app_id and user_ids
- Log total count of reassigned applications per merge
- Log any errors during reassignment

### Alarms

- Alert if application reassignment fails repeatedly
- Alert if reassignment takes too long (indicates many apps)

## Rollback Plan

If issues occur after deployment:

1. Applications can be manually reassigned back using DynamoDB console
2. Query GSI1 for apps with wrong userId
3. Update userId and GSI1PK back to original values

## Summary

**Current Issue**: Applications are orphaned during account linking because userId is not updated.

**Solution**: Add `_reassign_applications()` function to update all applications from source to destination user during profile merge.

**Impact**: After linking, all applications will correctly appear in the destination user's profile, maintaining data integrity.

**Risk**: Low - Applications are reassigned atomically per app, failures are logged and don't block the merge.
