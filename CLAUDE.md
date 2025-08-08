# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides tools for retrieving and managing Cursor rules and AGENTS.md files. The server exposes several tools that can be used to load, list, and get applicable rules for specific files.

## Architecture

The project follows a service-oriented architecture:

- **AgentRulesMCPServer** (`src/server.ts`): Main MCP server class that handles tool registration and requests
- **CursorRulesService** (`src/services/cursor-rules-service.ts`): Manages loading and filtering of `.cursor/rules/*.mdc` files
- **AgentsService** (`src/services/agents-service.ts`): Manages loading of `AGENTS.md` files
- **frontmatter-parser** (`src/utils/frontmatter-parser.ts`): Utility for parsing YAML frontmatter from markdown files

## Available MCP Tools

The server provides these tools:
- `load_cursor_rules` - Load and cache all Cursor rules from `.cursor/rules` directory
- `get_cursor_rules` - Get applicable Cursor rules for a specific file path
- `list_cursor_rules` - List all available Cursor rules files
- `load_agents` - Load and cache AGENTS.md file from project root
- `get_agents` - Get AGENTS.md content for the current project

## Commands

- **Build**: `pnpm build` - Compiles TypeScript to JavaScript in `dist/` folder
- **Start**: `pnpm start` - Runs the compiled server from `dist/index.js`
- **Test**: `pnpm test` - Runs tests using Vitest
- **Format**: `pnpm format` - Formats code using Prettier

## TypeScript Configuration

The project uses:
- Path aliases with `@/*` mapping to `src/*`
- ES2022 target and modules
- Custom path resolution via `ts-paths-loader.mjs` for runtime execution

## Development Notes

- The server runs on stdio transport for MCP communication
- All services implement caching with project root as the cache key
- Cursor rules use glob patterns for file matching and support frontmatter metadata
- The frontmatter parser handles arrays, booleans, and strings from YAML-like syntax