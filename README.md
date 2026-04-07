# MadeWithKiro

**Showcase your Kiro creations with the world.**

MadeWithKiro is a community platform where you can share the amazing applications you've built using Kiro. Create your profile, add your projects, and discover what others are building.

## What is MadeWithKiro?

Think of it as a portfolio site specifically for Kiro users. You can:

- 🎨 **Create your profile** - Share your name and connect your GitHub, LinkedIn, and AWS Builder Center profiles
- 🚀 **Showcase your apps** - Add the applications you've built with Kiro
- 🔍 **Discover projects** - Browse what others in the community are creating
- 🏷️ **Find by tags** - Search for projects by technology or category

## Getting Started

### For Users

Visit [madewithkiro.com](https://madewithkiro.com) to:

1. Sign in with your account
2. Create your profile
3. Add your first application
4. Share your profile with others

## Features

- **User Profiles** - Showcase who you are and link to your professional profiles
- **Application Gallery** - Browse all projects created by the community
- **Tag-based Discovery** - Find projects by technology, category, or use case
- **Direct Links** - Quick access to live apps and source code

## Project Structure

```
.
├── src/                    # React frontend (TypeScript)
├── backend/                # Python Lambda functions
├── infrastructure/         # AWS SAM templates
│   ├── template.yaml       # Main infrastructure
│   ├── certificate/        # ACM certificate setup
│   └── oidc/              # OIDC provider setup
├── config/                 # Build & tool configurations
│   ├── vite.config.ts     # Vite build config
│   ├── vitest.config.ts   # Test config
│   ├── tsconfig.json      # TypeScript config
│   └── tailwind.config.js # Tailwind CSS config
├── docs/                   # Documentation
├── scripts/                # Setup & deployment scripts
├── .kiro/                  # Kiro AI configuration
│   ├── skills/            # On-demand guidance
│   ├── steering/          # Always-on context
│   └── hooks/             # Automated workflows
├── Makefile               # Common commands
└── package.json           # Frontend dependencies
```

For developers, see [docs/DEVELOPER.md](docs/DEVELOPER.md) for setup instructions.

## Community

- Share your profile on social media with `#MadeWithKiro`
- Connect with other builders through their profiles
- Get inspired by what others are creating

## License

MIT
