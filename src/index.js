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
const { SUPPORTED, setLanguage, t } = require('./lang');

const TIERS = {
  '1': { thinking: null,                  max_tokens: 4000 },
  '2': { thinking: { type: 'adaptive' },  max_tokens: 6000 },
  '3': { thinking: { type: 'adaptive' },  max_tokens: 8096 },
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function selectLanguage() {
  console.log(chalk.bold.cyan('\n━━━  Language / שפה / Langue / Idioma  ━━━'));
  SUPPORTED.forEach((l, i) => {
    console.log(chalk.white(`  ${i + 1}.  ${l.label}`));
  });
  console.log('');
  const input = (await ask(chalk.bold.green(`▶  Select (1-${SUPPORTED.length}) [default: 1]: `))).trim();
  const index = parseInt(input, 10) - 1;
  const chosen = SUPPORTED[index] || SUPPORTED[0];
  setLanguage(chosen.code);
}

async function askForGithubRepo() {
  console.log(chalk.bold.cyan(`\n━━━  ${t('githubTitle')}  ━━━`));
  console.log(chalk.gray('The generated code will be saved to this repository at the end of the build.\n'));

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

async function selectTier() {
  console.log(chalk.bold.cyan(`\n━━━  ${t('qualityTitle')}  ━━━`));
  console.log(chalk.gray('Select the level of Extended Thinking usage and tokens:\n'));
  Object.entries(TIERS).forEach(([key, tier]) => {
    const tokens = tier.max_tokens.toLocaleString();
    console.log(chalk.white(`  ${key}️⃣   ${t(`tier${key}`)}  (max ${tokens} tokens)`));
  });
  console.log('');
  let tier = '';
  while (!Object.keys(TIERS).includes(tier)) {
    tier = (await ask(chalk.bold.green(t('chooseLevel')))).trim() || '2';
  }
  const selected = TIERS[tier];
  setModelConfig({ thinking: selected.thinking, max_tokens: selected.max_tokens });
  console.log(chalk.green(`\n${t('tierSelected', t(`tier${tier}`))}\n`));
  return selected;
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

  // Language selection — first step
  await selectLanguage();

  const projectName = (await ask(chalk.yellow(`\n${t('projectName')}`))).trim();
  if (!projectName) {
    console.log(chalk.red(t('errNoProjectName')));
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

    console.log(chalk.bold.yellow(`\n${t('foundPrevBuild', projectName)}`));
    console.log(chalk.gray(`    ${t('completedLayers')} ${completedList || 'none'}`));
    console.log('');
    console.log(chalk.white(`  ${t('opt1Fresh')}`));
    if (!allDone)      console.log(chalk.white(`  ${t('opt2Resume')}`));
    if (hasSquadPlan)  console.log(chalk.white(`  ${t('opt3Update')}`));
    console.log('');

    const validOptions = ['1', ...(!allDone ? ['2'] : []), ...(hasSquadPlan ? ['3'] : [])];
    let choice = '';
    while (!validOptions.includes(choice)) {
      choice = (await ask(chalk.bold.green(t('chooseOption', validOptions.join('/'))))).trim();
    }

    if (choice === '2') {
      await selectTier();
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
      console.log(chalk.bold.cyan('\n━━━  Update App  ━━━'));
      console.log(chalk.gray(t('describeUpdate') + '\n'));
      const lines = [];
      while (true) {
        const line = await ask('');
        if (line.trim() === 'END') break;
        lines.push(line);
      }
      const changeRequest = lines.join('\n').trim();
      if (!changeRequest) {
        console.log(chalk.red(t('errNoChange')));
        process.exit(1);
      }
      await selectTier();
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

    console.log(chalk.gray(t('freshBuild') + '\n'));
  }

  // ── Mode selection ──────────────────────────────────────────────────────────
  console.log(chalk.bold.yellow(t('howStart') + '\n'));
  console.log(chalk.white(`  ${t('mode1')}`));
  console.log(chalk.white(`  ${t('mode2')}\n`));

  let mode = '';
  while (!['1', '2'].includes(mode)) {
    mode = (await ask(chalk.bold.green(t('chooseMode')))).trim();
  }

  let requirements = '';

  // ── Mode 1: AI Planning Session ─────────────────────────────────────────────
  if (mode === '1') {
    requirements = await runPlanningSession(ask);

    console.log(chalk.bold.cyan(`\n${t('reqsHeader')}`));
    console.log(chalk.gray(requirements));
    console.log(chalk.bold.cyan(`${t('reqsFooter')}\n`));

    const confirm = (await ask(chalk.bold.green(t('startDev')))).trim().toLowerCase();
    if (confirm !== 'y' && confirm !== 'yes' && confirm !== '') {
      console.log(chalk.yellow(`\n${t('refineHint')}`));
      rl.close();
      return;
    }

  // ── Mode 2: Direct Input ────────────────────────────────────────────────────
  } else {
    console.log(chalk.yellow(`\n${t('describeApp')}\n`));
    const lines = [];
    while (true) {
      const line = await ask('');
      if (line.trim() === 'END') break;
      lines.push(line);
    }
    requirements = lines.join('\n').trim();
    if (!requirements) {
      console.log(chalk.red(t('errNoRequirements')));
      process.exit(1);
    }
  }

  // ── Tier selection ────────────────────────────────────────────────────────
  await selectTier();

  // ── Design Picker ─────────────────────────────────────────────────────────
  console.log(chalk.bold.cyan('\n━━━  Design Phase  ━━━'));
  console.log(chalk.gray("Before we start building — let's choose the visual style of the application.\n"));

  const skipDesign = (await ask(chalk.bold.green(t('designBeforeDev')))).trim().toLowerCase();
  if (skipDesign === 'y' || skipDesign === 'yes' || skipDesign === '') {
    const designSpec = await runDesignPicker(requirements, ask);
    if (designSpec) {
      requirements = requirements + '\n\n' + designSpec;
      console.log(chalk.green(`\n${t('designAdded')}\n`));
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
