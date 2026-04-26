'use strict';

const fs = require('fs');
const path = require('path');

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
      fs.writeFileSync(fullPath, content, 'utf8');
      return { success: true, path: file_path };
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
