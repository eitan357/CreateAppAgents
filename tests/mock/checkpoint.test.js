'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { ProjectContext } = require('../../src/context');

let tmpDir;
let ctx;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-test-'));
  ctx = new ProjectContext('test requirements', { projectName: 'test', layers: {}, optionalAgents: [] }, tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Save / Load ──────────────────────────────────────────────────────────────
test('saveCheckpoint creates .build-checkpoint.json', () => {
  ctx.saveCheckpoint();
  expect(fs.existsSync(path.join(tmpDir, '.build-checkpoint.json'))).toBe(true);
});

test('loadCheckpoint returns null when no file exists', () => {
  expect(ProjectContext.loadCheckpoint(tmpDir)).toBeNull();
});

test('loadCheckpoint returns saved checkpoint data', () => {
  ctx.markLayerComplete(1);
  ctx.addAgentOutput('testAgent', 'Test summary', ['file1.js']);
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  expect(loaded).not.toBeNull();
  expect(loaded.completedLayers).toContain('1');
  expect(loaded.agentOutputs.testAgent.summary).toBe('Test summary');
  expect(loaded.agentOutputs.testAgent.files).toContain('file1.js');
});

test('checkpoint survives multiple save/load cycles', () => {
  ctx.markLayerComplete(1);
  ctx.saveCheckpoint();
  ctx.markLayerComplete('2b');
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  expect(loaded.completedLayers).toContain('1');
  expect(loaded.completedLayers).toContain('2b');
});

// ── Layer tracking ───────────────────────────────────────────────────────────
test('isLayerComplete returns false before marking', () => {
  expect(ctx.isLayerComplete(1)).toBe(false);
});

test('isLayerComplete returns true after marking', () => {
  ctx.markLayerComplete(1);
  expect(ctx.isLayerComplete(1)).toBe(true);
});

test('layers with string ids work correctly', () => {
  ctx.markLayerComplete('2b');
  ctx.markLayerComplete('2c');
  expect(ctx.isLayerComplete('2b')).toBe(true);
  expect(ctx.isLayerComplete('2c')).toBe(true);
  expect(ctx.isLayerComplete('3f')).toBe(false);
});

// ── Squad agent tracking ─────────────────────────────────────────────────────
test('isSquadAgentComplete returns false before marking', () => {
  expect(ctx.isSquadAgentComplete('squad-01', 'backendDev')).toBe(false);
});

test('isSquadAgentComplete returns true after marking', () => {
  ctx.markSquadAgentComplete('squad-01', 'backendDev');
  expect(ctx.isSquadAgentComplete('squad-01', 'backendDev')).toBe(true);
});

test('squad agents are isolated per squad id', () => {
  ctx.markSquadAgentComplete('squad-01', 'backendDev');
  expect(ctx.isSquadAgentComplete('squad-02', 'backendDev')).toBe(false);
});

test('multiple squad agents tracked independently', () => {
  ctx.markSquadAgentComplete('squad-01', 'backendDev');
  ctx.markSquadAgentComplete('squad-01', 'frontendDev');
  ctx.markSquadAgentComplete('squad-01', 'squadQaAgent');

  expect(ctx.isSquadAgentComplete('squad-01', 'backendDev')).toBe(true);
  expect(ctx.isSquadAgentComplete('squad-01', 'frontendDev')).toBe(true);
  expect(ctx.isSquadAgentComplete('squad-01', 'squadQaAgent')).toBe(true);
  expect(ctx.isSquadAgentComplete('squad-01', 'authAgent')).toBe(false);
});

// ── fromCheckpoint restore ───────────────────────────────────────────────────
test('fromCheckpoint restores layer completion state', () => {
  ctx.markLayerComplete(1);
  ctx.markLayerComplete('2b');
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  const restored = ProjectContext.fromCheckpoint({ ...loaded, outputDir: tmpDir });

  expect(restored.isLayerComplete(1)).toBe(true);
  expect(restored.isLayerComplete('2b')).toBe(true);
  expect(restored.isLayerComplete(3)).toBe(false);
});

test('fromCheckpoint restores squad agent completion state', () => {
  ctx.markSquadAgentComplete('squad-01', 'squadQaAgent');
  ctx.markSquadAgentComplete('squad-01', 'backendDev');
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  const restored = ProjectContext.fromCheckpoint({ ...loaded, outputDir: tmpDir });

  expect(restored.isSquadAgentComplete('squad-01', 'squadQaAgent')).toBe(true);
  expect(restored.isSquadAgentComplete('squad-01', 'backendDev')).toBe(true);
  expect(restored.isSquadAgentComplete('squad-01', 'authAgent')).toBe(false);
});

test('fromCheckpoint restores agentOutputs', () => {
  ctx.addAgentOutput('requirementsAnalyst', 'Requirements done', ['docs/requirements-spec.md']);
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  const restored = ProjectContext.fromCheckpoint({ ...loaded, outputDir: tmpDir });

  expect(restored.agentOutputs.requirementsAnalyst.summary).toBe('Requirements done');
});

// ── Squad completion tracking ────────────────────────────────────────────────
test('isSquadComplete returns false before marking', () => {
  expect(ctx.isSquadComplete('squad-01')).toBe(false);
});

test('isSquadComplete returns true after marking', () => {
  ctx.markSquadComplete('squad-01');
  expect(ctx.isSquadComplete('squad-01')).toBe(true);
});

test('fromCheckpoint restores completedSquads', () => {
  ctx.markSquadComplete('squad-01');
  ctx.markSquadComplete('squad-02');
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  const restored = ProjectContext.fromCheckpoint({ ...loaded, outputDir: tmpDir });

  expect(restored.isSquadComplete('squad-01')).toBe(true);
  expect(restored.isSquadComplete('squad-02')).toBe(true);
  expect(restored.isSquadComplete('squad-03')).toBe(false);
});

// ── Partial squad resume ─────────────────────────────────────────────────────
test('partial squad resume: only completed agents are marked done', () => {
  // Simulate: backendDev and frontendDev finished, but authAgent and squadQaAgent did not
  ctx.markSquadAgentComplete('squad-01', 'backendDev');
  ctx.markSquadAgentComplete('squad-01', 'frontendDev');
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  const restored = ProjectContext.fromCheckpoint({ ...loaded, outputDir: tmpDir });

  expect(restored.isSquadAgentComplete('squad-01', 'backendDev')).toBe(true);
  expect(restored.isSquadAgentComplete('squad-01', 'frontendDev')).toBe(true);
  expect(restored.isSquadAgentComplete('squad-01', 'authAgent')).toBe(false);
  expect(restored.isSquadAgentComplete('squad-01', 'squadQaAgent')).toBe(false);
  expect(restored.isSquadAgentComplete('squad-01', 'integrationAgent')).toBe(false);
});

test('partial squad resume: multiple squads with different completion states', () => {
  // squad-01 fully done, squad-02 half done, squad-03 not started
  ctx.markSquadAgentComplete('squad-01', 'backendDev');
  ctx.markSquadAgentComplete('squad-01', 'frontendDev');
  ctx.markSquadAgentComplete('squad-01', 'authAgent');
  ctx.markSquadAgentComplete('squad-01', 'integrationAgent');
  ctx.markSquadComplete('squad-01');

  ctx.markSquadAgentComplete('squad-02', 'backendDev');
  ctx.saveCheckpoint();

  const loaded = ProjectContext.loadCheckpoint(tmpDir);
  const restored = ProjectContext.fromCheckpoint({ ...loaded, outputDir: tmpDir });

  expect(restored.isSquadComplete('squad-01')).toBe(true);
  expect(restored.isSquadAgentComplete('squad-02', 'backendDev')).toBe(true);
  expect(restored.isSquadAgentComplete('squad-02', 'frontendDev')).toBe(false);
  expect(restored.isSquadAgentComplete('squad-03', 'backendDev')).toBe(false);
});

test('checkpoint after partial squad work is valid JSON', () => {
  ctx.markLayerComplete(1);
  ctx.markLayerComplete(2);
  ctx.markSquadAgentComplete('squad-01', 'backendDev');
  ctx.saveCheckpoint();

  const raw = require('fs').readFileSync(require('path').join(tmpDir, '.build-checkpoint.json'), 'utf8');
  expect(() => JSON.parse(raw)).not.toThrow();
  const parsed = JSON.parse(raw);
  expect(parsed.completedSquadAgents['squad-01']).toContain('backendDev');
});

// ── Agent output tracking ────────────────────────────────────────────────────
test('addAgentOutput accumulates allFilesCreated', () => {
  ctx.addAgentOutput('agent1', 'done', ['a.js', 'b.js']);
  ctx.addAgentOutput('agent2', 'done', ['c.js']);

  expect(ctx.allFilesCreated).toEqual(['a.js', 'b.js', 'c.js']);
});
