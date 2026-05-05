'use strict';

const readline = require('readline');
const chalk = require('chalk');
const { t } = require('./lang');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function approveStep(stepName, description, details = null) {
  console.log('\n' + chalk.cyan('─'.repeat(60)));
  console.log(chalk.bold.yellow(`📋  ${stepName}`));
  console.log(chalk.white(description));
  if (details) {
    console.log('\n' + chalk.gray(details));
  }
  console.log(chalk.cyan('─'.repeat(60)));
  const answer = await ask(chalk.bold.green(t('continuePrompt')));
  return answer === 'y' || answer === 'yes' || answer === '';
}

async function showAgentOutput(agentName, summary, filesCreated) {
  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.bold.blue(t('agentDone', agentName)));

  const MAX = 600;
  const display = summary.length > MAX ? summary.slice(0, MAX) + '...' : summary;
  console.log('\n' + chalk.gray(display));

  if (filesCreated.length > 0) {
    console.log(chalk.white('\n' + t('filesCreated')));
    filesCreated.forEach(f => console.log(chalk.green(`  ✓ ${f}`)));
  }
  console.log(chalk.cyan('═'.repeat(60)));

  const answer = await ask(chalk.bold.green(t('continueStep')));
  return answer === 'y' || answer === 'yes' || answer === '';
}

async function approveLayer(layerName, layerResults) {
  const agentNames = Object.keys(layerResults);
  const totalFiles = agentNames.reduce(
    (sum, name) => sum + (layerResults[name]?.filesCreated?.length || 0), 0
  );

  console.log('\n' + chalk.cyan('═'.repeat(70)));
  console.log(chalk.bold.blue(`🏁  ${t('layerComplete')} ${layerName}`));
  console.log(chalk.white(`   Agents: ${agentNames.join(', ')}`));
  console.log(chalk.white(`   Files created this layer: ${totalFiles}`));

  for (const [agentName, result] of Object.entries(layerResults)) {
    if (!result || result.error) {
      console.log(chalk.red(`\n  ❌ ${agentName}: FAILED — ${result?.error || 'unknown error'}`));
      continue;
    }
    const preview = result.summary.slice(0, 300);
    console.log(chalk.gray(`\n  [${agentName}] ${preview}${result.summary.length > 300 ? '...' : ''}`));
    if (result.filesCreated && result.filesCreated.length > 0) {
      result.filesCreated.forEach(f => console.log(chalk.green(`    ✓ ${f}`)));
    }
  }

  console.log(chalk.cyan('═'.repeat(70)));
  const answer = await ask(chalk.bold.green(t('continueLayer')));
  return answer === 'y' || answer === 'yes' || answer === '';
}

module.exports = { approveStep, showAgentOutput, approveLayer, ask };
