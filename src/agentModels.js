'use strict';

const nameMap = require('../scripts/agent-name-map.json');

// ── Category sets (camelCase registry keys) ───────────────────────────────────
const LIGHT_KEYS = new Set([
  'documentation',
  'devops',
  'deploymentAdvisor',
  'analyticsMonitoring',
  'seoAgent',
  'appStorePublisher',
  'asoMarketingAgent',
  'businessPlanningAgent',
  'userTestingAgent',
  'privacyEthicsAgent',
  'dependencyManagementAgent',
  'squadCodeCleanupAgent',
  'squadDeduplicationAgent',
  'localizationAgent',
]);

const MEDIUM_KEYS = new Set([
  'requirementsAnalyst',
  'systemArchitect',
  'apiDesigner',
  'dataArchitect',
  'frontendArchitect',
  'uxDesignerAgent',
  'designLeadAgent',
  'inputPolicyAgent',
  'renderingStrategyAgent',
  'reviewer',
  'pmReviewer',
  'testWriter',
  'loadTestingAgent',
  'accessibilityAgent',
  'performanceAgent',
  'webPerformanceAgent',
  'errorAuditAgent',
  'codeQualityAuditAgent',
  'codeDeduplicationAgent',
  'squadDesignerAgent',
  'vpPmAgent',
  'techLeadAgent',
  'qaLeadAgent',
  'securityLeadAgent',
  'platformPmAgent',
  'platformQaAgent',
  'platformSecurityAgent',
  'mobileTechAdvisor',
  'webTechAdvisor',
]);

// Everything not in LIGHT or MEDIUM → heavy
// (backendDev, frontendDev, authAgent, integrationAgent, testRunner, testFixer,
//  security, uiPrimitivesAgent, uiCompositeAgent, apiClientAgent, dbSchemaAgent,
//  squadErrorHandlingAgent, squadQaAgent, squadSecurityAgent,
//  notificationsAgent, deepLinksAgent, offlineFirstAgent, realtimeAgent,
//  animationsAgent, onboardingAgent, monetizationAgent, mlMobileAgent, arVrAgent,
//  widgetsExtensionsAgent, otaUpdatesAgent, socialSharingAgent,
//  cmsIntegratorAgent, cmsQaAgent, simpleAppBuilder, ...)

// ── Build displayName → category map using nameMap as bridge ──────────────────
const _categoryMap = {};
for (const [key, displayName] of Object.entries(nameMap)) {
  if (LIGHT_KEYS.has(key))       _categoryMap[displayName] = 'light';
  else if (MEDIUM_KEYS.has(key)) _categoryMap[displayName] = 'medium';
  else                           _categoryMap[displayName] = 'heavy';
}

function getAgentCategory(displayName) {
  return _categoryMap[displayName] || 'heavy';
}

// ── Available model presets ───────────────────────────────────────────────────
const MODEL_OPTIONS = {
  haiku:          { model: 'claude-haiku-4-5-20251001', max_tokens: 4096,  thinking: null },
  sonnet:         { model: 'claude-sonnet-4-6',         max_tokens: 8096,  thinking: null },
  sonnetThinking: { model: 'claude-sonnet-4-6',         max_tokens: 16000, thinking: { type: 'adaptive' } },
  opus:           { model: 'claude-opus-4-7',           max_tokens: 32000, thinking: { type: 'adaptive' } },
};

function getDefaultModels(tier) {
  return {
    light:  { ...MODEL_OPTIONS.haiku },
    medium: { ...MODEL_OPTIONS.sonnet },
    heavy:  tier >= 3 ? { ...MODEL_OPTIONS.opus }
          : tier === 2 ? { ...MODEL_OPTIONS.sonnetThinking }
          : { ...MODEL_OPTIONS.sonnet },
  };
}

module.exports = { getAgentCategory, getDefaultModels, MODEL_OPTIONS, LIGHT_KEYS, MEDIUM_KEYS };
