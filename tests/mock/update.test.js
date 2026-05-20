'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const { orchestrateUpdate, MOCK_PLAN, MOCK_SQUAD_PLAN } = require('../../src/orchestrator');
const { runSquadUpdate }   = require('../../src/squadRunner');
const { ProjectContext }   = require('../../src/context');

// ── Minimal checkpoint that simulates a completed build ──────────────────────
function makeCheckpoint(outputDir) {
  return {
    requirements:          'Simple todo app.',
    plan:                  MOCK_PLAN,
    squadPlan:             MOCK_SQUAD_PLAN,
    agentOutputs: {
      requirementsAnalyst: { summary: 'done', files: ['docs/requirements-spec.md'] },
      systemArchitect:     { summary: 'done', files: ['docs/ARCHITECTURE.md'] },
    },
    allFilesCreated:       ['docs/requirements-spec.md', 'docs/ARCHITECTURE.md'],
    completedLayers:       ['1', '2', '2b', '2c', '3', '3f', '4', '4b', '4c', '5'],
    completedSquads:       ['squad-01'],
    completedSquadAgents:  { 'squad-01': ['backendDev', 'frontendDev', 'squadQaAgent'] },
    outputDir,
  };
}

// ── orchestrateUpdate ────────────────────────────────────────────────────────
describe('orchestrateUpdate', () => {
  let outputDir;

  beforeAll(() => {
    global._mockMode = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-test-'));
    // Write the minimum files orchestrateUpdate may read
    fs.mkdirSync(path.join(outputDir, 'docs', 'squads'), { recursive: true });
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('orchestrateUpdate completes without throwing', async () => {
    const checkpoint = makeCheckpoint(outputDir);
    await expect(
      orchestrateUpdate('Add dark mode support', checkpoint, outputDir, null)
    ).resolves.not.toThrow();
  });

  test('checkpoint is saved after update completes', () => {
    expect(ProjectContext.loadCheckpoint(outputDir)).not.toBeNull();
  });

  test('squad-01 update spec file is created during update', () => {
    // SquadPmUpdateSpec mock writes squad-01-update-spec.md
    const updateSpecPath = path.join(outputDir, 'docs', 'squads', 'squad-01-update-spec.md');
    expect(fs.existsSync(updateSpecPath)).toBe(true);
  });
});

// ── orchestrateUpdate with no squad plan ─────────────────────────────────────
describe('orchestrateUpdate — no squad plan', () => {
  let outputDir;

  beforeAll(() => {
    global._mockMode = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-no-squad-'));
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('orchestrateUpdate returns early and does not throw when no squad plan exists', async () => {
    const checkpoint = {
      ...makeCheckpoint(outputDir),
      squadPlan: null,
    };
    await expect(
      orchestrateUpdate('Add dark mode support', checkpoint, outputDir, null)
    ).resolves.not.toThrow();
  });
});

// ── runSquadUpdate (isolated) ────────────────────────────────────────────────
describe('runSquadUpdate', () => {
  const { AGENT_REGISTRY } = require('../../src/orchestrator');
  let outputDir;
  let context;

  const squad = MOCK_SQUAD_PLAN.squads[0];
  const emptyToolSet = { tools: [], handlers: {} };
  const toolSets = { fs: emptyToolSet, all: emptyToolSet };

  beforeAll(() => {
    global._mockMode = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-update-test-'));
    fs.mkdirSync(path.join(outputDir, 'docs', 'squads'), { recursive: true });

    context = new ProjectContext('Simple todo app.', MOCK_PLAN, outputDir);
    context.setSquadPlan(MOCK_SQUAD_PLAN);
    global._mockOutputDir = outputDir;
  });

  afterAll(() => {
    global._mockMode = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('runSquadUpdate completes without throwing', async () => {
    const activeAgents = new Set(['backendDev', 'frontendDev', 'squadQaAgent', 'squadPmAgent', 'squadSecurityAgent']);
    await expect(
      runSquadUpdate(squad, 'Add dark mode toggle to UI', context, toolSets, AGENT_REGISTRY, activeAgents)
    ).resolves.not.toThrow();
  });

  test('runSquadUpdate writes update spec file for the squad', () => {
    const specPath = path.join(outputDir, 'docs', 'squads', `${squad.id}-update-spec.md`);
    expect(fs.existsSync(specPath)).toBe(true);
  });

  test('runSquadUpdate adds output to context agentOutputs', () => {
    const keys = Object.keys(context.agentOutputs);
    expect(keys.some(k => k.includes(squad.id))).toBe(true);
  });
});
