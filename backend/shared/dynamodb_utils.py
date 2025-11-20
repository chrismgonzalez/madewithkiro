"""
DynamoDB utility functions for table operations
"""
import os
import boto3
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import json


# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME', 'MadeWithKiro')
table = dynamodb.Table(table_name)


def get_table():
    """Get DynamoDB table instance"""
    return table


def get_item(pk: str, sk: str) -> Optional[Dict[str, Any]]:
    """
    Get a single item from DynamoDB
    
    Args:
        pk: Partition key value
        sk: Sort key value
    
    Returns:
        Item dict or None if not found
    """
    try:
        response = table.get_item(
            Key={
                'PK': pk,
                'SK': sk
            }
        )
        return response.get('Item')
    except Exception as e:
        print(f"Error getting item: {str(e)}")
        raise


def put_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Put an item into DynamoDB
    
    Args:
        item: Item dictionary to store
    
    Returns:
        The stored item
    """
    try:
        table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error putting item: {str(e)}")
        raise


def update_item(pk: str, sk: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an item in DynamoDB
    
    Args:
        pk: Partition key value
        sk: Sort key value
        updates: Dictionary of attributes to update
    
    Returns:
        Updated item
    """
    try:
        # Build update expression
        update_expression_parts = []
        expression_attribute_names = {}
        expression_attribute_values = {}
        
        for key, value in updates.items():
            placeholder = f"#{key}"
            value_placeholder = f":{key}"
            update_expression_parts.append(f"{placeholder} = {value_placeholder}")
            expression_attribute_names[placeholder] = key
            expression_attribute_values[value_placeholder] = value
        
        update_expression = "SET " + ", ".join(update_expression_parts)
        
        response = table.update_item(
            Key={
                'PK': pk,
                'SK': sk
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )
        
        return response.get('Attributes', {})
    except Exception as e:
        print(f"Error updating item: {str(e)}")
        raise


def query_by_pk(pk: str, sk_prefix: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Query items by partition key
    
    Args:
        pk: Partition key value
        sk_prefix: Optional sort key prefix for begins_with condition
    
    Returns:
        List of items
    """
    try:
        if sk_prefix:
            response = table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues={
                    ':pk': pk,
                    ':sk_prefix': sk_prefix
                }
            )
        else:
            response = table.query(
                KeyConditionExpression='PK = :pk',
                ExpressionAttributeValues={
                    ':pk': pk
                }
            )
        
        return response.get('Items', [])
    except Exception as e:
        print(f"Error querying by PK: {str(e)}")
        raise


def query_gsi(gsi_name: str, gsi_pk: str, gsi_sk_prefix: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Query items using a Global Secondary Index
    
    Args:
        gsi_name: Name of the GSI
        gsi_pk: GSI partition key value
        gsi_sk_prefix: Optional GSI sort key prefix for begins_with condition
    
    Returns:
        List of items
    """
    try:
        if gsi_sk_prefix:
            response = table.query(
                IndexName=gsi_name,
                KeyConditionExpression='GSI1PK = :gsi_pk AND begins_with(GSI1SK, :gsi_sk_prefix)',
                ExpressionAttributeValues={
                    ':gsi_pk': gsi_pk,
                    ':gsi_sk_prefix': gsi_sk_prefix
                }
            )
        else:
            response = table.query(
                IndexName=gsi_name,
                KeyConditionExpression='GSI1PK = :gsi_pk',
                ExpressionAttributeValues={
                    ':gsi_pk': gsi_pk
                }
            )
        
        return response.get('Items', [])
    except Exception as e:
        print(f"Error querying GSI: {str(e)}")
        raise


def scan_by_entity_type(entity_type: str) -> List[Dict[str, Any]]:
    """
    Scan table for items of a specific entity type
    
    Args:
        entity_type: Entity type to filter by
    
    Returns:
        List of items
    """
    try:
        response = table.scan(
            FilterExpression='entityType = :entity_type',
            ExpressionAttributeValues={
                ':entity_type': entity_type
            }
        )
        
        items = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression='entityType = :entity_type',
                ExpressionAttributeValues={
                    ':entity_type': entity_type
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))
        
        return items
    except Exception as e:
        print(f"Error scanning by entity type: {str(e)}")
        raise


def get_timestamp() -> str:
    """
    Get current timestamp in ISO 8601 format
    
    Returns:
        ISO 8601 formatted timestamp string
    """
    from datetime import timezone
    now = datetime.now(timezone.utc)
    return now.isoformat().replace('+00:00', 'Z')


def decimal_to_float(obj: Any) -> Any:
    """
    Convert Decimal objects to float for JSON serialization
    
    Args:
        obj: Object that may contain Decimal values
    
    Returns:
        Object with Decimals converted to floats
    """
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    return obj


def clean_dynamodb_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean DynamoDB item by removing internal keys and converting Decimals
    
    Args:
        item: DynamoDB item
    
    Returns:
        Cleaned item
    """
    # Remove DynamoDB internal keys
    cleaned = {k: v for k, v in item.items() if k not in ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType']}
    
    # Convert Decimals to floats
    return decimal_to_float(cleaned)
