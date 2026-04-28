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
  designSystemAgent:      ['requirementsAnalyst', 'frontendArchitect', 'uxDesignerAgent'],
  localizationAgent:      ['requirementsAnalyst', 'frontendArchitect'],

  // ── Core Implementation ───────────────────────────────────────────────────
  backendDev:             ['systemArchitect', 'dataArchitect', 'apiDesigner'],
  frontendDev:            ['systemArchitect', 'frontendArchitect', 'apiDesigner', 'uxDesignerAgent', 'designSystemAgent', 'localizationAgent'],
  authAgent:              ['systemArchitect', 'apiDesigner', 'dataArchitect'],
  integrationAgent:       ['systemArchitect', 'apiDesigner'],

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
  errorHandlingAgent:     ['backendDev', 'frontendDev', 'authAgent'],
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

  // ── PM Acceptance Review ──────────────────────────────────────────────────
  pmReviewer:             ['requirementsAnalyst', 'systemArchitect', 'backendDev', 'frontendDev', 'authAgent', 'testFixer', 'reviewer', 'security', 'errorHandlingAgent'],
};

module.exports = { DEPENDENCY_MAP };
