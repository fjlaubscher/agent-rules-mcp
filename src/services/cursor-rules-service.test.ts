import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { readFile, readdir } from 'fs/promises';
import { CursorRulesService } from './cursor-rules-service';

vi.mock('fs/promises');
vi.mock('@/utils/frontmatter-parser');

const mockReadFile = vi.mocked(readFile);
const mockReaddir = vi.mocked(readdir);

import { parseFrontmatter } from '@/utils/frontmatter-parser';
const mockParseFrontmatter = vi.mocked(parseFrontmatter);

describe('CursorRulesService', () => {
  let service: CursorRulesService;
  const testProjectRoot = '/test/project';

  beforeEach(() => {
    service = new CursorRulesService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('loadRules', () => {
    it('should return error when .cursor/rules directory does not exist', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const result = await service.loadRules(testProjectRoot);

      expect(result.error).toBe(true);
      expect(result.rules).toEqual([]);
      expect(result.message).toContain('No .cursor/rules directory found');
    });

    it('should successfully load valid rule files', async () => {
      const mockFiles = ['rule1.mdc', 'rule2.mdc', 'ignored.txt'];
      const mockContent1 = 'Mock content 1';
      const mockContent2 = 'Mock content 2';

      mockReaddir.mockResolvedValue(mockFiles as any);
      mockReadFile
        .mockResolvedValueOnce(mockContent1)
        .mockResolvedValueOnce(mockContent2);

      mockParseFrontmatter
        .mockReturnValueOnce({
          frontmatter: {
            description: 'TypeScript rules',
            globs: ['*.ts', '*.tsx'],
            alwaysApply: false,
          },
          content: 'TypeScript specific rules',
        })
        .mockReturnValueOnce({
          frontmatter: {
            description: 'Global rules',
            globs: [],
            alwaysApply: true,
          },
          content: 'Always apply these rules',
        });

      const result = await service.loadRules(testProjectRoot);

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(2);
      expect(result.rules[0]).toEqual({
        file: 'rule1.mdc',
        description: 'TypeScript rules',
        globs: ['*.ts', '*.tsx'],
        alwaysApply: false,
        content: 'TypeScript specific rules',
      });
      expect(result.rules[1]).toEqual({
        file: 'rule2.mdc',
        description: 'Global rules',
        globs: [],
        alwaysApply: true,
        content: 'Always apply these rules',
      });
      expect(result.message).toContain('Loaded 2 rule files');
    });

    it('should handle files without frontmatter gracefully', async () => {
      const mockFiles = ['simple.mdc'];
      const mockContent = 'Simple rule content';

      mockReaddir.mockResolvedValue(mockFiles as any);
      mockReadFile.mockResolvedValue(mockContent);
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: 'Simple rule content',
      });

      const result = await service.loadRules(testProjectRoot);

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toEqual({
        file: 'simple.mdc',
        description: 'No description',
        globs: [],
        alwaysApply: false,
        content: 'Simple rule content',
      });
    });

    it('should handle string globs by converting to array', async () => {
      const mockFiles = ['rule.mdc'];
      mockReaddir.mockResolvedValue(mockFiles as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {
          globs: '*.js',
          description: 'JS rules',
        },
        content: 'JS content',
      });

      const result = await service.loadRules(testProjectRoot);

      expect(result.rules[0].globs).toEqual(['*.js']);
    });

    it('should skip files that fail to read and continue with others', async () => {
      const mockFiles = ['good.mdc', 'bad.mdc', 'another.mdc'];

      mockReaddir.mockResolvedValue(mockFiles as any);
      mockReadFile
        .mockResolvedValueOnce('good content')
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce('another content');

      mockParseFrontmatter
        .mockReturnValueOnce({
          frontmatter: { description: 'Good rule' },
          content: 'good content',
        })
        .mockReturnValueOnce({
          frontmatter: { description: 'Another rule' },
          content: 'another content',
        });

      const result = await service.loadRules(testProjectRoot);

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(2);
      expect(result.fileErrors).toHaveLength(1);
      expect(result.fileErrors?.[0]).toContain(
        'Error reading rule file bad.mdc: Permission denied',
      );
      expect(result.message).toContain('Warnings:');
    });

    it('should cache rules by project root', async () => {
      const mockFiles = ['rule.mdc'];
      mockReaddir.mockResolvedValue(mockFiles as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: 'content',
      });

      await service.loadRules(testProjectRoot);
      const cachedRules = service.getCachedRules(testProjectRoot);

      expect(cachedRules).toHaveLength(1);
      expect(cachedRules[0].file).toBe('rule.mdc');
    });

    it('should handle general errors gracefully', async () => {
      // Mock readdir to return files, but then throw an error during processing
      mockReaddir.mockResolvedValue(['rule.mdc'] as any);
      mockReadFile.mockRejectedValue(new Error('Unexpected error'));

      const result = await service.loadRules(testProjectRoot);

      expect(result.error).toBeFalsy(); // Service continues even if individual files fail
      expect(result.rules).toHaveLength(0); // No rules loaded due to file errors
    });
  });

  describe('getRulesForFile', () => {
    beforeEach(async () => {
      const mockFiles = ['typescript.mdc', 'global.mdc', 'react.mdc'];
      mockReaddir.mockResolvedValue(mockFiles as any);
      mockReadFile
        .mockResolvedValueOnce('ts content')
        .mockResolvedValueOnce('global content')
        .mockResolvedValueOnce('react content');

      mockParseFrontmatter
        .mockReturnValueOnce({
          frontmatter: {
            description: 'TypeScript rules',
            globs: ['*.ts', '*.tsx'],
            alwaysApply: false,
          },
          content: 'TypeScript specific rules',
        })
        .mockReturnValueOnce({
          frontmatter: {
            description: 'Global rules',
            globs: [],
            alwaysApply: true,
          },
          content: 'Always apply these rules',
        })
        .mockReturnValueOnce({
          frontmatter: {
            description: 'React rules',
            globs: ['**/components/**/*.tsx', '**/pages/**/*.tsx'],
            alwaysApply: false,
          },
          content: 'React component rules',
        });

      await service.loadRules(testProjectRoot);
    });

    it('should return rules that always apply', async () => {
      const result = await service.getRulesForFile(
        '/test/project/src/utils/helper.js',
        testProjectRoot,
      );

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].description).toBe('Global rules');
      expect(result.message).toContain('Applicable Cursor rules');
    });

    it('should return rules matching file extension glob', async () => {
      const result = await service.getRulesForFile(
        '/test/project/src/component.tsx',
        testProjectRoot,
      );

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(2); // TypeScript + Global rules
      expect(
        result.rules.some((r) => r.description === 'TypeScript rules'),
      ).toBe(true);
      expect(result.rules.some((r) => r.description === 'Global rules')).toBe(
        true,
      );
    });

    it('should return rules matching path glob patterns', async () => {
      const result = await service.getRulesForFile(
        '/test/project/src/components/Button.tsx',
        testProjectRoot,
      );

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(3); // All rules match
      expect(result.rules.some((r) => r.description === 'React rules')).toBe(
        true,
      );
    });

    it('should return only global rules when no specific patterns match', async () => {
      const result = await service.getRulesForFile(
        '/test/project/src/styles.css',
        testProjectRoot,
      );

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].description).toBe('Global rules');
    });

    it('should load rules automatically if not cached', async () => {
      service.clearCache();

      // Reset mocks for the second load
      mockReaddir.mockResolvedValue(['rule.mdc'] as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {
          description: 'Auto-loaded rule',
          alwaysApply: true,
        },
        content: 'content',
      });

      const result = await service.getRulesForFile(
        '/test/file.js',
        testProjectRoot,
      );

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].description).toBe('Auto-loaded rule');
    });

    it('should return error when no rules are cached and loading fails', async () => {
      service.clearCache();
      mockReaddir.mockRejectedValue(new Error('No directory'));

      const result = await service.getRulesForFile(
        '/test/file.js',
        testProjectRoot,
      );

      expect(result.error).toBe(true);
      expect(result.message).toContain(
        'No Cursor rules found. Run load_cursor_rules first.',
      );
    });

    it('should handle no applicable rules gracefully', async () => {
      service.clearCache();

      mockReaddir.mockResolvedValue(['specific.mdc'] as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {
          description: 'Specific rule',
          globs: ['*.very-specific-extension'],
          alwaysApply: false,
        },
        content: 'content',
      });

      const result = await service.getRulesForFile(
        '/test/file.js',
        testProjectRoot,
      );

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(0);
      expect(result.message).toContain('No Cursor rules apply to');
    });

    it('should handle errors gracefully', async () => {
      // Mock process.cwd() to throw an error
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockImplementation(() => {
        throw new Error('Cannot get current directory');
      });

      const result = await service.getRulesForFile('/test/file.js');

      expect(result.error).toBe(true);
      expect(result.message).toContain('Error getting cursor rules:');

      // Restore original cwd
      process.cwd = originalCwd;
    });

    it('should match basename for simple glob patterns', async () => {
      service.clearCache();

      mockReaddir.mockResolvedValue(['package-json.mdc'] as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {
          description: 'Package.json rule',
          globs: ['package.json'],
          alwaysApply: false,
        },
        content: 'Package.json specific rules',
      });

      const result = await service.getRulesForFile(
        '/test/project/package.json',
        testProjectRoot,
      );

      expect(result.error).toBeFalsy();
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].description).toBe('Package.json rule');
    });
  });

  describe('getCachedRules', () => {
    it('should return empty array when no rules are cached', () => {
      const rules = service.getCachedRules(testProjectRoot);
      expect(rules).toEqual([]);
    });

    it('should return cached rules', async () => {
      mockReaddir.mockResolvedValue(['rule.mdc'] as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: { description: 'Test rule' },
        content: 'content',
      });

      await service.loadRules(testProjectRoot);
      const rules = service.getCachedRules(testProjectRoot);

      expect(rules).toHaveLength(1);
      expect(rules[0].description).toBe('Test rule');
    });
  });

  describe('clearCache', () => {
    it('should clear specific project cache', async () => {
      mockReaddir.mockResolvedValue(['rule.mdc'] as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: 'content',
      });

      await service.loadRules(testProjectRoot);
      expect(service.getCachedRules(testProjectRoot)).toHaveLength(1);

      service.clearCache(testProjectRoot);
      expect(service.getCachedRules(testProjectRoot)).toEqual([]);
    });

    it('should clear all cache when no project root specified', async () => {
      mockReaddir.mockResolvedValue(['rule.mdc'] as any);
      mockReadFile.mockResolvedValue('content');
      mockParseFrontmatter.mockReturnValue({
        frontmatter: {},
        content: 'content',
      });

      await service.loadRules(testProjectRoot);
      await service.loadRules('/other/project');

      service.clearCache();

      expect(service.getCachedRules(testProjectRoot)).toEqual([]);
      expect(service.getCachedRules('/other/project')).toEqual([]);
    });
  });
});
