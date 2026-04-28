'use strict';

const chalk = require('chalk');

// Run a single agent with one automatic retry on failure
async function runAgentWithRetry(agentConfig, context, toolSets, agentRegistry) {
  const createAgent = agentRegistry[agentConfig.name];
  if (!createAgent) {
    console.log(chalk.yellow(`  ⚠️  Unknown agent "${agentConfig.name}" — skipping`));
    return null;
  }

  const toolSet = agentConfig.needsShell ? toolSets.all : toolSets.fs;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const agent = createAgent(toolSet);
      const contextMessage = context.buildScopedContext(agentConfig.name);
      const result = await agent.run(contextMessage);
      return result;
    } catch (err) {
      if (attempt === 1) {
        console.log(chalk.yellow(`  ⚠️  ${agentConfig.name} failed (attempt 1/2) — retrying automatically...`));
        console.log(chalk.gray(`      Error: ${err.message}`));
      } else {
        console.log(chalk.red(`  ✖  ${agentConfig.name} failed after 2 attempts: ${err.message}`));
        return { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] };
      }
    }
  }
}

async function runLayerInParallel(agentConfigs, context, toolSets, agentRegistry) {
  const tasks = agentConfigs.map(async (agentConfig) => {
    console.log(chalk.cyan(`  [parallel] Starting ${agentConfig.name}...`));
    const result = await runAgentWithRetry(agentConfig, context, toolSets, agentRegistry);
    if (!result) return [agentConfig.name, null];

    if (!result.error) {
      context.addAgentOutput(agentConfig.name, result.summary, result.filesCreated);
      console.log(chalk.green(`  [parallel] ${agentConfig.name} done — ${result.filesCreated.length} file(s)`));
    }
    return [agentConfig.name, result];
  });

  const results = await Promise.all(tasks);
  return Object.fromEntries(results.filter(([, v]) => v !== null));
}

async function runLayerSequential(agentConfigs, context, toolSets, agentRegistry) {
  const results = {};
  for (const agentConfig of agentConfigs) {
    console.log(chalk.cyan(`  [sequential] Running ${agentConfig.name}...`));
    const result = await runAgentWithRetry(agentConfig, context, toolSets, agentRegistry);
    if (!result) continue;

    if (!result.error) {
      context.addAgentOutput(agentConfig.name, result.summary, result.filesCreated);
      console.log(chalk.green(`  [sequential] ${agentConfig.name} done — ${result.filesCreated.length} file(s)`));
    }
    results[agentConfig.name] = result;
  }
  return results;
}

// Returns list of failed agents from layer results
function getFailedAgents(layerResults) {
  return Object.entries(layerResults)
    .filter(([, r]) => r && r.error)
    .map(([name, r]) => ({ name, error: r.error }));
}

module.exports = { runLayerInParallel, runLayerSequential, getFailedAgents };
