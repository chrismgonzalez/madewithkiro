#!/bin/bash

# SSM Parameter Setup Script for OAuth Secrets
# This script stores OAuth client secrets in AWS Systems Manager Parameter Store
# for both development and production environments.

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}INFO: $1${NC}"
}

# Function to validate environment argument
validate_environment() {
    local env=$1
    if [[ "$env" != "dev" && "$env" != "prod" ]]; then
        print_error "Invalid environment: $env. Must be 'dev' or 'prod'"
        exit 1
    fi
}

# Function to check if parameter exists
parameter_exists() {
    local param_name=$1
    if aws ssm get-parameter --name "$param_name" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to validate OAuth credentials format
validate_oauth_secret() {
    local secret_name=$1
    local secret_value=$2
    
    # Check if secret is not empty
    if [[ -z "$secret_value" ]]; then
        print_error "$secret_name is empty"
        return 1
    fi
    
    # Check minimum length (OAuth secrets are typically at least 20 characters)
    if [[ ${#secret_value} -lt 20 ]]; then
        print_error "$secret_name appears to be too short (${#secret_value} characters). OAuth secrets are typically at least 20 characters."
        return 1
    fi
    
    # Check for placeholder values
    if [[ "$secret_value" == *"your-"* ]] || [[ "$secret_value" == *"example"* ]] || [[ "$secret_value" == *"placeholder"* ]]; then
        print_error "$secret_name appears to be a placeholder value. Please use your actual OAuth secret."
        return 1
    fi
    
    return 0
}

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        print_info "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
}

# Function to check AWS credentials
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured or invalid."
        print_info "Run 'aws configure' to set up your credentials."
        exit 1
    fi
    
    local identity=$(aws sts get-caller-identity --output json)
    local account=$(echo "$identity" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
    local user=$(echo "$identity" | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
    print_info "Using AWS Account: $account"
    print_info "Using AWS Identity: $user"
}

# Function to validate required environment variables
validate_env_vars() {
    local env=$1
    local missing_vars=()
    
    # Check for Google OAuth credentials
    if [[ -z "${GOOGLE_CLIENT_ID}" ]]; then
        missing_vars+=("GOOGLE_CLIENT_ID")
    fi
    if [[ -z "${GOOGLE_CLIENT_SECRET}" ]]; then
        missing_vars+=("GOOGLE_CLIENT_SECRET")
    fi
    
    # Check for GitHub OAuth credentials
    if [[ -z "${GITHUB_CLIENT_ID}" ]]; then
        missing_vars+=("GITHUB_CLIENT_ID")
    fi
    if [[ -z "${GITHUB_CLIENT_SECRET}" ]]; then
        missing_vars+=("GITHUB_CLIENT_SECRET")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        print_info "Please set the required environment variables before running this script."
        print_info "Example:"
        echo "  export GOOGLE_CLIENT_ID='your-google-client-id'"
        echo "  export GOOGLE_CLIENT_SECRET='your-google-client-secret'"
        echo "  export GITHUB_CLIENT_ID='your-github-client-id'"
        echo "  export GITHUB_CLIENT_SECRET='your-github-client-secret'"
        echo ""
        print_info "Optional environment variables:"
        echo "  export GOOGLE_CLIENT_ID='your-google-client-id'"
        echo "  export GITHUB_CLIENT_ID='your-github-client-id'"
        exit 1
    fi
    
    # Validate OAuth secret formats
    print_info "Validating OAuth secret formats..."
    if ! validate_oauth_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"; then
        exit 1
    fi
    if ! validate_oauth_secret "GITHUB_CLIENT_SECRET" "$GITHUB_CLIENT_SECRET"; then
        exit 1
    fi
    print_success "OAuth secrets validated"
}

# Function to store parameter in SSM
store_parameter() {
    local param_name=$1
    local param_value=$2
    local param_description=$3
    
    print_info "Storing parameter: $param_name"
    
    # Check if parameter already exists
    if aws ssm get-parameter --name "$param_name" &> /dev/null; then
        print_info "Parameter already exists. Updating..."
        if aws ssm put-parameter \
            --name "$param_name" \
            --value "$param_value" \
            --type "String" \
            --description "$param_description" \
            --overwrite \
            --output json > /dev/null; then
            print_success "Updated parameter: $param_name"
        else
            print_error "Failed to update parameter: $param_name"
            return 1
        fi
    else
        print_info "Creating new parameter..."
        if aws ssm put-parameter \
            --name "$param_name" \
            --value "$param_value" \
            --type "String" \
            --description "$param_description" \
            --output json > /dev/null; then
            print_success "Created parameter: $param_name"
        else
            print_error "Failed to create parameter: $param_name"
            return 1
        fi
    fi
}

# Function to verify parameter was stored correctly
verify_parameter() {
    local param_name=$1
    
    if aws ssm get-parameter --name "$param_name" --with-decryption &> /dev/null; then
        print_success "Verified parameter exists: $param_name"
        return 0
    else
        print_error "Failed to verify parameter: $param_name"
        return 1
    fi
}

# Function to validate existing parameters in SSM
validate_existing_parameters() {
    local env=$1
    
    print_info "Validating OAuth credentials in SSM for $env environment..."
    echo ""
    
    local google_param_name="/madewithkiro/google-client-secret"
    local github_param_name="/madewithkiro/github-client-secret"
    
    local validation_failed=0
    
    # Check Google OAuth secret
    if parameter_exists "$google_param_name"; then
        print_success "Google OAuth secret exists: $google_param_name"
    else
        print_error "Google OAuth secret not found: $google_param_name"
        print_info "Run 'make setup-ssm-$env' to configure OAuth secrets"
        validation_failed=1
    fi
    
    # Check GitHub OAuth secret
    if parameter_exists "$github_param_name"; then
        print_success "GitHub OAuth secret exists: $github_param_name"
    else
        print_error "GitHub OAuth secret not found: $github_param_name"
        print_info "Run 'make setup-ssm-$env' to configure OAuth secrets"
        validation_failed=1
    fi
    
    if [[ $validation_failed -eq 1 ]]; then
        echo ""
        print_error "OAuth credential validation failed"
        print_info "Please configure OAuth secrets before deploying:"
        echo "  1. Set environment variables:"
        echo "     export GOOGLE_CLIENT_SECRET='your-google-secret'"
        echo "     export GITHUB_CLIENT_SECRET='your-github-secret'"
        echo "  2. Run: make setup-ssm-$env"
        exit 1
    fi
    
    echo ""
    print_success "All OAuth credentials validated for $env environment!"
}

# Function to setup parameters for an environment
setup_environment() {
    local env=$1
    
    print_info "Setting up SSM parameters for $env environment..."
    echo ""
    
    # Store Google OAuth client ID
    local google_id_param="/madewithkiro/google-client-id"
    local google_id_desc="Google OAuth client ID for $env environment"
    
    if ! store_parameter "$google_id_param" "$GOOGLE_CLIENT_ID" "$google_id_desc"; then
        print_error "Failed to store Google OAuth client ID"
        exit 1
    fi
    
    if ! verify_parameter "$google_id_param"; then
        exit 1
    fi
    
    # Store Google OAuth client secret
    local google_secret_param="/madewithkiro/google-client-secret"
    local google_secret_desc="Google OAuth client secret for $env environment"
    
    if ! store_parameter "$google_secret_param" "$GOOGLE_CLIENT_SECRET" "$google_secret_desc"; then
        print_error "Failed to store Google OAuth secret"
        exit 1
    fi
    
    if ! verify_parameter "$google_secret_param"; then
        exit 1
    fi
    
    echo ""
    
    # Store GitHub OAuth client ID
    local github_id_param="/madewithkiro/github-client-id"
    local github_id_desc="GitHub OAuth client ID for $env environment"
    
    if ! store_parameter "$github_id_param" "$GITHUB_CLIENT_ID" "$github_id_desc"; then
        print_error "Failed to store GitHub OAuth client ID"
        exit 1
    fi
    
    if ! verify_parameter "$github_id_param"; then
        exit 1
    fi
    
    # Store GitHub OAuth client secret
    local github_secret_param="/madewithkiro/github-client-secret"
    local github_secret_desc="GitHub OAuth client secret for $env environment"
    
    if ! store_parameter "$github_secret_param" "$GITHUB_CLIENT_SECRET" "$github_secret_desc"; then
        print_error "Failed to store GitHub OAuth secret"
        exit 1
    fi
    
    if ! verify_parameter "$github_param_name"; then
        exit 1
    fi
    
    echo ""
    print_success "All parameters stored successfully for $env environment!"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 <environment> [--validate-only]

Store OAuth secrets in AWS Systems Manager Parameter Store.

Arguments:
  environment       Environment to configure (dev or prod)
  --validate-only   Only validate that OAuth secrets exist in SSM (don't store)

Environment Variables (required for setup):
  GOOGLE_CLIENT_SECRET    Google OAuth client secret
  GITHUB_CLIENT_SECRET    GitHub OAuth client secret

Environment Variables (optional):
  GOOGLE_CLIENT_ID        Google OAuth client ID (for reference)
  GITHUB_CLIENT_ID        GitHub OAuth client ID (for reference)

Examples:
  # Setup development environment
  export GOOGLE_CLIENT_SECRET='your-google-secret'
  export GITHUB_CLIENT_SECRET='your-github-secret'
  $0 dev

  # Setup production environment
  export GOOGLE_CLIENT_SECRET='your-google-secret'
  export GITHUB_CLIENT_SECRET='your-github-secret'
  $0 prod

  # Validate OAuth secrets are configured (before deployment)
  $0 dev --validate-only
  $0 prod --validate-only

Notes:
  - Secrets are stored as String type (still encrypted at rest by AWS)
  - If parameters already exist, they will be updated
  - AWS CLI must be installed and configured with appropriate permissions
  - Required IAM permissions: ssm:PutParameter, ssm:GetParameter
  - Validation checks that secrets exist but does not read their values
  - OAuth secrets are validated for format and length before storing

EOF
}

# Main script execution
main() {
    # Check if help is requested
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Check if environment argument is provided
    if [[ -z "$1" ]]; then
        print_error "Environment argument is required"
        echo ""
        usage
        exit 1
    fi
    
    local environment=$1
    local validate_only=0
    
    # Check for --validate-only flag
    if [[ "$2" == "--validate-only" ]]; then
        validate_only=1
    fi
    
    # Validate environment
    validate_environment "$environment"
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    check_aws_cli
    check_aws_credentials
    echo ""
    
    # If validate-only mode, just check existing parameters
    if [[ $validate_only -eq 1 ]]; then
        validate_existing_parameters "$environment"
        exit 0
    fi
    
    # Validate environment variables
    print_info "Validating environment variables..."
    validate_env_vars "$environment"
    echo ""
    
    # Setup parameters
    setup_environment "$environment"
    
    echo ""
    print_success "SSM parameter setup complete!"
    print_info "You can now deploy the SAM template with these parameters."
    print_info "The secrets will be automatically retrieved during deployment."
}

# Run main function
main "$@"
