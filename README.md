# Agent Rules MCP Server

A Model Context Protocol (MCP) server that provides tools for retrieving and managing Cursor rules and AGENTS.md files. This server enables seamless integration with Claude Code to access project-specific coding guidelines and agent instructions.

## Features

This MCP server provides the following tools:

- **`load_cursor_rules`** - Load and cache all Cursor rules from `.cursor/rules` directory
- **`get_cursor_rules`** - Get applicable Cursor rules for a specific file path
- **`list_cursor_rules`** - List all available Cursor rules files
- **`load_agents`** - Load and cache AGENTS.md file from project root
- **`get_agents`** - Get AGENTS.md content for the current project

## Setup with Claude Code

### Prerequisites

- Node.js 22 or later
- pnpm package manager
- Claude Code CLI

### Installation

1. **Clone and build the server:**

   ```bash
   git clone <repository-url>
   cd agent-rules-mcp
   pnpm install
   pnpm build
   ```

2. **Configure Claude Code MCP settings:**

   Add the server to your Claude Code configuration file (`~/.config/claude-code/mcp-settings.json` on Linux/macOS or `%APPDATA%\claude-code\mcp-settings.json` on Windows):

   ```json
   {
     "mcpServers": {
       "agent-rules": {
         "command": "node",
         "args": ["/path/to/agent-rules-mcp/dist/index.js"]
       }
     }
   }
   ```

   Replace `/path/to/agent-rules-mcp` with the actual path to this repository.

3. **Restart Claude Code** to load the MCP server.

### Usage

Once configured, the server will automatically be available in Claude Code. The server provides access to:

#### Cursor Rules (`.cursor/rules/*.mdc`)

Create Cursor rule files in your project's `.cursor/rules/` directory with frontmatter metadata:

```markdown
---
description: "TypeScript coding standards"
globs: ["*.ts", "*.tsx"]
alwaysApply: false
---

Your TypeScript coding rules and guidelines here...
```

#### AGENTS.md Files

Create an `AGENTS.md` file in your project root with agent instructions:

```markdown
---
description: "Project-specific agent guidelines"
version: "1.0"
---

# Project Agent Rules

Your agent-specific instructions and guidelines here...
```

### Available Commands

- `pnpm build` – Compiles TypeScript to JavaScript for the MCP server
- `pnpm start` – Runs the compiled MCP server (used by Claude Code)
- `pnpm test` – Executes tests using Vitest
- `pnpm format` – Formats code using Prettier

## Architecture

The server follows a service-oriented architecture:

- **AgentRulesMCPServer** (`src/server.ts`) - Main MCP server handling tool registration and requests
- **CursorRulesService** (`src/services/cursor-rules-service.ts`) - Manages Cursor rules with glob pattern matching
- **AgentsService** (`src/services/agents-service.ts`) - Handles AGENTS.md file loading and caching
- **frontmatter-parser** (`src/utils/frontmatter-parser.ts`) - YAML frontmatter parsing utility

## Development

### Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Run tests:**
   ```bash
   pnpm test
   ```

3. **Format code:**
   ```bash
   pnpm format
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

### Technology Stack

- **TypeScript** - Type-safe development
- **Model Context Protocol SDK** - MCP server implementation
- **Vitest** - Fast testing framework
- **Prettier** - Code formatting

## Project Structure

```
agent-rules-mcp/
├── src/
│   ├── server.ts              # Main MCP server implementation
│   ├── index.ts               # Server entry point
│   ├── services/
│   │   ├── cursor-rules-service.ts    # Cursor rules management
│   │   └── agents-service.ts          # AGENTS.md file management
│   └── utils/
│       └── frontmatter-parser.ts      # YAML frontmatter parsing
├── dist/                      # Compiled JavaScript output
├── .github/workflows/         # CI/CD workflows
├── CLAUDE.md                  # Claude Code project instructions
├── README.md                  # This file
└── package.json              # Project configuration
```

## Error Handling

The server implements production-ready error handling:

- **Structured Error Reporting** - Errors are returned as structured data rather than logged to console
- **Graceful Degradation** - Individual file errors don't prevent processing of other files
- **Detailed Error Messages** - Clear, actionable error messages for debugging
- **Type Safety** - Consistent null handling and proper TypeScript types

## Contributing

Contributions are welcome! Please ensure all tests pass and code is properly formatted:

```bash
pnpm test
pnpm format
```

## License

This project is open source and available under the terms specified in the LICENSE file.
