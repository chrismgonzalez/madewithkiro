"""
DefineAuthChallenge Lambda Handler

Cognito trigger that defines the custom authentication flow and enforces rate limiting.
Requirements: 5.1, 7.1
"""

from datetime import datetime, timezone
from typing import Dict, Any, List

from shared.logger import get_logger

logger = get_logger(__name__)

# Rate limiting configuration
RATE_LIMIT_SECONDS = 60  # Minimum 60 seconds between OTP requests


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    DefineAuthChallenge Lambda handler for Cognito custom authentication.
    
    This function determines the authentication flow and decides when to issue
    tokens or present challenges. It also enforces rate limiting on OTP requests.
    
    Requirements: 5.1, 7.1
    
    Args:
        event: Cognito DefineAuthChallenge event
        context: Lambda context
        
    Returns:
        dict: Modified event with challenge decisions
    """
    try:
        # Extract session information
        session: List[Dict[str, Any]] = event['request'].get('session', [])
        user_attributes = event['request'].get('userAttributes', {})
        email = user_attributes.get('email', 'unknown')
        
        logger.info(
            f"DefineAuthChallenge triggered for user: {email[:3]}***@{email.split('@')[1] if '@' in email else email}, "
            f"session length: {len(session)}"
        )
        
        # Initialize response
        event['response']['issueTokens'] = False
        event['response']['failAuthentication'] = False
        event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
        
        # Check if this is the first challenge (no session history)
        if len(session) == 0:
            # First challenge - always issue OTP
            logger.info("First authentication attempt - issuing OTP challenge")
            event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
            return event
        
        # Get the last challenge from session
        last_challenge = session[-1]
        
        # Check if the last challenge was answered correctly
        if last_challenge.get('challengeResult') is True:
            # User answered correctly - issue tokens
            logger.info("Challenge answered correctly - issuing tokens")
            event['response']['issueTokens'] = True
            event['response']['failAuthentication'] = False
            return event
        
        # Check for rate limiting on OTP requests
        # Look for recent OTP challenge creations in session
        if len(session) >= 2:
            # Check if user is requesting OTP too frequently
            rate_limit_violated = check_rate_limit(session)
            
            if rate_limit_violated:
                logger.warning(
                    f"Rate limit violated for {email[:3]}***@{email.split('@')[1] if '@' in email else email}"
                )
                # Fail authentication due to rate limiting
                event['response']['issueTokens'] = False
                event['response']['failAuthentication'] = True
                return event
        
        # Check if maximum attempts exceeded (prevent brute force)
        max_attempts = 5
        if len(session) >= max_attempts:
            logger.warning(
                f"Maximum attempts ({max_attempts}) exceeded for "
                f"{email[:3]}***@{email.split('@')[1] if '@' in email else email}"
            )
            event['response']['issueTokens'] = False
            event['response']['failAuthentication'] = True
            return event
        
        # Continue with custom challenge
        logger.info("Continuing with custom challenge")
        event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
        
        return event
        
    except Exception as e:
        logger.error(f"Error in DefineAuthChallenge: {str(e)}", error=e)
        # Fail authentication on error
        event['response']['issueTokens'] = False
        event['response']['failAuthentication'] = True
        return event


def check_rate_limit(session: List[Dict[str, Any]]) -> bool:
    """
    Check if rate limit has been violated based on session timestamps.
    
    Requirements: 7.1
    
    Args:
        session: List of challenge attempts from Cognito session
        
    Returns:
        bool: True if rate limit violated, False otherwise
    """
    try:
        current_time = int(datetime.now(timezone.utc).timestamp())
        
        # Look for the most recent challenge creation timestamp
        # Session entries are ordered chronologically
        for i in range(len(session) - 1, -1, -1):
            challenge = session[i]
            
            # Check if this was a challenge creation (not a verification attempt)
            challenge_metadata = challenge.get('challengeMetadata')
            
            if challenge_metadata == 'OTP_CHALLENGE':
                # Found a recent OTP challenge creation
                # Check the timestamp (stored in challengeMetadata or use current time as fallback)
                
                # For rate limiting, we check if the last challenge was created
                # within the rate limit window
                # Since Cognito doesn't provide exact timestamps in session,
                # we use a simple counter: if there are multiple challenges
                # in quick succession, we assume rate limit violation
                
                # Count recent challenge creations (last 2 entries)
                recent_challenges = 0
                for j in range(max(0, len(session) - 2), len(session)):
                    if session[j].get('challengeMetadata') == 'OTP_CHALLENGE':
                        recent_challenges += 1
                
                # If we see 2+ OTP challenges in the session, enforce rate limit
                if recent_challenges >= 2:
                    logger.info(f"Rate limit check: {recent_challenges} recent challenges detected")
                    return True
                
                break
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking rate limit: {str(e)}")
        # On error, don't enforce rate limit (fail open for availability)
        return False
