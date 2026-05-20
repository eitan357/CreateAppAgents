'use strict';

/**
 * Generates mock stubs for any agent missing from MOCK_DEFINITIONS.
 * Output goes to scripts/auto-mocks.json — loaded automatically by mockResponses.js.
 * Run: node scripts/generate-mocks.js
 */

const fs   = require('fs');
const path = require('path');

const NAME_MAP_PATH   = path.join(__dirname, 'agent-name-map.json');
const AUTO_MOCKS_PATH = path.join(__dirname, 'auto-mocks.json');

// ── Load name map ────────────────────────────────────────────────────────────
if (!fs.existsSync(NAME_MAP_PATH)) {
  console.error('❌  scripts/agent-name-map.json not found — run: node scripts/build-agent-map.js');
  process.exit(1);
}
const nameMap = JSON.parse(fs.readFileSync(NAME_MAP_PATH, 'utf8'));

// ── Load existing definitions ────────────────────────────────────────────────
const { MOCK_DEFINITIONS } = require('../src/mockResponses');
const existingAutoMocks = fs.existsSync(AUTO_MOCKS_PATH)
  ? JSON.parse(fs.readFileSync(AUTO_MOCKS_PATH, 'utf8'))
  : {};

// ── Find missing agents ──────────────────────────────────────────────────────
const allDefinedNames = new Set([
  ...Object.keys(MOCK_DEFINITIONS),
  ...Object.keys(existingAutoMocks),
]);

const missing = [];
for (const [registryKey, agentName] of Object.entries(nameMap)) {
  if (!allDefinedNames.has(agentName)) {
    missing.push({ registryKey, agentName });
  }
}

console.log(`🔍  Scanning ${Object.keys(nameMap).length} agents...`);

if (missing.length === 0) {
  console.log('✅  All agents have mock definitions — nothing to generate');
  process.exit(0);
}

// ── Generate stubs for missing agents ────────────────────────────────────────
console.log(`\n⚙️   ${missing.length} agent(s) missing mocks — generating stubs:\n`);

const updatedAutoMocks = { ...existingAutoMocks };

for (const { registryKey, agentName } of missing) {
  const slugName = agentName.toLowerCase().replace(/\s+/g, '-');
  updatedAutoMocks[agentName] = {
    summary: `[MOCK] ${agentName} completed successfully.`,
    files: {
      [`docs/mock-stubs/${slugName}.md`]: `# ${agentName}\n\n[Auto-generated mock stub — replace with real content if needed]\n`,
    },
  };
  console.log(`    + ${registryKey} ("${agentName}") → auto-mocks.json`);
}

fs.writeFileSync(AUTO_MOCKS_PATH, JSON.stringify(updatedAutoMocks, null, 2), 'utf8');
console.log(`\n✅  scripts/auto-mocks.json updated — ${missing.length} stub(s) added`);
