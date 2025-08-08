import { readFile, readdir } from 'fs/promises';
import { join, basename, extname, relative, resolve } from 'path';
import { minimatch } from 'minimatch';
import { parseFrontmatter } from '@/utils/frontmatter-parser';

export interface CursorRule {
  file: string;
  description: string;
  globs: string[];
  alwaysApply: boolean;
  content: string;
}

export class CursorRulesService {
  private rulesCache = new Map<string, CursorRule[]>();

  async loadRules(
    projectRoot?: string,
  ): Promise<{
    rules: CursorRule[];
    message: string;
    error?: boolean;
    fileErrors?: string[];
  }> {
    try {
      const rootDir = projectRoot || process.cwd();
      const rulesDir = join(rootDir, '.cursor', 'rules');

      let files;
      try {
        files = await readdir(rulesDir);
      } catch (error) {
        return {
          rules: [],
          message: `No .cursor/rules directory found at ${rulesDir}`,
          error: true,
        };
      }

      const mdcFiles = files.filter((file) => extname(file) === '.mdc');
      const rules: CursorRule[] = [];
      const fileErrors: string[] = [];

      for (const file of mdcFiles) {
        const filePath = join(rulesDir, file);
        try {
          const content = await readFile(filePath, 'utf-8');
          const { frontmatter, content: ruleContent } =
            parseFrontmatter(content);

          rules.push({
            file: file,
            description: frontmatter.description || 'No description',
            globs: Array.isArray(frontmatter.globs)
              ? frontmatter.globs
              : frontmatter.globs
                ? [frontmatter.globs]
                : [],
            alwaysApply: frontmatter.alwaysApply || false,
            content: ruleContent,
          });
        } catch (error) {
          fileErrors.push(
            `Error reading rule file ${file}: ${(error as Error).message}`,
          );
        }
      }

      this.rulesCache.set(rootDir, rules);

      let message = `Loaded ${rules.length} rule files from ${rulesDir}:\n\n${rules
        .map(
          (rule) =>
            `• ${rule.file}: ${rule.description}\n  Globs: ${rule.globs.join(', ')}\n  Always apply: ${rule.alwaysApply}`,
        )
        .join('\n\n')}`;

      if (fileErrors.length > 0) {
        message += `\n\nWarnings:\n${fileErrors.map((err) => `• ${err}`).join('\n')}`;
      }

      const result: {
        rules: CursorRule[];
        message: string;
        error?: boolean;
        fileErrors?: string[];
      } = { rules, message };
      if (fileErrors.length > 0) {
        result.fileErrors = fileErrors;
      }

      return result;
    } catch (error) {
      return {
        rules: [],
        message: `Error loading cursor rules: ${(error as Error).message}`,
        error: true,
      };
    }
  }

  async getRulesForFile(
    filePath: string,
    projectRoot?: string,
  ): Promise<{ rules: CursorRule[]; message: string; error?: boolean }> {
    try {
      const rootDir = projectRoot || process.cwd();

      if (!this.rulesCache.has(rootDir)) {
        await this.loadRules(rootDir);
      }

      const rules = this.rulesCache.get(rootDir) || [];

      if (rules.length === 0) {
        return {
          rules: [],
          message: 'No Cursor rules found. Run load_cursor_rules first.',
          error: true,
        };
      }

      const applicableRules: CursorRule[] = [];
      const relativePath = relative(rootDir, resolve(filePath));

      for (const rule of rules) {
        if (rule.alwaysApply) {
          applicableRules.push(rule);
          continue;
        }

        const globs = Array.isArray(rule.globs) ? rule.globs : [];
        for (const glob of globs) {
          if (
            minimatch(relativePath, glob) ||
            minimatch(basename(filePath), glob)
          ) {
            applicableRules.push(rule);
            break;
          }
        }
      }

      if (applicableRules.length === 0) {
        return {
          rules: [],
          message: `No Cursor rules apply to ${filePath} (${relativePath})`,
        };
      }

      const rulesText = applicableRules
        .map((rule) => {
          const header = `${rule.description} (${rule.file})`;
          const metadata = rule.alwaysApply
            ? 'Always applies'
            : `Applies to: ${rule.globs.join(', ')}`;
          return `## ${header}\n*${metadata}*\n\n${rule.content}`;
        })
        .join('\n\n---\n\n');

      return {
        rules: applicableRules,
        message: `Applicable Cursor rules for ${filePath}:\n\n${rulesText}`,
      };
    } catch (error) {
      return {
        rules: [],
        message: `Error getting cursor rules: ${(error as Error).message}`,
        error: true,
      };
    }
  }

  getCachedRules(projectRoot?: string): CursorRule[] {
    const rootDir = projectRoot || process.cwd();
    return this.rulesCache.get(rootDir) || [];
  }

  clearCache(projectRoot?: string): void {
    if (projectRoot) {
      this.rulesCache.delete(projectRoot);
    } else {
      this.rulesCache.clear();
    }
  }
}
