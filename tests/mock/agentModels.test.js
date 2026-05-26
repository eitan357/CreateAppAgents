'use strict';

const { getAgentCategory, getDefaultModels, MODEL_OPTIONS, LIGHT_KEYS, MEDIUM_KEYS } = require('../../src/agentModels');
const nameMap = require('../../scripts/agent-name-map.json');

// ── Category assignment tests ──────────────────────────────────────────────────
describe('getAgentCategory — category assignments', () => {
  // Light agents
  test.each([
    ['documentation', 'Documentation'],
    ['devops',        'DevOps'],
    ['deploymentAdvisor', 'DeploymentAdvisor'],
    ['analyticsMonitoring', 'AnalyticsMonitoring'],
    ['seoAgent', 'SEO'],
    ['appStorePublisher', 'AppStorePublisher'],
    ['asoMarketingAgent', 'ASOMarketing'],
    ['localizationAgent', 'Localization'],
    ['privacyEthicsAgent', 'PrivacyEthics'],
    ['businessPlanningAgent', 'BusinessPlanning'],
  ])('%s → light', (key, displayName) => {
    expect(getAgentCategory(displayName)).toBe('light');
  });

  // Medium agents
  test.each([
    ['requirementsAnalyst', 'RequirementsAnalyst'],
    ['systemArchitect', 'Architect'],
    ['apiDesigner', 'ApiDesigner'],
    ['reviewer', 'Reviewer'],
    ['testWriter', 'TestWriter'],
    ['vpPmAgent', 'VpPm'],
    ['techLeadAgent', 'TechLead'],
    ['qaLeadAgent', 'QaLead'],
    ['uxDesignerAgent', 'UXDesigner'],
    ['platformPmAgent', 'PlatformPm'],
  ])('%s → medium', (key, displayName) => {
    expect(getAgentCategory(displayName)).toBe('medium');
  });

  // Heavy agents
  test.each([
    ['backendDev',    'Backend Dev'],
    ['frontendDev',   'Frontend Dev'],
    ['authAgent',     'AuthAgent'],
    ['integrationAgent', 'IntegrationAgent'],
    ['testRunner',    'TestRunner'],
    ['testFixer',     'TestFixer'],
    ['security',      'Security'],
    ['uiPrimitivesAgent', 'UiPrimitives'],
    ['notificationsAgent', 'Notifications'],
    ['socialSharingAgent', 'SocialSharing'],
  ])('%s → heavy', (key, displayName) => {
    expect(getAgentCategory(displayName)).toBe('heavy');
  });

  test('unknown display name defaults to heavy', () => {
    expect(getAgentCategory('SomeNonExistentAgent')).toBe('heavy');
  });
});

// ── Every agent in the name map resolves to a category ────────────────────────
describe('getAgentCategory — full name map coverage', () => {
  const allDisplayNames = Object.values(nameMap);

  test.each(allDisplayNames.map(n => [n]))('"%s" resolves to light/medium/heavy', (displayName) => {
    const category = getAgentCategory(displayName);
    expect(['light', 'medium', 'heavy']).toContain(category);
  });
});

// ── LIGHT_KEYS and MEDIUM_KEYS are disjoint ────────────────────────────────────
describe('agentModels — key sets', () => {
  test('LIGHT_KEYS and MEDIUM_KEYS have no overlap', () => {
    const overlap = [...LIGHT_KEYS].filter(k => MEDIUM_KEYS.has(k));
    expect(overlap).toHaveLength(0);
  });

  test('every LIGHT_KEYS entry appears in the name map', () => {
    const mapKeys = new Set(Object.keys(nameMap));
    for (const key of LIGHT_KEYS) {
      expect(mapKeys).toContain(key);
    }
  });

  test('every MEDIUM_KEYS entry appears in the name map', () => {
    const mapKeys = new Set(Object.keys(nameMap));
    for (const key of MEDIUM_KEYS) {
      expect(mapKeys).toContain(key);
    }
  });
});

// ── getDefaultModels — config correctness per tier ────────────────────────────
describe('getDefaultModels — tier-based defaults', () => {
  test('Tier 1: light=haiku, medium=sonnet, heavy=sonnet', () => {
    const cfg = getDefaultModels(1);
    expect(cfg.light).toEqual(MODEL_OPTIONS.haiku);
    expect(cfg.medium).toEqual(MODEL_OPTIONS.sonnet);
    expect(cfg.heavy).toEqual(MODEL_OPTIONS.sonnet);
  });

  test('Tier 2: light=haiku, medium=sonnet, heavy=sonnetThinking', () => {
    const cfg = getDefaultModels(2);
    expect(cfg.light).toEqual(MODEL_OPTIONS.haiku);
    expect(cfg.medium).toEqual(MODEL_OPTIONS.sonnet);
    expect(cfg.heavy).toEqual(MODEL_OPTIONS.sonnetThinking);
  });

  test('Tier 3: light=haiku, medium=sonnet, heavy=opus', () => {
    const cfg = getDefaultModels(3);
    expect(cfg.light).toEqual(MODEL_OPTIONS.haiku);
    expect(cfg.medium).toEqual(MODEL_OPTIONS.sonnet);
    expect(cfg.heavy).toEqual(MODEL_OPTIONS.opus);
  });

  test('each config has model, max_tokens, and thinking fields', () => {
    for (const tier of [1, 2, 3]) {
      const cfg = getDefaultModels(tier);
      for (const [group, c] of Object.entries(cfg)) {
        expect(typeof c.model).toBe('string');
        expect(typeof c.max_tokens).toBe('number');
        expect(c).toHaveProperty('thinking');
      }
    }
  });

  test('getDefaultModels does not mutate MODEL_OPTIONS', () => {
    const original = JSON.parse(JSON.stringify(MODEL_OPTIONS));
    getDefaultModels(1);
    getDefaultModels(2);
    getDefaultModels(3);
    expect(MODEL_OPTIONS).toEqual(original);
  });
});

// ── base.js — setModelConfigs / getModelConfigs ───────────────────────────────
describe('BaseAgent — setModelConfigs / getModelConfigs', () => {
  const { setModelConfigs, getModelConfigs } = require('../../src/agents/base');

  afterEach(() => {
    // Restore to tier-3 defaults after each test
    setModelConfigs(getDefaultModels(3));
  });

  test('getModelConfigs returns an object with light/medium/heavy keys', () => {
    const cfg = getModelConfigs();
    expect(cfg).toHaveProperty('light');
    expect(cfg).toHaveProperty('medium');
    expect(cfg).toHaveProperty('heavy');
  });

  test('setModelConfigs replaces all three categories', () => {
    const newCfg = {
      light:  { ...MODEL_OPTIONS.sonnet },
      medium: { ...MODEL_OPTIONS.sonnet },
      heavy:  { ...MODEL_OPTIONS.sonnet },
    };
    setModelConfigs(newCfg);
    expect(getModelConfigs()).toEqual(newCfg);
  });

  test('default heavy config for tier 3 is opus', () => {
    setModelConfigs(getDefaultModels(3));
    expect(getModelConfigs().heavy.model).toBe('claude-opus-4-7');
  });

  test('default light config is always haiku', () => {
    for (const tier of [1, 2, 3]) {
      setModelConfigs(getDefaultModels(tier));
      expect(getModelConfigs().light.model).toBe('claude-haiku-4-5-20251001');
    }
  });
});
