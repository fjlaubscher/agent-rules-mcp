# Agent Rules MCP Server

A Model Context Protocol (MCP) server that provides Claude Code access to project-specific Cursor rules and AGENTS.md files.

## Features

- Load and filter Cursor rules from `.cursor/rules/*.mdc` files
- Access AGENTS.md project instructions
- Smart file matching with glob patterns
- Automatic caching for performance

## Installation

**Prerequisites:** Node.js 22+ and Claude Code CLI

### Option 1: Project-Level (Recommended)

```bash
npm install -D @fjlaubscher/agent-rules-mcp
```

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "agent-rules": {
      "command": "node",
      "args": ["./node_modules/@fjlaubscher/agent-rules-mcp/dist/index.js"]
    }
  }
}
```

### Option 2: Global Configuration

Add to Claude Code's `mcp-settings.json`:

```json
{
  "mcpServers": {
    "agent-rules": {
      "command": "npx",
      "args": ["@fjlaubscher/agent-rules-mcp"]
    }
  }
}
```

**Note:** Restart Claude Code after configuration changes.

## Usage

The server automatically detects and provides access to existing project conventions:

- **Cursor Rules**: If you have `.cursor/rules/*.mdc` files, they'll be available with glob pattern matching
- **AGENTS.md**: If you have `AGENTS.md` files (at project root or directory level), they'll be accessible

### Adding MCP Tools to Your CLAUDE.md

To help Claude Code use these tools automatically, add this to your project's `CLAUDE.md`:

```markdown
## Available MCP Tools

- Use `load_cursor_rules` and `get_cursor_rules` for Cursor rules (if present)
- Use `get_agents` for AGENTS.md instructions (searches current directory up to project root)
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests  
pnpm test

# Build for production
pnpm build
```

## Contributing

Contributions welcome! Ensure tests pass and code is formatted:

```bash
pnpm test && pnpm format
```
