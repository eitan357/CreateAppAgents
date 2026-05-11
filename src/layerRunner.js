'use strict';

const chalk = require('chalk');
const { sleep } = require('./withRetry');

// Max concurrent API calls — default 1 to stay under 30k input tokens/minute.
// Increase via PARALLEL_AGENTS=3 in .env if your Anthropic account has higher rate limits.
const MAX_PARALLEL_AGENTS = Math.max(1, parseInt(process.env.PARALLEL_AGENTS || '1', 10));

function retryDelay(err) {
  if (err.message?.includes('529')) return 20000;
  if (err.message?.includes('429')) return 60000;
  return 5000;
}

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
        const delay = retryDelay(err);
        console.log(chalk.yellow(`  ⚠️  ${agentConfig.name} failed (attempt 1/2) — retrying in ${delay / 1000}s...`));
        console.log(chalk.gray(`      Error: ${err.message}`));
        await sleep(delay);
      } else {
        console.log(chalk.red(`  ✖  ${agentConfig.name} failed after 2 attempts: ${err.message}`));
        return { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] };
      }
    }
  }
}

// Runs agents with a concurrency cap to stay under API rate limits.
// With the default cap of 1, agents run one at a time (safest for low-rate-limit accounts).
// Agents that finish early allow the next queued agent to start immediately.
async function runLayerInParallel(agentConfigs, context, toolSets, agentRegistry) {
  const results = {};
  const queue = [...agentConfigs];
  let active = 0;

  if (MAX_PARALLEL_AGENTS > 1) {
    console.log(chalk.gray(`  Rate limit mode: up to ${MAX_PARALLEL_AGENTS} concurrent agents (PARALLEL_AGENTS env var)`));
  }

  await new Promise((resolve) => {
    function startNext() {
      while (active < MAX_PARALLEL_AGENTS && queue.length > 0) {
        const agentConfig = queue.shift();
        active++;
        console.log(chalk.cyan(`  [parallel] Starting ${agentConfig.name}...`));

        runAgentWithRetry(agentConfig, context, toolSets, agentRegistry)
          .then(result => {
            if (!result) return;
            if (!result.error) {
              context.addAgentOutput(agentConfig.name, result.summary, result.filesCreated);
              console.log(chalk.green(`  [parallel] ${agentConfig.name} done — ${result.filesCreated.length} file(s)`));
            }
            results[agentConfig.name] = result;
          })
          .catch(err => {
            results[agentConfig.name] = { error: err.message, summary: `FAILED: ${err.message}`, filesCreated: [] };
          })
          .finally(() => {
            active--;
            if (queue.length > 0 || active > 0) {
              startNext();
            } else {
              resolve();
            }
          });
      }
      if (active === 0 && queue.length === 0) resolve();
    }
    startNext();
  });

  return Object.fromEntries(Object.entries(results).filter(([, v]) => v !== null));
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
