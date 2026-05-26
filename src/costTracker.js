'use strict';

const PRICING = {
  'claude-sonnet-4-6':         { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-opus-4-7':           { input: 5.00, output: 25.00, cacheRead: 0.50, cacheWrite: 6.25 },
  'claude-haiku-4-5-20251001': { input: 1.00, output:  5.00, cacheRead: 0.10, cacheWrite: 1.25 },
};

const _records = [];

function record(agentName, model, usage) {
  if (!usage) return;
  const price = PRICING[model] || PRICING['claude-sonnet-4-6'];
  const inputCost  = ((usage.input_tokens                   || 0) / 1_000_000) * price.input;
  const outputCost = ((usage.output_tokens                  || 0) / 1_000_000) * price.output;
  const cacheRCost = ((usage.cache_read_input_tokens        || 0) / 1_000_000) * price.cacheRead;
  const cacheWCost = ((usage.cache_creation_input_tokens    || 0) / 1_000_000) * price.cacheWrite;
  _records.push({ agentName, model, usage, totalCost: inputCost + outputCost + cacheRCost + cacheWCost });
}

function getTotal() {
  return _records.reduce((sum, r) => sum + r.totalCost, 0);
}

function getSummary() {
  if (_records.length === 0) return null;

  const byAgent = {};
  for (const r of _records) {
    byAgent[r.agentName] = (byAgent[r.agentName] || 0) + r.totalCost;
  }

  const sorted = Object.entries(byAgent).sort((a, b) => b[1] - a[1]);
  const total  = getTotal();

  const lines = ['💰  Build Cost Summary:', ''];
  for (const [name, cost] of sorted) {
    if (cost >= 0.0001) {
      lines.push(`    ${name.padEnd(32)} $${cost.toFixed(4)}`);
    }
  }
  lines.push('');
  lines.push(`    ${'TOTAL'.padEnd(32)} $${total.toFixed(4)}`);
  return lines.join('\n');
}

function reset() {
  _records.length = 0;
}

module.exports = { record, getTotal, getSummary, reset };
