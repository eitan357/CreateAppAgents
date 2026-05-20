'use strict';

/**
 * Builds scripts/agent-name-map.json — maps AGENT_REGISTRY key → agent this.name.
 * Run: node scripts/build-agent-map.js
 */

const fs   = require('fs');
const path = require('path');

const { AGENT_REGISTRY } = require('../src/orchestrator');

const minimalTools = { tools: [], handlers: {} };
const map = {};
const errors = [];

for (const [registryKey, createAgent] of Object.entries(AGENT_REGISTRY)) {
  try {
    const agent = createAgent(minimalTools);
    map[registryKey] = agent.name;
  } catch (err) {
    errors.push(`  ⚠  ${registryKey}: ${err.message}`);
    map[registryKey] = registryKey; // fallback to registry key
  }
}

const outPath = path.join(__dirname, 'agent-name-map.json');
fs.writeFileSync(outPath, JSON.stringify(map, null, 2), 'utf8');

console.log(`✅  Agent name map written — ${Object.keys(map).length} agents → scripts/agent-name-map.json`);
if (errors.length > 0) {
  console.log('\nWarnings (using registry key as fallback):');
  errors.forEach(e => console.log(e));
}
