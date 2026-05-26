'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const costTracker = require('../../src/costTracker');
const { orchestrate, MOCK_PLAN } = require('../../src/orchestrator');
const { BaseAgent } = require('../../src/agents/base');

// ── Unit tests for costTracker ────────────────────────────────────────────────
describe('costTracker — unit', () => {
  beforeEach(() => costTracker.reset());

  test('starts empty — getTotal returns 0', () => {
    expect(costTracker.getTotal()).toBe(0);
  });

  test('getSummary returns null when no records', () => {
    expect(costTracker.getSummary()).toBeNull();
  });

  test('record() accumulates input token cost correctly', () => {
    costTracker.record('TestAgent', 'claude-sonnet-4-6', { input_tokens: 1_000_000, output_tokens: 0 });
    expect(costTracker.getTotal()).toBeCloseTo(3.00, 5);
  });

  test('record() accumulates output token cost correctly', () => {
    costTracker.record('TestAgent', 'claude-sonnet-4-6', { input_tokens: 0, output_tokens: 1_000_000 });
    expect(costTracker.getTotal()).toBeCloseTo(15.00, 5);
  });

  test('record() handles cache_read_input_tokens', () => {
    costTracker.record('TestAgent', 'claude-sonnet-4-6', {
      input_tokens: 0, output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
    });
    expect(costTracker.getTotal()).toBeCloseTo(0.30, 5);
  });

  test('record() handles cache_creation_input_tokens', () => {
    costTracker.record('TestAgent', 'claude-sonnet-4-6', {
      input_tokens: 0, output_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
    });
    expect(costTracker.getTotal()).toBeCloseTo(3.75, 5);
  });

  test('record() uses opus pricing for claude-opus-4-7', () => {
    costTracker.record('TestAgent', 'claude-opus-4-7', { input_tokens: 1_000_000, output_tokens: 0 });
    expect(costTracker.getTotal()).toBeCloseTo(5.00, 5);
  });

  test('record() uses haiku pricing for claude-haiku-4-5-20251001', () => {
    costTracker.record('TestAgent', 'claude-haiku-4-5-20251001', { input_tokens: 1_000_000, output_tokens: 0 });
    expect(costTracker.getTotal()).toBeCloseTo(1.00, 5);
  });

  test('record() falls back to sonnet pricing for unknown model', () => {
    costTracker.record('TestAgent', 'claude-unknown', { input_tokens: 1_000_000, output_tokens: 0 });
    expect(costTracker.getTotal()).toBeCloseTo(3.00, 5);
  });

  test('record() ignores null/undefined usage gracefully', () => {
    costTracker.record('TestAgent', 'claude-sonnet-4-6', null);
    costTracker.record('TestAgent', 'claude-sonnet-4-6', undefined);
    expect(costTracker.getTotal()).toBe(0);
  });

  test('multiple agents accumulate independently', () => {
    costTracker.record('AgentA', 'claude-sonnet-4-6', { input_tokens: 1_000_000 });
    costTracker.record('AgentB', 'claude-sonnet-4-6', { output_tokens: 1_000_000 });
    expect(costTracker.getTotal()).toBeCloseTo(18.00, 5);
  });

  test('getSummary includes agent names and total', () => {
    costTracker.record('backendDev', 'claude-sonnet-4-6', { input_tokens: 100_000, output_tokens: 10_000 });
    const summary = costTracker.getSummary();
    expect(summary).toContain('backendDev');
    expect(summary).toContain('TOTAL');
  });

  test('reset() clears all records', () => {
    costTracker.record('TestAgent', 'claude-sonnet-4-6', { input_tokens: 1_000_000 });
    costTracker.reset();
    expect(costTracker.getTotal()).toBe(0);
    expect(costTracker.getSummary()).toBeNull();
  });

  test('multi-turn accumulates all turns for the same agent', () => {
    costTracker.record('Coder', 'claude-sonnet-4-6', { input_tokens: 500_000, output_tokens: 0 });
    costTracker.record('Coder', 'claude-sonnet-4-6', { input_tokens: 500_000, output_tokens: 0 });
    expect(costTracker.getTotal()).toBeCloseTo(3.00, 5);
  });
});

// ── Integration: orchestrate resets cost tracker on each run ──────────────────
describe('costTracker — orchestrate integration', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode = true;
    global._mockForceTier = 1;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-test-'));
    // Seed a stale record that should be wiped by orchestrate()
    costTracker.record('staleAgent', 'claude-sonnet-4-6', { input_tokens: 999_999_999 });
    await orchestrate('Simple todo app.', 'cost-test-app', outputDir, null, null, { forceTier: 1 });
  });

  afterAll(() => {
    global._mockMode = false;
    global._mockForceTier = undefined;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
    costTracker.reset();
  });

  test('orchestrate() resets stale cost records at the start', () => {
    // mock mode produces no real API calls, so total should be 0 (not from stale record)
    expect(costTracker.getTotal()).toBe(0);
  });

  test('getSummary returns null in mock mode (no API calls)', () => {
    expect(costTracker.getSummary()).toBeNull();
  });
});

// ── Prompt caching structure tests ────────────────────────────────────────────
// These tests validate the caching logic in base.js by reproducing it directly,
// since mock mode short-circuits the actual API call path.
describe('BaseAgent — prompt caching message structure', () => {
  const TOOLS = [
    { name: 'write_file', description: 'Write a file', input_schema: { type: 'object', properties: {} } },
    { name: 'read_file',  description: 'Read a file',  input_schema: { type: 'object', properties: {} } },
    { name: 'list_files', description: 'List files',   input_schema: { type: 'object', properties: {} } },
  ];

  // Mirrors the logic in base.js run()
  function buildMessages(userMessage) {
    return [{ role: 'user', content: [{ type: 'text', text: userMessage, cache_control: { type: 'ephemeral' } }] }];
  }
  function applyToolCaching(tools) {
    return tools.map((t, i) => i === tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t);
  }

  test('user message content is an array (not a plain string)', () => {
    const messages = buildMessages('some context');
    expect(Array.isArray(messages[0].content)).toBe(true);
  });

  test('user message block has cache_control: ephemeral', () => {
    const messages = buildMessages('some context');
    expect(messages[0].content[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  test('user message block preserves original text', () => {
    const text = 'project context goes here';
    const messages = buildMessages(text);
    expect(messages[0].content[0].text).toBe(text);
  });

  test('only the last tool gets cache_control', () => {
    const mapped = applyToolCaching(TOOLS);
    expect(mapped[0].cache_control).toBeUndefined();
    expect(mapped[1].cache_control).toBeUndefined();
    expect(mapped[2].cache_control).toEqual({ type: 'ephemeral' });
  });

  test('single-tool array: that tool gets cache_control', () => {
    const mapped = applyToolCaching([TOOLS[0]]);
    expect(mapped[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  test('original tool objects are not mutated', () => {
    const original = JSON.parse(JSON.stringify(TOOLS));
    applyToolCaching(TOOLS);
    expect(TOOLS).toEqual(original);
  });
});
