'use strict';

require('dotenv').config();

const readline = require('readline');
const path = require('path');
const chalk = require('chalk');
const { orchestrate } = require('./orchestrator');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║       App Builder — Multi-Agent       ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════╝\n'));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(chalk.red('❌  Missing ANTHROPIC_API_KEY in environment.'));
    console.log(chalk.yellow('    Create a .env file with: ANTHROPIC_API_KEY=your_key_here'));
    process.exit(1);
  }

  const projectName = (await ask(chalk.yellow('📦  Project name: '))).trim();
  if (!projectName) {
    console.log(chalk.red('❌  Project name is required.'));
    process.exit(1);
  }

  console.log(chalk.yellow('\n📝  Describe the application you want to build.'));
  console.log(chalk.gray('    (Enter your requirements, then type END on a new line)\n'));

  const lines = [];
  while (true) {
    const line = await ask('');
    if (line.trim() === 'END') break;
    lines.push(line);
  }

  const requirements = lines.join('\n').trim();
  if (!requirements) {
    console.log(chalk.red('❌  Requirements cannot be empty.'));
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), 'output', projectName.replace(/\s+/g, '-').toLowerCase());

  rl.close();

  try {
    await orchestrate(requirements, projectName, outputDir);
  } catch (err) {
    console.error(chalk.red('\n❌  Fatal error:'), err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
