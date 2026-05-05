'use strict';

const fs   = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createSquadPmSpecAgent, createSquadPmReviewAgent, createSquadPmUpdateSpecAgent } = require('./agents/squadPmAgent');

const SQUAD_DEV_AGENTS  = new Set(['backendDev', 'frontendDev', 'authAgent', 'integrationAgent']);
const CLEANUP_AGENTS    = ['squadErrorHandlingAgent', 'squadCodeCleanupAgent', 'squadDeduplicationAgent'];
const MAX_QA_FIX_ROUNDS = 2;

// ── Single-agent runner with retry ───────────────────────────────────────────
async function _runSingleAgent(agentName, contextStr, squad, context, toolSets, agentRegistry) {
  const createAgent = agentRegistry[agentName];
  if (!createAgent) return null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const needsShell = agentName === 'squadQaAgent';
      const toolSet = needsShell ? toolSets.all : toolSets.fs;
      const agent = createAgent(toolSet);
      const result = await agent.run(contextStr);
      context.addAgentOutput(`${squad.id}:${agentName}`, result.summary, result.filesCreated);
      console.log(chalk.green(`    [${squad.name}] ${agentName} done — ${result.filesCreated.length} file(s)`));
      return result;
    } catch (err) {
      if (attempt === 2) {
        console.log(chalk.red(`    [${squad.name}] ${agentName} failed: ${err.message}`));
        return { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] };
      }
      console.log(chalk.yellow(`    [${squad.name}] ${agentName} failed (attempt 1) — retrying...`));
    }
  }
}

// ── Check if QA report indicates issues ──────────────────────────────────────
function _qaHasIssues(context, squad) {
  const qaReportPath = path.join(context.outputDir, 'docs', 'squads', `${squad.id}-qa-report.md`);
  if (!fs.existsSync(qaReportPath)) return false;
  const content = fs.readFileSync(qaReportPath, 'utf8');
  return /FAIL|FAILING|ERROR|ISSUE|BUG|BROKEN|❌|✗/i.test(content) &&
         !/ALL PASS|ALL TESTS PASS|NO ISSUES|0 FAILING/i.test(content);
}

// ── Run dev agents — contextFn(agentName) builds the context string ───────────
async function _runDevAgents(squad, agents, context, toolSets, agentRegistry, contextFn, label = 'Running') {
  const results = {};
  for (const agentName of agents) {
    console.log(chalk.cyan(`    [${squad.name}] ${label} ${agentName}...`));
    const result = await _runSingleAgent(agentName, contextFn(agentName), squad, context, toolSets, agentRegistry);
    if (result) results[agentName] = result;
  }
  return results;
}

// ── QA fix loop (shared between initial build and update mode) ────────────────
async function _runQaFixLoop(squad, fixFn, qaContextFn, context, toolSets, agentRegistry) {
  for (let round = 1; round <= MAX_QA_FIX_ROUNDS; round++) {
    if (!_qaHasIssues(context, squad)) {
      console.log(chalk.green(`    [${squad.name}] QA: all tests passing ✅`));
      break;
    }
    console.log(chalk.yellow(`    [${squad.name}] QA fix round ${round}/${MAX_QA_FIX_ROUNDS}...`));
    await fixFn();
    console.log(chalk.bold.yellow(`    [${squad.name}] QA re-check after fix round ${round}...`));
    await _runSingleAgent('squadQaAgent', qaContextFn(), squad, context, toolSets, agentRegistry);
    if (round >= MAX_QA_FIX_ROUNDS && _qaHasIssues(context, squad)) {
      console.log(chalk.gray(`    [${squad.name}] Max QA fix rounds reached — continuing.`));
    }
  }
}

// ── PM gaps fix round (shared between initial build and update mode) ──────────
async function _handlePmGaps(squad, verdict, fixFn, qaContextFn, context, toolSets, agentRegistry) {
  if (verdict !== 'GAPS') return;
  console.log(chalk.yellow(`    [${squad.name}] PM found gaps — running fix round...`));
  await fixFn();
  context.setSquadGaps(squad.id, null);
  if (agentRegistry['squadQaAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] QA re-check after PM fix round...`));
    await _runSingleAgent('squadQaAgent', qaContextFn(), squad, context, toolSets, agentRegistry);
  }
  console.log(chalk.bold.yellow(`    [${squad.name}] PM re-reviewing after fix...`));
  await _runPmReview(squad, context, toolSets);
}

// ── PM review — returns 'ACCEPTED', 'GAPS', or 'UNKNOWN' ─────────────────────
async function _runPmReview(squad, context, toolSets) {
  try {
    const reviewAgent = createSquadPmReviewAgent(toolSets.fs);
    await reviewAgent.run(context.buildSquadPmReviewContext(squad));

    const reviewPath = path.join(context.outputDir, 'docs', 'squads', `${squad.id}-review.md`);
    if (!fs.existsSync(reviewPath)) return 'UNKNOWN';

    const content = fs.readFileSync(reviewPath, 'utf8');
    if (content.includes('VERDICT: ACCEPTED')) {
      console.log(chalk.bold.green(`    [${squad.name}] PM verdict: ACCEPTED ✅`));
      return 'ACCEPTED';
    }
    if (content.includes('VERDICT: GAPS')) {
      console.log(chalk.yellow(`    [${squad.name}] PM verdict: GAPS — fix round triggered`));
      context.setSquadGaps(squad.id, content);
      return 'GAPS';
    }
    return 'UNKNOWN';
  } catch (err) {
    console.log(chalk.yellow(`    [${squad.name}] PM review failed: ${err.message}`));
    return 'UNKNOWN';
  }
}

// Run one squad: PM spec → designer → devs → cleanup → CMS → QA loop → security → PM review loop
async function runSquad(squad, context, toolSets, agentRegistry, activeAgents) {
  const devAgents = (squad.agents || ['backendDev', 'frontendDev'])
    .filter(name => SQUAD_DEV_AGENTS.has(name))
    .filter(name => agentRegistry[name])
    .filter(name => activeAgents.has(name));

  const devCtx = (agentName) => context.buildSquadScopedContext(agentName, squad);
  const qaCtx  = () => context.buildSquadScopedContext('squadQaAgent', squad);
  const devFn  = () => _runDevAgents(squad, devAgents, context, toolSets, agentRegistry, devCtx);

  // Phase 1: Squad PM writes the feature spec
  console.log(chalk.bold.yellow(`    [${squad.name}] PM writing feature spec...`));
  try {
    const specAgent = createSquadPmSpecAgent(toolSets.fs);
    await specAgent.run(context.buildSquadPmSpecContext(squad));
    const specPath = path.join(context.outputDir, 'docs', 'squads', `${squad.id}-spec.md`);
    if (fs.existsSync(specPath)) {
      context.setSquadSpec(squad.id, fs.readFileSync(specPath, 'utf8'));
      console.log(chalk.green(`    [${squad.name}] Spec written → docs/squads/${squad.id}-spec.md`));
    }
  } catch (err) {
    console.log(chalk.yellow(`    [${squad.name}] Spec writing failed: ${err.message} — continuing without spec`));
  }

  // Phase 2: Squad Designer writes screen-by-screen design doc
  if (agentRegistry['squadDesignerAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] Designer writing design doc...`));
    await _runSingleAgent('squadDesignerAgent', devCtx('squadDesignerAgent'), squad, context, toolSets, agentRegistry);
  }

  // Phase 3: Dev agents implement
  const squadResults = await devFn();

  // Phases 4a–4c: Error handling, cleanup, dedup
  for (const agentName of CLEANUP_AGENTS) {
    if (agentRegistry[agentName]) {
      console.log(chalk.bold.yellow(`    [${squad.name}] ${agentName}...`));
      await _runSingleAgent(agentName, devCtx(agentName), squad, context, toolSets, agentRegistry);
    }
  }

  // Phase 5: CMS Integrator (per-squad, optional)
  if (agentRegistry['cmsIntegratorAgent'] && activeAgents.has('cmsIntegratorAgent')) {
    console.log(chalk.bold.yellow(`    [${squad.name}] CMS integration...`));
    await _runSingleAgent('cmsIntegratorAgent', devCtx('cmsIntegratorAgent'), squad, context, toolSets, agentRegistry);
  }

  // Phase 6: Squad QA with fix loop
  if (agentRegistry['squadQaAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] QA: writing + running tests...`));
    await _runSingleAgent('squadQaAgent', qaCtx(), squad, context, toolSets, agentRegistry);
    await _runQaFixLoop(squad, devFn, qaCtx, context, toolSets, agentRegistry);
  }

  // Phase 7: Squad Security review
  if (agentRegistry['squadSecurityAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] Security review...`));
    await _runSingleAgent('squadSecurityAgent', devCtx('squadSecurityAgent'), squad, context, toolSets, agentRegistry);
  }

  // Phase 8: Squad PM reviews the output
  console.log(chalk.bold.yellow(`    [${squad.name}] PM reviewing implementation...`));
  const verdict = await _runPmReview(squad, context, toolSets);

  // Phase 9: PM fix round if needed
  await _handlePmGaps(squad, verdict, devFn, qaCtx, context, toolSets, agentRegistry);

  return squadResults;
}

// Run all squads in parallel, then merge their outputs so global Layer 4 agents
// can find 'backendDev' / 'frontendDev' outputs as if one agent built the whole app.
async function runAllSquads(squadPlan, context, toolSets, agentRegistry, activeAgents) {
  const tasks = squadPlan.squads.map(async (squad) => {
    console.log(chalk.bold.cyan(`\n  ▶  Squad: ${squad.name} — ${squad.userFacingArea}`));
    const results = await runSquad(squad, context, toolSets, agentRegistry, activeAgents);
    return { squad, results };
  });

  const allSquadResults = await Promise.all(tasks);
  _mergeOutputsToContext(allSquadResults, context);

  const flatResults = {};
  for (const { squad, results } of allSquadResults) {
    for (const [agentName, result] of Object.entries(results)) {
      flatResults[`${squad.id}:${agentName}`] = result;
    }
  }
  return flatResults;
}

// Merge every squad's output for a given agent type into one combined entry.
function _mergeOutputsToContext(allSquadResults, context) {
  const byAgent = {};
  for (const { squad, results } of allSquadResults) {
    for (const [agentName, result] of Object.entries(results)) {
      if (result.error) continue;
      if (!byAgent[agentName]) byAgent[agentName] = [];
      byAgent[agentName].push({ squad, result });
    }
  }
  for (const [agentName, entries] of Object.entries(byAgent)) {
    const mergedSummary = entries
      .map(({ squad, result }) => `## ${squad.name}\n${result.summary}`)
      .join('\n\n');
    const mergedFiles = entries.flatMap(({ result }) => result.filesCreated);
    context.addAgentOutput(agentName, mergedSummary, mergedFiles);
  }
}

// ── Update mode ───────────────────────────────────────────────────────────────
async function runSquadUpdate(squad, changeDescription, context, toolSets, agentRegistry, activeAgents) {
  const devAgents = (squad.agents || ['backendDev', 'frontendDev'])
    .filter(name => SQUAD_DEV_AGENTS.has(name))
    .filter(name => agentRegistry[name])
    .filter(name => activeAgents.has(name));

  const devCtx = (agentName) => context.buildSquadUpdateContext(agentName, squad, changeDescription);
  const qaCtx  = () => context.buildSquadUpdateContext('squadQaAgent', squad, changeDescription);
  const devFn  = () => _runDevAgents(squad, devAgents, context, toolSets, agentRegistry, devCtx, 'Updating');

  // Phase 1: Update the PM spec
  console.log(chalk.bold.yellow(`    [${squad.name}] PM updating feature spec...`));
  try {
    const specAgent = createSquadPmUpdateSpecAgent(toolSets.fs);
    await specAgent.run(context.buildSquadPmUpdateSpecContext(squad, changeDescription));
    const specPath = path.join(context.outputDir, 'docs', 'squads', `${squad.id}-spec.md`);
    if (fs.existsSync(specPath)) {
      context.setSquadSpec(squad.id, fs.readFileSync(specPath, 'utf8'));
      console.log(chalk.green(`    [${squad.name}] Spec updated`));
    }
  } catch (err) {
    console.log(chalk.yellow(`    [${squad.name}] Spec update failed: ${err.message} — continuing`));
  }

  // Phase 2: Dev agents apply the change
  const squadResults = await devFn();

  // Phase 3: Error handling, cleanup, dedup on updated code
  for (const agentName of CLEANUP_AGENTS) {
    if (agentRegistry[agentName]) {
      console.log(chalk.bold.yellow(`    [${squad.name}] ${agentName} on updated code...`));
      await _runSingleAgent(agentName, devCtx(agentName), squad, context, toolSets, agentRegistry);
    }
  }

  // Phase 4: QA with fix loop
  if (agentRegistry['squadQaAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] QA on updated code...`));
    await _runSingleAgent('squadQaAgent', qaCtx(), squad, context, toolSets, agentRegistry);
    await _runQaFixLoop(squad, devFn, qaCtx, context, toolSets, agentRegistry);
  }

  // Phase 5: Security
  if (agentRegistry['squadSecurityAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] Security review on updated code...`));
    await _runSingleAgent('squadSecurityAgent', devCtx('squadSecurityAgent'), squad, context, toolSets, agentRegistry);
  }

  // Phase 6: PM review + optional fix round
  console.log(chalk.bold.yellow(`    [${squad.name}] PM reviewing update...`));
  const verdict = await _runPmReview(squad, context, toolSets);
  await _handlePmGaps(squad, verdict, devFn, qaCtx, context, toolSets, agentRegistry);

  return squadResults;
}

async function runAllSquadsUpdate(updatePlan, context, toolSets, agentRegistry, activeAgents) {
  const tasks = [
    ...updatePlan.affectedSquads.map(({ id, changeDescription }) => async () => {
      const squad = context.squadPlan.squads.find(s => s.id === id);
      if (!squad) {
        console.log(chalk.yellow(`  ⚠️   Squad "${id}" not found — skipping.`));
        return null;
      }
      console.log(chalk.bold.cyan(`\n  ✏️   Updating Squad: ${squad.name}`));
      const results = await runSquadUpdate(squad, changeDescription, context, toolSets, agentRegistry, activeAgents);
      return { squad, results };
    }),
    ...updatePlan.newSquads.map(squad => async () => {
      console.log(chalk.bold.cyan(`\n  🆕  New Squad: ${squad.name}`));
      const results = await runSquad(squad, context, toolSets, agentRegistry, activeAgents);
      return { squad, results };
    }),
  ];

  const allResults = (await Promise.all(tasks.map(t => t()))).filter(Boolean);
  _mergeOutputsToContext(allResults, context);

  const flatResults = {};
  for (const { squad, results } of allResults) {
    for (const [agentName, result] of Object.entries(results)) {
      flatResults[`${squad.id}:${agentName}`] = result;
    }
  }
  return flatResults;
}

module.exports = { runAllSquads, runAllSquadsUpdate };
