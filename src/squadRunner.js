'use strict';

const chalk = require('chalk');

// Layer 3 agents eligible to run inside a squad
const SQUAD_ELIGIBLE_AGENTS = new Set(['backendDev', 'frontendDev', 'authAgent', 'integrationAgent']);

// Run one squad's agents sequentially (BE before FE so API contract is defined first)
async function runSquad(squad, context, toolSets, agentRegistry, activeAgents) {
  const agents = (squad.agents || ['backendDev', 'frontendDev'])
    .filter(name => SQUAD_ELIGIBLE_AGENTS.has(name))
    .filter(name => agentRegistry[name])
    .filter(name => activeAgents.has(name));

  const squadResults = {};

  for (const agentName of agents) {
    console.log(chalk.cyan(`    [${squad.name}] Running ${agentName}...`));

    const createAgent = agentRegistry[agentName];
    const toolSet = toolSets.fs; // squads never need shell access

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const agent = createAgent(toolSet);
        const contextMessage = context.buildSquadScopedContext(agentName, squad);
        const result = await agent.run(contextMessage);

        context.addAgentOutput(`${squad.id}:${agentName}`, result.summary, result.filesCreated);
        console.log(chalk.green(`    [${squad.name}] ${agentName} done — ${result.filesCreated.length} file(s)`));
        squadResults[agentName] = result;
        break;
      } catch (err) {
        if (attempt === 2) {
          console.log(chalk.red(`    [${squad.name}] ${agentName} failed: ${err.message}`));
          squadResults[agentName] = { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] };
        } else {
          console.log(chalk.yellow(`    [${squad.name}] ${agentName} failed (attempt 1) — retrying...`));
        }
      }
    }
  }

  return squadResults;
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
