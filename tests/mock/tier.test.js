'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { orchestrate, MOCK_PLAN, MOCK_SQUAD_PLAN } = require('../../src/orchestrator');
const { ProjectContext } = require('../../src/context');

const TEST_REQUIREMENTS = 'Simple todo app. Users can add, view, and delete items.';

// ── Tier 0 — single agent build ──────────────────────────────────────────────
describe('Tier 0 — single agent fast path', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode = true;
    global._mockForceTier = 0;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tier0-test-'));
    await orchestrate(TEST_REQUIREMENTS, 'tier0-app', outputDir, null, null, { forceTier: 0 });
  });

  afterAll(() => {
    global._mockMode = false;
    global._mockForceTier = undefined;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('tier 0 creates index.html', () => {
    expect(fs.existsSync(path.join(outputDir, 'index.html'))).toBe(true);
  });

  test('tier 0 creates README.md', () => {
    expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
  });

  test('tier 0 does NOT create layer 1 docs (no RequirementsAnalyst)', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'requirements-spec.md'))).toBe(false);
  });

  test('tier 0 does NOT create squad files', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'squads', 'squad-01-spec.md'))).toBe(false);
  });

  test('tier 0 checkpoint is saved', () => {
    expect(ProjectContext.loadCheckpoint(outputDir)).not.toBeNull();
  });

  test('tier 0 checkpoint records simpleAppBuilder output', () => {
    const cp = ProjectContext.loadCheckpoint(outputDir);
    expect(cp.agentOutputs.simpleAppBuilder).toBeDefined();
  });
});

// ── Tier 1 — simple build (no Leaders, no Platform, no Quality) ──────────────
describe('Tier 1 — simple build', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tier1-test-'));
    await orchestrate(TEST_REQUIREMENTS, 'tier1-app', outputDir, null, null, { forceTier: 1 });
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('tier 1 runs layer 1 — requirements doc exists', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'requirements-spec.md'))).toBe(true);
  });

  test('tier 1 runs layer 2 — architecture doc exists', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'ARCHITECTURE.md'))).toBe(true);
  });

  test('tier 1 runs squads — backend stub exists', () => {
    expect(fs.existsSync(path.join(outputDir, 'backend', 'src', 'index.js'))).toBe(true);
  });

  test('tier 1 checkpoint marks layers 2b and 2c complete (skipped via tier)', () => {
    const cp = ProjectContext.loadCheckpoint(outputDir);
    // Layers are marked complete even when skipped so resume works correctly
    expect(cp.completedLayers).toContain('2b');
    expect(cp.completedLayers).toContain('2c');
  });

  test('tier 1 does NOT create Leaders Team guidelines (layer 2b skipped)', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'guidelines', 'tech-guidelines.md'))).toBe(false);
  });

  test('tier 1 does NOT create Platform shared components (layer 2c skipped)', () => {
    expect(fs.existsSync(path.join(outputDir, 'shared', 'components', 'primitives', 'index.ts'))).toBe(false);
  });

  test('tier 1 does NOT create Quality layer test files (layer 4 skipped)', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'security-report.md'))).toBe(false);
  });
});

// ── Tier field in plan ───────────────────────────────────────────────────────
describe('MOCK_PLAN tier field', () => {
  test('MOCK_PLAN has tier: 3 for full pipeline tests', () => {
    expect(MOCK_PLAN.tier).toBe(3);
  });

  test('MOCK_PLAN has tierReason', () => {
    expect(typeof MOCK_PLAN.tierReason).toBe('string');
    expect(MOCK_PLAN.tierReason.length).toBeGreaterThan(0);
  });
});

// ── forceTier option ─────────────────────────────────────────────────────────
describe('forceTier option overrides plan tier', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'force-tier-test-'));
    // MOCK_PLAN has tier:3 but we force tier:1 — Leaders/Platform layers should be skipped
    await orchestrate(TEST_REQUIREMENTS, 'force-tier-app', outputDir, null, null, { forceTier: 1 });
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('forceTier:1 skips Leaders Team even though MOCK_PLAN.tier is 3', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'guidelines', 'tech-guidelines.md'))).toBe(false);
  });

  test('forceTier:1 still runs discovery layer', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'requirements-spec.md'))).toBe(true);
  });
});
