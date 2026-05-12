'use strict';

const { execSync } = require('child_process');
const path = require('path');

const IS_WIN = process.platform === 'win32';

// Translate Unix commands that don't exist in PowerShell to their equivalents.
// PowerShell already aliases: cat→Get-Content, ls→Get-ChildItem, pwd→Get-Location, etc.
// We only need to patch commands PowerShell doesn't alias at all.
function _translateForPowerShell(command) {
  // tail -n N file  →  Get-Content -Tail N file
  command = command.replace(/\btail\s+-n\s+(\d+)\s+(.+)/g, 'Get-Content -Tail $1 $2');
  // tail -f file  →  Get-Content -Wait file  (approximate)
  command = command.replace(/\btail\s+-f\s+(.+)/g, 'Get-Content -Wait $1');
  // bare tail file  →  Get-Content -Tail 20 file
  command = command.replace(/\btail\s+(?!-)(.+)/g, 'Get-Content -Tail 20 $1');
  // grep -r pattern dir  →  Get-ChildItem -Recurse | Select-String pattern
  // (too complex to translate reliably — leave as-is, PowerShell will error gracefully)
  return command;
}

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
      const cmd = IS_WIN ? _translateForPowerShell(command) : command;
      const opts = {
        cwd: workDir,
        encoding: 'utf8',
        timeout: 60_000,
        ...(IS_WIN ? { shell: 'powershell.exe' } : {}),
      };
      try {
        const output = execSync(cmd, opts);
        return { success: true, output: output.trim() };
      } catch (err) {
        return { success: false, error: err.message, stderr: err.stderr };
      }
    },
  };

  return { tools, handlers };
}

module.exports = { createShellTools };
