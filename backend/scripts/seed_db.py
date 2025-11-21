#!/usr/bin/env python3
"""
DynamoDB seed script for MadeWithKiro

Seeds the database with test data including:
- 1 test user profile (test-user-001)
- 10+ applications with various tags
"""
import argparse
import boto3
import sys
import os
from datetime import datetime, timezone
from typing import List, Dict, Any
import uuid

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def get_timestamp() -> str:
    """Get current timestamp in ISO 8601 format"""
    now = datetime.now(timezone.utc)
    return now.isoformat().replace('+00:00', 'Z')


# Seed data for test users
SEED_USERS = [
    {
        'PK': 'USER#test-user-001',
        'SK': 'PROFILE',
        'entityType': 'PROFILE',
        'userId': 'test-user-001',
        'firstName': 'Test',
        'lastName': 'User',
        'awsBuilderHandle': 'test-builder',
        'linkedInUsername': 'testuser',
        'githubUsername': 'test-user',
    },
    {
        'PK': 'USER#test-user-002',
        'SK': 'PROFILE',
        'entityType': 'PROFILE',
        'userId': 'test-user-002',
        'firstName': 'Jane',
        'lastName': 'Developer',
        'awsBuilderHandle': 'jane-dev',
        'linkedInUsername': 'janedev',
        'githubUsername': 'jane-developer',
    },
]


# Seed data for applications
SEED_APPLICATIONS = [
    {
        'name': 'Task Manager Pro',
        'description': 'A powerful task management application built with Kiro AI assistance',
        'appUrl': 'https://taskmanager.example.com',
        'githubUrl': 'https://github.com/test-user/task-manager',
        'tags': ['productivity', 'react', 'typescript'],
    },
    {
        'name': 'Weather Dashboard',
        'description': 'Real-time weather tracking with beautiful visualizations',
        'appUrl': 'https://weather.example.com',
        'githubUrl': None,  # Optional field
        'tags': ['weather', 'dashboard', 'api'],
    },
    {
        'name': 'Recipe Finder',
        'description': 'Discover and save your favorite recipes with AI-powered search',
        'appUrl': 'https://recipes.example.com',
        'githubUrl': 'https://github.com/test-user/recipe-finder',
        'tags': ['food', 'search', 'ai'],
    },
    {
        'name': 'Fitness Tracker',
        'description': 'Track your workouts and monitor your fitness progress',
        'appUrl': 'https://fitness.example.com',
        'githubUrl': None,
        'tags': ['health', 'fitness', 'tracking'],
    },
    {
        'name': 'Budget Planner',
        'description': 'Manage your finances and plan your budget effectively',
        'appUrl': 'https://budget.example.com',
        'githubUrl': 'https://github.com/test-user/budget-planner',
        'tags': ['finance', 'budgeting', 'planning'],
    },
    {
        'name': 'Study Companion',
        'description': 'AI-powered study assistant for students',
        'appUrl': 'https://study.example.com',
        'githubUrl': 'https://github.com/test-user/study-companion',
        'tags': ['education', 'ai', 'learning'],
    },
    {
        'name': 'Travel Planner',
        'description': 'Plan your trips and discover new destinations',
        'appUrl': 'https://travel.example.com',
        'githubUrl': None,
        'tags': ['travel', 'planning', 'maps'],
    },
    {
        'name': 'Music Player',
        'description': 'Stream and organize your music collection',
        'appUrl': 'https://music.example.com',
        'githubUrl': 'https://github.com/test-user/music-player',
        'tags': ['music', 'streaming', 'audio'],
    },
    {
        'name': 'Photo Gallery',
        'description': 'Organize and share your photos with friends and family',
        'appUrl': 'https://photos.example.com',
        'githubUrl': None,
        'tags': ['photos', 'gallery', 'sharing'],
    },
    {
        'name': 'Code Snippet Manager',
        'description': 'Save and organize your code snippets for quick access',
        'appUrl': 'https://snippets.example.com',
        'githubUrl': 'https://github.com/test-user/snippet-manager',
        'tags': ['coding', 'productivity', 'developer-tools'],
    },
    {
        'name': 'Habit Tracker',
        'description': 'Build better habits with daily tracking and reminders',
        'appUrl': 'https://habits.example.com',
        'githubUrl': 'https://github.com/test-user/habit-tracker',
        'tags': ['productivity', 'habits', 'self-improvement'],
    },
    {
        'name': 'Book Library',
        'description': 'Catalog your book collection and track your reading progress',
        'appUrl': 'https://books.example.com',
        'githubUrl': None,
        'tags': ['books', 'reading', 'library'],
    },
]

# Applications for second user
SEED_APPLICATIONS_USER_2 = [
    {
        'name': 'Portfolio Website',
        'description': 'Personal portfolio showcasing my projects and skills',
        'appUrl': 'https://janedev.example.com',
        'githubUrl': 'https://github.com/jane-developer/portfolio',
        'tags': ['portfolio', 'react', 'design'],
    },
    {
        'name': 'Chat Application',
        'description': 'Real-time chat app with WebSocket support',
        'appUrl': 'https://chat.janedev.example.com',
        'githubUrl': 'https://github.com/jane-developer/chat-app',
        'tags': ['chat', 'websocket', 'real-time'],
    },
]


def count_items_by_entity_type(table, entity_type: str) -> int:
    """Count items of a specific entity type"""
    try:
        response = table.scan(
            FilterExpression='entityType = :entity_type',
            ExpressionAttributeValues={
                ':entity_type': entity_type
            },
            Select='COUNT'
        )
        return response.get('Count', 0)
    except Exception as e:
        print(f"Error counting items: {str(e)}")
        return 0


def delete_all_items(table) -> int:
    """Delete all items from the table"""
    deleted_count = 0
    
    try:
        # Scan all items
        response = table.scan()
        items = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        # Delete each item
        for item in items:
            table.delete_item(
                Key={
                    'PK': item['PK'],
                    'SK': item['SK']
                }
            )
            deleted_count += 1
        
        return deleted_count
    except Exception as e:
        print(f"Error deleting items: {str(e)}")
        raise


def create_profile(table, profile_data: Dict[str, Any], dry_run: bool = False) -> None:
    """Create a user profile"""
    timestamp = get_timestamp()
    
    profile_item = {
        **profile_data,
        'createdAt': timestamp,
        'updatedAt': timestamp,
    }
    
    if not dry_run:
        table.put_item(Item=profile_item)


def create_application(table, app_data: Dict[str, Any], user_id: str, dry_run: bool = False) -> None:
    """Create an application"""
    timestamp = get_timestamp()
    app_id = str(uuid.uuid4())
    
    app_item = {
        'PK': f'APP#{app_id}',
        'SK': 'METADATA',
        'GSI1PK': f'USER#{user_id}',
        'GSI1SK': f'APP#{app_id}',
        'entityType': 'APPLICATION',
        'appId': app_id,
        'userId': user_id,
        'userName': 'Test User',
        'name': app_data['name'],
        'description': app_data['description'],
        'appUrl': app_data['appUrl'],
        'tags': app_data['tags'],
        'createdAt': timestamp,
    }
    
    # Add optional GitHub URL if present
    if app_data.get('githubUrl'):
        app_item['githubUrl'] = app_data['githubUrl']
    
    if not dry_run:
        table.put_item(Item=app_item)


def seed_database(table_name: str = 'MadeWithKiro', clean: bool = False, dry_run: bool = False) -> None:
    """
    Seed the DynamoDB table with test data
    
    Args:
        table_name: Name of the DynamoDB table
        clean: If True, delete all existing data before seeding
        dry_run: If True, show what would be created without actually creating
    """
    # Connect to DynamoDB
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)
    
    print(f"Seeding table: {table_name}")
    if dry_run:
        print("DRY RUN MODE - No changes will be made")
    
    # Clean existing data if requested
    if clean:
        print("Cleaning existing data...")
        deleted_count = delete_all_items(table)
        print(f"Deleted {deleted_count} items")
    
    # Check for existing data
    existing_profiles = count_items_by_entity_type(table, 'PROFILE')
    if existing_profiles > 0 and not clean:
        print(f"Found {existing_profiles} existing profiles. Skipping seed to prevent duplicates.")
        print("Use --clean flag to delete existing data and reseed.")
        return
    
    # Create test user profiles
    profiles_created = 0
    for user in SEED_USERS:
        print(f"Creating profile: {user['firstName']} {user['lastName']} ({user['userId']})")
        create_profile(table, user, dry_run=dry_run)
        profiles_created += 1
    
    # Create applications for user 1
    apps_created = 0
    user1 = SEED_USERS[0]
    for app_data in SEED_APPLICATIONS:
        print(f"Creating application for {user1['firstName']}: {app_data['name']}")
        create_application(table, app_data, user1['userId'], dry_run=dry_run)
        apps_created += 1
    
    # Create applications for user 2
    user2 = SEED_USERS[1]
    for app_data in SEED_APPLICATIONS_USER_2:
        print(f"Creating application for {user2['firstName']}: {app_data['name']}")
        create_application(table, app_data, user2['userId'], dry_run=dry_run)
        apps_created += 1
    
    # Output summary
    print(f"\n{'Would create' if dry_run else 'Seed complete!'}:")
    print(f"Profiles created: {profiles_created}")
    print(f"Applications created: {apps_created}")


def main():
    """Main entry point for the seed script"""
    parser = argparse.ArgumentParser(description='Seed DynamoDB with test data')
    parser.add_argument(
        '--table-name',
        default=None,
        help='DynamoDB table name (default: MadeWithKiro-{env} based on ENVIRONMENT)'
    )
    parser.add_argument(
        '--env',
        default=os.environ.get('ENVIRONMENT', 'dev'),
        help='Environment (dev, prod) - defaults to ENVIRONMENT env var or "dev"'
    )
    parser.add_argument(
        '--clean',
        action='store_true',
        help='Delete all existing data before seeding'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be created without actually creating'
    )
    
    args = parser.parse_args()
    
    # Determine table name
    if args.table_name:
        table_name = args.table_name
    else:
        table_name = f'MadeWithKiro-{args.env}'
    
    try:
        seed_database(
            table_name=table_name,
            clean=args.clean,
            dry_run=args.dry_run
        )
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
