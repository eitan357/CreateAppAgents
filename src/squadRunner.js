'use strict';

const fs   = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createSquadPmSpecAgent, createSquadPmReviewAgent } = require('./agents/squadPmAgent');

// Layer 3 agents eligible to run inside a squad
const SQUAD_ELIGIBLE_AGENTS = new Set(['backendDev', 'frontendDev', 'authAgent', 'integrationAgent']);

// Run one squad: PM spec → dev agents → PM review → (optional) fix round
async function runSquad(squad, context, toolSets, agentRegistry, activeAgents) {
  const agents = (squad.agents || ['backendDev', 'frontendDev'])
    .filter(name => SQUAD_ELIGIBLE_AGENTS.has(name))
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

  // ── Phase 2: Dev agents implement ────────────────────────────────────────
  const squadResults = await _runDevAgents(squad, agents, context, toolSets, agentRegistry);

  // ── Phase 3: Squad PM reviews the output ─────────────────────────────────
  console.log(chalk.bold.yellow(`    [${squad.name}] PM reviewing implementation...`));
  const verdict = await _runPmReview(squad, context, toolSets);

  // ── Phase 4: One fix round if PM found gaps ───────────────────────────────
  if (verdict === 'GAPS') {
    console.log(chalk.yellow(`    [${squad.name}] PM found gaps — running fix round...`));
    await _runDevAgents(squad, agents, context, toolSets, agentRegistry);
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
    const createAgent = agentRegistry[agentName];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const agent = createAgent(toolSets.fs);
        const result = await agent.run(context.buildSquadScopedContext(agentName, squad));
        context.addAgentOutput(`${squad.id}:${agentName}`, result.summary, result.filesCreated);
        console.log(chalk.green(`    [${squad.name}] ${agentName} done — ${result.filesCreated.length} file(s)`));
        results[agentName] = result;
        break;
      } catch (err) {
        if (attempt === 2) {
          console.log(chalk.red(`    [${squad.name}] ${agentName} failed: ${err.message}`));
          results[agentName] = { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] };
        } else {
          console.log(chalk.yellow(`    [${squad.name}] ${agentName} failed (attempt 1) — retrying...`));
        }
      }
    }
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

// Run all squads in parallel, then merge their outputs so Layer 4 agents
// (testWriter, reviewer, security) can find 'backendDev' / 'frontendDev' outputs
// as if one agent had built the whole app.
async function runAllSquads(squadPlan, context, toolSets, agentRegistry, activeAgents) {
  const tasks = squadPlan.squads.map(async (squad) => {
    console.log(chalk.bold.cyan(`\n  ▶  Squad: ${squad.name} — ${squad.userFacingArea}`));
    const results = await runSquad(squad, context, toolSets, agentRegistry, activeAgents);
    return { squad, results };
  });

  const allSquadResults = await Promise.all(tasks);

  // Merge per-agent-type summaries into standard keys for downstream platform agents
  _mergeOutputsToContext(allSquadResults, context);

  // Flatten to { 'squadId:agentName': result } for the approval gate / failure check
  const flatResults = {};
  for (const { squad, results } of allSquadResults) {
    for (const [agentName, result] of Object.entries(results)) {
      flatResults[`${squad.id}:${agentName}`] = result;
    }
  }
  return flatResults;
}

// Merge every squad's output for a given agent type into one combined entry.
// e.g. 'backendDev' = Auth Squad summary + Listings Squad summary + ...
// This lets Layer 4 agents (testWriter, reviewer) use the existing DEPENDENCY_MAP
// without any changes — they look up 'backendDev' and get everything.
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

module.exports = { runAllSquads };
