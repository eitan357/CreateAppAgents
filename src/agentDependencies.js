'use strict';

const DEPENDENCY_MAP = {
  // ── Planning & Discovery ──────────────────────────────────────────────────
  pmAgent:                [],
  requirementsAnalyst:    [],
  mobileTechAdvisor:      ['requirementsAnalyst'],
  businessPlanningAgent:  ['requirementsAnalyst'],
  asoMarketingAgent:      ['requirementsAnalyst'],

  // ── Architecture & Design ─────────────────────────────────────────────────
  systemArchitect:        ['requirementsAnalyst'],
  dataArchitect:          ['requirementsAnalyst', 'systemArchitect'],
  apiDesigner:            ['requirementsAnalyst', 'systemArchitect'],
  frontendArchitect:      ['requirementsAnalyst', 'systemArchitect'],

  // ── Core Implementation ───────────────────────────────────────────────────
  backendDev:             ['systemArchitect', 'dataArchitect', 'apiDesigner'],
  frontendDev:            ['systemArchitect', 'frontendArchitect', 'apiDesigner'],
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

  // ── Quality & Hardening ───────────────────────────────────────────────────
  security:               ['backendDev', 'authAgent', 'apiDesigner'],
  tester:                 ['backendDev', 'frontendDev', 'authAgent', 'dataArchitect'],
  performanceAgent:       ['frontendDev', 'frontendArchitect'],
  accessibilityAgent:     ['frontendDev'],
  loadTestingAgent:       ['backendDev', 'apiDesigner', 'devops'],
  reviewer:               ['backendDev', 'frontendDev', 'authAgent', 'integrationAgent'],

  // ── Monetization & Distribution ───────────────────────────────────────────
  monetizationAgent:      ['frontendDev', 'backendDev', 'integrationAgent'],
  userTestingAgent:       ['frontendDev', 'devops'],
  appStorePublisher:      ['systemArchitect', 'frontendDev', 'devops'],

  // ── Compliance & Maintenance ──────────────────────────────────────────────
  localizationAgent:      ['frontendDev', 'frontendArchitect'],
  analyticsMonitoring:    ['frontendDev', 'backendDev'],
  privacyEthicsAgent:     ['backendDev', 'frontendDev', 'analyticsMonitoring'],
  dependencyManagementAgent: ['frontendDev', 'backendDev'],

  // ── DevOps & Documentation ────────────────────────────────────────────────
  devops:                 ['systemArchitect', 'backendDev', 'frontendDev'],
  documentation:          ['requirementsAnalyst', 'apiDesigner', 'backendDev', 'frontendDev', 'devops'],

  // ── PM Acceptance Review ──────────────────────────────────────────────────
  pmReviewer:             ['requirementsAnalyst', 'systemArchitect', 'backendDev', 'frontendDev', 'authAgent', 'tester', 'reviewer', 'security'],
};

module.exports = { DEPENDENCY_MAP };
