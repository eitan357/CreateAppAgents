'use strict';

const fs = require('fs');
const path = require('path');

// Deep merge two plain objects. Arrays are union-merged (no duplicates).
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const tv = result[key];
    const sv = source[key];
    if (tv && sv && typeof tv === 'object' && typeof sv === 'object' && !Array.isArray(tv) && !Array.isArray(sv)) {
      result[key] = deepMerge(tv, sv);
    } else if (Array.isArray(tv) && Array.isArray(sv)) {
      result[key] = [...new Set([...tv, ...sv])];
    } else {
      result[key] = sv;
    }
  }
  return result;
}

// Merge two .env files — keep existing keys, append new ones only.
function mergeEnvContent(existing, incoming) {
  const existingKeys = new Set();
  const lines = existing.split('\n');

  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
    if (m) existingKeys.add(m[1]);
  }

  const additions = [];
  for (const line of incoming.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
    if (m && !existingKeys.has(m[1])) {
      additions.push(line);
      existingKeys.add(m[1]);
    }
  }

  if (additions.length === 0) return existing;
  const separator = existing.endsWith('\n') ? '' : '\n';
  return existing + separator + additions.join('\n') + '\n';
}

function createFileSystemTools(outputDir) {
  const tools = [
    {
      name: 'write_file',
      description: 'Write content to a file in the project directory. Creates parent directories automatically.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'File path relative to project root (e.g. "backend/src/index.js")' },
          content: { type: 'string', description: 'Full file content to write' },
        },
        required: ['file_path', 'content'],
      },
    },
    {
      name: 'read_file',
      description: 'Read an existing file from the project directory.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'File path relative to project root' },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'list_files',
      description: 'List files and directories in a project directory.',
      input_schema: {
        type: 'object',
        properties: {
          dir_path: { type: 'string', description: 'Directory path relative to project root (use "." for root)' },
        },
        required: ['dir_path'],
      },
    },
  ];

  const handlers = {
    write_file({ file_path, content }) {
      const fullPath = path.join(outputDir, file_path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });

      if (fs.existsSync(fullPath)) {
        const ext = path.extname(file_path).toLowerCase();
        const basename = path.basename(file_path);

        // JSON files — deep merge so parallel agents can each contribute dependencies etc.
        if (ext === '.json') {
          try {
            const existing = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const incoming = JSON.parse(content);
            const merged = deepMerge(existing, incoming);
            fs.writeFileSync(fullPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
            return { success: true, path: file_path, strategy: 'json-merge' };
          } catch {
            // Malformed JSON — fall through to overwrite
          }
        }

        // .env / .env.example — append new keys, never overwrite existing ones
        if (basename === '.env' || basename === '.env.example' || basename === '.env.local') {
          const existing = fs.readFileSync(fullPath, 'utf8');
          fs.writeFileSync(fullPath, mergeEnvContent(existing, content), 'utf8');
          return { success: true, path: file_path, strategy: 'env-merge' };
        }
      }

      // Default: overwrite
      fs.writeFileSync(fullPath, content, 'utf8');
      return { success: true, path: file_path, strategy: 'overwrite' };
    },

    read_file({ file_path }) {
      const fullPath = path.join(outputDir, file_path);
      if (!fs.existsSync(fullPath)) return { error: `File not found: ${file_path}` };
      return { content: fs.readFileSync(fullPath, 'utf8') };
    },

    list_files({ dir_path }) {
      const fullPath = path.join(outputDir, dir_path);
      if (!fs.existsSync(fullPath)) return { error: `Directory not found: ${dir_path}` };
      return { entries: fs.readdirSync(fullPath) };
    },
  };

  return { tools, handlers };
}

module.exports = { createFileSystemTools };
