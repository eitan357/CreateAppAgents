'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');

// ── Prompt for generating 3 design concepts ───────────────────────────────────
const GENERATOR_SYSTEM = `You are a senior UI/UX designer and brand strategist.
Given application requirements, generate exactly 3 distinct design concepts as valid JSON.
Each concept must be meaningfully different in mood, palette, and visual personality.
Return ONLY a valid JSON array — no markdown, no explanation, just the JSON.`;

const REFINER_SYSTEM = `You are a senior UI/UX designer helping a client refine design concepts.
You speak Hebrew. When the client requests changes, update the concepts and return the full
updated JSON array (same format, same 3 concepts). Return ONLY valid JSON — no extra text.`;

const CONCEPT_SCHEMA = `[
  {
    "id": 1,
    "name": "שם העיצוב בעברית",
    "tagline": "משפט קצר שמסכם את האופי",
    "mood": "תיאור האופי הויזואלי (2-3 משפטים)",
    "colors": {
      "primary":    "#hex",
      "secondary":  "#hex",
      "accent":     "#hex",
      "background": "#hex",
      "surface":    "#hex",
      "text":       "#hex"
    },
    "typography": {
      "heading": "שם גופן כותרות",
      "body":    "שם גופן גוף",
      "style":   "תיאור סגנון הטיפוגרפיה"
    },
    "cornerRadius": "חד | בינוני | עגול מאוד",
    "shadows":      "ללא | עדין | בולט",
    "animations":   "ללא | עדינות | אקספרסיביות",
    "darkMode":     "ברירת מחדל | אופציונלי | לא נתמך",
    "layoutStyle":  "תיאור מבנה הממשק",
    "inspiration":  "מוצרים דומים (לדוגמה: Notion, Linear, Stripe)"
  }
]`;

// ── Color swatch renderer ─────────────────────────────────────────────────────
function swatch(hex, label) {
  try {
    return chalk.bgHex(hex)('   ') + ' ' + chalk.hex(hex)(label || hex);
  } catch {
    return chalk.gray('■■■') + ' ' + (label || hex);
  }
}

function textOnBg(hex, text) {
  try {
    // pick white or black text based on luminance
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? chalk.bgHex(hex).black(text) : chalk.bgHex(hex).white(text);
  } catch {
    return text;
  }
}

// ── Display a single concept card ─────────────────────────────────────────────
function displayConcept(concept, index) {
  const c = concept.colors;
  const border = chalk.hex(c.primary)('═'.repeat(62));

  console.log('\n' + border);
  console.log(
    chalk.hex(c.primary).bold(`  עיצוב ${index + 1} — ${concept.name}`) +
    chalk.gray(`  "${concept.tagline}"`)
  );
  console.log(border);

  // Color palette row
  console.log(chalk.gray('\n  צבעים:'));
  console.log(
    `    ${swatch(c.primary,    'ראשי')}   ` +
    `${swatch(c.secondary, 'משני')}   ` +
    `${swatch(c.accent,    'הדגשה')}`
  );
  console.log(
    `    ${swatch(c.background, 'רקע')}    ` +
    `${swatch(c.surface,   'משטח')}   ` +
    `${swatch(c.text,      'טקסט')}`
  );

  // Typography
  console.log(chalk.gray('\n  טיפוגרפיה:'));
  console.log(`    כותרות: ${chalk.white(concept.typography.heading)}  |  גוף: ${chalk.white(concept.typography.body)}`);
  console.log(`    ${chalk.gray(concept.typography.style)}`);

  // Style details
  console.log(chalk.gray('\n  סגנון:'));
  console.log(`    פינות: ${chalk.white(concept.cornerRadius)}   צללים: ${chalk.white(concept.shadows)}   אנימציה: ${chalk.white(concept.animations)}`);
  console.log(`    Dark mode: ${chalk.white(concept.darkMode)}`);

  // Layout preview (ASCII)
  console.log(chalk.gray('\n  מבנה ממשק:'));
  console.log('    ' + chalk.gray(concept.layoutStyle));

  // Mood & inspiration
  console.log(chalk.gray('\n  אופי:'));
  concept.mood.split('. ').filter(Boolean).forEach(s => {
    console.log(`    ${chalk.white('• ' + s.trim())}`);
  });
  console.log(chalk.gray(`\n  השראה: ${concept.inspiration}`));

  // Mini UI preview using the palette
  console.log(chalk.gray('\n  תצוגה מקדימה:'));
  const navBg   = textOnBg(c.primary,    `  ◉ ${concept.name}                    `);
  const btnPrim = textOnBg(c.primary,    '  פעולה ראשית  ');
  const btnSec  = chalk.hex(c.primary)('[ פעולה משנית ]');
  console.log('    ' + navBg);
  console.log('    ' + chalk.bgHex(c.background).hex(c.text)('  תוכן ראשי / כרטיסיה                '));
  console.log('    ' + chalk.bgHex(c.surface).hex(c.text)('  משטח מורם / מודאל                   '));
  console.log(`    ${btnPrim}  ${btnSec}`);

  console.log('\n' + border + '\n');
}

// ── Display all 3 concepts ────────────────────────────────────────────────────
function displayAllConcepts(concepts) {
  console.log(chalk.bold.cyan('\n\n╔══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║               🎨  3 הצעות עיצוב לאפליקציה שלך            ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝'));
  concepts.forEach((c, i) => displayConcept(c, i));
}

// ── Generate concepts from Claude ─────────────────────────────────────────────
async function generateConcepts(client, requirements, refinementHistory) {
  const isRefinement = refinementHistory.length > 0;

  const messages = isRefinement
    ? refinementHistory
    : [{ role: 'user', content:
        `צור 3 הצעות עיצוב שונות לאפליקציה הבאה.\n\nדרישות:\n${requirements}\n\nסכמת JSON:\n${CONCEPT_SCHEMA}` }];

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 3000,
    system: [{ type: 'text', text: isRefinement ? REFINER_SYSTEM : GENERATOR_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  const raw = response.content.find(b => b.type === 'text')?.text || '[]';
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('לא הצלחתי לייצר הצעות עיצוב תקינות.');
  return JSON.parse(jsonMatch[0]);
}

// ── Format chosen design as a requirements appendix ───────────────────────────
function formatDesignSpec(concept) {
  const c = concept.colors;
  return `
## מפרט עיצוב נבחר — ${concept.name}
### אופי
${concept.mood}

### פלטת צבעים
- ראשי:      ${c.primary}
- משני:      ${c.secondary}
- הדגשה:     ${c.accent}
- רקע:       ${c.background}
- משטח:      ${c.surface}
- טקסט:      ${c.text}

### טיפוגרפיה
- כותרות: ${concept.typography.heading}
- גוף:    ${concept.typography.body}
- סגנון:  ${concept.typography.style}

### סגנון
- פינות:   ${concept.cornerRadius}
- צללים:   ${concept.shadows}
- אנימציה: ${concept.animations}
- Dark mode: ${concept.darkMode}

### מבנה ממשק
${concept.layoutStyle}

### השראה
${concept.inspiration}`.trim();
}

// ── Main export ───────────────────────────────────────────────────────────────
async function runDesignPicker(requirements, ask) {
  const client = new Anthropic();

  console.log(chalk.bold.cyan('\n🎨  מייצר 3 הצעות עיצוב מותאמות לאפליקציה שלך...'));

  let concepts = await generateConcepts(client, requirements, []);
  displayAllConcepts(concepts);

  // Refinement conversation history (for REFINER_SYSTEM)
  const refinementHistory = [
    {
      role: 'user',
      content: `הנה הדרישות:\n${requirements}\n\nהצעות העיצוב הנוכחיות:\n${JSON.stringify(concepts, null, 2)}`,
    },
    {
      role: 'assistant',
      content: JSON.stringify(concepts),
    },
  ];

  console.log(chalk.bold.yellow('מה תרצה לעשות?\n'));
  console.log(chalk.white('  • הקלד 1, 2, או 3 — לבחור עיצוב'));
  console.log(chalk.white('  • הקלד בקשה — לשנות / לשלב עיצובים (לדוגמה: "אני אוהב את 1 אבל עם הצבעים של 2")'));
  console.log(chalk.white('  • הקלד "דלג" — להמשיך לפיתוח ללא בחירת עיצוב\n'));

  while (true) {
    const input = (await ask(chalk.bold.green('▶  בחירה או בקשה: '))).trim();

    if (!input) continue;

    // Skip design picking
    if (input === 'דלג' || input === 'skip') {
      console.log(chalk.gray('\n⏭️   ממשיך לפיתוח ללא עיצוב נבחר.'));
      return null;
    }

    // Direct selection: "1", "2", "3"
    const pick = parseInt(input, 10);
    if ([1, 2, 3].includes(pick)) {
      const chosen = concepts[pick - 1];
      console.log(chalk.bold.green(`\n✅  נבחר עיצוב ${pick} — ${chosen.name}`));
      displayConcept(chosen, pick - 1);

      const confirm = (await ask(chalk.bold.green('▶  לאשר את הבחירה ולהמשיך לפיתוח? (y/n): '))).trim().toLowerCase();
      if (confirm === 'y' || confirm === 'yes' || confirm === '') {
        return formatDesignSpec(chosen);
      }
      // User wants to continue refining
      console.log(chalk.gray('\n💬  המשך לשכלל את העיצוב:\n'));
      continue;
    }

    // Refinement request — send to Claude
    console.log(chalk.cyan('\n🔄  משכלל את העיצובים לפי הבקשה שלך...'));

    refinementHistory.push({ role: 'user', content: input });

    try {
      concepts = await generateConcepts(client, requirements, refinementHistory);
      refinementHistory.push({ role: 'assistant', content: JSON.stringify(concepts) });
      displayAllConcepts(concepts);

      console.log(chalk.bold.yellow('\nמה תרצה לעשות עכשיו?'));
      console.log(chalk.white('  • הקלד 1, 2, או 3 לבחור  •  המשך לשכלל  •  הקלד "דלג" לדילוג\n'));
    } catch (err) {
      console.log(chalk.red(`\n⚠️  שגיאה בעדכון העיצובים: ${err.message}`));
    }
  }
}

module.exports = { runDesignPicker };
