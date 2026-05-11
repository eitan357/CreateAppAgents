'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');
const { getLangInstruction, t } = require('./lang');

const GENERATOR_SYSTEM = `You are a senior UI/UX designer and brand strategist.
Given application requirements, generate exactly 3 distinct design concepts as valid JSON.
Each concept must be meaningfully different in mood, palette, and visual personality.
Return ONLY a valid JSON array — no markdown, no explanation, just the JSON.`;

function getRefinerSystem() {
  return `You are a senior UI/UX designer helping a client refine design concepts.
${getLangInstruction()} When the client requests changes, update the concepts and return the full
updated JSON array (same format, same 3 concepts). Return ONLY valid JSON — no extra text.`;
}

const CONCEPT_SCHEMA = `[
  {
    "id": 1,
    "name": "Design name in English",
    "tagline": "Short sentence summarizing the character",
    "mood": "Description of the visual character (2-3 sentences)",
    "colors": {
      "primary":    "#hex",
      "secondary":  "#hex",
      "accent":     "#hex",
      "background": "#hex",
      "surface":    "#hex",
      "text":       "#hex"
    },
    "typography": {
      "heading": "Heading font name",
      "body":    "Body font name",
      "style":   "Typography style description"
    },
    "cornerRadius": "Sharp | Medium | Very Rounded",
    "shadows":      "None | Subtle | Prominent",
    "animations":   "None | Subtle | Expressive",
    "darkMode":     "Default | Optional | Not Supported",
    "layoutStyle":  "Description of the interface structure",
    "inspiration":  "Similar products (e.g. Notion, Linear, Stripe)"
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
    chalk.hex(c.primary).bold(`  Design ${index + 1} — ${concept.name}`) +
    chalk.gray(`  "${concept.tagline}"`)
  );
  console.log(border);

  console.log(chalk.gray(`\n  ${t('colorsLabel')}`));
  console.log(
    `    ${swatch(c.primary,    t('primaryLabel'))}   ` +
    `${swatch(c.secondary, t('secondaryLabel'))}   ` +
    `${swatch(c.accent,    t('accentLabel'))}`
  );
  console.log(
    `    ${swatch(c.background, t('backgroundLabel'))}    ` +
    `${swatch(c.surface,   t('surfaceLabel'))}   ` +
    `${swatch(c.text,      t('textLabel'))}`
  );

  console.log(chalk.gray(`\n  ${t('typographyLabel')}`));
  console.log(`    ${t('headingsLabel')} ${chalk.white(concept.typography.heading)}  |  ${t('bodyLabel')} ${chalk.white(concept.typography.body)}`);
  console.log(`    ${chalk.gray(concept.typography.style)}`);

  console.log(chalk.gray(`\n  ${t('styleLabel')}`));
  console.log(`    ${t('cornersLabel')} ${chalk.white(concept.cornerRadius)}   ${t('shadowsLabel')} ${chalk.white(concept.shadows)}   ${t('animationLabel')} ${chalk.white(concept.animations)}`);
  console.log(`    ${t('darkModeLabel')} ${chalk.white(concept.darkMode)}`);

  console.log(chalk.gray(`\n  ${t('previewLabel').replace(':', '')} — ${t('styleLabel').replace(':', '')}`));
  console.log('    ' + chalk.gray(concept.layoutStyle));

  console.log(chalk.gray(`\n  ${t('characterLabel')}`));
  concept.mood.split('. ').filter(Boolean).forEach(s => {
    console.log(`    ${chalk.white('• ' + s.trim())}`);
  });
  console.log(chalk.gray(`\n  ${t('inspirationLabel')} ${concept.inspiration}`));

  console.log(chalk.gray(`\n  ${t('previewLabel')}`));
  const navBg   = textOnBg(c.primary, `  ◉ ${concept.name}                    `);
  const btnPrim = textOnBg(c.primary, '  Primary Action  ');
  const btnSec  = chalk.hex(c.primary)('[ Secondary Action ]');
  console.log('    ' + navBg);
  console.log('    ' + chalk.bgHex(c.background).hex(c.text)('  Main Content / Card                 '));
  console.log('    ' + chalk.bgHex(c.surface).hex(c.text)('  Raised Surface / Modal               '));
  console.log(`    ${btnPrim}  ${btnSec}`);

  console.log('\n' + border + '\n');
}

// ── Display all 3 concepts ────────────────────────────────────────────────────
function displayAllConcepts(concepts) {
  console.log(chalk.bold.cyan('\n\n╔══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║   ${t('designTitle').padEnd(57)}║`));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝'));
  concepts.forEach((c, i) => displayConcept(c, i));
}

// ── Generate concepts from Claude ─────────────────────────────────────────────
async function generateConcepts(client, requirements, refinementHistory) {
  const isRefinement = refinementHistory.length > 0;

  const messages = isRefinement
    ? refinementHistory
    : [{ role: 'user', content:
        `Create 3 different design proposals for the following application.\n\nRequirements:\n${requirements}\n\nJSON schema:\n${CONCEPT_SCHEMA}` }];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: [{ type: 'text', text: isRefinement ? getRefinerSystem() : GENERATOR_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  const raw = response.content.find(b => b.type === 'text')?.text || '[]';
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to generate valid design proposals.');
  return JSON.parse(jsonMatch[0]);
}

// ── Format chosen design as a requirements appendix ───────────────────────────
function formatDesignSpec(concept) {
  const c = concept.colors;
  return `
## Selected Design Spec — ${concept.name}
### Character
${concept.mood}

### Color Palette
- Primary:    ${c.primary}
- Secondary:  ${c.secondary}
- Accent:     ${c.accent}
- Background: ${c.background}
- Surface:    ${c.surface}
- Text:       ${c.text}

### Typography
- Headings: ${concept.typography.heading}
- Body:     ${concept.typography.body}
- Style:    ${concept.typography.style}

### Style
- Corners:   ${concept.cornerRadius}
- Shadows:   ${concept.shadows}
- Animation: ${concept.animations}
- Dark mode: ${concept.darkMode}

### Interface Structure
${concept.layoutStyle}

### Inspiration
${concept.inspiration}`.trim();
}

// ── Main export ───────────────────────────────────────────────────────────────
async function runDesignPicker(requirements, ask) {
  const client = new Anthropic();

  console.log(chalk.bold.cyan(`\n${t('generatingDesigns')}`));

  let concepts = await generateConcepts(client, requirements, []);
  displayAllConcepts(concepts);

  const refinementHistory = [
    {
      role: 'user',
      content: `Here are the requirements:\n${requirements}\n\nCurrent design proposals:\n${JSON.stringify(concepts, null, 2)}`,
    },
    {
      role: 'assistant',
      content: JSON.stringify(concepts),
    },
  ];

  console.log(chalk.bold.yellow(t('designOpts') + '\n'));
  console.log(chalk.white(t('designOptPick')));
  console.log(chalk.white(t('designOptRefine')));
  console.log(chalk.white(t('designOptSkip') + '\n'));

  while (true) {
    const input = (await ask(chalk.bold.green(t('chooseDesign')))).trim();
    if (!input) continue;

    if (input === 'skip') {
      console.log(chalk.gray(`\n${t('designSkipped')}`));
      return null;
    }

    const pick = parseInt(input, 10);
    if ([1, 2, 3].includes(pick)) {
      const chosen = concepts[pick - 1];
      console.log(chalk.bold.green(`\n${t('designSelected', pick, chosen.name)}`));
      displayConcept(chosen, pick - 1);

      const confirm = (await ask(chalk.bold.green(t('confirmSelection')))).trim().toLowerCase();
      if (confirm === 'y' || confirm === 'yes' || confirm === '') {
        return formatDesignSpec(chosen);
      }
      console.log(chalk.gray(`\n${t('continueRefining')}\n`));
      continue;
    }

    console.log(chalk.cyan(`\n${t('refining')}`));
    refinementHistory.push({ role: 'user', content: input });

    try {
      concepts = await generateConcepts(client, requirements, refinementHistory);
      refinementHistory.push({ role: 'assistant', content: JSON.stringify(concepts) });
      displayAllConcepts(concepts);

      console.log(chalk.bold.yellow('\n' + t('designNow')));
      console.log(chalk.white(t('designNowOpts') + '\n'));
    } catch (err) {
      console.log(chalk.red(`\n⚠️  Error updating designs: ${err.message}`));
    }
  }
}

module.exports = { runDesignPicker };
