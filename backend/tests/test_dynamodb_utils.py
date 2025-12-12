"""
Tests for DynamoDB utility functions
"""
import pytest
from datetime import datetime
from decimal import Decimal
from unittest.mock import Mock, patch
from shared.dynamodb_utils import (
    get_timestamp,
    decimal_to_float,
    clean_dynamodb_item,
    query_profile_by_email
)


class TestTimestamp:
    """Tests for timestamp generation"""
    
    def test_get_timestamp_format(self):
        """Test that timestamp is in ISO 8601 format"""
        timestamp = get_timestamp()
        assert timestamp.endswith('Z')
        # Should be parseable as ISO format
        parsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        assert isinstance(parsed, datetime)
    
    def test_get_timestamp_is_current(self):
        """Test that timestamp is approximately current time"""
        timestamp = get_timestamp()
        parsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        now = datetime.now(datetime.UTC if hasattr(datetime, 'UTC') else None)
        if now.tzinfo is None:
            # Fallback for older Python versions
            from datetime import timezone
            now = datetime.now(timezone.utc)
        # Should be within 1 second
        diff = abs((now - parsed).total_seconds())
        assert diff < 1.0


class TestDecimalConversion:
    """Tests for Decimal to float conversion"""
    
    def test_convert_decimal(self):
        """Test converting Decimal to float"""
        result = decimal_to_float(Decimal('123.45'))
        assert result == 123.45
        assert isinstance(result, float)
    
    def test_convert_dict_with_decimals(self):
        """Test converting dict containing Decimals"""
        data = {
            'price': Decimal('99.99'),
            'quantity': Decimal('5'),
            'name': 'Product'
        }
        result = decimal_to_float(data)
        assert result['price'] == 99.99
        assert result['quantity'] == 5.0
        assert result['name'] == 'Product'
    
    def test_convert_list_with_decimals(self):
        """Test converting list containing Decimals"""
        data = [Decimal('1.5'), Decimal('2.5'), 'text']
        result = decimal_to_float(data)
        assert result == [1.5, 2.5, 'text']
    
    def test_convert_nested_structures(self):
        """Test converting nested structures with Decimals"""
        data = {
            'items': [
                {'price': Decimal('10.50')},
                {'price': Decimal('20.75')}
            ],
            'total': Decimal('31.25')
        }
        result = decimal_to_float(data)
        assert result['items'][0]['price'] == 10.50
        assert result['items'][1]['price'] == 20.75
        assert result['total'] == 31.25


class TestCleanDynamoDBItem:
    """Tests for cleaning DynamoDB items"""
    
    def test_remove_internal_keys(self):
        """Test that internal DynamoDB keys are removed"""
        item = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'GSI1PK': 'PROFILE',
            'GSI1SK': 'USER#123',
            'entityType': 'PROFILE',
            'userId': '123',
            'firstName': 'John',
            'lastName': 'Doe'
        }
        result = clean_dynamodb_item(item)
        assert 'PK' not in result
        assert 'SK' not in result
        assert 'GSI1PK' not in result
        assert 'GSI1SK' not in result
        assert 'entityType' not in result
        assert result['userId'] == '123'
        assert result['firstName'] == 'John'
        assert result['lastName'] == 'Doe'
    
    def test_convert_decimals_in_cleaned_item(self):
        """Test that Decimals are converted in cleaned items"""
        item = {
            'PK': 'APP#456',
            'SK': 'METADATA',
            'appId': '456',
            'rating': Decimal('4.5')
        }
        result = clean_dynamodb_item(item)
        assert 'PK' not in result
        assert result['rating'] == 4.5
        assert isinstance(result['rating'], float)


class TestQueryProfileByEmail:
    """Tests for querying profiles by email using GSI1"""
    
    def test_query_profile_by_email_found(self):
        """Test querying profile by email when profile exists"""
        with patch('shared.dynamodb_utils.table') as mock_table:
            mock_table.query.return_value = {
                'Items': [{
                    'PK': 'USER#123',
                    'SK': 'PROFILE',
                    'GSI1PK': 'EMAIL#user@example.com',
                    'GSI1SK': 'PROFILE',
                    'userId': '123',
                    'email': 'user@example.com',
                    'firstName': 'John',
                    'lastName': 'Doe',
                    'authMethods': ['google']
                }]
            }
            
            result = query_profile_by_email('user@example.com')
            
            assert result is not None
            assert result['userId'] == '123'
            assert result['email'] == 'user@example.com'
            assert result['authMethods'] == ['google']
            
            # Verify query was called with correct parameters
            mock_table.query.assert_called_once()
            call_kwargs = mock_table.query.call_args[1]
            assert call_kwargs['IndexName'] == 'GSI1'
            assert call_kwargs['ExpressionAttributeValues'][':gsi1pk'] == 'EMAIL#user@example.com'
            assert call_kwargs['ExpressionAttributeValues'][':gsi1sk'] == 'PROFILE'
    
    def test_query_profile_by_email_not_found(self):
        """Test querying profile by email when profile doesn't exist"""
        with patch('shared.dynamodb_utils.table') as mock_table:
            mock_table.query.return_value = {'Items': []}
            
            result = query_profile_by_email('nonexistent@example.com')
            
            assert result is None
    
    def test_query_profile_by_email_multiple_found(self):
        """Test querying profile by email when multiple profiles found (should log warning)"""
        with patch('shared.dynamodb_utils.table') as mock_table, \
             patch('shared.dynamodb_utils.logger') as mock_logger:
            mock_table.query.return_value = {
                'Items': [
                    {
                        'PK': 'USER#123',
                        'SK': 'PROFILE',
                        'userId': '123',
                        'email': 'user@example.com',
                        'authMethods': ['google']
                    },
                    {
                        'PK': 'USER#456',
                        'SK': 'PROFILE',
                        'userId': '456',
                        'email': 'user@example.com',
                        'authMethods': ['email']
                    }
                ]
            }
            
            result = query_profile_by_email('user@example.com')
            
            # Should return first profile
            assert result is not None
            assert result['userId'] == '123'
            
            # Should log warning about multiple profiles
            mock_logger.warning.assert_called_once()
            warning_call = mock_logger.warning.call_args
            assert 'Multiple profiles' in warning_call[1]['message']
