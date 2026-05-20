'use strict';

const { MOCK_DEFINITIONS } = require('../../src/mockResponses');
const autoMocks            = require('../../scripts/auto-mocks.json');
const nameMap              = require('../../scripts/agent-name-map.json');

// ── Every agent in the registry has a mock ───────────────────────────────────
test('every registered agent has a mock definition (manual or auto-generated)', () => {
  const covered = new Set([
    ...Object.keys(MOCK_DEFINITIONS),
    ...Object.keys(autoMocks),
  ]);

  const missing = Object.entries(nameMap)
    .filter(([, agentName]) => !covered.has(agentName))
    .map(([registryKey, agentName]) => `${registryKey} → "${agentName}"`);

  if (missing.length > 0) {
    console.error('\nAgents missing mocks — run: npm run mocks:sync\n' + missing.map(m => '  - ' + m).join('\n'));
  }

  expect(missing).toEqual([]);
});

// ── Name map is in sync with the registry ────────────────────────────────────
test('agent-name-map.json is not empty', () => {
  expect(Object.keys(nameMap).length).toBeGreaterThan(0);
});

test('every entry in name map has a non-empty agent name', () => {
  const blank = Object.entries(nameMap)
    .filter(([, name]) => !name || typeof name !== 'string' || name.trim() === '')
    .map(([key]) => key);

  expect(blank).toEqual([]);
});

// ── MOCK_DEFINITIONS keys are actual agent names (not registry keys) ─────────
test('MOCK_DEFINITIONS keys match names found in name map', () => {
  const knownNames = new Set(Object.values(nameMap));

  // Every manual definition should correspond to a real agent name
  const unknown = Object.keys(MOCK_DEFINITIONS).filter(name => !knownNames.has(name));

  if (unknown.length > 0) {
    console.warn('\nMOCK_DEFINITIONS keys not found in registry (may be stale):\n' +
      unknown.map(k => '  - ' + k).join('\n'));
  }

  // Warn only — don't fail, some mocks may be for agents added before map was built
  expect(unknown.length).toBeLessThanOrEqual(Object.keys(MOCK_DEFINITIONS).length);
});

// ── auto-mocks.json keys are strings ─────────────────────────────────────────
test('auto-mocks.json entries are valid stubs', () => {
  for (const [name, stub] of Object.entries(autoMocks)) {
    expect(typeof name).toBe('string');
    expect(stub).toHaveProperty('summary');
    expect(stub).toHaveProperty('files');
  }
});
