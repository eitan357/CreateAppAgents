'use strict';

const chalk = require('chalk');

async function runLayerInParallel(agentConfigs, context, toolSets, agentRegistry) {
  const tasks = agentConfigs.map(async (agentConfig) => {
    const createAgent = agentRegistry[agentConfig.name];
    if (!createAgent) {
      console.log(chalk.yellow(`  ⚠️  Unknown agent "${agentConfig.name}" — skipping`));
      return [agentConfig.name, null];
    }

    const toolSet = agentConfig.needsShell ? toolSets.all : toolSets.fs;
    const agent = createAgent(toolSet);
    const contextMessage = context.buildScopedContext(agentConfig.name);

    console.log(chalk.cyan(`  [parallel] Starting ${agentConfig.name}...`));
    try {
      const result = await agent.run(contextMessage);
      context.addAgentOutput(agentConfig.name, result.summary, result.filesCreated);
      console.log(chalk.green(`  [parallel] ${agentConfig.name} done — ${result.filesCreated.length} file(s)`));
      return [agentConfig.name, result];
    } catch (err) {
      console.log(chalk.red(`  [parallel] ${agentConfig.name} FAILED: ${err.message}`));
      return [agentConfig.name, { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] }];
    }
  });

  const results = await Promise.all(tasks);
  return Object.fromEntries(results.filter(([, v]) => v !== null));
}

async function runLayerSequential(agentConfigs, context, toolSets, agentRegistry) {
  const results = {};
  for (const agentConfig of agentConfigs) {
    const createAgent = agentRegistry[agentConfig.name];
    if (!createAgent) {
      console.log(chalk.yellow(`  ⚠️  Unknown agent "${agentConfig.name}" — skipping`));
      continue;
    }

    const toolSet = agentConfig.needsShell ? toolSets.all : toolSets.fs;
    const agent = createAgent(toolSet);
    const contextMessage = context.buildScopedContext(agentConfig.name);

    console.log(chalk.cyan(`  [sequential] Running ${agentConfig.name}...`));
    try {
      const result = await agent.run(contextMessage);
      context.addAgentOutput(agentConfig.name, result.summary, result.filesCreated);
      console.log(chalk.green(`  [sequential] ${agentConfig.name} done — ${result.filesCreated.length} file(s)`));
      results[agentConfig.name] = result;
    } catch (err) {
      console.log(chalk.red(`  [sequential] ${agentConfig.name} FAILED: ${err.message}`));
      results[agentConfig.name] = { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] };
    }
  }
  return results;
}

module.exports = { runLayerInParallel, runLayerSequential };
