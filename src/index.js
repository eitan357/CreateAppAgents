'use strict';

require('dotenv').config();

const readline = require('readline');
const path = require('path');
const chalk = require('chalk');
const { orchestrate, orchestrateUpdate } = require('./orchestrator');
const { runPlanningSession } = require('./planner');
const { runDesignPicker } = require('./designPicker');
const { setModelConfig } = require('./agents/base');
const { ProjectContext } = require('./context');
const { parseGithubRepo, checkGithubAccess, createGithubRepo } = require('./github');

const TIERS = {
  '1': {
    label: 'Economy  — no extended thinking, faster and cheaper',
    thinking: null,
    max_tokens: 4000,
  },
  '2': {
    label: 'Balanced — adaptive extended thinking (Claude decides when to think)',
    thinking: { type: 'adaptive' },
    max_tokens: 6000,
  },
  '3': {
    label: 'Maximum  — full extended thinking, highest quality',
    thinking: { type: 'adaptive' },
    max_tokens: 8096,
  },
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// Returns { owner, repo, full } after validating token + access.
// Loops until the user provides a valid repo or exits.
async function askForGithubRepo() {
  console.log(chalk.bold.cyan('\n━━━  GitHub Repository  ━━━'));
  console.log(chalk.gray('The generated code will be saved to this repository at the end of the build.\n'));

  // Check token
  let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!token) {
    console.log(chalk.yellow('⚠️   No GITHUB_TOKEN found in environment.'));
    console.log(chalk.gray('    Add GITHUB_TOKEN=<personal access token> to your .env file'));
    console.log(chalk.gray('    The token needs permissions: repo (read + write)\n'));
    console.log(chalk.gray('    To create a token: https://github.com/settings/tokens/new'));
    console.log(chalk.gray('    Select: repo → Full control of private repositories\n'));
    token = (await ask(chalk.bold.green('▶  Paste your GitHub token here (or Enter to skip): '))).trim();
    if (!token) {
      console.log(chalk.yellow('⚠️  Skipping GitHub — code will be generated locally only.\n'));
      return null;
    }
    // Save to process.env for this session
    process.env.GITHUB_TOKEN = token;
  }

  while (true) {
    const input = (await ask(chalk.bold.green('▶  GitHub repository (owner/repo): '))).trim();
    if (!input) {
      console.log(chalk.yellow('⚠️  Skipping GitHub — code will be generated locally only.\n'));
      return null;
    }

    const parsed = parseGithubRepo(input);
    if (!parsed) {
      console.log(chalk.red('❌  Invalid format. Examples: myuser/my-app  or  https://github.com/myuser/my-app\n'));
      continue;
    }

    console.log(chalk.gray(`\n🔍  Checking access to ${parsed.full}...`));
    const access = await checkGithubAccess(parsed.owner, parsed.repo, token);

    if (access.networkError) {
      console.log(chalk.red(`❌  Network error: ${access.networkError}`));
      console.log(chalk.gray('    Check your internet connection and try again.\n'));
      continue;
    }

    if (access.authError) {
      console.log(chalk.red('❌  Authentication error — token is invalid or expired.'));
      console.log(chalk.gray('    Create a new token at: https://github.com/settings/tokens/new'));
      console.log(chalk.gray('    Required permissions: repo → Full control\n'));
      token = (await ask(chalk.bold.green('▶  Paste new token: '))).trim();
      if (!token) return null;
      process.env.GITHUB_TOKEN = token;
      continue;
    }

    if (!access.exists) {
      console.log(chalk.yellow(`⚠️   Repository "${parsed.full}" does not exist.`));
      const create = (await ask(chalk.bold.green('▶  Create it now? (y/n) [default: y]: '))).trim().toLowerCase();
      if (create === 'n') continue;

      const isPrivate = (await ask(chalk.bold.green('▶  Private repository? (y/n) [default: y]: '))).trim().toLowerCase();
      try {
        await createGithubRepo(parsed.repo, token, isPrivate !== 'n');
        console.log(chalk.green(`✅  Repository "${parsed.full}" created successfully.\n`));
        return { ...parsed, token };
      } catch (err) {
        console.log(chalk.red(`❌  Repository creation failed: ${err.message}`));
        console.log(chalk.gray('    The name may be taken or you may lack creation permissions. Try a different name.\n'));
        continue;
      }
    }

    if (!access.canPush) {
      console.log(chalk.red(`❌  No write access to ${parsed.full}.`));
      console.log(chalk.gray('    Ensure the token belongs to a user with write/push permission to this repository.'));
      console.log(chalk.gray('    If this is an organization repository — ensure the token includes org access.\n'));
      continue;
    }

    const visibility = access.private ? 'private' : 'public';
    console.log(chalk.green(`✅  Access confirmed — ${parsed.full} (${visibility})\n`));
    return { ...parsed, token };
  }
}

async function main() {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║       App Builder — Multi-Agent System    ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(chalk.red('❌  Missing ANTHROPIC_API_KEY in environment.'));
    console.log(chalk.yellow('    Create a .env file with: ANTHROPIC_API_KEY=your_key_here'));
    process.exit(1);
  }

  const projectName = (await ask(chalk.yellow('\n📦  Project name: '))).trim();
  if (!projectName) {
    console.log(chalk.red('❌  Project name is required.'));
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), 'output', projectName.replace(/\s+/g, '-').toLowerCase());

  // ── GitHub repository ───────────────────────────────────────────────────────
  const githubRepo = await askForGithubRepo();

  // ── Check for existing checkpoint ──────────────────────────────────────────
  const checkpoint = ProjectContext.loadCheckpoint(outputDir);
  if (checkpoint) {
    const completedList = (checkpoint.completedLayers || []).join(', ');
    const hasSquadPlan  = !!(checkpoint.squadPlan);
    const allDone       = completedList.includes('5');

    console.log(chalk.bold.yellow(`\n♻️   Found a previous build for "${projectName}"`));
    console.log(chalk.gray(`    Completed layers: ${completedList || 'none'}`));
    console.log('');
    console.log(chalk.white('  1️⃣   Fresh build from scratch'));
    if (!allDone) {
      console.log(chalk.white('  2️⃣   Resume from checkpoint'));
    }
    if (hasSquadPlan) {
      console.log(chalk.white('  3️⃣   Update / add a feature to the existing app'));
    }
    console.log('');

    const validOptions = ['1', ...(!allDone ? ['2'] : []), ...(hasSquadPlan ? ['3'] : [])];
    let choice = '';
    while (!validOptions.includes(choice)) {
      choice = (await ask(chalk.bold.green(`▶  Choose (${validOptions.join('/')}): `))).trim();
    }

    if (choice === '2') {
      // Resume build
      console.log(chalk.bold.cyan('\n━━━  Quality / Cost Level  ━━━'));
      console.log(chalk.gray('Select a level for the remaining steps:\n'));
      Object.entries(TIERS).forEach(([key, tier]) => {
        console.log(chalk.white(`  ${key}️⃣   ${tier.label}  (max ${tier.max_tokens.toLocaleString()} tokens)`));
      });
      let tier = '';
      while (!Object.keys(TIERS).includes(tier)) {
        tier = (await ask(chalk.bold.green('▶  Select level (1, 2 or 3) [default: 2]: '))).trim() || '2';
      }
      const selectedTier = TIERS[tier];
      setModelConfig({ thinking: selectedTier.thinking, max_tokens: selectedTier.max_tokens });
      console.log(chalk.green(`\n✅  Selected level: ${selectedTier.label}\n`));

      rl.close();
      try {
        await orchestrate(checkpoint.requirements, projectName, outputDir, checkpoint, githubRepo);
      } catch (err) {
        console.error(chalk.red('\n❌  Critical error:'), err.message);
        if (process.env.DEBUG) console.error(err.stack);
        process.exit(1);
      }
      return;
    }

    if (choice === '3') {
      // Update mode
      console.log(chalk.bold.cyan('\n━━━  Update App  ━━━'));
      console.log(chalk.gray('Describe the change you want to make. (Type END on a separate line when done)\n'));

      const lines = [];
      while (true) {
        const line = await ask('');
        if (line.trim() === 'END') break;
        lines.push(line);
      }
      const changeRequest = lines.join('\n').trim();
      if (!changeRequest) {
        console.log(chalk.red('❌  Cannot continue without a description of the change.'));
        process.exit(1);
      }

      console.log(chalk.bold.cyan('\n━━━  Quality / Cost Level  ━━━'));
      Object.entries(TIERS).forEach(([key, tier]) => {
        console.log(chalk.white(`  ${key}️⃣   ${tier.label}  (max ${tier.max_tokens.toLocaleString()} tokens)`));
      });
      let tier = '';
      while (!Object.keys(TIERS).includes(tier)) {
        tier = (await ask(chalk.bold.green('▶  Select level (1, 2 or 3) [default: 2]: '))).trim() || '2';
      }
      const selectedTier = TIERS[tier];
      setModelConfig({ thinking: selectedTier.thinking, max_tokens: selectedTier.max_tokens });
      console.log(chalk.green(`\n✅  Selected level: ${selectedTier.label}\n`));

      rl.close();
      try {
        await orchestrateUpdate(changeRequest, checkpoint, outputDir, githubRepo);
      } catch (err) {
        console.error(chalk.red('\n❌  Critical error:'), err.message);
        if (process.env.DEBUG) console.error(err.stack);
        process.exit(1);
      }
      return;
    }

    // choice === '1': fall through to fresh build
    console.log(chalk.gray('Starting fresh build...\n'));
  }

  // ── Mode selection ──────────────────────────────────────────────────────────
  console.log(chalk.bold.yellow('How would you like to start?\n'));
  console.log(chalk.white('  1️⃣   AI Planning  — interactive conversation with a product advisor who will ask you questions'));
  console.log(chalk.white('  2️⃣   Direct Input  — type your requirements yourself\n'));

  let mode = '';
  while (!['1', '2'].includes(mode)) {
    mode = (await ask(chalk.bold.green('▶  Choose mode (1 or 2): '))).trim();
  }

  let requirements = '';

  // ── Mode 1: AI Planning Session ─────────────────────────────────────────────
  if (mode === '1') {
    requirements = await runPlanningSession(ask);

    // Show the generated requirements and let user confirm
    console.log(chalk.bold.cyan('\n━━━  Generated Requirements Document  ━━━'));
    console.log(chalk.gray(requirements));
    console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const confirm = (await ask(chalk.bold.green('▶  Start development with these requirements? (y/n): '))).trim().toLowerCase();
    if (confirm !== 'y' && confirm !== 'yes' && confirm !== '') {
      console.log(chalk.yellow('\n💡  You can re-run and continue refining the requirements in another conversation.'));
      rl.close();
      return;
    }

  // ── Mode 2: Direct Input ────────────────────────────────────────────────────
  } else {
    console.log(chalk.yellow('\n📝  Describe the application you want to build.'));
    console.log(chalk.gray('    (Type your requirements, and when done type END on a separate line)\n'));

    const lines = [];
    while (true) {
      const line = await ask('');
      if (line.trim() === 'END') break;
      lines.push(line);
    }

    requirements = lines.join('\n').trim();
    if (!requirements) {
      console.log(chalk.red('❌  Cannot continue without requirements.'));
      process.exit(1);
    }
  }

  // ── Tier selection ────────────────────────────────────────────────────────
  console.log(chalk.bold.cyan('\n━━━  Quality / Cost Level  ━━━'));
  console.log(chalk.gray('Select the level of Extended Thinking usage and tokens:\n'));
  Object.entries(TIERS).forEach(([key, tier]) => {
    const tokens = tier.max_tokens.toLocaleString();
    console.log(chalk.white(`  ${key}️⃣   ${tier.label}  (max ${tokens} tokens)`));
  });
  console.log('');

  let tier = '';
  while (!Object.keys(TIERS).includes(tier)) {
    tier = (await ask(chalk.bold.green('▶  Select level (1, 2 or 3) [default: 2]: '))).trim() || '2';
  }
  const selectedTier = TIERS[tier];
  setModelConfig({ thinking: selectedTier.thinking, max_tokens: selectedTier.max_tokens });
  console.log(chalk.green(`\n✅  Selected level: ${selectedTier.label}\n`));

  // ── Design Picker ─────────────────────────────────────────────────────────
  console.log(chalk.bold.cyan('\n━━━  Design Phase  ━━━'));
  console.log(chalk.gray('Before we start building — let\'s choose the visual style of the application.\n'));

  const skipDesign = (await ask(chalk.bold.green('▶  Design the app before development? (y/n): '))).trim().toLowerCase();

  if (skipDesign === 'y' || skipDesign === 'yes' || skipDesign === '') {
    const designSpec = await runDesignPicker(requirements, ask);
    if (designSpec) {
      requirements = requirements + '\n\n' + designSpec;
      console.log(chalk.green('\n✅  Design spec added to project requirements.\n'));
    }
  }

  rl.close();

  try {
    await orchestrate(requirements, projectName, outputDir, null, githubRepo);
  } catch (err) {
    console.error(chalk.red('\n❌  Critical error:'), err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
