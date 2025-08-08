export interface ParsedFrontmatter {
  frontmatter: Record<string, any>;
  content: string;
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    return { frontmatter: {}, content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, content };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const bodyContent = lines
    .slice(endIndex + 1)
    .join('\n')
    .trim();

  const frontmatter: Record<string, any> = {};
  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: any = line.slice(colonIndex + 1).trim();

    // Handle arrays (globs) - much more robust parsing
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        // Use JSON.parse for proper array parsing
        value = JSON.parse(value);
        // Ensure it's an array
        if (!Array.isArray(value)) {
          value = [value.toString()];
        }
      } catch (e) {
        // Fallback to manual parsing
        try {
          value = value
            .slice(1, -1)
            .split(',')
            .map((item: string) => item.trim().replace(/^["']|["']$/g, ''))
            .filter((item: string) => item.length > 0);
        } catch (e2) {
          // If all parsing fails, make it an empty array
          value = [];
        }
      }
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }

    frontmatter[key] = value;
  }

  return { frontmatter, content: bodyContent };
}
