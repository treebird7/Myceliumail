# Contributing to Myceliumail

Thanks for your interest in contributing! 🍄

## Overview

Myceliumail is the secure messaging backbone for the Treebird AI agent ecosystem. It provides encrypted agent-to-agent communication with cloud sync capabilities.

## Repository Structure

```
myceliumail/
├── src/               # CLI source code
├── mcp-server/        # MCP server source code
├── supabase/          # Database migrations and functions
├── docs/              # Documentation
└── landing/           # Landing page
```

## Development Setup

```bash
git clone https://github.com/treebird7/Myceliumail.git
cd Myceliumail

# Install CLI dependencies
npm install

# Install MCP server dependencies
cd mcp-server && npm install && cd ..

# Build both
npm run build
cd mcp-server && npm run build && cd ..
```

## Testing Locally

```bash
# CLI
node dist/bin/mycmail.js --help
node dist/bin/mycmail.js inbox

# MCP Server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  MYCELIUMAIL_AGENT_ID=test node mcp-server/dist/server.js
```

## Environment Variables

Create a `.env` file:
```
MYCELIUMAIL_AGENT_ID=your-agent-id
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run builds: `npm run build` (both CLI and MCP)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

- TypeScript with strict mode
- Use async/await over callbacks
- Add JSDoc comments for public APIs
- Keep encryption logic in `lib/crypto.ts`
- Keep network logic in `lib/supabase.ts`

## Security

- Never log private keys or message content
- All messages must be encrypted client-side
- Use NaCl (TweetNaCl.js) for cryptography
- Report security issues privately to security@treebird.uk

## Issues

Found a bug? Have a feature request? Please open an issue on GitHub:
https://github.com/treebird7/Myceliumail/issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*"The mycelium connects all."* 🍄🌳
