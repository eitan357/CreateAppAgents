'use strict';

const fs   = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createSquadPmSpecAgent, createSquadPmReviewAgent, createSquadPmUpdateSpecAgent } = require('./agents/squadPmAgent');

// Dev agents eligible to run inside a squad
const SQUAD_DEV_AGENTS = new Set(['backendDev', 'frontendDev', 'authAgent', 'integrationAgent']);

// New per-squad specialist agents (run after dev agents)
const SQUAD_SPECIALIST_AGENTS = ['squadDesignerAgent', 'squadCleanupAgent', 'squadQaAgent', 'squadSecurityAgent'];

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

// Run one squad: PM spec → designer → dev agents → cleanup → QA → security → PM review
async function runSquad(squad, context, toolSets, agentRegistry, activeAgents) {
  const devAgents = (squad.agents || ['backendDev', 'frontendDev'])
    .filter(name => SQUAD_DEV_AGENTS.has(name))
    .filter(name => agentRegistry[name])
    .filter(name => activeAgents.has(name));

  // ── Phase 1: Squad PM writes the feature spec ─────────────────────────────
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

  // ── Phase 2: Squad Designer writes screen-by-screen design doc ───────────
  if (agentRegistry['squadDesignerAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] Designer writing design doc...`));
    await _runSingleAgent('squadDesignerAgent',
      context.buildSquadScopedContext('squadDesignerAgent', squad),
      squad, context, toolSets, agentRegistry);
  }

  // ── Phase 3: Dev agents implement ────────────────────────────────────────
  const squadResults = await _runDevAgents(squad, devAgents, context, toolSets, agentRegistry);

  // ── Phase 4: Squad Cleanup (error handling + code cleanup) ───────────────
  if (agentRegistry['squadCleanupAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] Cleanup: error handling + code cleanup...`));
    await _runSingleAgent('squadCleanupAgent',
      context.buildSquadScopedContext('squadCleanupAgent', squad),
      squad, context, toolSets, agentRegistry);
  }

  // ── Phase 5: Squad QA (tests + review + accessibility) ───────────────────
  if (agentRegistry['squadQaAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] QA: writing + running tests...`));
    await _runSingleAgent('squadQaAgent',
      context.buildSquadScopedContext('squadQaAgent', squad),
      squad, context, toolSets, agentRegistry);
  }

  // ── Phase 6: Squad Security review ───────────────────────────────────────
  if (agentRegistry['squadSecurityAgent']) {
    console.log(chalk.bold.yellow(`    [${squad.name}] Security review...`));
    await _runSingleAgent('squadSecurityAgent',
      context.buildSquadScopedContext('squadSecurityAgent', squad),
      squad, context, toolSets, agentRegistry);
  }

  // ── Phase 7: Squad PM reviews the output ─────────────────────────────────
  console.log(chalk.bold.yellow(`    [${squad.name}] PM reviewing implementation...`));
  const verdict = await _runPmReview(squad, context, toolSets);

  // ── Phase 8: One fix round if PM found gaps ───────────────────────────────
  if (verdict === 'GAPS') {
    console.log(chalk.yellow(`    [${squad.name}] PM found gaps — running fix round...`));
    await _runDevAgents(squad, devAgents, context, toolSets, agentRegistry);
    context.setSquadGaps(squad.id, null);

    console.log(chalk.bold.yellow(`    [${squad.name}] PM re-reviewing after fix...`));
    await _runPmReview(squad, context, toolSets);
  }

  return squadResults;
}

// ── Dev agents (shared by initial run + fix round) ────────────────────────────
async function _runDevAgents(squad, agents, context, toolSets, agentRegistry) {
  const results = {};
  for (const agentName of agents) {
    console.log(chalk.cyan(`    [${squad.name}] Running ${agentName}...`));
    const result = await _runSingleAgent(agentName,
      context.buildSquadScopedContext(agentName, squad),
      squad, context, toolSets, agentRegistry);
    if (result) results[agentName] = result;
  }
  return results;
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
  const squadResults = await _runDevAgentsUpdate(squad, devAgents, changeDescription, context, toolSets, agentRegistry);

  // Phase 3: Cleanup + QA + Security on updated code
  for (const agentName of ['squadCleanupAgent', 'squadQaAgent', 'squadSecurityAgent']) {
    if (agentRegistry[agentName]) {
      console.log(chalk.bold.yellow(`    [${squad.name}] ${agentName} on updated code...`));
      await _runSingleAgent(agentName,
        context.buildSquadUpdateContext(agentName, squad, changeDescription),
        squad, context, toolSets, agentRegistry);
    }
  }

  // Phase 4: PM reviews
  console.log(chalk.bold.yellow(`    [${squad.name}] PM reviewing update...`));
  const verdict = await _runPmReview(squad, context, toolSets);

  if (verdict === 'GAPS') {
    console.log(chalk.yellow(`    [${squad.name}] PM found gaps — running fix round...`));
    await _runDevAgentsUpdate(squad, devAgents, changeDescription, context, toolSets, agentRegistry);
    context.setSquadGaps(squad.id, null);
    console.log(chalk.bold.yellow(`    [${squad.name}] PM re-reviewing after fix...`));
    await _runPmReview(squad, context, toolSets);
  }

  return squadResults;
}

async function _runDevAgentsUpdate(squad, agents, changeDescription, context, toolSets, agentRegistry) {
  const results = {};
  for (const agentName of agents) {
    console.log(chalk.cyan(`    [${squad.name}] Updating ${agentName}...`));
    const result = await _runSingleAgent(agentName,
      context.buildSquadUpdateContext(agentName, squad, changeDescription),
      squad, context, toolSets, agentRegistry);
    if (result) results[agentName] = result;
  }
  return results;
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
