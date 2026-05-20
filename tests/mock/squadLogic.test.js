'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { _qaHasIssues } = require('../../src/squadRunner');
const { orchestrate }  = require('../../src/orchestrator');
const { ProjectContext } = require('../../src/context');

// ── _qaHasIssues unit tests ──────────────────────────────────────────────────
describe('_qaHasIssues', () => {
  let tmpDir;
  const squad = { id: 'squad-01', name: 'Core' };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-test-'));
    fs.mkdirSync(path.join(tmpDir, 'docs', 'squads'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeQaReport(content) {
    fs.writeFileSync(path.join(tmpDir, 'docs', 'squads', 'squad-01-qa-report.md'), content, 'utf8');
  }

  function makeCtx() {
    return { outputDir: tmpDir };
  }

  test('returns false when QA report file does not exist', () => {
    expect(_qaHasIssues(makeCtx(), squad)).toBe(false);
  });

  test('returns false when report contains ALL PASS', () => {
    writeQaReport('# QA\n\nALL PASS — 5 passing (12ms)\n');
    expect(_qaHasIssues(makeCtx(), squad)).toBe(false);
  });

  test('returns true when report contains FAIL without ALL PASS', () => {
    writeQaReport('# QA\n\nFAILING — 2 tests failed\n- FAIL: auth endpoint returns 500\n');
    expect(_qaHasIssues(makeCtx(), squad)).toBe(true);
  });

  test('returns false when FAIL appears alongside ALL PASS (e.g. "0 failed")', () => {
    // Common pattern: "5 passing, 0 failed" — "failed" matches /FAIL/i but ALL PASS overrides
    writeQaReport('# QA\n\nALL PASS — 5 passing, 0 failed\n');
    expect(_qaHasIssues(makeCtx(), squad)).toBe(false);
  });

  test('returns true when report contains ERROR without ALL PASS', () => {
    writeQaReport('# QA\n\nERROR: Cannot connect to database\n');
    expect(_qaHasIssues(makeCtx(), squad)).toBe(true);
  });

  test('returns true when report contains ❌ without ALL PASS', () => {
    writeQaReport('# QA\n\n❌ Auth test failed\n');
    expect(_qaHasIssues(makeCtx(), squad)).toBe(true);
  });

  test('returns false when report contains NO ISSUES', () => {
    writeQaReport('# QA\n\nNO ISSUES found.\n');
    expect(_qaHasIssues(makeCtx(), squad)).toBe(false);
  });

  test('returns false when report contains 0 FAILING', () => {
    writeQaReport('# QA\n\n5 passing, 0 FAILING\n');
    expect(_qaHasIssues(makeCtx(), squad)).toBe(false);
  });
});

// ── QA fix loop — max rounds reached ────────────────────────────────────────
describe('QA fix loop — persistent failures', () => {
  let outputDir;

  beforeAll(() => {
    global._mockMode = true;
    global._mockQaFails = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-loop-test-'));
  });

  afterAll(() => {
    global._mockMode = false;
    global._mockQaFails = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('pipeline completes even when QA keeps failing (max rounds reached)', async () => {
    await expect(
      orchestrate('Simple todo app.', 'qa-fail-test', outputDir, null, null)
    ).resolves.not.toThrow();
  });

  test('QA report on disk contains the failure content from mock', () => {
    const qaPath = path.join(outputDir, 'docs', 'squads', 'squad-01-qa-report.md');
    expect(fs.existsSync(qaPath)).toBe(true);
    const content = fs.readFileSync(qaPath, 'utf8');
    expect(content).toContain('FAILING');
  });

  test('checkpoint is saved despite QA failures', () => {
    expect(ProjectContext.loadCheckpoint(outputDir)).not.toBeNull();
  });
});

// ── PM GAPS verdict ──────────────────────────────────────────────────────────
describe('PM GAPS — fix round triggered', () => {
  let outputDir;

  beforeAll(() => {
    global._mockMode = true;
    global._mockPmGaps = true;
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-gaps-test-'));
  });

  afterAll(() => {
    global._mockMode = false;
    global._mockPmGaps = false;
    delete global._mockOutputDir;
    delete global._currentSquadContext;
    if (outputDir) fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('pipeline completes even when PM returns GAPS', async () => {
    await expect(
      orchestrate('Simple todo app.', 'pm-gaps-test', outputDir, null, null)
    ).resolves.not.toThrow();
  });

  test('PM review file on disk contains VERDICT: GAPS', () => {
    const reviewPath = path.join(outputDir, 'docs', 'squads', 'squad-01-review.md');
    expect(fs.existsSync(reviewPath)).toBe(true);
    const content = fs.readFileSync(reviewPath, 'utf8');
    expect(content).toContain('VERDICT: GAPS');
  });

  test('checkpoint is saved despite PM GAPS', () => {
    expect(ProjectContext.loadCheckpoint(outputDir)).not.toBeNull();
  });
});
