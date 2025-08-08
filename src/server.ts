#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types';
import { CursorRulesService } from '@/services/cursor-rules-service';
import { AgentsService } from '@/services/agents-service';

interface ToolArgs {
  projectRoot?: string;
  filePath?: string;
}

export class AgentRulesMCPServer {
  private server: Server;
  private cursorRulesService: CursorRulesService;
  private agentsService: AgentsService;

  constructor() {
    this.server = new Server(
      {
        name: 'agent-rules',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cursorRulesService = new CursorRulesService();
    this.agentsService = new AgentsService();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('ListTools request received');
      const tools = [
        {
          name: 'get_cursor_rules',
          description: 'Get applicable Cursor rules for a specific file or directory',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file to get rules for',
              },
              projectRoot: {
                type: 'string',
                description: 'Root directory of the project (optional, defaults to current directory)',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'load_cursor_rules',
          description: 'Load and cache all Cursor rules from .cursor/rules directory',
          inputSchema: {
            type: 'object',
            properties: {
              projectRoot: {
                type: 'string',
                description: 'Root directory of the project (optional, defaults to current directory)',
              },
            },
          },
        },
        {
          name: 'list_cursor_rules',
          description: 'List all available Cursor rules files',
          inputSchema: {
            type: 'object',
            properties: {
              projectRoot: {
                type: 'string',
                description: 'Root directory of the project (optional, defaults to current directory)',
              },
            },
          },
        },
        {
          name: 'get_agents',
          description: 'Get AGENTS.md content for the current project',
          inputSchema: {
            type: 'object',
            properties: {
              projectRoot: {
                type: 'string',
                description: 'Root directory of the project (optional, defaults to current directory)',
              },
            },
          },
        },
        {
          name: 'load_agents',
          description: 'Load and cache AGENTS.md file from project root',
          inputSchema: {
            type: 'object',
            properties: {
              projectRoot: {
                type: 'string',
                description: 'Root directory of the project (optional, defaults to current directory)',
              },
            },
          },
        },
      ];
      
      console.error('Returning tools:', JSON.stringify(tools, null, 2));
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolArgs = args as ToolArgs;

      switch (name) {
        case 'load_cursor_rules':
          return this.handleLoadCursorRules(toolArgs?.projectRoot);
        
        case 'get_cursor_rules':
          return this.handleGetCursorRules(toolArgs?.filePath, toolArgs?.projectRoot);
        
        case 'list_cursor_rules':
          return this.handleListCursorRules(toolArgs?.projectRoot);

        case 'load_agents':
          return this.handleLoadAgents(toolArgs?.projectRoot);
        
        case 'get_agents':
          return this.handleGetAgents(toolArgs?.projectRoot);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleLoadCursorRules(projectRoot?: string) {
    const result = await this.cursorRulesService.loadRules(projectRoot);
    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
      isError: result.error,
    };
  }

  private async handleGetCursorRules(filePath?: string, projectRoot?: string) {
    if (!filePath) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: filePath is required',
          },
        ],
        isError: true,
      };
    }

    const result = await this.cursorRulesService.getRulesForFile(filePath, projectRoot);
    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
      isError: result.error,
    };
  }

  private async handleListCursorRules(projectRoot?: string) {
    const rules = this.cursorRulesService.getCachedRules(projectRoot);
    
    if (rules.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No Cursor rules found. Run load_cursor_rules first.',
          },
        ],
      };
    }

    const rulesList = rules
      .map(rule => `**${rule.file}**\n${rule.description}\nGlobs: ${rule.globs.join(', ')}\nAlways apply: ${rule.alwaysApply}`)
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available Cursor Rules:\n\n${rulesList}`,
        },
      ],
    };
  }

  private async handleLoadAgents(projectRoot?: string) {
    const result = await this.agentsService.loadAgents(projectRoot);
    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
      isError: result.error,
    };
  }

  private async handleGetAgents(projectRoot?: string) {
    const result = await this.agentsService.getAgents(projectRoot);
    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
      isError: result.error,
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Agent Rules MCP server running on stdio');
  }
}

const server = new AgentRulesMCPServer();
server.run().catch(console.error);