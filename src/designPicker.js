'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');

// ── Prompt for generating 3 design concepts ───────────────────────────────────
const GENERATOR_SYSTEM = `You are a senior UI/UX designer and brand strategist.
Given application requirements, generate exactly 3 distinct design concepts as valid JSON.
Each concept must be meaningfully different in mood, palette, and visual personality.
Return ONLY a valid JSON array — no markdown, no explanation, just the JSON.`;

const REFINER_SYSTEM = `You are a senior UI/UX designer helping a client refine design concepts.
Communicate in English. When the client requests changes, update the concepts and return the full
updated JSON array (same format, same 3 concepts). Return ONLY valid JSON — no extra text.`;

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
    chalk.hex(c.primary).bold(`  Design ${index + 1} — ${concept.name}`) +
    chalk.gray(`  "${concept.tagline}"`)
  );
  console.log(border);

  // Color palette row
  console.log(chalk.gray('\n  Colors:'));
  console.log(
    `    ${swatch(c.primary,    'Primary')}   ` +
    `${swatch(c.secondary, 'Secondary')}   ` +
    `${swatch(c.accent,    'Accent')}`
  );
  console.log(
    `    ${swatch(c.background, 'Background')}    ` +
    `${swatch(c.surface,   'Surface')}   ` +
    `${swatch(c.text,      'Text')}`
  );

  // Typography
  console.log(chalk.gray('\n  Typography:'));
  console.log(`    Headings: ${chalk.white(concept.typography.heading)}  |  Body: ${chalk.white(concept.typography.body)}`);
  console.log(`    ${chalk.gray(concept.typography.style)}`);

  // Style details
  console.log(chalk.gray('\n  Style:'));
  console.log(`    Corners: ${chalk.white(concept.cornerRadius)}   Shadows: ${chalk.white(concept.shadows)}   Animation: ${chalk.white(concept.animations)}`);
  console.log(`    Dark mode: ${chalk.white(concept.darkMode)}`);

  // Layout preview (ASCII)
  console.log(chalk.gray('\n  Interface structure:'));
  console.log('    ' + chalk.gray(concept.layoutStyle));

  // Mood & inspiration
  console.log(chalk.gray('\n  Character:'));
  concept.mood.split('. ').filter(Boolean).forEach(s => {
    console.log(`    ${chalk.white('• ' + s.trim())}`);
  });
  console.log(chalk.gray(`\n  Inspiration: ${concept.inspiration}`));

  // Mini UI preview using the palette
  console.log(chalk.gray('\n  Preview:'));
  const navBg   = textOnBg(c.primary,    `  ◉ ${concept.name}                    `);
  const btnPrim = textOnBg(c.primary,    '  Primary Action  ');
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
  console.log(chalk.bold.cyan('║               🎨  3 Design Proposals for Your App         ║'));
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
    system: [{ type: 'text', text: isRefinement ? REFINER_SYSTEM : GENERATOR_SYSTEM, cache_control: { type: 'ephemeral' } }],
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

  console.log(chalk.bold.cyan('\n🎨  Generating 3 design proposals tailored to your app...'));

  let concepts = await generateConcepts(client, requirements, []);
  displayAllConcepts(concepts);

  // Refinement conversation history (for REFINER_SYSTEM)
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

  console.log(chalk.bold.yellow('What would you like to do?\n'));
  console.log(chalk.white('  • Type 1, 2, or 3 — to choose a design'));
  console.log(chalk.white('  • Type a request — to modify / combine designs (e.g. "I like 1 but with the colors of 2")'));
  console.log(chalk.white('  • Type "skip" — to continue to development without choosing a design\n'));

  while (true) {
    const input = (await ask(chalk.bold.green('▶  Choice or request: '))).trim();

    if (!input) continue;

    // Skip design picking
    if (input === 'skip') {
      console.log(chalk.gray('\n⏭️   Continuing to development without a selected design.'));
      return null;
    }

    // Direct selection: "1", "2", "3"
    const pick = parseInt(input, 10);
    if ([1, 2, 3].includes(pick)) {
      const chosen = concepts[pick - 1];
      console.log(chalk.bold.green(`\n✅  Design ${pick} selected — ${chosen.name}`));
      displayConcept(chosen, pick - 1);

      const confirm = (await ask(chalk.bold.green('▶  Confirm selection and continue to development? (y/n): '))).trim().toLowerCase();
      if (confirm === 'y' || confirm === 'yes' || confirm === '') {
        return formatDesignSpec(chosen);
      }
      // User wants to continue refining
      console.log(chalk.gray('\n💬  Continue refining the design:\n'));
      continue;
    }

    // Refinement request — send to Claude
    console.log(chalk.cyan('\n🔄  Refining designs based on your request...'));

    refinementHistory.push({ role: 'user', content: input });

    try {
      concepts = await generateConcepts(client, requirements, refinementHistory);
      refinementHistory.push({ role: 'assistant', content: JSON.stringify(concepts) });
      displayAllConcepts(concepts);

      console.log(chalk.bold.yellow('\nWhat would you like to do now?'));
      console.log(chalk.white('  • Type 1, 2, or 3 to choose  •  Continue refining  •  Type "skip" to skip\n'));
    } catch (err) {
      console.log(chalk.red(`\n⚠️  Error updating designs: ${err.message}`));
    }
  }
}

module.exports = { runDesignPicker };
