'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getLangInstruction, t } = require('./lang');
const { withRetry } = require('./withRetry');

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

  const response = await withRetry(() => client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: [{ type: 'text', text: isRefinement ? getRefinerSystem() : GENERATOR_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages,
  }), 'designPicker');

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

// ── HTML preview ──────────────────────────────────────────────────────────────
function generateHtmlPreview(concepts, outputDir) {
  const fonts = [...new Set(
    concepts.flatMap(c => [c.typography.heading, c.typography.body])
  )].map(f => f.replace(/ /g, '+')).join('&family=');

  const cardHtml = concepts.map((c, i) => {
    const col = c.colors;
    const swatches = [
      ['Primary',    col.primary],
      ['Secondary',  col.secondary],
      ['Accent',     col.accent],
      ['Background', col.background],
      ['Surface',    col.surface],
      ['Text',       col.text],
    ].map(([label, hex]) => `
      <div class="swatch-item">
        <div class="swatch-box" style="background:${hex}"></div>
        <div class="swatch-label">${label}<br><span>${hex}</span></div>
      </div>`).join('');

    const moodBullets = c.mood.split('. ').filter(Boolean)
      .map(s => `<li>${s.trim()}</li>`).join('');

    return `
    <div class="card">
      <div class="card-header" style="background:${col.primary}; font-family:'${c.typography.heading}',sans-serif">
        <span class="card-num">${i + 1}</span>
        <div>
          <div class="card-name">${c.name}</div>
          <div class="card-tagline">"${c.tagline}"</div>
        </div>
      </div>

      <div class="card-body" style="background:${col.background}; color:${col.text}">

        <section class="section">
          <h3 style="font-family:'${c.typography.heading}',sans-serif">Color Palette</h3>
          <div class="swatches">${swatches}</div>
        </section>

        <section class="section">
          <h3 style="font-family:'${c.typography.heading}',sans-serif">Typography</h3>
          <p style="font-family:'${c.typography.heading}',sans-serif; font-size:1.4rem; margin:0 0 4px">
            Heading — ${c.typography.heading}
          </p>
          <p style="font-family:'${c.typography.body}',sans-serif; margin:0 0 4px">
            Body — ${c.typography.body}
          </p>
          <p class="meta">${c.typography.style}</p>
        </section>

        <section class="section">
          <h3 style="font-family:'${c.typography.heading}',sans-serif">UI Preview</h3>
          <div class="ui-preview" style="border-radius:${c.cornerRadius === 'Sharp' ? '2px' : c.cornerRadius === 'Medium' ? '8px' : '16px'}; overflow:hidden; border:1px solid ${col.surface}">
            <div class="ui-nav" style="background:${col.primary}; font-family:'${c.typography.heading}',sans-serif">
              <span style="font-weight:700">◉ ${c.name}</span>
              <span style="opacity:.7; font-size:.8rem">Home · Features · Pricing</span>
            </div>
            <div class="ui-content" style="background:${col.background}; color:${col.text}; font-family:'${c.typography.body}',sans-serif">
              <div class="ui-card" style="background:${col.surface}; border-radius:${c.cornerRadius === 'Sharp' ? '2px' : c.cornerRadius === 'Medium' ? '8px' : '16px'}; box-shadow:${c.shadows === 'None' ? 'none' : c.shadows === 'Subtle' ? '0 2px 8px rgba(0,0,0,.08)' : '0 8px 32px rgba(0,0,0,.18)'}">
                <p style="margin:0 0 12px; font-family:'${c.typography.heading}',sans-serif; font-weight:700">Sample Card</p>
                <p style="margin:0 0 16px; font-size:.9rem; opacity:.75">This is how content will look inside the application surfaces and modals.</p>
                <div class="ui-buttons">
                  <button style="background:${col.primary}; color:#fff; border:none; padding:8px 18px; border-radius:${c.cornerRadius === 'Sharp' ? '2px' : c.cornerRadius === 'Medium' ? '6px' : '999px'}; font-family:'${c.typography.body}',sans-serif; cursor:pointer">Primary Action</button>
                  <button style="background:transparent; color:${col.primary}; border:2px solid ${col.primary}; padding:8px 18px; border-radius:${c.cornerRadius === 'Sharp' ? '2px' : c.cornerRadius === 'Medium' ? '6px' : '999px'}; font-family:'${c.typography.body}',sans-serif; cursor:pointer">Secondary</button>
                  <button style="background:${col.accent}; color:#fff; border:none; padding:8px 18px; border-radius:${c.cornerRadius === 'Sharp' ? '2px' : c.cornerRadius === 'Medium' ? '6px' : '999px'}; font-family:'${c.typography.body}',sans-serif; cursor:pointer">Accent</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <h3 style="font-family:'${c.typography.heading}',sans-serif">Style Details</h3>
          <div class="tags">
            <span class="tag" style="background:${col.surface}">Corners: ${c.cornerRadius}</span>
            <span class="tag" style="background:${col.surface}">Shadows: ${c.shadows}</span>
            <span class="tag" style="background:${col.surface}">Animation: ${c.animations}</span>
            <span class="tag" style="background:${col.surface}">Dark mode: ${c.darkMode}</span>
          </div>
          <p class="meta" style="margin-top:10px">${c.layoutStyle}</p>
        </section>

        <section class="section">
          <h3 style="font-family:'${c.typography.heading}',sans-serif">Character</h3>
          <ul class="mood-list">${moodBullets}</ul>
          <p class="meta">Inspired by: ${c.inspiration}</p>
        </section>

      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Concepts</title>
  <link href="https://fonts.googleapis.com/css2?family=${fonts}&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #eee; padding: 32px 24px; min-height: 100vh; }
    h1 { text-align: center; font-size: 1.6rem; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .subtitle { text-align: center; color: #888; margin-bottom: 32px; font-size: .95rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 28px; max-width: 1300px; margin: 0 auto; }
    .card { border-radius: 12px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,.5); display: flex; flex-direction: column; }
    .card-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; color: #fff; }
    .card-num { font-size: 2rem; font-weight: 900; opacity: .9; min-width: 32px; }
    .card-name { font-size: 1.3rem; font-weight: 700; }
    .card-tagline { font-size: .85rem; opacity: .75; margin-top: 2px; }
    .card-body { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
    .section h3 { font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; opacity: .5; margin-bottom: 12px; }
    .swatches { display: flex; flex-wrap: wrap; gap: 10px; }
    .swatch-item { display: flex; align-items: center; gap: 8px; }
    .swatch-box { width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,.1); flex-shrink: 0; }
    .swatch-label { font-size: .75rem; line-height: 1.4; }
    .swatch-label span { opacity: .55; font-size: .68rem; }
    .ui-nav { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; color: #fff; }
    .ui-content { padding: 16px; }
    .ui-card { padding: 16px; }
    .ui-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag { padding: 4px 10px; border-radius: 999px; font-size: .78rem; opacity: .85; }
    .mood-list { padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: .9rem; opacity: .85; }
    .meta { font-size: .82rem; opacity: .6; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Design Concepts</h1>
  <p class="subtitle">Choose a concept in the terminal — type 1, 2, or 3 to select, or describe changes to refine.</p>
  <div class="grid">${cardHtml}</div>
</body>
</html>`;

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, 'design-preview.html');
    fs.writeFileSync(filePath, html, 'utf8');
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'cmd'
      : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', filePath] : [filePath];
    spawn(opener, args, { detached: true, stdio: 'ignore' }).unref();
    return filePath;
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
async function runDesignPicker(requirements, ask, outputDir) {
  const client = new Anthropic();

  console.log(chalk.bold.cyan(`\n${t('generatingDesigns')}`));

  let concepts = await generateConcepts(client, requirements, []);
  displayAllConcepts(concepts);
  if (outputDir) {
    const previewPath = generateHtmlPreview(concepts, outputDir);
    if (previewPath) console.log(chalk.gray(`  🌐  Preview opened in browser — ${previewPath}\n`));
  }

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
      if (outputDir) generateHtmlPreview(concepts, outputDir);

      console.log(chalk.bold.yellow('\n' + t('designNow')));
      console.log(chalk.white(t('designNowOpts') + '\n'));
    } catch (err) {
      console.log(chalk.red(`\n⚠️  Error updating designs: ${err.message}`));
    }
  }
}

module.exports = { runDesignPicker };
