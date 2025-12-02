#!/bin/bash

# Script to retrieve SES DNS records for domain configuration
# Usage: ./scripts/get-ses-dns-records.sh [domain] [region]

set -e

# Default values
DOMAIN="${1:-madewithkiro.com}"
REGION="${2:-us-west-2}"

echo "=========================================="
echo "AWS SES DNS Records for ${DOMAIN}"
echo "Region: ${REGION}"
echo "=========================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if jq is installed (for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo "Warning: jq is not installed. Output will be raw JSON."
    echo "Install jq for better formatting: brew install jq (macOS) or apt-get install jq (Linux)"
    echo ""
    USE_JQ=false
else
    USE_JQ=true
fi

echo "1. Domain Verification Record (TXT)"
echo "-----------------------------------"
VERIFICATION=$(aws ses get-identity-verification-attributes \
    --identities "${DOMAIN}" \
    --region "${REGION}" \
    --output json 2>/dev/null || echo "{}")

if [ "$USE_JQ" = true ]; then
    TOKEN=$(echo "$VERIFICATION" | jq -r ".VerificationAttributes.\"${DOMAIN}\".VerificationToken // \"Not found\"")
    STATUS=$(echo "$VERIFICATION" | jq -r ".VerificationAttributes.\"${DOMAIN}\".VerificationStatus // \"Not found\"")
    
    echo "Status: ${STATUS}"
    echo ""
    echo "Add this TXT record to your DNS:"
    echo "Name: _amazonses.${DOMAIN}"
    echo "Type: TXT"
    echo "Value: ${TOKEN}"
    echo "TTL: 1800"
else
    echo "$VERIFICATION"
fi
echo ""
echo ""

echo "2. DKIM Records (CNAME)"
echo "----------------------"
DKIM=$(aws ses get-identity-dkim-attributes \
    --identities "${DOMAIN}" \
    --region "${REGION}" \
    --output json 2>/dev/null || echo "{}")

if [ "$USE_JQ" = true ]; then
    DKIM_ENABLED=$(echo "$DKIM" | jq -r ".DkimAttributes.\"${DOMAIN}\".DkimEnabled // false")
    DKIM_STATUS=$(echo "$DKIM" | jq -r ".DkimAttributes.\"${DOMAIN}\".DkimVerificationStatus // \"Not found\"")
    DKIM_TOKENS=$(echo "$DKIM" | jq -r ".DkimAttributes.\"${DOMAIN}\".DkimTokens[]? // empty")
    
    echo "DKIM Enabled: ${DKIM_ENABLED}"
    echo "DKIM Status: ${DKIM_STATUS}"
    echo ""
    
    if [ -n "$DKIM_TOKENS" ]; then
        echo "Add these 3 CNAME records to your DNS:"
        echo ""
        counter=1
        while IFS= read -r token; do
            echo "Record ${counter}:"
            echo "Name: ${token}._domainkey.${DOMAIN}"
            echo "Type: CNAME"
            echo "Value: ${token}.dkim.amazonses.com"
            echo "TTL: 1800"
            echo ""
            counter=$((counter + 1))
        done <<< "$DKIM_TOKENS"
    else
        echo "No DKIM tokens found. You may need to enable DKIM for this domain."
        echo "Run: aws ses set-identity-dkim-enabled --identity ${DOMAIN} --dkim-enabled --region ${REGION}"
    fi
else
    echo "$DKIM"
fi
echo ""

echo "3. SPF Record (TXT)"
echo "-------------------"
echo "Add this TXT record to your DNS:"
echo "Name: ${DOMAIN}"
echo "Type: TXT"
echo "Value: v=spf1 include:amazonses.com ~all"
echo "TTL: 1800"
echo ""
echo "Note: If you already have an SPF record, add 'include:amazonses.com' to it."
echo "You can only have ONE SPF record per domain."
echo ""
echo ""

echo "4. DMARC Record (TXT)"
echo "---------------------"
echo "Add this TXT record to your DNS:"
echo "Name: _dmarc.${DOMAIN}"
echo "Type: TXT"
echo "Value: v=DMARC1; p=quarantine; rua=mailto:postmaster@${DOMAIN}; pct=100; adkim=s; aspf=s"
echo "TTL: 1800"
echo ""
echo ""

echo "5. Custom MAIL FROM Domain Records"
echo "-----------------------------------"
echo "Add these records to your DNS:"
echo ""
echo "MX Record:"
echo "Name: mail.${DOMAIN}"
echo "Type: MX"
echo "Value: 10 feedback-smtp.${REGION}.amazonses.com"
echo "TTL: 1800"
echo ""
echo "TXT Record:"
echo "Name: mail.${DOMAIN}"
echo "Type: TXT"
echo "Value: v=spf1 include:amazonses.com ~all"
echo "TTL: 1800"
echo ""
echo ""

echo "=========================================="
echo "Verification Commands"
echo "=========================================="
echo ""
echo "After adding DNS records, verify them with:"
echo ""
echo "# Domain verification"
echo "dig TXT _amazonses.${DOMAIN}"
echo ""
echo "# DKIM records (replace <token> with actual tokens from above)"
echo "dig CNAME <token1>._domainkey.${DOMAIN}"
echo "dig CNAME <token2>._domainkey.${DOMAIN}"
echo "dig CNAME <token3>._domainkey.${DOMAIN}"
echo ""
echo "# SPF record"
echo "dig TXT ${DOMAIN}"
echo ""
echo "# DMARC record"
echo "dig TXT _dmarc.${DOMAIN}"
echo ""
echo "# MAIL FROM MX record"
echo "dig MX mail.${DOMAIN}"
echo ""
echo ""

echo "=========================================="
echo "Check Verification Status"
echo "=========================================="
echo ""
echo "Run these commands to check if DNS records have propagated:"
echo ""
echo "# Check domain verification status"
echo "aws ses get-identity-verification-attributes --identities ${DOMAIN} --region ${REGION}"
echo ""
echo "# Check DKIM status"
echo "aws ses get-identity-dkim-attributes --identities ${DOMAIN} --region ${REGION}"
echo ""
echo ""

echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Add all DNS records to your DNS provider (Route 53 or external)"
echo "2. Wait for DNS propagation (up to 48 hours, usually faster)"
echo "3. Verify DNS records using the dig commands above"
echo "4. Check verification status in AWS SES Console or using AWS CLI"
echo "5. Verify email identity: noreply@${DOMAIN}"
echo "6. Request production access for SES"
echo "7. Deploy SAM template with SES configuration"
echo ""
echo "For detailed instructions, see: docs/SES_SETUP.md"
echo ""
