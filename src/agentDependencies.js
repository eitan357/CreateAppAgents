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
  platformQaAgent:        ['platformPmAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent', 'dbSchemaAgent'],

  // ── Platform Build ────────────────────────────────────────────────────────
  uiPrimitivesAgent:      ['designLeadAgent', 'uxDesignerAgent', 'frontendArchitect', 'inputPolicyAgent'],
  uiCompositeAgent:       ['uiPrimitivesAgent', 'uxDesignerAgent', 'frontendArchitect'],
  apiClientAgent:         ['apiDesigner', 'systemArchitect'],
  dbSchemaAgent:          ['dataArchitect', 'systemArchitect'],

  // ── Core Implementation ───────────────────────────────────────────────────
  backendDev:             ['systemArchitect', 'dataArchitect', 'apiDesigner', 'apiClientAgent', 'dbSchemaAgent'],
  frontendDev:            ['systemArchitect', 'frontendArchitect', 'apiDesigner', 'uxDesignerAgent', 'designSystemAgent', 'localizationAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent', 'inputPolicyAgent'],
  authAgent:              ['systemArchitect', 'apiDesigner', 'dataArchitect', 'apiClientAgent', 'dbSchemaAgent', 'inputPolicyAgent'],
  integrationAgent:       ['systemArchitect', 'apiDesigner', 'apiClientAgent'],

  // ── Mobile-Specific Features ──────────────────────────────────────────────
  notificationsAgent:     ['frontendDev', 'backendDev', 'integrationAgent'],
  deepLinksAgent:         ['frontendDev', 'backendDev'],
  offlineFirstAgent:      ['frontendDev', 'dataArchitect', 'apiDesigner'],
  onboardingAgent:        ['frontendDev', 'frontendArchitect'],
  animationsAgent:        ['frontendDev', 'frontendArchitect'],
  realtimeAgent:          ['backendDev', 'frontendDev', 'integrationAgent'],
  otaUpdatesAgent:        ['frontendDev', 'devops'],
  widgetsExtensionsAgent: ['frontendDev'],
  mlMobileAgent:          ['frontendDev', 'systemArchitect'],
  arVrAgent:              ['frontendDev', 'systemArchitect'],

  // ── Web-Specific Features ─────────────────────────────────────────────────
  responsiveDesignAgent:  ['frontendArchitect', 'frontendDev'],
  pwaAgent:               ['frontendDev', 'frontendArchitect'],
  webMonetizationAgent:   ['backendDev', 'frontendDev', 'dataArchitect', 'apiDesigner'],
  cmsAgent:               ['frontendDev', 'backendDev', 'systemArchitect'],
  cmsIntegratorAgent:     ['cmsAgent', 'frontendDev'],

  // ── Quality & Hardening ───────────────────────────────────────────────────
  errorHandlingAgent:        ['backendDev', 'frontendDev', 'authAgent'],
  codeDeduplicationAgent:    ['backendDev', 'frontendDev', 'authAgent', 'errorHandlingAgent'],
  codeCleanupAgent:          ['codeDeduplicationAgent'],
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
  squadDesignerAgent:     ['designLeadAgent', 'uxDesignerAgent', 'designLeadAgent'],
  squadQaAgent:           ['qaLeadAgent', 'backendDev', 'frontendDev', 'authAgent'],
  squadSecurityAgent:     ['securityLeadAgent', 'backendDev', 'frontendDev', 'authAgent'],
  squadCleanupAgent:      ['techLeadAgent', 'backendDev', 'frontendDev', 'authAgent'],

  // ── PM Acceptance Review ──────────────────────────────────────────────────
  pmReviewer:             ['vpPmAgent', 'requirementsAnalyst', 'systemArchitect', 'backendDev', 'frontendDev', 'authAgent', 'squadQaAgent', 'squadSecurityAgent', 'squadCleanupAgent', 'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent'],
};

module.exports = { DEPENDENCY_MAP };
