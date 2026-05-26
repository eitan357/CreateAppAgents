'use strict';

const chalk = require('chalk');
const { getDefaultModels, MODEL_OPTIONS } = require('./agentModels');

// ── Per-group display info ────────────────────────────────────────────────────
const GROUP_INFO = {
  light: {
    label:    'Light agents',
    examples: 'documentation, devops, deploymentAdvisor, analyticsMonitoring, seoAgent, appStorePublisher, localization, businessPlanning',
    desc:     'Formatting, docs, config, publishing — output quality is less sensitive to model power.',
  },
  medium: {
    label:    'Medium agents',
    examples: 'requirementsAnalyst, systemArchitect, apiDesigner, uxDesigner, reviewer, testWriter, codeQualityAudit, leaders team',
    desc:     'Analysis, design, review, planning — benefit from deeper reasoning.',
  },
  heavy: {
    label:    'Heavy agents',
    examples: 'backendDev, frontendDev, authAgent, testRunner, testFixer, security, uiPrimitives, platformPipeline, mobile features',
    desc:     'Core implementation — most time-consuming, highest impact on code quality.',
  },
};

// preset → human label + $/MTok (input)
const PRESET_DISPLAY = {
  haiku:          { label: 'Haiku 4.5         ', price: '$1/MTok in  · $5/MTok out' },
  sonnet:         { label: 'Sonnet 4.6        ', price: '$3/MTok in  · $15/MTok out' },
  sonnetThinking: { label: 'Sonnet 4.6 + Think', price: '$3/MTok in  · $15/MTok out  (extended thinking enabled)' },
  opus:           { label: 'Opus 4.7          ', price: '$5/MTok in  · $25/MTok out' },
};

function describeConfig(cfg) {
  for (const [key, opt] of Object.entries(MODEL_OPTIONS)) {
    if (opt.model === cfg.model && opt.max_tokens === cfg.max_tokens
        && JSON.stringify(opt.thinking) === JSON.stringify(cfg.thinking)) {
      const d = PRESET_DISPLAY[key];
      return `${d.label}  (${d.price})`;
    }
  }
  return `${cfg.model} / max_tokens=${cfg.max_tokens}`;
}

// ── Interactive selection for a single group ──────────────────────────────────
async function selectGroupModel(groupKey, currentConfig, askFn) {
  const info = GROUP_INFO[groupKey];
  console.log(chalk.bold.cyan(`\n  ── ${info.label} ──`));
  console.log(chalk.gray(`     ${info.desc}`));
  console.log(chalk.gray(`     Examples: ${info.examples}`));
  console.log('');

  const presets = Object.entries(PRESET_DISPLAY);
  presets.forEach(([key, d], i) => {
    const isCurrent = JSON.stringify(MODEL_OPTIONS[key]) === JSON.stringify(currentConfig);
    const marker = isCurrent ? chalk.bold.green(' ◀ current') : '';
    console.log(chalk.white(`    ${i + 1}.  ${d.label}  — ${d.price}${marker}`));
  });
  console.log('');

  while (true) {
    const input = (await askFn(chalk.bold.green(`     ▶  Choose (1-${presets.length}) [Enter = keep current]: `))).trim();
    if (input === '') return { ...currentConfig };
    const idx = parseInt(input, 10) - 1;
    if (idx >= 0 && idx < presets.length) {
      return { ...MODEL_OPTIONS[presets[idx][0]] };
    }
    console.log(chalk.red(`     Please enter a number between 1 and ${presets.length}.`));
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
async function selectAgentModels(plan, askFn) {
  const tier = plan.tier ?? 3;
  const defaults = getDefaultModels(tier);

  if (global._mockMode) return defaults;

  const { ask: _ask } = require('./approval');
  const ask = askFn || _ask;

  console.log(chalk.bold.cyan('\n━━━  Agent Model Selection  ━━━'));
  console.log(chalk.gray('Each agent group uses its own model. You can keep the defaults or customize.\n'));

  for (const [group, cfg] of Object.entries(defaults)) {
    const info = GROUP_INFO[group];
    console.log(chalk.white(`  ${info.label.padEnd(16)}  →  ${describeConfig(cfg)}`));
  }
  console.log('');

  const choice = (await ask(chalk.bold.green('▶  Continue with defaults (y) or customize (c)? [default: y]: '))).trim().toLowerCase();

  if (choice !== 'c' && choice !== 'customize') {
    console.log(chalk.green('  ✅  Using default model configuration.\n'));
    return defaults;
  }

  console.log(chalk.gray('\n  Customize each group — press Enter to keep the current selection.\n'));

  const configs = {};
  for (const group of ['light', 'medium', 'heavy']) {
    configs[group] = await selectGroupModel(group, defaults[group], ask);
    console.log(chalk.green(`     ✓  ${GROUP_INFO[group].label}: ${describeConfig(configs[group])}`));
  }

  console.log(chalk.bold.green('\n  ✅  Model configuration saved.\n'));
  return configs;
}

module.exports = { selectAgentModels };
