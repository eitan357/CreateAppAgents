'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { getMockResponse } = require('../src/mockResponses');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-test-'));
  global._mockOutputDir        = tmpDir;
  global._currentSquadContext  = null;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete global._mockOutputDir;
  delete global._currentSquadContext;
});

// ── Generic contract ─────────────────────────────────────────────────────────
test('every known agent returns { summary: string, filesCreated: array }', () => {
  const agents = [
    'RequirementsAnalyst', 'Architect', 'DataArchitect', 'ApiDesigner',
    'FrontendArchitect', 'UXDesigner', 'Backend Dev', 'Frontend Dev',
    'AuthAgent', 'VpPm', 'TechLead', 'QaLead', 'SecurityLead', 'DesignLead',
    'PlatformPm', 'UiPrimitives', 'UiComposite', 'ApiClient', 'DbSchema',
    'Security', 'Reviewer', 'TestWriter', 'TestRunner', 'TestFixer',
    'PMReviewer', 'DevOps', 'Documentation',
    'CodeDeduplication', 'ErrorAudit', 'CodeQualityAudit',
    'SquadCodeCleanup', 'SquadDeduplication',
  ];
  for (const name of agents) {
    const result = getMockResponse(name);
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(result.filesCreated)).toBe(true);
  }
});

test('unknown agent returns generic summary and empty filesCreated', () => {
  const result = getMockResponse('SomeUnknownAgentXYZ');
  expect(result.summary).toContain('SomeUnknownAgentXYZ');
  expect(result.filesCreated).toEqual([]);
});

// ── Critical pipeline files ──────────────────────────────────────────────────
test('SquadPmReview creates review file with VERDICT: ACCEPTED', () => {
  global._currentSquadContext = { id: 'squad-01', name: 'Core' };
  const result = getMockResponse('SquadPmReview');
  expect(result.summary).toContain('VERDICT: ACCEPTED');

  const reviewPath = path.join(tmpDir, 'docs', 'squads', 'squad-01-review.md');
  expect(fs.existsSync(reviewPath)).toBe(true);
  expect(fs.readFileSync(reviewPath, 'utf8')).toContain('VERDICT: ACCEPTED');
});

test('SquadQa creates QA report without FAIL keywords', () => {
  global._currentSquadContext = { id: 'squad-01', name: 'Core' };
  getMockResponse('SquadQa');

  const qaPath = path.join(tmpDir, 'docs', 'squads', 'squad-01-qa-report.md');
  expect(fs.existsSync(qaPath)).toBe(true);
  const content = fs.readFileSync(qaPath, 'utf8');
  expect(/FAIL|FAILING|ERROR|BUG|BROKEN/i.test(content)).toBe(false);
  expect(/ALL PASS/i.test(content)).toBe(true);
});

test('SquadPmSpec creates spec file with squad id', () => {
  global._currentSquadContext = { id: 'squad-02', name: 'Settings' };
  getMockResponse('SquadPmSpec');

  const specPath = path.join(tmpDir, 'docs', 'squads', 'squad-02-spec.md');
  expect(fs.existsSync(specPath)).toBe(true);
});

test('PMReviewer summary contains VERDICT: ACCEPTED', () => {
  const result = getMockResponse('PMReviewer');
  expect(result.summary).toContain('VERDICT: ACCEPTED');
});

// ── Guideline files ──────────────────────────────────────────────────────────
test('VpPm creates pm-guidelines.md', () => {
  getMockResponse('VpPm');
  expect(fs.existsSync(path.join(tmpDir, 'docs', 'guidelines', 'pm-guidelines.md'))).toBe(true);
});

test('TechLead creates tech-guidelines.md', () => {
  getMockResponse('TechLead');
  expect(fs.existsSync(path.join(tmpDir, 'docs', 'guidelines', 'tech-guidelines.md'))).toBe(true);
});

test('SecurityLead creates security-guidelines.md', () => {
  getMockResponse('SecurityLead');
  expect(fs.existsSync(path.join(tmpDir, 'docs', 'guidelines', 'security-guidelines.md'))).toBe(true);
});

// ── Shared platform files ────────────────────────────────────────────────────
test('UiPrimitives creates shared/components/primitives/index.ts', () => {
  getMockResponse('UiPrimitives');
  expect(fs.existsSync(path.join(tmpDir, 'shared', 'components', 'primitives', 'index.ts'))).toBe(true);
});

test('ApiClient creates shared/api/client.ts', () => {
  getMockResponse('ApiClient');
  expect(fs.existsSync(path.join(tmpDir, 'shared', 'api', 'client.ts'))).toBe(true);
});

// ── Squad id isolation ───────────────────────────────────────────────────────
test('different squads write to different file paths', () => {
  global._currentSquadContext = { id: 'squad-01', name: 'Core' };
  getMockResponse('SquadPmReview');

  global._currentSquadContext = { id: 'squad-02', name: 'Auth' };
  getMockResponse('SquadPmReview');

  expect(fs.existsSync(path.join(tmpDir, 'docs', 'squads', 'squad-01-review.md'))).toBe(true);
  expect(fs.existsSync(path.join(tmpDir, 'docs', 'squads', 'squad-02-review.md'))).toBe(true);
});
