'use strict';

require('dotenv').config();

const readline = require('readline');
const path = require('path');
const chalk = require('chalk');
const { orchestrate } = require('./orchestrator');
const { runPlanningSession } = require('./planner');
const { runDesignPicker } = require('./designPicker');
const { setModelConfig } = require('./agents/base');
const { ProjectContext } = require('./context');
const { parseGithubRepo, checkGithubAccess, createGithubRepo } = require('./github');

const TIERS = {
  '1': {
    label: 'חסכוני  — ללא חשיבה עמוקה, מהיר וזול יותר',
    thinking: null,
    max_tokens: 4000,
  },
  '2': {
    label: 'מאוזן   — חשיבה עמוקה אדפטיבית (Claude מחליט מתי לחשוב)',
    thinking: { type: 'adaptive' },
    max_tokens: 6000,
  },
  '3': {
    label: 'מקסימלי — חשיבה עמוקה מלאה, איכות גבוהה ביותר',
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
  console.log(chalk.gray('הקוד שייוצר יישמר ב-repository הזה בסוף הבנייה.\n'));

  // Check token
  let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!token) {
    console.log(chalk.yellow('⚠️   לא נמצא GITHUB_TOKEN בסביבה.'));
    console.log(chalk.gray('    הוסף GITHUB_TOKEN=<personal access token> לקובץ .env'));
    console.log(chalk.gray('    הטוקן צריך הרשאות: repo (read + write)\n'));
    console.log(chalk.gray('    ליצירת טוקן: https://github.com/settings/tokens/new'));
    console.log(chalk.gray('    בחר: repo → Full control of private repositories\n'));
    token = (await ask(chalk.bold.green('▶  הדבק את ה-GitHub token כאן (או Enter לדלג): '))).trim();
    if (!token) {
      console.log(chalk.yellow('⚠️  דילוג על GitHub — הקוד ייוצר מקומית בלבד.\n'));
      return null;
    }
    // Save to process.env for this session
    process.env.GITHUB_TOKEN = token;
  }

  while (true) {
    const input = (await ask(chalk.bold.green('▶  GitHub repository (owner/repo): '))).trim();
    if (!input) {
      console.log(chalk.yellow('⚠️  דילוג על GitHub — הקוד ייוצר מקומית בלבד.\n'));
      return null;
    }

    const parsed = parseGithubRepo(input);
    if (!parsed) {
      console.log(chalk.red('❌  פורמט לא תקין. דוגמאות: myuser/my-app  או  https://github.com/myuser/my-app\n'));
      continue;
    }

    console.log(chalk.gray(`\n🔍  בודק גישה ל-${parsed.full}...`));
    const access = await checkGithubAccess(parsed.owner, parsed.repo, token);

    if (access.networkError) {
      console.log(chalk.red(`❌  שגיאת רשת: ${access.networkError}`));
      console.log(chalk.gray('    בדוק חיבור לאינטרנט ונסה שוב.\n'));
      continue;
    }

    if (access.authError) {
      console.log(chalk.red('❌  שגיאת אימות — הטוקן לא תקין או פג תוקף.'));
      console.log(chalk.gray('    צור טוקן חדש ב: https://github.com/settings/tokens/new'));
      console.log(chalk.gray('    הרשאות נדרשות: repo → Full control\n'));
      token = (await ask(chalk.bold.green('▶  הדבק טוקן חדש: '))).trim();
      if (!token) return null;
      process.env.GITHUB_TOKEN = token;
      continue;
    }

    if (!access.exists) {
      console.log(chalk.yellow(`⚠️   Repository "${parsed.full}" לא קיים.`));
      const create = (await ask(chalk.bold.green('▶  ליצור אותו עכשיו? (y/n) [ברירת מחדל: y]: '))).trim().toLowerCase();
      if (create === 'n') continue;

      const isPrivate = (await ask(chalk.bold.green('▶  Repository פרטי? (y/n) [ברירת מחדל: y]: '))).trim().toLowerCase();
      try {
        await createGithubRepo(parsed.repo, token, isPrivate !== 'n');
        console.log(chalk.green(`✅  Repository "${parsed.full}" נוצר בהצלחה.\n`));
        return { ...parsed, token };
      } catch (err) {
        console.log(chalk.red(`❌  יצירת repository נכשלה: ${err.message}`));
        console.log(chalk.gray('    ייתכן שהשם תפוס או שאין הרשאות ליצירה. נסה שם אחר.\n'));
        continue;
      }
    }

    if (!access.canPush) {
      console.log(chalk.red(`❌  אין הרשאת כתיבה ל-${parsed.full}.`));
      console.log(chalk.gray('    ודא שהטוקן שייך למשתמש שיש לו הרשאת write/push ל-repository.'));
      console.log(chalk.gray('    אם זה repository של ארגון — ודא שהטוקן כולל גישה לארגון.\n'));
      continue;
    }

    const visibility = access.private ? 'פרטי' : 'ציבורי';
    console.log(chalk.green(`✅  גישה אושרה — ${parsed.full} (${visibility})\n`));
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

  const projectName = (await ask(chalk.yellow('\n📦  שם הפרויקט: '))).trim();
  if (!projectName) {
    console.log(chalk.red('❌  שם הפרויקט הוא שדה חובה.'));
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), 'output', projectName.replace(/\s+/g, '-').toLowerCase());

  // ── GitHub repository ───────────────────────────────────────────────────────
  const githubRepo = await askForGithubRepo();

  // ── Check for existing checkpoint ──────────────────────────────────────────
  const checkpoint = ProjectContext.loadCheckpoint(outputDir);
  if (checkpoint) {
    const completedList = (checkpoint.completedLayers || []).join(', ');
    console.log(chalk.bold.yellow(`\n♻️   נמצאה בנייה חצויה עבור "${projectName}"`));
    console.log(chalk.gray(`    Layers שהושלמו: ${completedList || 'אין'}`));
    const resume = (await ask(chalk.bold.green('▶  האם להמשיך מנקודת העצירה? (y/n): '))).trim().toLowerCase();

    if (resume === 'y' || resume === 'yes' || resume === '') {
      // Tier selection still needed for resumed build
      console.log(chalk.bold.cyan('\n━━━  רמת איכות / עלות  ━━━'));
      console.log(chalk.gray('בחר רמה לשלבים הנותרים:\n'));
      Object.entries(TIERS).forEach(([key, tier]) => {
        console.log(chalk.white(`  ${key}️⃣   ${tier.label}  (max ${tier.max_tokens.toLocaleString()} tokens)`));
      });
      let tier = '';
      while (!Object.keys(TIERS).includes(tier)) {
        tier = (await ask(chalk.bold.green('▶  בחר רמה (1, 2 או 3) [ברירת מחדל: 2]: '))).trim() || '2';
      }
      const selectedTier = TIERS[tier];
      setModelConfig({ thinking: selectedTier.thinking, max_tokens: selectedTier.max_tokens });
      console.log(chalk.green(`\n✅  נבחרה רמה: ${selectedTier.label}\n`));

      rl.close();
      try {
        await orchestrate(checkpoint.requirements, projectName, outputDir, checkpoint, githubRepo);
      } catch (err) {
        console.error(chalk.red('\n❌  שגיאה קריטית:'), err.message);
        if (process.env.DEBUG) console.error(err.stack);
        process.exit(1);
      }
      return;
    }

    console.log(chalk.gray('מתחיל בנייה חדשה...\n'));
  }

  // ── Mode selection ──────────────────────────────────────────────────────────
  console.log(chalk.bold.yellow('איך תרצה להתחיל?\n'));
  console.log(chalk.white('  1️⃣   תכנון עם AI  — שיחה אינטראקטיבית עם יועץ מוצר שישאל אותך שאלות'));
  console.log(chalk.white('  2️⃣   הזנה ישירה  — הקלד את הדרישות שלך בעצמך\n'));

  let mode = '';
  while (!['1', '2'].includes(mode)) {
    mode = (await ask(chalk.bold.green('▶  בחר מצב (1 או 2): '))).trim();
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

  // ── Tier selection ────────────────────────────────────────────────────────
  console.log(chalk.bold.cyan('\n━━━  רמת איכות / עלות  ━━━'));
  console.log(chalk.gray('בחר את רמת השימוש בחשיבה עמוקה (Extended Thinking) ו-tokens:\n'));
  Object.entries(TIERS).forEach(([key, tier]) => {
    const tokens = tier.max_tokens.toLocaleString();
    console.log(chalk.white(`  ${key}️⃣   ${tier.label}  (max ${tokens} tokens)`));
  });
  console.log('');

  let tier = '';
  while (!Object.keys(TIERS).includes(tier)) {
    tier = (await ask(chalk.bold.green('▶  בחר רמה (1, 2 או 3) [ברירת מחדל: 2]: '))).trim() || '2';
  }
  const selectedTier = TIERS[tier];
  setModelConfig({ thinking: selectedTier.thinking, max_tokens: selectedTier.max_tokens });
  console.log(chalk.green(`\n✅  נבחרה רמה: ${selectedTier.label}\n`));

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

  rl.close();

  try {
    await orchestrate(requirements, projectName, outputDir, null, githubRepo);
  } catch (err) {
    console.error(chalk.red('\n❌  שגיאה קריטית:'), err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
