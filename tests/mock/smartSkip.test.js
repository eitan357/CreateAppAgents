'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { orchestrate } = require('../../src/orchestrator');
const { ProjectContext } = require('../../src/context');

const TEST_REQUIREMENTS = 'Simple todo app. Users can add, view, and delete items.';

// Backend-only squad — no frontendDev → squadDesignerAgent must be skipped
const BACKEND_ONLY_SQUAD_PLAN = {
  squads: [{
    id:             'squad-01',
    name:           'Core API',
    description:    'Backend REST API with CRUD operations and auth',
    userFacingArea: 'API endpoints',
    keyFeatures:    ['Create item', 'Read items', 'Delete item'],
    agents:         ['backendDev', 'authAgent'],   // intentionally no frontendDev
    backendModule:  'core',
    frontendModule: 'core',
  }],
  platformNotes: 'Shared DB schema used by all squads.',
};

// ── #1: squadDesignerAgent skipped for backend-only squad ────────────────────
describe('Smart skip — squadDesignerAgent skipped for backend-only squad', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode      = true;
    global._mockSquadPlan = BACKEND_ONLY_SQUAD_PLAN;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartskip-designer-'));
    await orchestrate(TEST_REQUIREMENTS, 'designer-skip-app', outputDir, null, null, { forceTier: 2 });
  });

  afterAll(() => {
    global._mockMode      = false;
    global._mockSquadPlan = undefined;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('design doc NOT created for backend-only squad', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'squads', 'squad-01-design.md'))).toBe(false);
  });

  test('dev agents still ran — backend files exist', () => {
    expect(fs.existsSync(path.join(outputDir, 'backend', 'src', 'index.js'))).toBe(true);
  });

  test('checkpoint is saved correctly', () => {
    expect(ProjectContext.loadCheckpoint(outputDir)).not.toBeNull();
  });
});

// ── #1b: squadDesignerAgent runs when squad HAS frontendDev ──────────────────
describe('Smart skip — squadDesignerAgent runs for squad with frontendDev', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode = true;
    // Default MOCK_SQUAD_PLAN has backendDev + frontendDev → designer should run
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartskip-designer-yes-'));
    await orchestrate(TEST_REQUIREMENTS, 'designer-yes-app', outputDir, null, null, { forceTier: 2 });
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('design doc IS created when squad has frontendDev', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'squads', 'squad-01-design.md'))).toBe(true);
  });
});

// ── #2: socialSharingAgent not included when absent from optionalAgents ───────
describe('Smart skip — socialSharingAgent excluded unless PM requested it', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode = true;
    // MOCK_PLAN.optionalAgents = [] — socialSharingAgent NOT requested
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartskip-social-'));
    await orchestrate(TEST_REQUIREMENTS, 'social-skip-app', outputDir, null, null, { forceTier: 3 });
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('social sharing files NOT created when PM did not request it', () => {
    expect(fs.existsSync(path.join(outputDir, 'shared', 'sharing', 'index.ts'))).toBe(false);
  });

  test('social sharing doc NOT created when PM did not request it', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'features', 'social-sharing.md'))).toBe(false);
  });
});

// ── #3: testRunner + testFixer skipped when testWriter writes no files ────────
describe('Smart skip — testRunner/testFixer skipped when testWriter wrote nothing', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode              = true;
    global._mockTestWriterNoFiles = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartskip-testrunner-'));
    await orchestrate(TEST_REQUIREMENTS, 'testskip-app', outputDir, null, null, { forceTier: 3 });
  });

  afterAll(() => {
    global._mockMode              = false;
    global._mockTestWriterNoFiles = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('testRunner did NOT run — no test-results file', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'quality-findings', 'test-results.md'))).toBe(false);
  });

  test('layers 4b and 4c are marked complete in checkpoint (not left dangling)', () => {
    const cp = ProjectContext.loadCheckpoint(outputDir);
    expect(cp.completedLayers).toContain('4b');
    expect(cp.completedLayers).toContain('4c');
  });

  test('testWriter ran (just wrote no files) — output recorded in checkpoint', () => {
    const cp = ProjectContext.loadCheckpoint(outputDir);
    expect(cp.agentOutputs['testWriter']).toBeDefined();
  });

  test('build still completed — devops layer ran', () => {
    expect(fs.existsSync(path.join(outputDir, 'Dockerfile'))).toBe(true);
  });
});

// ── #3b: testRunner runs normally when testWriter wrote files ─────────────────
describe('Smart skip — testRunner runs when testWriter wrote test files', () => {
  let outputDir;

  beforeAll(async () => {
    global._mockMode = true;
    // _mockTestWriterNoFiles not set → testWriter writes files → testRunner runs
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartskip-testrunner-yes-'));
    await orchestrate(TEST_REQUIREMENTS, 'testrun-yes-app', outputDir, null, null, { forceTier: 3 });
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('testRunner ran — test-results file exists', () => {
    expect(fs.existsSync(path.join(outputDir, 'docs', 'quality-findings', 'test-results.md'))).toBe(true);
  });
});
