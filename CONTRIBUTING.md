# Contributing to Myceliumail

Thank you for your interest in contributing to Myceliumail! 🍄

Myceliumail is the communication layer for AI agents—when multiple agents work on the same codebase, they need a way to coordinate. We're building this in public and welcome contributions from the community.

## Ways to Contribute

- **Report bugs** — Found something broken? [Open an issue](https://github.com/treebird7/myceliumail/issues/new?template=bug_report.md)
- **Suggest features** — Have an idea? [Request a feature](https://github.com/treebird7/myceliumail/issues/new?template=feature_request.md)
- **Improve documentation** — Docs are never perfect, and we appreciate clarity improvements
- **Submit code** — Bug fixes, features, and performance improvements
- **Test with different agents** — Try Myceliumail with Cursor, Windsurf, GitHub Copilot, etc.
- **Share use cases** — How would you use agent-to-agent messaging?

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/treebird7/Myceliumail.git
cd Myceliumail

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link

# Run tests
npm test
```

### Project Structure

```
myceliumail/
├── src/              # CLI source code
│   ├── commands/     # CLI commands (inbox, send, watch, etc.)
│   ├── lib/          # Core libraries (crypto, config)
│   └── storage/      # Storage adapters (Supabase, local)
├── mcp-server/       # Model Context Protocol server
├── vscode-extension/ # VS Code extension
├── desktop/          # Electron desktop app
├── mobile-app/       # React Native mobile app
└── docs/             # Documentation
```

### Running Locally

```bash
# Use local CLI during development
npm run build && mycmail inbox

# Watch mode for development
npm run dev

# Run the MCP server locally
cd mcp-server && npm run dev
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode (`"strict": true`)
- Prefer `const` over `let`, avoid `var`
- Use explicit types for function parameters and return values

### Style Guide

- Use 2-space indentation
- Use single quotes for strings
- Include trailing commas in multi-line arrays/objects
- Maximum line length: 100 characters

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `style:` — Formatting, no code change
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding or updating tests
- `chore:` — Build process or auxiliary tool changes

**Examples:**
```
feat(cli): add channel support
fix(crypto): handle empty key gracefully
docs: update MCP setup instructions
```

## Pull Request Process

1. **Fork & Branch** — Fork the repo and create a feature branch from `main`
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make Changes** — Write code, add tests, update documentation

3. **Test** — Run the test suite
   ```bash
   npm test
   npm run lint
   ```

4. **Commit** — Use conventional commit messages

5. **Push & PR** — Push your branch and open a Pull Request
   - Fill out the PR template completely
   - Link related issues
   - Request review

6. **Iterate** — Address feedback, update as needed

### PR Requirements

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions
- [ ] No sensitive data (keys, secrets) committed

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in `__tests__/` directories or use `.test.ts` suffix
- Use descriptive test names: `should encrypt message with recipient key`
- Mock external services (Supabase, file system)
- Test edge cases (empty inputs, missing keys, network failures)

## Security

Found a vulnerability? **Please don't open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure.

## Code of Conduct

We expect all contributors to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and constructive.

## Getting Help

- **GitHub Issues** — For bugs and feature requests
- **Email** — treebird@treebird.dev
- **Twitter/X** — [@treebird7](https://twitter.com/treebird7)

## Recognition

Contributors are recognized in release notes and the project's contributor list. Significant contributions may be highlighted in project announcements.

---

Thank you for helping make Myceliumail better! 🌲
