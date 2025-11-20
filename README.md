# MadeWithKiro

A serverless showcase platform where users can display applications they've built using Kiro. Built with React, AWS Lambda, DynamoDB, and Cognito.

## Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [uv](https://docs.astral.sh/uv/) - Python package manager
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) - Serverless deployment tool
- [AWS CLI](https://aws.amazon.com/cli/) - AWS command line interface
- AWS Account with appropriate permissions

## Quick Start

### 1. Install Dependencies

```bash
make install
```

This installs both frontend (Bun) and backend (uv) dependencies.

### 2. Local Development

```bash
make dev
```

Starts the Vite development server at http://localhost:5173

### 3. Deploy to AWS

```bash
make deploy-dev
```

Deploys the complete infrastructure to AWS (DynamoDB, Lambda, API Gateway, Cognito, S3).

## Available Commands

Run `make help` to see all available commands:

- `make install` - Install all dependencies
- `make dev` - Start local development server
- `make build` - Build frontend for production
- `make test` - Run all tests
- `make deploy-dev` - Deploy to development environment
- `make deploy-prod` - Deploy to production environment
- `make logs` - Tail Lambda logs
- `make outputs-dev` - Show CloudFormation outputs
- `make clean` - Clean build artifacts
- `make check-deps` - Check if required tools are installed

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: AWS Lambda (Python 3.13)
- **Database**: DynamoDB (single-table design)
- **Authentication**: AWS Cognito
- **API**: API Gateway with Cognito authorizer
- **Hosting**: S3 + CloudFront
- **DNS**: Route 53 (optional custom domain)
- **SSL/TLS**: ACM Certificate (automatic)
- **IaC**: AWS SAM (Serverless Application Model)

## Project Structure

```
.
├── src/                    # React frontend
├── backend/
│   ├── profile/           # Profile Lambda function
│   └── application/       # Application Lambda function
├── template.yaml          # AWS SAM template
├── samconfig.toml         # SAM configuration
├── Makefile              # Deployment automation
└── README.md
```

## Deployment

### Development Environment

```bash
make deploy-dev
```

After deployment, get the API URL and Cognito details:

```bash
make outputs-dev
```

### Production Environment

```bash
make deploy-prod
```

You'll be prompted to confirm before deploying to production.

### Upload Frontend

After deploying infrastructure, upload the frontend:

```bash
make upload-frontend-dev
```

## Environment Configuration

The application uses two environments:

- **dev**: Development environment with relaxed settings
- **prod**: Production environment with stricter security

Configuration is managed in `samconfig.toml`.

## Testing

```bash
make test
```

Runs both frontend and backend tests.

## Monitoring

View Lambda logs in real-time:

```bash
make logs
```

Or view specific function logs:

```bash
make logs-profile
make logs-application
```

## Custom Domain

To use a custom domain (e.g., `madewithkiro.com`):

1. Register a domain through Route 53 or another registrar
2. Update `samconfig.toml` with your domain name
3. Deploy: `make deploy-prod`
4. Wait for DNS propagation (5-30 minutes)

See [DOMAIN-SETUP.md](DOMAIN-SETUP.md) for detailed instructions.

## Cleanup

To remove all AWS resources:

```bash
make destroy-dev
```

⚠️ This will delete all data and resources.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `make dev`
4. Deploy to dev with `make deploy-dev`
5. Submit a pull request

## License

MIT
