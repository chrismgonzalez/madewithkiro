#!/usr/bin/env python3
"""
Test OTP Authentication Flow

This script tests the complete OTP authentication flow:
1. Initiate custom auth with email
2. Receive OTP code (simulated - check CloudWatch logs)
3. Verify OTP code
4. Receive JWT tokens

Requirements: 5.1, 5.2, 5.5
"""

import os
import sys
import boto3
import json
from botocore.exceptions import ClientError

def test_otp_auth_flow(email: str, test_otp: str = None):
    """
    Test the OTP authentication flow.
    
    Args:
        email: Email address to test with
        test_otp: Optional OTP code for testing (if known from logs)
    """
    
    # Get environment
    environment = os.environ.get('ENVIRONMENT', 'dev')
    region = os.environ.get('AWS_REGION', 'us-west-2')
    
    print(f"Testing OTP Authentication Flow")
    print(f"Environment: {environment}")
    print(f"Region: {region}")
    print(f"Email: {email}\n")
    
    # Initialize Cognito client
    cognito_client = boto3.client('cognito-idp', region_name=region)
    
    # Get User Pool and Client IDs
    try:
        # List user pools
        response = cognito_client.list_user_pools(MaxResults=60)
        user_pools = response.get('UserPools', [])
        
        target_pool_name = f'MadeWithKiro-{environment}'
        user_pool = None
        
        for pool in user_pools:
            if pool['Name'] == target_pool_name:
                user_pool = pool
                break
        
        if not user_pool:
            print(f"❌ User Pool '{target_pool_name}' not found")
            return False
        
        user_pool_id = user_pool['Id']
        print(f"✅ User Pool ID: {user_pool_id}")
        
        # Get client ID
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
            print(f"❌ Client '{target_client_name}' not found")
            return False
        
        client_id = client['ClientId']
        print(f"✅ Client ID: {client_id}\n")
        
    except ClientError as e:
        print(f"❌ Error getting Cognito configuration: {e}")
        return False
    
    # Step 1: Initiate Custom Auth
    print("=" * 60)
    print("Step 1: Initiating Custom Auth (Request OTP)")
    print("=" * 60)
    
    try:
        response = cognito_client.initiate_auth(
            ClientId=client_id,
            AuthFlow='CUSTOM_AUTH',
            AuthParameters={
                'USERNAME': email
            }
        )
        
        print(f"✅ InitiateAuth successful")
        print(f"   Challenge Name: {response.get('ChallengeName')}")
        print(f"   Session: {response.get('Session')[:50]}...")
        
        # Extract challenge parameters
        challenge_params = response.get('ChallengeParameters', {})
        print(f"\n   Challenge Parameters:")
        for key, value in challenge_params.items():
            print(f"      {key}: {value}")
        
        session = response.get('Session')
        
        print(f"\n📧 OTP code should have been sent to: {email}")
        print(f"   Check your email or CloudWatch logs for the OTP code")
        print(f"   Log Group: /aws/lambda/MadeWithKiro-CreateAuthChallenge-{environment}")
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"❌ InitiateAuth failed: {error_code} - {error_message}")
        
        if error_code == 'UserNotFoundException':
            print(f"\n   Note: User '{email}' does not exist yet.")
            print(f"   This is expected for first-time OTP users.")
            print(f"   The user will be created automatically on successful OTP verification.")
        
        return False
    
    # Step 2: Verify OTP (if provided)
    if test_otp:
        print(f"\n{'=' * 60}")
        print("Step 2: Verifying OTP Code")
        print("=" * 60)
        
        try:
            response = cognito_client.respond_to_auth_challenge(
                ClientId=client_id,
                ChallengeName='CUSTOM_CHALLENGE',
                Session=session,
                ChallengeResponses={
                    'USERNAME': email,
                    'ANSWER': test_otp
                }
            )
            
            # Check if we got tokens
            if 'AuthenticationResult' in response:
                print(f"✅ OTP Verification successful!")
                print(f"\n   Authentication Result:")
                auth_result = response['AuthenticationResult']
                print(f"      Access Token: {auth_result.get('AccessToken')[:50]}...")
                print(f"      ID Token: {auth_result.get('IdToken')[:50]}...")
                print(f"      Refresh Token: {auth_result.get('RefreshToken')[:50]}...")
                print(f"      Token Type: {auth_result.get('TokenType')}")
                print(f"      Expires In: {auth_result.get('ExpiresIn')} seconds")
                
                print(f"\n✅ Complete OTP authentication flow successful!")
                return True
            else:
                print(f"⚠️  OTP verification response received but no tokens")
                print(f"   Response: {json.dumps(response, indent=2)}")
                return False
                
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            print(f"❌ OTP Verification failed: {error_code} - {error_message}")
            return False
    else:
        print(f"\n{'=' * 60}")
        print("Step 2: Manual OTP Verification Required")
        print("=" * 60)
        print(f"\nTo complete the test:")
        print(f"1. Check your email for the OTP code")
        print(f"2. Or check CloudWatch logs:")
        print(f"   aws logs tail /aws/lambda/MadeWithKiro-CreateAuthChallenge-{environment} --follow")
        print(f"3. Run this script again with the OTP code:")
        print(f"   python3 backend/scripts/test_otp_auth_flow.py {email} <OTP_CODE>")
        
        return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 test_otp_auth_flow.py <email> [otp_code]")
        print("\nExample:")
        print("  python3 backend/scripts/test_otp_auth_flow.py test@example.com")
        print("  python3 backend/scripts/test_otp_auth_flow.py test@example.com 123456")
        sys.exit(1)
    
    email = sys.argv[1]
    test_otp = sys.argv[2] if len(sys.argv) > 2 else None
    
    success = test_otp_auth_flow(email, test_otp)
    sys.exit(0 if success else 1)
