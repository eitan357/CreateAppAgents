'use strict';

require('dotenv').config();

const readline = require('readline');
const path = require('path');
const chalk = require('chalk');
const { orchestrate } = require('./orchestrator');
const { runPlanningSession } = require('./planner');
const { runDesignPicker } = require('./designPicker');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
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

  // ── Mode selection ──────────────────────────────────────────────────────────
  console.log(chalk.bold.yellow('איך תרצה להתחיל?\n'));
  console.log(chalk.white('  1️⃣   תכנון עם AI  — שיחה אינטראקטיבית עם יועץ מוצר שישאל אותך שאלות'));
  console.log(chalk.white('  2️⃣   הזנה ישירה  — הקלד את הדרישות שלך בעצמך\n'));

  let mode = '';
  while (!['1', '2'].includes(mode)) {
    mode = (await ask(chalk.bold.green('▶  בחר מצב (1 או 2): '))).trim();
  }

  const projectName = (await ask(chalk.yellow('\n📦  שם הפרויקט: '))).trim();
  if (!projectName) {
    console.log(chalk.red('❌  שם הפרויקט הוא שדה חובה.'));
    process.exit(1);
  }

  let requirements = '';

  // ── Mode 1: AI Planning Session ─────────────────────────────────────────────
  if (mode === '1') {
    requirements = await runPlanningSession(ask);

    // Show the generated requirements and let user confirm
    console.log(chalk.bold.cyan('\n━━━  מסמך הדרישות שנוצר  ━━━'));
    console.log(chalk.gray(requirements));
    console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const confirm = (await ask(chalk.bold.green('▶  להתחיל בפיתוח עם הדרישות האלו? (y/n): '))).trim().toLowerCase();
    if (confirm !== 'y' && confirm !== 'yes' && confirm !== '') {
      console.log(chalk.yellow('\n💡  תוכל להריץ מחדש ולהמשיך לשכלל את הדרישות בשיחה נוספת.'));
      rl.close();
      return;
    }

  // ── Mode 2: Direct Input ────────────────────────────────────────────────────
  } else {
    console.log(chalk.yellow('\n📝  תאר את האפליקציה שתרצה לבנות.'));
    console.log(chalk.gray('    (הקלד את הדרישות שלך, ובסיום הקלד END בשורה נפרדת)\n'));

    const lines = [];
    while (true) {
      const line = await ask('');
      if (line.trim() === 'END') break;
      lines.push(line);
    }

    requirements = lines.join('\n').trim();
    if (!requirements) {
      console.log(chalk.red('❌  לא ניתן להמשיך ללא דרישות.'));
      process.exit(1);
    }
  }

  // ── Design Picker ─────────────────────────────────────────────────────────
  console.log(chalk.bold.cyan('\n━━━  שלב עיצוב  ━━━'));
  console.log(chalk.gray('לפני שנתחיל לבנות — נבחר את הסגנון הויזואלי של האפליקציה.\n'));

  const skipDesign = (await ask(chalk.bold.green('▶  האם לעצב את האפליקציה לפני הפיתוח? (y/n): '))).trim().toLowerCase();

  if (skipDesign === 'y' || skipDesign === 'yes' || skipDesign === '') {
    const designSpec = await runDesignPicker(requirements, ask);
    if (designSpec) {
      requirements = requirements + '\n\n' + designSpec;
      console.log(chalk.green('\n✅  מפרט העיצוב נוסף לדרישות הפרויקט.\n'));
    }
  }

  const outputDir = path.resolve(process.cwd(), 'output', projectName.replace(/\s+/g, '-').toLowerCase());

  rl.close();

  try {
    await orchestrate(requirements, projectName, outputDir);
  } catch (err) {
    console.error(chalk.red('\n❌  שגיאה קריטית:'), err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
