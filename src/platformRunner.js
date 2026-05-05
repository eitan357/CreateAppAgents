'use strict';

const fs   = require('fs');
const path = require('path');
const chalk = require('chalk');
const { runLayerInParallel, runLayerSequential } = require('./layerRunner');
const { createPlatformPmReviewAgent } = require('./agents/platformPmAgent');

// Platform build agents — re-run in fix rounds
const PLATFORM_BUILD_AGENTS = ['uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent', 'dbSchemaAgent'];

// Feature infrastructure agents — run after platform build, in parallel
const PLATFORM_FEATURE_AGENTS = [
  // Mobile feature infrastructure
  'notificationsAgent', 'deepLinksAgent', 'offlineFirstAgent', 'realtimeAgent',
  'animationsAgent', 'onboardingAgent', 'monetizationAgent', 'mlMobileAgent',
  'arVrAgent', 'widgetsExtensionsAgent', 'otaUpdatesAgent',
  // Social sharing & external app integration (mobile + web)
  'socialSharingAgent',
  // Web feature infrastructure
  'responsiveDesignAgent', 'pwaAgent', 'webMonetizationAgent',
];

const MAX_PLATFORM_QA_FIX_ROUNDS = 2;

// ── Report readers ────────────────────────────────────────────────────────────

function _platformQaHasIssues(outputDir) {
  const reportPath = path.join(outputDir, 'docs', 'squads', 'platform-review.md');
  if (!fs.existsSync(reportPath)) return false;
  const content = fs.readFileSync(reportPath, 'utf8');
  return /INCOMPLETE/i.test(content) && !/VERDICT:\s*READY/i.test(content);
}

function _platformPmHasGaps(outputDir) {
  const reportPath = path.join(outputDir, 'docs', 'squads', 'platform-pm-review.md');
  if (!fs.existsSync(reportPath)) return false;
  return fs.readFileSync(reportPath, 'utf8').includes('VERDICT: GAPS');
}

// ── PM review helper ──────────────────────────────────────────────────────────

async function _runPlatformPmReview(context, toolSets) {
  try {
    const agent = createPlatformPmReviewAgent(toolSets.fs);
    const result = await agent.run(context.buildScopedContext('platformPmAgent'));
    context.addAgentOutput('platformPmReview', result.summary, result.filesCreated);
    if (_platformPmHasGaps(context.outputDir)) {
      console.log(chalk.yellow('  [Platform] PM verdict: GAPS'));
    } else {
      console.log(chalk.bold.green('  [Platform] PM verdict: ACCEPTED ✅'));
    }
    return result;
  } catch (err) {
    console.log(chalk.yellow(`  [Platform] PM review failed: ${err.message}`));
    return null;
  }
}

// ── Main platform pipeline ────────────────────────────────────────────────────

async function runPlatformPipeline(context, toolSets, agentRegistry, activeAgents) {
  const allFilesCreated = [];

  function _track(results) {
    for (const r of Object.values(results)) {
      if (r && !r.error) allFilesCreated.push(...(r.filesCreated || []));
    }
  }

  // Phase 1 — Platform PM writes the platform spec
  if (agentRegistry['platformPmAgent'] && activeAgents.has('platformPmAgent')) {
    console.log(chalk.bold.yellow('  [Platform] Phase 1 — PM writing platform spec...'));
    const r = await runLayerSequential(
      [{ name: 'platformPmAgent', needsShell: false }],
      context, toolSets, agentRegistry,
    );
    _track(r);
  }

  // Phase 2 — Platform Build agents (sequential — each builds on previous)
  const buildConfigs = PLATFORM_BUILD_AGENTS
    .filter(name => activeAgents.has(name) && agentRegistry[name])
    .map(name => ({ name, needsShell: false }));

  if (buildConfigs.length > 0) {
    console.log(chalk.bold.yellow(`  [Platform] Phase 2 — Building shared infrastructure (${buildConfigs.map(a => a.name).join(', ')})...`));
    _track(await runLayerSequential(buildConfigs, context, toolSets, agentRegistry));
  }

  // Phase 3 — Feature Infrastructure agents (parallel — independent of each other)
  const featureConfigs = PLATFORM_FEATURE_AGENTS
    .filter(name => activeAgents.has(name) && agentRegistry[name])
    .map(name => ({ name, needsShell: false }));

  if (featureConfigs.length > 0) {
    console.log(chalk.bold.yellow(`  [Platform] Phase 3 — Feature Infrastructure (${featureConfigs.length} agents in parallel)...`));
    _track(await runLayerInParallel(featureConfigs, context, toolSets, agentRegistry));
  }

  // Phase 4 — Platform QA + fix loop (max MAX_PLATFORM_QA_FIX_ROUNDS)
  if (agentRegistry['platformQaAgent'] && activeAgents.has('platformQaAgent')) {
    console.log(chalk.bold.yellow('  [Platform] Phase 4 — QA review...'));
    _track(await runLayerSequential(
      [{ name: 'platformQaAgent', needsShell: false }],
      context, toolSets, agentRegistry,
    ));

    for (let round = 1; round <= MAX_PLATFORM_QA_FIX_ROUNDS; round++) {
      if (!_platformQaHasIssues(context.outputDir)) {
        console.log(chalk.green('  [Platform] QA: all checks passing ✅'));
        break;
      }
      console.log(chalk.yellow(`  [Platform] QA found issues — fix round ${round}/${MAX_PLATFORM_QA_FIX_ROUNDS}...`));
      if (buildConfigs.length > 0) {
        _track(await runLayerSequential(buildConfigs, context, toolSets, agentRegistry));
      }
      console.log(chalk.bold.yellow(`  [Platform] QA re-check after fix round ${round}...`));
      _track(await runLayerSequential(
        [{ name: 'platformQaAgent', needsShell: false }],
        context, toolSets, agentRegistry,
      ));
      if (round >= MAX_PLATFORM_QA_FIX_ROUNDS && _platformQaHasIssues(context.outputDir)) {
        console.log(chalk.gray('  [Platform] Max QA fix rounds reached — continuing.'));
      }
    }
  }

  // Phase 5 — Platform Security review
  if (agentRegistry['platformSecurityAgent'] && activeAgents.has('platformSecurityAgent')) {
    console.log(chalk.bold.yellow('  [Platform] Phase 5 — Security review...'));
    _track(await runLayerSequential(
      [{ name: 'platformSecurityAgent', needsShell: false }],
      context, toolSets, agentRegistry,
    ));
  }

  // Phase 6 — Platform PM review
  console.log(chalk.bold.yellow('  [Platform] Phase 6 — PM reviewing implementation...'));
  const pmResult = await _runPlatformPmReview(context, toolSets);
  if (pmResult && !pmResult.error) allFilesCreated.push(...(pmResult.filesCreated || []));

  // Phase 7 — Fix round if PM found gaps (build → QA re-check → PM re-review)
  if (_platformPmHasGaps(context.outputDir)) {
    console.log(chalk.yellow('  [Platform] Phase 7 — PM found gaps — running fix round...'));
    if (buildConfigs.length > 0) {
      _track(await runLayerSequential(buildConfigs, context, toolSets, agentRegistry));
    }

    if (agentRegistry['platformQaAgent'] && activeAgents.has('platformQaAgent')) {
      console.log(chalk.bold.yellow('  [Platform] QA re-check after PM fix round...'));
      _track(await runLayerSequential(
        [{ name: 'platformQaAgent', needsShell: false }],
        context, toolSets, agentRegistry,
      ));
    }

    console.log(chalk.bold.yellow('  [Platform] PM re-reviewing after fix...'));
    const reReview = await _runPlatformPmReview(context, toolSets);
    if (reReview && !reReview.error) allFilesCreated.push(...(reReview.filesCreated || []));
  }

  console.log(chalk.bold.green('  [Platform] Pipeline complete ✅'));

  return {
    platformPipeline: {
      summary: `Platform pipeline complete — ${allFilesCreated.length} file(s) across all phases`,
      filesCreated: allFilesCreated,
    },
  };
}

module.exports = { runPlatformPipeline };
