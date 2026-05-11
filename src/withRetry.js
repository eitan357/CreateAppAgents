'use strict';

const chalk = require('chalk');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Wrap any async fn with up to MAX_ATTEMPTS tries.
// Waits 20s before retry on 529 (Overloaded), 5s for other transient errors.
async function withRetry(fn, label) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      const delay = err.message?.includes('529') ? 20000 : 5000;
      const tag = label ? ` [${label}]` : '';
      console.log(chalk.yellow(`  ⚠️  API error (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in ${delay / 1000}s...${tag}`));
      console.log(chalk.gray(`      ${err.message}`));
      await sleep(delay);
    }
  }
}

module.exports = { withRetry, sleep };
