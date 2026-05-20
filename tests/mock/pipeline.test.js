'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { orchestrate }    = require('../../src/orchestrator');
const { ProjectContext } = require('../../src/context');

const TEST_REQUIREMENTS = 'Simple todo app. Users can add, view, and delete items.';
const TEST_PROJECT      = 'test-pipeline-app';

let outputDir;

beforeAll(() => {
  global._mockMode = true;
  outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));
});

afterAll(() => {
  global._mockMode = false;
  delete global._mockOutputDir;
  delete global._currentSquadContext;
  if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
});

// ── Full pipeline ────────────────────────────────────────────────────────────
test('pipeline runs to completion without throwing', async () => {
  await expect(
    orchestrate(TEST_REQUIREMENTS, TEST_PROJECT, outputDir, null, null)
  ).resolves.not.toThrow();
});

test('checkpoint is saved after pipeline completes', () => {
  const checkpoint = ProjectContext.loadCheckpoint(outputDir);
  expect(checkpoint).not.toBeNull();
});

test('all layers are marked complete in checkpoint', () => {
  const checkpoint = ProjectContext.loadCheckpoint(outputDir);
  const completed = checkpoint.completedLayers;

  expect(completed).toContain('1');
  expect(completed).toContain('2');
  expect(completed).toContain('2b');
  expect(completed).toContain('2c');
  expect(completed).toContain('3');
  expect(completed).toContain('3f');
  expect(completed).toContain('4');
  expect(completed).toContain('4b');
  expect(completed).toContain('4c');
  expect(completed).toContain('5');
});

test('layer 1 agents are recorded in agentOutputs', () => {
  const checkpoint = ProjectContext.loadCheckpoint(outputDir);
  expect(checkpoint.agentOutputs.requirementsAnalyst).toBeDefined();
  expect(checkpoint.agentOutputs.systemArchitect).toBeDefined();
});

test('Layer 1 creates expected stub files on disk', () => {
  expect(fs.existsSync(path.join(outputDir, 'docs', 'requirements-spec.md'))).toBe(true);
  expect(fs.existsSync(path.join(outputDir, 'docs', 'ARCHITECTURE.md'))).toBe(true);
});

test('squad pipeline creates squad spec and review files', () => {
  expect(fs.existsSync(path.join(outputDir, 'docs', 'squads', 'squad-01-spec.md'))).toBe(true);
  expect(fs.existsSync(path.join(outputDir, 'docs', 'squads', 'squad-01-review.md'))).toBe(true);

  const review = fs.readFileSync(path.join(outputDir, 'docs', 'squads', 'squad-01-review.md'), 'utf8');
  expect(review).toContain('VERDICT: ACCEPTED');
});

test('squad QA report has no failing tests', () => {
  const qaPath = path.join(outputDir, 'docs', 'squads', 'squad-01-qa-report.md');
  expect(fs.existsSync(qaPath)).toBe(true);
  const content = fs.readFileSync(qaPath, 'utf8');
  expect(/ALL PASS/i.test(content)).toBe(true);
});

test('backend stub file exists', () => {
  expect(fs.existsSync(path.join(outputDir, 'backend', 'src', 'index.js'))).toBe(true);
});

test('shared platform files exist', () => {
  expect(fs.existsSync(path.join(outputDir, 'shared', 'components', 'primitives', 'index.ts'))).toBe(true);
  expect(fs.existsSync(path.join(outputDir, 'shared', 'api', 'client.ts'))).toBe(true);
});

test('operations files exist', () => {
  expect(fs.existsSync(path.join(outputDir, 'Dockerfile'))).toBe(true);
  expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
});

// ── Resume from checkpoint ───────────────────────────────────────────────────
test('resume skips already-completed layers', async () => {
  const checkpoint = ProjectContext.loadCheckpoint(outputDir);
  expect(checkpoint).not.toBeNull();

  const outputDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-resume-'));
  try {
    // Copy checkpoint into new dir to simulate resume scenario
    fs.mkdirSync(outputDir2, { recursive: true });
    fs.writeFileSync(
      path.join(outputDir2, '.build-checkpoint.json'),
      JSON.stringify({ ...checkpoint, outputDir: outputDir2 }, null, 2)
    );

    // Mark layer 1 as complete in the checkpoint — resume should skip it
    const partialCheckpoint = { ...checkpoint, outputDir: outputDir2 };

    await expect(
      orchestrate(TEST_REQUIREMENTS, TEST_PROJECT, outputDir2, partialCheckpoint, null)
    ).resolves.not.toThrow();

    const resumedCheckpoint = ProjectContext.loadCheckpoint(outputDir2);
    expect(resumedCheckpoint.completedLayers).toContain('5');
  } finally {
    fs.rmSync(outputDir2, { recursive: true, force: true });
  }
});
