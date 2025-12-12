"""
DefineAuthChallenge Lambda Handler

Cognito trigger that defines the custom authentication flow.
Controls when to issue challenges, when to issue tokens, and when to fail authentication.

Requirements: 7.4 - Maximum attempts enforcement
"""

from typing import Dict, Any, List

from shared.logger import get_logger

logger = get_logger(__name__)

# Maximum number of failed OTP verification attempts before failing authentication
MAX_FAILED_ATTEMPTS = 5


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    DefineAuthChallenge Lambda handler for Cognito custom authentication.
    
    This function determines the authentication flow:
    - First attempt: Issue CUSTOM_CHALLENGE
    - Correct answer: Issue tokens
    - Incorrect answer (< 5 attempts): Continue with CUSTOM_CHALLENGE
    - 5+ failed attempts: Fail authentication
    
    Requirements: 7.4
    
    Args:
        event: Cognito DefineAuthChallenge event
        context: Lambda context
        
    Returns:
        dict: Modified event with challenge decisions
    """
    try:
        session: List[Dict[str, Any]] = event['request'].get('session', [])
        user_attributes = event['request'].get('userAttributes', {})
        email = user_attributes.get('email', 'unknown')
        
        # Mask email for logging
        masked_email = _mask_email(email)
        
        logger.info(
            f"DefineAuthChallenge triggered for user: {masked_email}, "
            f"session length: {len(session)}"
        )
        
        # Initialize response defaults
        event['response']['issueTokens'] = False
        event['response']['failAuthentication'] = False
        
        # First attempt - no session history, issue challenge
        if len(session) == 0:
            logger.info("First authentication attempt - issuing CUSTOM_CHALLENGE")
            event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
            return event
        
        # Get the last challenge from session
        last_challenge = session[-1]
        
        # Debug logging
        logger.info(f"Last challenge: {last_challenge}")
        logger.info(f"Challenge result: {last_challenge.get('challengeResult')}")
        
        # Check if the last challenge was answered correctly
        if last_challenge.get('challengeResult') is True:
            logger.info("Challenge answered correctly - issuing tokens")
            event['response']['issueTokens'] = True
            event['response']['failAuthentication'] = False
            # IMPORTANT: Do NOT set challengeName when issuing tokens
            # Cognito will fail with NotAuthorizedException if challengeName is present
            if 'challengeName' in event['response']:
                del event['response']['challengeName']
            
            # Debug logging
            logger.info(f"DefineAuthChallenge response: {event['response']}")
            return event
        
        # Count failed attempts (challenges where result was False)
        failed_attempts = _count_failed_attempts(session)
        
        logger.info(f"Failed attempts so far: {failed_attempts}")
        
        # Check if maximum failed attempts exceeded
        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            logger.warning(
                f"Maximum failed attempts ({MAX_FAILED_ATTEMPTS}) exceeded for {masked_email}"
            )
            event['response']['issueTokens'] = False
            event['response']['failAuthentication'] = True
            return event
        
        # Continue with custom challenge for retry
        logger.info("Continuing with CUSTOM_CHALLENGE for retry")
        event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
        
        return event
        
    except Exception as e:
        logger.error(f"Error in DefineAuthChallenge: {str(e)}", error=e)
        # Fail authentication on error for security
        event['response']['issueTokens'] = False
        event['response']['failAuthentication'] = True
        return event


def _count_failed_attempts(session: List[Dict[str, Any]]) -> int:
    """
    Count the number of failed OTP verification attempts in the session.
    
    A failed attempt is when challengeResult is False for a CUSTOM_CHALLENGE.
    
    Args:
        session: List of challenge attempts from Cognito session
        
    Returns:
        int: Number of failed attempts
    """
    failed_count = 0
    
    for challenge in session:
        # Count challenges where the result was explicitly False
        # (meaning user submitted an incorrect OTP)
        if (challenge.get('challengeName') == 'CUSTOM_CHALLENGE' and 
            challenge.get('challengeResult') is False):
            failed_count += 1
    
    return failed_count


def _mask_email(email: str) -> str:
    """
    Mask email address for logging (security requirement).
    
    Args:
        email: Email address to mask
        
    Returns:
        str: Masked email (e.g., "use***@domain.com")
    """
    if not email or '@' not in email:
        return 'unknown'
    
    local_part, domain = email.split('@', 1)
    if len(local_part) <= 3:
        masked_local = local_part[0] + '***'
    else:
        masked_local = local_part[:3] + '***'
    
    return f"{masked_local}@{domain}"
