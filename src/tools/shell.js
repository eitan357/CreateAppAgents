'use strict';

const { execSync } = require('child_process');
const path = require('path');

function createShellTools(outputDir) {
  const tools = [
    {
      name: 'run_command',
      description: 'Run a shell command in the project directory. Use for npm install, git init, docker build, etc.',
      input_schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
          cwd: { type: 'string', description: 'Working directory relative to project root (optional, defaults to root)' },
        },
        required: ['command'],
      },
    },
  ];

  const handlers = {
    run_command({ command, cwd }) {
      const workDir = cwd ? path.join(outputDir, cwd) : outputDir;
      try {
        const output = execSync(command, { cwd: workDir, encoding: 'utf8', timeout: 60_000 });
        return { success: true, output: output.trim() };
      } catch (err) {
        return { success: false, error: err.message, stderr: err.stderr };
      }
    },
  };

  return { tools, handlers };
}

module.exports = { createShellTools };
