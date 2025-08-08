import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFile, access, constants } from 'fs/promises';
import { AgentsService } from './agents-service';

vi.mock('fs/promises');
vi.mock('@/utils/frontmatter-parser');

const mockReadFile = vi.mocked(readFile);
const mockAccess = vi.mocked(access);

import { parseFrontmatter } from '@/utils/frontmatter-parser';
const mockParseFrontmatter = vi.mocked(parseFrontmatter);

describe('AgentsService', () => {
  let service: AgentsService;
  const testProjectRoot = '/test/project';

  beforeEach(() => {
    service = new AgentsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('loadAgents', () => {
    it('should return error when AGENTS.md file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await service.loadAgents(testProjectRoot);

      expect(result.error).toBe(true);
      expect(result.agents).toBe(null);
      expect(result.message).toContain('No AGENTS.md file found');
      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringMatching(/[\/\\]test[\/\\]project[\/\\]AGENTS\.md$/),
        constants.F_OK,
      );
    });

    it('should successfully load AGENTS.md with frontmatter', async () => {
      const mockContent = 'Mock AGENTS.md content';

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(mockContent);
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {
          description: 'Project agent rules and guidelines',
          version: '1.0',
          author: 'Test Author',
        },
        content: 'These are the agent guidelines for the project.',
      });

      const result = await service.loadAgents(testProjectRoot);

      expect(result.error).toBeFalsy();
      expect(result.agents).toEqual({
        file: 'AGENTS.md',
        description: 'Project agent rules and guidelines',
        content: 'These are the agent guidelines for the project.',
        metadata: {
          description: 'Project agent rules and guidelines',
          version: '1.0',
          author: 'Test Author',
        },
      });
      expect(result.message).toMatch(
        /Loaded AGENTS\.md from.*[\/\\]test[\/\\]project[\/\\]AGENTS\.md/,
      );
      expect(result.message).toContain('Project agent rules and guidelines');
    });

    it('should handle AGENTS.md without frontmatter', async () => {
      const mockContent = 'Plain AGENTS.md content without frontmatter';

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(mockContent);
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: mockContent,
      });

      const result = await service.loadAgents(testProjectRoot);

      expect(result.error).toBeFalsy();
      expect(result.agents).toEqual({
        file: 'AGENTS.md',
        description: 'Agent rules and guidelines',
        content: mockContent,
        metadata: {},
      });
    });

    it('should cache agents by project root', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: { description: 'Test agents' },
        content: 'content',
      });

      await service.loadAgents(testProjectRoot);
      const cachedAgents = service.getCachedAgents(testProjectRoot);

      expect(cachedAgents).toBeDefined();
      expect(cachedAgents?.file).toBe('AGENTS.md');
      expect(cachedAgents?.description).toBe('Test agents');
    });

    it('should handle read errors gracefully', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      const result = await service.loadAgents(testProjectRoot);

      expect(result.error).toBe(true);
      expect(result.message).toContain(
        'Error loading AGENTS.md: Permission denied',
      );
    });

    it('should use current working directory when no project root provided', async () => {
      const currentDir = process.cwd();

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: 'content',
      });

      await service.loadAgents();

      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringContaining('AGENTS.md'),
        constants.F_OK,
      );
    });
  });

  describe('getAgents', () => {
    beforeEach(async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('Test agent content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {
          description: 'Test agent rules',
          version: '2.0',
        },
        content:
          'These are test agent guidelines with **markdown** formatting.',
      });

      await service.loadAgents(testProjectRoot);
    });

    it('should return cached agents with formatted message', async () => {
      const result = await service.getAgents(testProjectRoot);

      expect(result.error).toBeFalsy();
      expect(result.agents).toBeDefined();
      expect(result.agents?.description).toBe('Test agent rules');
      expect(result.message).toContain('AGENTS.md content:');
      expect(result.message).toContain('## Test agent rules');
      expect(result.message).toContain('These are test agent guidelines');
    });

    it('should load agents automatically if not cached', async () => {
      service.clearCache();

      // Reset mocks for the second load
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('Auto-loaded content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {
          description: 'Auto-loaded agents',
        },
        content: 'Auto-loaded agent content',
      });

      const result = await service.getAgents(testProjectRoot);

      expect(result.error).toBeFalsy();
      expect(result.agents?.description).toBe('Auto-loaded agents');
      expect(result.message).toContain('Auto-loaded agent content');
    });

    it('should return error when loading fails and no cache exists', async () => {
      service.clearCache();

      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await service.getAgents(testProjectRoot);

      expect(result.error).toBe(true);
      expect(result.agents).toBeNull();
      expect(result.message).toContain('No AGENTS.md file found');
    });

    it('should return error when loading fails and no cache exists', async () => {
      const emptyService = new AgentsService();
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await emptyService.getAgents('/nonexistent/project');

      expect(result.error).toBe(true);
      expect(result.agents).toBeNull();
      expect(result.message).toContain('No AGENTS.md file found');
    });

    it('should handle errors gracefully', async () => {
      // Mock process.cwd() to throw an error to simulate an error in getAgents
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockImplementation(() => {
        throw new Error('Cannot get current directory');
      });

      const result = await service.getAgents();

      expect(result.error).toBe(true);
      expect(result.message).toContain('Error getting AGENTS.md:');

      // Restore original cwd
      process.cwd = originalCwd;
    });

    it('should use current working directory when no project root provided', async () => {
      const result = await service.getAgents();

      expect(result.error).toBeFalsy();
      expect(result.agents).toBeDefined();
    });
  });

  describe('getCachedAgents', () => {
    it('should return null when no agents are cached', () => {
      const agents = service.getCachedAgents(testProjectRoot);
      expect(agents).toBeNull();
    });

    it('should return cached agents', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: { description: 'Cached agents' },
        content: 'content',
      });

      await service.loadAgents(testProjectRoot);
      const agents = service.getCachedAgents(testProjectRoot);

      expect(agents).toBeDefined();
      expect(agents?.description).toBe('Cached agents');
    });

    it('should return agents for different project roots independently', async () => {
      const project1 = '/project1';
      const project2 = '/project2';

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2');
      mockParseFrontmatter
        .mockReturnValueOnce({
          frontmatter: { description: 'Project 1 agents' },
          content: 'content1',
        })
        .mockReturnValueOnce({
          frontmatter: { description: 'Project 2 agents' },
          content: 'content2',
        });

      await service.loadAgents(project1);
      await service.loadAgents(project2);

      const agents1 = service.getCachedAgents(project1);
      const agents2 = service.getCachedAgents(project2);

      expect(agents1?.description).toBe('Project 1 agents');
      expect(agents2?.description).toBe('Project 2 agents');
    });
  });

  describe('clearCache', () => {
    it('should clear specific project cache', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: 'content',
      });

      await service.loadAgents(testProjectRoot);
      expect(service.getCachedAgents(testProjectRoot)).toBeDefined();

      service.clearCache(testProjectRoot);
      expect(service.getCachedAgents(testProjectRoot)).toBeNull();
    });

    it('should clear all cache when no project root specified', async () => {
      const project1 = '/project1';
      const project2 = '/project2';

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: 'content',
      });

      await service.loadAgents(project1);
      await service.loadAgents(project2);

      service.clearCache();

      expect(service.getCachedAgents(project1)).toBeNull();
      expect(service.getCachedAgents(project2)).toBeNull();
    });

    it('should only clear specified project cache and leave others', async () => {
      const project1 = '/project1';
      const project2 = '/project2';

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: { description: 'Test' },
        content: 'content',
      });

      await service.loadAgents(project1);
      await service.loadAgents(project2);

      service.clearCache(project1);

      expect(service.getCachedAgents(project1)).toBeNull();
      expect(service.getCachedAgents(project2)).toBeDefined();
    });
  });
});
