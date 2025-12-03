#!/usr/bin/env python3
"""
Verify Cognito User Pool Configuration for Custom Authentication

This script checks if the Cognito User Pool is properly configured for
email OTP authentication with custom auth flow.
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError

def verify_cognito_config():
    """Verify Cognito User Pool configuration for custom authentication."""
    
    # Get environment
    environment = os.environ.get('ENVIRONMENT', 'dev')
    region = os.environ.get('AWS_REGION', 'us-west-2')
    
    print(f"Verifying Cognito configuration for environment: {environment}")
    print(f"Region: {region}\n")
    
    # Initialize Cognito client
    cognito_client = boto3.client('cognito-idp', region_name=region)
    
    try:
        # List user pools to find ours
        response = cognito_client.list_user_pools(MaxResults=60)
        user_pools = response.get('UserPools', [])
        
        # Find our user pool
        target_pool_name = f'MadeWithKiro-{environment}'
        user_pool = None
        
        for pool in user_pools:
            if pool['Name'] == target_pool_name:
                user_pool = pool
                break
        
        if not user_pool:
            print(f"❌ User Pool '{target_pool_name}' not found")
            print(f"Available pools: {[p['Name'] for p in user_pools]}")
            return False
        
        user_pool_id = user_pool['Id']
        print(f"✅ Found User Pool: {target_pool_name}")
        print(f"   Pool ID: {user_pool_id}\n")
        
        # Get detailed user pool configuration
        pool_details = cognito_client.describe_user_pool(UserPoolId=user_pool_id)
        pool_config = pool_details['UserPool']
        
        # Check Lambda triggers
        print("Checking Lambda Triggers:")
        lambda_config = pool_config.get('LambdaConfig', {})
        
        required_triggers = {
            'DefineAuthChallenge': f'MadeWithKiro-DefineAuthChallenge-{environment}',
            'CreateAuthChallenge': f'MadeWithKiro-CreateAuthChallenge-{environment}',
            'VerifyAuthChallengeResponse': f'MadeWithKiro-VerifyAuthChallenge-{environment}'
        }
        
        all_triggers_configured = True
        for trigger_name, expected_function_name in required_triggers.items():
            trigger_arn = lambda_config.get(trigger_name)
            if trigger_arn:
                print(f"   ✅ {trigger_name}: {trigger_arn}")
                if expected_function_name not in trigger_arn:
                    print(f"      ⚠️  Warning: Expected function name '{expected_function_name}' not in ARN")
            else:
                print(f"   ❌ {trigger_name}: NOT CONFIGURED")
                all_triggers_configured = False
        
        print()
        
        # Check email configuration
        print("Checking Email Configuration:")
        email_config = pool_config.get('EmailConfiguration', {})
        email_sending_account = email_config.get('EmailSendingAccount')
        source_arn = email_config.get('SourceArn', '')
        from_email = email_config.get('From', '')
        
        if email_sending_account == 'DEVELOPER':
            print(f"   ✅ Email Sending Account: DEVELOPER (using SES)")
            print(f"   ✅ Source ARN: {source_arn}")
            print(f"   ✅ From Email: {from_email}")
        else:
            print(f"   ⚠️  Email Sending Account: {email_sending_account} (expected DEVELOPER)")
        
        print()
        
        # Check custom attributes
        print("Checking Custom Attributes:")
        schema = pool_config.get('SchemaAttributes', [])
        custom_attrs = [attr for attr in schema if attr.get('Name', '').startswith('custom:')]
        
        required_custom_attrs = ['custom:auth_methods', 'custom:linked_account']
        found_attrs = [attr['Name'] for attr in custom_attrs]
        
        for required_attr in required_custom_attrs:
            if required_attr in found_attrs:
                print(f"   ✅ {required_attr}: Configured")
            else:
                print(f"   ❌ {required_attr}: NOT CONFIGURED")
        
        print()
        
        # Check user pool client
        print("Checking User Pool Client:")
        clients_response = cognito_client.list_user_pool_clients(
            UserPoolId=user_pool_id,
            MaxResults=60
        )
        clients = clients_response.get('UserPoolClients', [])
        
        target_client_name = f'MadeWithKiro-Client-{environment}'
        client = None
        
        for c in clients:
            if c['ClientName'] == target_client_name:
                client = c
                break
        
        if not client:
            print(f"   ❌ Client '{target_client_name}' not found")
            return False
        
        client_id = client['ClientId']
        print(f"   ✅ Found Client: {target_client_name}")
        print(f"      Client ID: {client_id}")
        
        # Get client details
        client_details = cognito_client.describe_user_pool_client(
            UserPoolId=user_pool_id,
            ClientId=client_id
        )
        client_config = client_details['UserPoolClient']
        
        # Check explicit auth flows
        explicit_auth_flows = client_config.get('ExplicitAuthFlows', [])
        if 'ALLOW_CUSTOM_AUTH' in explicit_auth_flows:
            print(f"   ✅ ALLOW_CUSTOM_AUTH: Enabled")
        else:
            print(f"   ❌ ALLOW_CUSTOM_AUTH: NOT ENABLED")
            print(f"      Current flows: {explicit_auth_flows}")
        
        print()
        
        # Summary
        print("=" * 60)
        if all_triggers_configured and 'ALLOW_CUSTOM_AUTH' in explicit_auth_flows:
            print("✅ Cognito User Pool is properly configured for custom authentication")
            return True
        else:
            print("⚠️  Cognito User Pool configuration is incomplete")
            print("   Please deploy the SAM template to complete configuration")
            return False
        
    except ClientError as e:
        print(f"❌ Error accessing Cognito: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = verify_cognito_config()
    sys.exit(0 if success else 1)
