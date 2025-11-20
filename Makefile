.PHONY: install dev build deploy-dev deploy-prod logs clean test help

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)MadeWithKiro - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Install all dependencies (frontend and backend)
	@echo "$(BLUE)Installing frontend dependencies with Bun...$(NC)"
	bun install
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"
	@echo ""
	@echo "$(BLUE)Installing backend dependencies with uv...$(NC)"
	@if [ -d "backend/profile" ]; then \
		cd backend/profile && uv pip sync requirements.txt 2>/dev/null || echo "$(YELLOW)Note: requirements.txt not yet created$(NC)"; \
	fi
	@if [ -d "backend/application" ]; then \
		cd backend/application && uv pip sync requirements.txt 2>/dev/null || echo "$(YELLOW)Note: requirements.txt not yet created$(NC)"; \
	fi
	@echo "$(GREEN)✓ Backend dependencies installed$(NC)"

dev: ## Start local development server
	@echo "$(BLUE)Starting Vite development server...$(NC)"
	bun run dev

build: ## Build frontend for production
	@echo "$(BLUE)Building frontend with Vite...$(NC)"
	bun run build
	@echo "$(GREEN)✓ Frontend built successfully$(NC)"

test: ## Run all tests (frontend and backend)
	@echo "$(BLUE)Running backend tests...$(NC)"
	@if [ -d "backend/profile" ]; then \
		cd backend && uv run pytest -v || echo "$(YELLOW)No backend tests found yet$(NC)"; \
	fi
	@echo ""
	@echo "$(BLUE)Running frontend tests...$(NC)"
	@bun run test --run 2>/dev/null || echo "$(YELLOW)No frontend tests configured yet$(NC)"
	@echo "$(GREEN)✓ Tests completed$(NC)"

sam-build: ## Build SAM application
	@echo "$(BLUE)Building SAM application...$(NC)"
	sam build
	@echo "$(GREEN)✓ SAM build completed$(NC)"

sam-validate: ## Validate SAM template
	@echo "$(BLUE)Validating SAM template...$(NC)"
	sam validate --lint
	@echo "$(GREEN)✓ SAM template is valid$(NC)"

deploy-certificate: ## Deploy ACM certificate in us-east-1 (required for prod custom domain)
	@echo "$(BLUE)Deploying ACM certificate to us-east-1...$(NC)"
	@echo "$(YELLOW)This must be done before deploying prod with custom domain$(NC)"
	sam deploy \
		--template-file certificate-template.yaml \
		--config-file certificate-samconfig.toml \
		--stack-name madewithkiro-certificate \
		--region us-east-1 \
		--no-confirm-changeset
	@echo ""
	@echo "$(GREEN)✓ Certificate deployed$(NC)"
	@echo ""
	@echo "$(YELLOW)Certificate ARN:$(NC)"
	@aws cloudformation describe-stacks \
		--stack-name madewithkiro-certificate \
		--region us-east-1 \
		--query 'Stacks[0].Outputs[?OutputKey==`CertificateArn`].OutputValue' \
		--output text
	@echo ""
	@echo "$(YELLOW)Add this ARN to samconfig.toml prod parameters:$(NC)"
	@echo "  CertificateArn=<ARN_FROM_ABOVE>"

deploy-dev: sam-build ## Deploy to development environment
	@echo "$(BLUE)Deploying to development environment...$(NC)"
	sam deploy --config-env dev --no-confirm-changeset
	@echo ""
	@echo "$(GREEN)✓ Deployment to dev completed$(NC)"
	@echo ""
	@echo "$(YELLOW)Fetching stack outputs...$(NC)"
	@aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs' --output table 2>/dev/null || echo "$(RED)Could not fetch outputs. Run: aws cloudformation describe-stacks --stack-name madewithkiro-dev$(NC)"

deploy-prod: sam-build ## Deploy to production environment
	@echo "$(BLUE)Deploying to production environment...$(NC)"
	@echo "$(RED)⚠️  WARNING: Deploying to PRODUCTION$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		sam deploy --config-env prod; \
		echo "$(GREEN)✓ Deployment to prod completed$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Fetching stack outputs...$(NC)"; \
		aws cloudformation describe-stacks --stack-name madewithkiro-prod --query 'Stacks[0].Outputs' --output table 2>/dev/null || echo "$(RED)Could not fetch outputs$(NC)"; \
	else \
		echo "$(YELLOW)Deployment cancelled$(NC)"; \
	fi

upload-frontend-dev: build ## Upload frontend to S3 (dev)
	@echo "$(BLUE)Uploading frontend to S3 (dev)...$(NC)"
	@BUCKET_NAME=$$(aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text 2>/dev/null); \
	if [ -n "$$BUCKET_NAME" ]; then \
		aws s3 sync dist/ s3://$$BUCKET_NAME/ --delete; \
		echo "$(GREEN)✓ Frontend uploaded to S3$(NC)"; \
	else \
		echo "$(RED)✗ Could not find S3 bucket. Deploy infrastructure first.$(NC)"; \
		exit 1; \
	fi

upload-frontend-prod: build ## Upload frontend to S3 (prod)
	@echo "$(BLUE)Uploading frontend to S3 (prod)...$(NC)"
	@echo "$(RED)⚠️  WARNING: Uploading to PRODUCTION$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		BUCKET_NAME=$$(aws cloudformation describe-stacks --stack-name madewithkiro-prod --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text 2>/dev/null); \
		if [ -n "$$BUCKET_NAME" ]; then \
			aws s3 sync dist/ s3://$$BUCKET_NAME/ --delete; \
			echo "$(GREEN)✓ Frontend uploaded to S3$(NC)"; \
		else \
			echo "$(RED)✗ Could not find S3 bucket$(NC)"; \
			exit 1; \
		fi \
	else \
		echo "$(YELLOW)Upload cancelled$(NC)"; \
	fi

logs: ## Tail Lambda logs (dev environment)
	@echo "$(BLUE)Tailing Lambda logs for dev environment...$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop$(NC)"
	@sam logs --stack-name madewithkiro-dev --tail

logs-profile: ## Tail Profile Lambda logs (dev)
	@echo "$(BLUE)Tailing Profile Lambda logs...$(NC)"
	@FUNCTION_NAME=$$(aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs[?OutputKey==`ProfileFunction`].OutputValue' --output text 2>/dev/null || echo "MadeWithKiro-Profile-dev"); \
	aws logs tail /aws/lambda/$$FUNCTION_NAME --follow

logs-application: ## Tail Application Lambda logs (dev)
	@echo "$(BLUE)Tailing Application Lambda logs...$(NC)"
	@FUNCTION_NAME=$$(aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs[?OutputKey==`ApplicationFunction`].OutputValue' --output text 2>/dev/null || echo "MadeWithKiro-Application-dev"); \
	aws logs tail /aws/lambda/$$FUNCTION_NAME --follow

outputs-dev: ## Show CloudFormation outputs for dev
	@echo "$(BLUE)Development Environment Outputs:$(NC)"
	@aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs' --output table 2>/dev/null || echo "$(RED)Stack not found. Deploy first with: make deploy-dev$(NC)"

outputs-prod: ## Show CloudFormation outputs for prod
	@echo "$(BLUE)Production Environment Outputs:$(NC)"
	@aws cloudformation describe-stacks --stack-name madewithkiro-prod --query 'Stacks[0].Outputs' --output table 2>/dev/null || echo "$(RED)Stack not found. Deploy first with: make deploy-prod$(NC)"

clean: ## Clean build artifacts and caches
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf dist/
	rm -rf .aws-sam/
	rm -rf node_modules/.vite/
	@if [ -d "backend" ]; then \
		find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true; \
		find backend -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true; \
		find backend -type d -name .venv -exec rm -rf {} + 2>/dev/null || true; \
		find backend -type f -name "*.pyc" -delete 2>/dev/null || true; \
	fi
	@echo "$(GREEN)✓ Cleanup completed$(NC)"

destroy-dev: ## Destroy dev stack (WARNING: deletes all resources)
	@echo "$(RED)⚠️  WARNING: This will DELETE all dev resources$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Emptying S3 bucket...$(NC)"; \
		BUCKET_NAME=$$(aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text 2>/dev/null); \
		if [ -n "$$BUCKET_NAME" ]; then \
			aws s3 rm s3://$$BUCKET_NAME/ --recursive 2>/dev/null || true; \
		fi; \
		echo "$(BLUE)Deleting CloudFormation stack...$(NC)"; \
		sam delete --stack-name madewithkiro-dev --no-prompts; \
		echo "$(GREEN)✓ Dev stack destroyed$(NC)"; \
	else \
		echo "$(YELLOW)Destruction cancelled$(NC)"; \
	fi

destroy-prod: ## Destroy prod stack (WARNING: deletes all resources)
	@echo "$(RED)⚠️  WARNING: This will DELETE all PRODUCTION resources$(NC)"
	@read -p "Type 'DELETE PRODUCTION' to confirm: " confirm; \
	if [ "$$confirm" = "DELETE PRODUCTION" ]; then \
		echo "$(BLUE)Emptying S3 bucket...$(NC)"; \
		BUCKET_NAME=$$(aws cloudformation describe-stacks --stack-name madewithkiro-prod --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text 2>/dev/null); \
		if [ -n "$$BUCKET_NAME" ]; then \
			aws s3 rm s3://$$BUCKET_NAME/ --recursive 2>/dev/null || true; \
		fi; \
		echo "$(BLUE)Deleting CloudFormation stack...$(NC)"; \
		sam delete --stack-name madewithkiro-prod --no-prompts; \
		echo "$(GREEN)✓ Prod stack destroyed$(NC)"; \
	else \
		echo "$(YELLOW)Destruction cancelled$(NC)"; \
	fi

local-api: ## Start SAM local API Gateway
	@echo "$(BLUE)Starting SAM local API...$(NC)"
	sam local start-api --warm-containers EAGER

local-invoke-profile: ## Invoke Profile Lambda locally
	@echo "$(BLUE)Invoking Profile Lambda locally...$(NC)"
	sam local invoke ProfileFunction --event events/profile-event.json

local-invoke-application: ## Invoke Application Lambda locally
	@echo "$(BLUE)Invoking Application Lambda locally...$(NC)"
	sam local invoke ApplicationFunction --event events/application-event.json

status: ## Show deployment status
	@echo "$(BLUE)Checking deployment status...$(NC)"
	@echo ""
	@echo "$(YELLOW)Development Environment:$(NC)"
	@aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "$(RED)Not deployed$(NC)"
	@echo ""
	@echo "$(YELLOW)Production Environment:$(NC)"
	@aws cloudformation describe-stacks --stack-name madewithkiro-prod --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "$(RED)Not deployed$(NC)"

check-deps: ## Check if required tools are installed
	@echo "$(BLUE)Checking dependencies...$(NC)"
	@command -v bun >/dev/null 2>&1 && echo "$(GREEN)✓ bun installed$(NC)" || echo "$(RED)✗ bun not found$(NC)"
	@command -v uv >/dev/null 2>&1 && echo "$(GREEN)✓ uv installed$(NC)" || echo "$(RED)✗ uv not found$(NC)"
	@command -v sam >/dev/null 2>&1 && echo "$(GREEN)✓ sam installed$(NC)" || echo "$(RED)✗ sam not found$(NC)"
	@command -v aws >/dev/null 2>&1 && echo "$(GREEN)✓ aws cli installed$(NC)" || echo "$(RED)✗ aws cli not found$(NC)"
	@command -v python3 >/dev/null 2>&1 && echo "$(GREEN)✓ python3 installed$(NC)" || echo "$(RED)✗ python3 not found$(NC)"

setup-env-dev: ## Generate .env file from dev stack outputs
	@./scripts/setup-env.sh dev

setup-env-prod: ## Generate .env file from prod stack outputs
	@./scripts/setup-env.sh prod

invalidate-cloudfront-dev: ## Invalidate CloudFront cache (dev)
	@echo "$(BLUE)Invalidating CloudFront cache for dev...$(NC)"
	@DISTRIBUTION_ID=$$(aws cloudformation describe-stacks --stack-name madewithkiro-dev --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text 2>/dev/null); \
	if [ -n "$$DISTRIBUTION_ID" ] && [ "$$DISTRIBUTION_ID" != "None" ]; then \
		aws cloudfront create-invalidation --distribution-id $$DISTRIBUTION_ID --paths "/*"; \
		echo "$(GREEN)✓ CloudFront cache invalidated$(NC)"; \
	else \
		echo "$(YELLOW)No CloudFront distribution found. Custom domain not configured.$(NC)"; \
	fi

invalidate-cloudfront-prod: ## Invalidate CloudFront cache (prod)
	@echo "$(BLUE)Invalidating CloudFront cache for prod...$(NC)"
	@DISTRIBUTION_ID=$$(aws cloudformation describe-stacks --stack-name madewithkiro-prod --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text 2>/dev/null); \
	if [ -n "$$DISTRIBUTION_ID" ] && [ "$$DISTRIBUTION_ID" != "None" ]; then \
		aws cloudfront create-invalidation --distribution-id $$DISTRIBUTION_ID --paths "/*"; \
		echo "$(GREEN)✓ CloudFront cache invalidated$(NC)"; \
	else \
		echo "$(YELLOW)No CloudFront distribution found. Custom domain not configured.$(NC)"; \
	fi
