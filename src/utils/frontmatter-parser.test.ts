import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from './frontmatter-parser';

describe('frontmatter-parser', () => {
  describe('parseFrontmatter', () => {
    it('should parse content without frontmatter', () => {
      const content = 'This is plain content without frontmatter';
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(content);
    });

    it('should parse content with empty frontmatter', () => {
      const content = '---\n---\nThis is the body content';
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe('This is the body content');
    });

    it('should parse content with simple frontmatter properties', () => {
      const content = `---
description: Test description
title: Test title
---
This is the body content`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        description: 'Test description',
        title: 'Test title'
      });
      expect(result.content).toBe('This is the body content');
    });

    it('should parse boolean values correctly', () => {
      const content = `---
alwaysApply: true
enabled: false
---
Body content`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        alwaysApply: true,
        enabled: false
      });
    });

    it('should parse arrays using JSON syntax', () => {
      const content = `---
globs: ["*.ts", "*.js", "src/**/*.tsx"]
tags: ["javascript", "typescript"]
---
Body content`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        globs: ['*.ts', '*.js', 'src/**/*.tsx'],
        tags: ['javascript', 'typescript']
      });
    });

    it('should handle malformed arrays with fallback parsing', () => {
      const content = `---
globs: [*.ts, *.js, src/**/*.tsx]
---
Body content`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter.globs).toEqual(['*.ts', '*.js', 'src/**/*.tsx']);
    });

    it('should handle arrays with quotes in fallback parsing', () => {
      const content = `---
globs: ["*.ts", '*.js', src/**/*.tsx]
---
Body content`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter.globs).toEqual(['*.ts', '*.js', 'src/**/*.tsx']);
    });

    it('should handle invalid array syntax gracefully', () => {
      const content = `---
globs: [invalid array syntax]
---
Body content`;
      
      const result = parseFrontmatter(content);
      
      // The parser should handle this as a fallback array with the content
      expect(result.frontmatter.globs).toEqual(['invalid array syntax']);
    });


    it('should handle content without closing frontmatter delimiter', () => {
      const content = `---
description: Test
This is content without closing delimiter`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(content);
    });

    it('should handle mixed property types', () => {
      const content = `---
description: Mixed content rule
globs: ["*.ts", "*.js"]
alwaysApply: true
priority: 1
nested: ["value1", "value2"]
---
This is the rule content with **markdown** formatting.

- Item 1
- Item 2`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        description: 'Mixed content rule',
        globs: ['*.ts', '*.js'],
        alwaysApply: true,
        priority: '1',
        nested: ['value1', 'value2']
      });
      expect(result.content).toContain('This is the rule content');
      expect(result.content).toContain('- Item 1');
    });

    it('should ignore lines without colon separator', () => {
      const content = `---
description: Valid property
invalid line without colon
globs: ["*.ts"]
---
Body content`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        description: 'Valid property',
        globs: ['*.ts']
      });
    });

    it('should trim whitespace from keys and values', () => {
      const content = `---
  description  :   Test with spaces   
  globs   : ["*.ts", "*.js"]  
---
Body content`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        description: 'Test with spaces',
        globs: ['*.ts', '*.js']
      });
    });

    it('should handle empty body content', () => {
      const content = `---
description: Test
---`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        description: 'Test'
      });
      expect(result.content).toBe('');
    });

    it('should handle body content with multiple newlines', () => {
      const content = `---
description: Test
---


This content has multiple leading newlines`;
      
      const result = parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({
        description: 'Test'
      });
      expect(result.content).toBe('This content has multiple leading newlines');
    });
  });
});