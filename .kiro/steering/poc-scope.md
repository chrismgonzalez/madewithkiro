# MadeWithKiro POC Scope

## Overview

MadeWithKiro is a showcase platform where users can display applications they've built using Kiro. The platform enables users to create profiles, share their work, and connect with the community through social and professional links.

## POC Objectives

- **Fast Development**: Prioritize speed to market with minimal viable features
- **Secure Authentication**: Implement user authentication and profile management
- **Showcase Applications**: Allow users to add and display their Kiro-built apps
- **Community Connection**: Enable profile discovery and social linking
- **Rapid Deployment**: E2E workflow with AWS SAM and Makefile automation

## Core Features (POC)

### 1. User Authentication & Profile Management

**User Profile Fields:**

- First Name (required)
- Last Name (required)
- AWS Builder Center handle (required) - for community lookup
- LinkedIn username (optional) - for professional networking
- GitHub profile name (optional) - for code sharing

**Authentication:**

- Secure login via AWS Cognito
- Profile creation on first login
- Profile editing capabilities

### 2. Application Showcase

**Application Card Fields:**

- Application name (required)
- Description (required)
- Live app URL (required)
- GitHub repository URL (optional)
- Tags (required) - for categorization and discovery
- Creator profile link (automatic)

**Features:**

- Add new application cards
- View all applications (public gallery)
- Filter/search by tags
- Link to creator profiles

### 3. Profile Pages

**Public Profile View:**

- Display user information
- List of applications created by user
- Social/professional links (LinkedIn, GitHub, AWS Builder Center)
- Quick link-out buttons

## Out of Scope (POC)

The following features are explicitly excluded from the POC to maintain fast development:

- Application editing/deletion
- User comments or ratings
- Application analytics
- Image uploads for applications
- Advanced search/filtering
- User following/social features
- Email notifications
- Admin dashboard
- Application approval workflow

## Technical Constraints (POC)

### Development Speed Optimizations

- Use shadcn/ui components (no custom design system)
- Single-table DynamoDB design
- Minimal Lambda functions (combine related operations)
- No complex state management (Context API only)
- Basic error handling (no retry logic)
- Simple validation (client-side only for POC)
- Developer can ship to production quickly to validate the application

### Deployment Automation

**Makefile Commands:**

```makefile
make install      # Install dependencies (bun + uv)
make dev          # Run local development server
make build        # Build frontend for production
make test         # Run all tests (frontend + backend)
make deploy-dev   # Deploy to dev environment
make deploy-prod  # Deploy to production
make logs         # View Lambda logs
make clean        # Clean build artifacts
```

**AWS SAM:**

- Single template.yaml for all infrastructure
- Environment-based parameter files
- Automated CloudFormation deployment
- Integrated API Gateway + Lambda + DynamoDB setup
- Lambda functions bundled as zip files
- Python dependencies managed with uv

## Data Model (Simplified)

### User Profile

```
PK: USER#<userId>
SK: PROFILE
firstName: string
lastName: string
awsBuilderHandle: string
linkedInUsername?: string
githubUsername?: string
createdAt: timestamp
```

### Application

```
PK: APP#<appId>
SK: METADATA
userId: string (creator)
name: string
description: string
appUrl: string
githubUrl?: string
tags: string[]
createdAt: timestamp
```

### GSI for User Applications

```
GSI1PK: USER#<userId>
GSI1SK: APP#<appId>
```

## Success Criteria (POC)

1. User can sign up and create a profile in < 2 minutes
2. User can add an application card in < 1 minute
3. Public gallery displays all applications
4. Profile pages show user info and their applications
5. Social links work correctly
6. Deployment takes < 5 minutes via `make deploy-dev`
7. Zero manual AWS console configuration required

## Timeline Expectations

- **Setup & Infrastructure**: 1-2 hours
- **Authentication & Profiles**: 2-3 hours
- **Application CRUD**: 2-3 hours
- **UI Polish**: 1-2 hours
- **Testing & Deployment**: 1 hour

**Total POC Development**: 1 day

## Future Enhancements (Post-POC)

- Edit/delete applications
- Application images/screenshots
- Advanced filtering and search
- User analytics dashboard
- Featured applications
- Application categories
- User badges/achievements
- Export portfolio as PDF
