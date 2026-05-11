'use strict';

const chalk = require('chalk');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function _retryDelay(errMessage) {
  if (errMessage?.includes('529')) return 20000;  // Overloaded
  if (errMessage?.includes('429')) return 60000;  // Rate limit — wait a full minute
  return 5000;
}

// Wrap any async fn with up to MAX_ATTEMPTS tries.
async function withRetry(fn, label) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      const delay = _retryDelay(err.message);
      const tag = label ? ` [${label}]` : '';
      console.log(chalk.yellow(`  ⚠️  API error (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in ${delay / 1000}s...${tag}`));
      console.log(chalk.gray(`      ${err.message}`));
      await sleep(delay);
    }
  }
}

module.exports = { withRetry, sleep };

