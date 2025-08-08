import { readFile, access, constants } from 'fs/promises';
import { join } from 'path';
import { parseFrontmatter } from '@/utils/frontmatter-parser';

export interface AgentRule {
  file: string;
  description: string;
  content: string;
  metadata: Record<string, any>;
}

export class AgentsService {
  private agentsCache = new Map<string, AgentRule>();

  async loadAgents(
    projectRoot?: string,
  ): Promise<{ agents: AgentRule | null; message: string; error?: boolean }> {
    try {
      const rootDir = projectRoot || process.cwd();
      const agentsPath = join(rootDir, 'AGENTS.md');

      try {
        await access(agentsPath, constants.F_OK);
      } catch (error) {
        return {
          agents: null,
          message: `No AGENTS.md file found at ${agentsPath}`,
          error: true,
        };
      }

      const content = await readFile(agentsPath, 'utf-8');
      const { frontmatter, content: agentContent } = parseFrontmatter(content);

      const agent: AgentRule = {
        file: 'AGENTS.md',
        description: frontmatter.description || 'Agent rules and guidelines',
        content: agentContent,
        metadata: frontmatter,
      };

      this.agentsCache.set(rootDir, agent);

      const message = `Loaded AGENTS.md from ${agentsPath}:\n\n• ${agent.description}`;

      return { agents: agent, message };
    } catch (error) {
      return {
        agents: null,
        message: `Error loading AGENTS.md: ${(error as Error).message}`,
        error: true,
      };
    }
  }

  async getAgents(
    projectRoot?: string,
  ): Promise<{ agents: AgentRule | null; message: string; error?: boolean }> {
    try {
      const rootDir = projectRoot || process.cwd();

      if (!this.agentsCache.has(rootDir)) {
        const result = await this.loadAgents(rootDir);
        if (result.error) {
          return {
            agents: null,
            message: result.message,
            error: true,
          };
        }
      }

      const agents = this.agentsCache.get(rootDir);

      if (!agents) {
        return {
          agents: null,
          message: 'No AGENTS.md found. Run load_agents first.',
          error: true,
        };
      }

      const agentsText = `## ${agents.description}\n\n${agents.content}`;

      return {
        agents,
        message: `AGENTS.md content:\n\n${agentsText}`,
      };
    } catch (error) {
      return {
        agents: null,
        message: `Error getting AGENTS.md: ${(error as Error).message}`,
        error: true,
      };
    }
  }

  getCachedAgents(projectRoot?: string): AgentRule | null {
    const rootDir = projectRoot || process.cwd();
    return this.agentsCache.get(rootDir) || null;
  }

  clearCache(projectRoot?: string): void {
    if (projectRoot) {
      this.agentsCache.delete(projectRoot);
    } else {
      this.agentsCache.clear();
    }
  }
}
