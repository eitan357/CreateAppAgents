'use strict';

const DEPENDENCY_MAP = {
  // ── Planning & Discovery ──────────────────────────────────────────────────
  pmAgent:                [],
  requirementsAnalyst:    [],
  mobileTechAdvisor:      ['requirementsAnalyst'],
  webTechAdvisor:         ['requirementsAnalyst'],
  businessPlanningAgent:  ['requirementsAnalyst'],
  asoMarketingAgent:      ['requirementsAnalyst'],

  // ── Architecture & Design ─────────────────────────────────────────────────
  systemArchitect:        ['requirementsAnalyst'],
  dataArchitect:          ['requirementsAnalyst', 'systemArchitect'],
  apiDesigner:            ['requirementsAnalyst', 'systemArchitect'],
  frontendArchitect:      ['requirementsAnalyst', 'systemArchitect'],
  renderingStrategyAgent: ['requirementsAnalyst', 'systemArchitect', 'frontendArchitect'],
  uxDesignerAgent:        ['requirementsAnalyst', 'systemArchitect'],
  designLeadAgent:        ['requirementsAnalyst', 'frontendArchitect', 'uxDesignerAgent'],
  localizationAgent:      ['requirementsAnalyst', 'frontendArchitect'],
  inputPolicyAgent:       ['requirementsAnalyst', 'uxDesignerAgent'],

  // ── Leaders Team ─────────────────────────────────────────────────────────
  vpPmAgent:              ['requirementsAnalyst', 'systemArchitect', 'dataArchitect', 'apiDesigner'],
  techLeadAgent:          ['systemArchitect', 'apiDesigner', 'dataArchitect', 'frontendArchitect'],
  qaLeadAgent:            ['requirementsAnalyst', 'apiDesigner', 'systemArchitect'],
  securityLeadAgent:      ['systemArchitect', 'apiDesigner', 'dataArchitect'],

  // ── Platform Team ─────────────────────────────────────────────────────────
  platformPmAgent:        ['vpPmAgent', 'designLeadAgent', 'apiDesigner', 'dataArchitect'],
  platformQaAgent:        ['platformPmAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent', 'dbSchemaAgent',
                           'notificationsAgent', 'offlineFirstAgent', 'realtimeAgent', 'animationsAgent',
                           'responsiveDesignAgent', 'pwaAgent', 'webMonetizationAgent'],
  platformSecurityAgent:  ['platformPmAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent', 'dbSchemaAgent'],

  // ── Platform Build ────────────────────────────────────────────────────────
  uiPrimitivesAgent:      ['designLeadAgent', 'uxDesignerAgent', 'frontendArchitect', 'inputPolicyAgent'],
  uiCompositeAgent:       ['uiPrimitivesAgent', 'uxDesignerAgent', 'frontendArchitect'],
  apiClientAgent:         ['apiDesigner', 'systemArchitect'],
  dbSchemaAgent:          ['dataArchitect', 'systemArchitect'],

  // ── Core Implementation ───────────────────────────────────────────────────
  backendDev:             ['systemArchitect', 'dataArchitect', 'apiDesigner', 'apiClientAgent', 'dbSchemaAgent'],
  frontendDev:            ['systemArchitect', 'frontendArchitect', 'apiDesigner', 'uxDesignerAgent', 'designLeadAgent', 'localizationAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent', 'inputPolicyAgent'],
  authAgent:              ['systemArchitect', 'apiDesigner', 'dataArchitect', 'apiClientAgent', 'dbSchemaAgent', 'inputPolicyAgent'],
  integrationAgent:       ['systemArchitect', 'apiDesigner', 'apiClientAgent'],

  // ── Mobile Feature Infrastructure (Layer 2d — run before squads) ──────────
  notificationsAgent:     ['systemArchitect', 'apiDesigner', 'dbSchemaAgent'],
  deepLinksAgent:         ['systemArchitect', 'frontendArchitect'],
  offlineFirstAgent:      ['systemArchitect', 'dataArchitect', 'dbSchemaAgent'],
  onboardingAgent:        ['uxDesignerAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'frontendArchitect'],
  animationsAgent:        ['uiPrimitivesAgent', 'designLeadAgent', 'frontendArchitect'],
  realtimeAgent:          ['systemArchitect', 'apiDesigner'],
  otaUpdatesAgent:        ['systemArchitect', 'frontendArchitect'],
  widgetsExtensionsAgent: ['frontendArchitect', 'uiPrimitivesAgent'],
  mlMobileAgent:          ['systemArchitect', 'frontendArchitect'],
  arVrAgent:              ['systemArchitect', 'frontendArchitect'],
  monetizationAgent:      ['systemArchitect', 'apiDesigner', 'dbSchemaAgent'],

  // ── Social Sharing & External App Integration ─────────────────────────────
  socialSharingAgent:     ['systemArchitect', 'frontendArchitect'],

  // ── Web Feature Infrastructure (Layer 2d — run before squads) ─────────────
  responsiveDesignAgent:  ['frontendArchitect', 'designLeadAgent'],
  pwaAgent:               ['frontendArchitect', 'systemArchitect'],
  webMonetizationAgent:   ['systemArchitect', 'apiDesigner', 'dataArchitect', 'dbSchemaAgent'],
  cmsIntegratorAgent:     ['frontendDev', 'backendDev', 'systemArchitect'],

  // ── Quality & Hardening ───────────────────────────────────────────────────
  codeDeduplicationAgent:    ['backendDev', 'frontendDev', 'authAgent'],
  errorAuditAgent:           ['backendDev', 'frontendDev', 'authAgent'],
  codeQualityAuditAgent:     ['backendDev', 'frontendDev', 'authAgent', 'codeDeduplicationAgent'],
  cmsQaAgent:                ['cmsIntegratorAgent', 'frontendDev'],
  security:               ['backendDev', 'authAgent', 'apiDesigner'],
  testWriter:             ['backendDev', 'frontendDev', 'authAgent', 'dataArchitect'],
  testRunner:             ['testWriter', 'backendDev', 'frontendDev', 'authAgent'],
  testFixer:              ['testRunner'],
  performanceAgent:       ['frontendDev', 'frontendArchitect'],
  webPerformanceAgent:    ['frontendDev', 'frontendArchitect', 'renderingStrategyAgent'],
  accessibilityAgent:     ['frontendDev'],
  loadTestingAgent:       ['backendDev', 'apiDesigner', 'devops'],
  reviewer:               ['backendDev', 'frontendDev', 'authAgent', 'integrationAgent'],

  // ── Monetization & Distribution ───────────────────────────────────────────
  monetizationAgent:      ['frontendDev', 'backendDev', 'integrationAgent'],
  userTestingAgent:       ['frontendDev', 'backendDev'],
  appStorePublisher:      ['systemArchitect', 'frontendDev', 'devops'],

  // ── Compliance & Maintenance ──────────────────────────────────────────────
  analyticsMonitoring:    ['frontendDev', 'backendDev'],
  privacyEthicsAgent:     ['backendDev', 'frontendDev', 'analyticsMonitoring'],
  dependencyManagementAgent: ['frontendDev', 'backendDev'],

  // ── DevOps & Documentation ────────────────────────────────────────────────
  devops:                 ['systemArchitect', 'backendDev', 'frontendDev'],
  documentation:          ['requirementsAnalyst', 'apiDesigner', 'backendDev', 'frontendDev', 'devops'],

  // ── Web Operations ────────────────────────────────────────────────────────
  seoAgent:               ['frontendDev', 'renderingStrategyAgent', 'frontendArchitect'],

  // ── Per-squad specialist agents ───────────────────────────────────────────
  squadDesignerAgent:        ['designLeadAgent', 'uxDesignerAgent'],
  squadQaAgent:              ['qaLeadAgent', 'backendDev', 'frontendDev', 'authAgent'],
  squadSecurityAgent:        ['securityLeadAgent', 'backendDev', 'frontendDev', 'authAgent'],
  squadErrorHandlingAgent:   ['techLeadAgent', 'backendDev', 'frontendDev', 'authAgent'],
  squadCodeCleanupAgent:     ['techLeadAgent', 'backendDev', 'frontendDev', 'authAgent'],
  squadDeduplicationAgent:   ['backendDev', 'frontendDev', 'authAgent'],

  // ── PM Acceptance Review ──────────────────────────────────────────────────
  pmReviewer:             ['vpPmAgent', 'requirementsAnalyst', 'systemArchitect', 'backendDev', 'frontendDev', 'authAgent', 'squadQaAgent', 'squadSecurityAgent', 'squadErrorHandlingAgent', 'squadCodeCleanupAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent'],
};

module.exports = { DEPENDENCY_MAP };
