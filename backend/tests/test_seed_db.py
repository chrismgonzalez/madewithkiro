"""
Acceptance tests for DynamoDB seed script

Following BDD/TDD approach with Given-When-Then format
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestSeedScript:
    """Acceptance tests for seed_db.py script"""
    
    @pytest.fixture
    def mock_dynamodb_table(self):
        """Mock DynamoDB table for testing"""
        table = Mock()
        table.scan.return_value = {'Items': [], 'Count': 0}
        table.put_item.return_value = {}
        table.delete_item.return_value = {}
        return table
    
    @pytest.fixture
    def mock_boto3_resource(self, mock_dynamodb_table):
        """Mock boto3 resource"""
        with patch('boto3.resource') as mock_resource:
            mock_dynamodb = Mock()
            mock_dynamodb.Table.return_value = mock_dynamodb_table
            mock_resource.return_value = mock_dynamodb
            yield mock_resource
    
    def test_creates_test_user_profile_on_empty_database(self, mock_boto3_resource, mock_dynamodb_table):
        """
        GIVEN I run the seed script on an empty database
        WHEN the script executes
        THEN it should create exactly 1 user profile with userId "test-user-001" 
             and complete profile information in DynamoDB
        """
        # Import after mocking
        from scripts.seed_db import seed_database
        
        # GIVEN: Empty database
        mock_dynamodb_table.scan.return_value = {'Items': [], 'Count': 0}
        
        # WHEN: Run seed script
        seed_database(table_name='test-table', dry_run=False)
        
        # THEN: Verify profile was created
        put_calls = [call for call in mock_dynamodb_table.put_item.call_args_list]
        
        # Find the profile creation call
        profile_calls = [
            call for call in put_calls 
            if call[1]['Item'].get('PK') == 'USER#test-user-001'
            and call[1]['Item'].get('SK') == 'PROFILE'
        ]
        
        assert len(profile_calls) == 1, "Should create exactly 1 user profile"
        
        profile_item = profile_calls[0][1]['Item']
        assert profile_item['userId'] == 'test-user-001'
        assert profile_item['firstName']
        assert profile_item['lastName']
        assert profile_item['awsBuilderHandle']
        assert 'createdAt' in profile_item
        assert 'updatedAt' in profile_item
    
    def test_creates_at_least_ten_applications(self, mock_boto3_resource, mock_dynamodb_table):
        """
        GIVEN I run the seed script on an empty database
        WHEN the script executes
        THEN it should create at least 10 applications associated with test-user-001 in DynamoDB
        """
        from scripts.seed_db import seed_database
        
        # GIVEN: Empty database
        mock_dynamodb_table.scan.return_value = {'Items': [], 'Count': 0}
        
        # WHEN: Run seed script
        seed_database(table_name='test-table', dry_run=False)
        
        # THEN: Verify at least 10 applications were created
        put_calls = [call for call in mock_dynamodb_table.put_item.call_args_list]
        
        # Find application creation calls
        app_calls = [
            call for call in put_calls 
            if call[1]['Item'].get('PK', '').startswith('APP#')
            and call[1]['Item'].get('SK') == 'METADATA'
        ]
        
        assert len(app_calls) >= 10, f"Should create at least 10 applications, got {len(app_calls)}"
        
        # Verify all apps are associated with test user
        for call in app_calls:
            app_item = call[1]['Item']
            assert app_item['userId'] == 'test-user-001'
    
    def test_includes_applications_with_various_tags(self, mock_boto3_resource, mock_dynamodb_table):
        """
        GIVEN I run the seed script on an empty database
        WHEN the script executes
        THEN it should include applications with various tags for testing filtering functionality
        """
        from scripts.seed_db import seed_database
        
        # GIVEN: Empty database
        mock_dynamodb_table.scan.return_value = {'Items': [], 'Count': 0}
        
        # WHEN: Run seed script
        seed_database(table_name='test-table', dry_run=False)
        
        # THEN: Verify applications have various tags
        put_calls = [call for call in mock_dynamodb_table.put_item.call_args_list]
        
        app_calls = [
            call for call in put_calls 
            if call[1]['Item'].get('PK', '').startswith('APP#')
        ]
        
        # Collect all unique tags
        all_tags = set()
        for call in app_calls:
            app_item = call[1]['Item']
            tags = app_item.get('tags', [])
            all_tags.update(tags)
        
        # Should have multiple different tags for filtering
        assert len(all_tags) >= 5, f"Should have at least 5 different tags, got {len(all_tags)}"
    
    def test_includes_applications_with_and_without_github_urls(self, mock_boto3_resource, mock_dynamodb_table):
        """
        GIVEN I run the seed script on an empty database
        WHEN the script executes
        THEN it should include applications with and without optional GitHub URLs
        """
        from scripts.seed_db import seed_database
        
        # GIVEN: Empty database
        mock_dynamodb_table.scan.return_value = {'Items': [], 'Count': 0}
        
        # WHEN: Run seed script
        seed_database(table_name='test-table', dry_run=False)
        
        # THEN: Verify some apps have GitHub URLs and some don't
        put_calls = [call for call in mock_dynamodb_table.put_item.call_args_list]
        
        app_calls = [
            call for call in put_calls 
            if call[1]['Item'].get('PK', '').startswith('APP#')
        ]
        
        apps_with_github = 0
        apps_without_github = 0
        
        for call in app_calls:
            app_item = call[1]['Item']
            if app_item.get('githubUrl'):
                apps_with_github += 1
            else:
                apps_without_github += 1
        
        assert apps_with_github > 0, "Should have at least one app with GitHub URL"
        assert apps_without_github > 0, "Should have at least one app without GitHub URL"
    
    def test_skips_seeding_when_data_exists(self, mock_boto3_resource, mock_dynamodb_table):
        """
        GIVEN I run the seed script on a database with existing data
        WHEN the script executes without the clean flag
        THEN it should check for existing data and skip seeding to prevent duplicates
        """
        from scripts.seed_db import seed_database
        
        # GIVEN: Database with existing profile
        mock_dynamodb_table.scan.return_value = {
            'Items': [
                {
                    'PK': 'USER#test-user-001',
                    'SK': 'PROFILE',
                    'entityType': 'PROFILE'
                }
            ],
            'Count': 1
        }
        
        # WHEN: Run seed script without clean flag
        seed_database(table_name='test-table', clean=False, dry_run=False)
        
        # THEN: Should not create any new items
        assert mock_dynamodb_table.put_item.call_count == 0, "Should skip seeding when data exists"
    
    def test_outputs_summary_on_completion(self, mock_boto3_resource, mock_dynamodb_table, capsys):
        """
        GIVEN the seed script completes
        WHEN execution finishes
        THEN it should output a summary of created profile and applications
        """
        from scripts.seed_db import seed_database
        
        # GIVEN: Empty database
        mock_dynamodb_table.scan.return_value = {'Items': [], 'Count': 0}
        
        # WHEN: Run seed script
        seed_database(table_name='test-table', dry_run=False)
        
        # THEN: Verify summary output
        captured = capsys.readouterr()
        output = captured.out
        
        assert 'Seed complete!' in output or 'Created profile' in output
        assert 'test-user-001' in output
        assert 'applications created' in output.lower() or 'Applications created' in output
    
    def test_deletes_existing_data_with_clean_flag(self, mock_boto3_resource, mock_dynamodb_table):
        """
        GIVEN I run the seed script with the clean flag
        WHEN the script executes
        THEN it should delete all existing data before seeding new data
        """
        from scripts.seed_db import seed_database
        
        # GIVEN: Database with existing data
        existing_items = [
            {'PK': 'USER#old-user', 'SK': 'PROFILE', 'entityType': 'PROFILE'},
            {'PK': 'APP#old-app', 'SK': 'METADATA', 'entityType': 'APPLICATION'}
        ]
        mock_dynamodb_table.scan.return_value = {
            'Items': existing_items,
            'Count': len(existing_items)
        }
        
        # WHEN: Run seed script with clean flag
        seed_database(table_name='test-table', clean=True, dry_run=False)
        
        # THEN: Should delete existing items
        assert mock_dynamodb_table.delete_item.call_count >= len(existing_items), \
            "Should delete all existing items when clean flag is set"
        
        # AND: Should create new items
        assert mock_dynamodb_table.put_item.call_count > 0, \
            "Should create new items after cleaning"
