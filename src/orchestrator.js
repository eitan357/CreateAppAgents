'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');

const { ProjectContext } = require('./context');
const { approveStep, approveLayer } = require('./approval');
const { createSquadPlan, formatSquadPlan } = require('./squadPlanner');
const { createFileSystemTools } = require('./tools/fileSystem');
const { createShellTools } = require('./tools/shell');
const { runLayerInParallel, runLayerSequential, getFailedAgents } = require('./layerRunner');
const { runAllSquads, runAllSquadsUpdate } = require('./squadRunner');
const { analyzeUpdate, formatUpdatePlan } = require('./updatePlanner');
const { pushCheckpoint, pushToGithub } = require('./github');

// ── Core agents ───────────────────────────────────────────────────────────────
const { createRequirementsAnalystAgent } = require('./agents/requirementsAnalyst');
const { createArchitectAgent }           = require('./agents/architect');
const { createDataArchitectAgent }       = require('./agents/dataArchitect');
const { createApiDesignerAgent }         = require('./agents/apiDesigner');
const { createFrontendArchitectAgent }   = require('./agents/frontendArchitect');
const { createBackendDevAgent }          = require('./agents/backendDev');
const { createFrontendDevAgent }         = require('./agents/frontendDev');
const { createAuthAgent }                = require('./agents/authAgent');
const { createIntegrationAgent }         = require('./agents/integrationAgent');
const { createSecurityAgent }            = require('./agents/security');
const { createTestRunnerAgent }          = require('./agents/testRunner');
const { createTestFixerAgent }           = require('./agents/testFixer');
const { createTestWriterAgent }          = require('./agents/testWriter');
const { createReviewerAgent }            = require('./agents/reviewer');
const { createDevOpsAgent }              = require('./agents/devops');
const { createDocumentationAgent }       = require('./agents/documentation');

// ── Discovery & Planning agents ───────────────────────────────────────────────
const { createMobileTechAdvisorAgent }   = require('./agents/mobileTechAdvisor');
const { createBusinessPlanningAgent }    = require('./agents/businessPlanningAgent');
const { createWebTechAdvisorAgent }      = require('./agents/webTechAdvisorAgent');

// ── UX & Design System agents ─────────────────────────────────────────────────
const { createUxDesignerAgent }          = require('./agents/uxDesignerAgent');
const { createDesignSystemAgent }        = require('./agents/designSystemAgent');

// ── Web Feature agents ────────────────────────────────────────────────────────
const { createRenderingStrategyAgent }   = require('./agents/renderingStrategyAgent');
const { createResponsiveDesignAgent }    = require('./agents/responsiveDesignAgent');
const { createPwaAgent }                 = require('./agents/pwaAgent');
const { createWebMonetizationAgent }     = require('./agents/webMonetizationAgent');
const { createCmsAgent }                 = require('./agents/cmsAgent');
const { createCmsIntegratorAgent }       = require('./agents/cmsIntegratorAgent');

// ── Mobile Feature agents ─────────────────────────────────────────────────────
const { createNotificationsAgent }       = require('./agents/notificationsAgent');
const { createDeepLinksAgent }           = require('./agents/deepLinksAgent');
const { createOfflineFirstAgent }        = require('./agents/offlineFirstAgent');
const { createRealtimeAgent }            = require('./agents/realtimeAgent');
const { createAnimationsAgent }          = require('./agents/animationsAgent');
const { createOnboardingAgent }          = require('./agents/onboardingAgent');
const { createMonetizationAgent }        = require('./agents/monetizationAgent');
const { createMLMobileAgent }            = require('./agents/mlMobileAgent');
const { createARVRAgent }                = require('./agents/arVrAgent');
const { createWidgetsExtensionsAgent }   = require('./agents/widgetsExtensionsAgent');
const { createOTAUpdatesAgent }          = require('./agents/otaUpdatesAgent');

// ── Platform Build agents ─────────────────────────────────────────────────────
const { createUiPrimitivesAgent }        = require('./agents/uiPrimitivesAgent');
const { createUiCompositeAgent }         = require('./agents/uiCompositeAgent');
const { createApiClientAgent }           = require('./agents/apiClientAgent');

// ── Quality agents ────────────────────────────────────────────────────────────
const { createErrorHandlingAgent }       = require('./agents/errorHandlingAgent');
const { createCodeDeduplicationAgent }   = require('./agents/codeDeduplicationAgent');
const { createCodeCleanupAgent }         = require('./agents/codeCleanupAgent');
const { createPerformanceAgent }         = require('./agents/performanceAgent');
const { createAccessibilityAgent }       = require('./agents/accessibilityAgent');
const { createLoadTestingAgent }         = require('./agents/loadTestingAgent');
const { createDependencyManagementAgent } = require('./agents/dependencyManagementAgent');
const { createWebPerformanceAgent }      = require('./agents/webPerformanceAgent');

// ── PM Review agent ───────────────────────────────────────────────────────────
const { createPmReviewerAgent }          = require('./agents/pmReviewer');

// ── Operations agents ─────────────────────────────────────────────────────────
const { createAnalyticsMonitoringAgent } = require('./agents/analyticsMonitoring');
const { createLocalizationAgent }        = require('./agents/localizationAgent');
const { createPrivacyEthicsAgent }       = require('./agents/privacyEthicsAgent');
const { createAppStorePublisherAgent }   = require('./agents/appStorePublisher');
const { createUserTestingAgent }         = require('./agents/userTestingAgent');
const { createASOMarketingAgent }        = require('./agents/asoMarketingAgent');
const { createSeoAgent }                 = require('./agents/seoAgent');

// ── Registry ──────────────────────────────────────────────────────────────────
const AGENT_REGISTRY = {
  // Core
  requirementsAnalyst:      createRequirementsAnalystAgent,
  systemArchitect:          createArchitectAgent,
  dataArchitect:            createDataArchitectAgent,
  apiDesigner:              createApiDesignerAgent,
  frontendArchitect:        createFrontendArchitectAgent,
  backendDev:               createBackendDevAgent,
  frontendDev:              createFrontendDevAgent,
  authAgent:                createAuthAgent,
  integrationAgent:         createIntegrationAgent,
  testWriter:               createTestWriterAgent,
  testRunner:               createTestRunnerAgent,
  testFixer:                createTestFixerAgent,
  security:                 createSecurityAgent,
  reviewer:                 createReviewerAgent,
  devops:                   createDevOpsAgent,
  documentation:            createDocumentationAgent,
  // Platform Build
  uiPrimitivesAgent:        createUiPrimitivesAgent,
  uiCompositeAgent:         createUiCompositeAgent,
  apiClientAgent:           createApiClientAgent,
  // Discovery & Planning
  mobileTechAdvisor:        createMobileTechAdvisorAgent,
  businessPlanningAgent:    createBusinessPlanningAgent,
  webTechAdvisor:           createWebTechAdvisorAgent,
  // UX & Design System
  uxDesignerAgent:          createUxDesignerAgent,
  designSystemAgent:        createDesignSystemAgent,
  // Web Features
  renderingStrategyAgent:   createRenderingStrategyAgent,
  responsiveDesignAgent:    createResponsiveDesignAgent,
  pwaAgent:                 createPwaAgent,
  webMonetizationAgent:     createWebMonetizationAgent,
  cmsAgent:                 createCmsAgent,
  cmsIntegratorAgent:       createCmsIntegratorAgent,
  // Mobile Features
  notificationsAgent:       createNotificationsAgent,
  deepLinksAgent:           createDeepLinksAgent,
  offlineFirstAgent:        createOfflineFirstAgent,
  realtimeAgent:            createRealtimeAgent,
  animationsAgent:          createAnimationsAgent,
  onboardingAgent:          createOnboardingAgent,
  monetizationAgent:        createMonetizationAgent,
  mlMobileAgent:            createMLMobileAgent,
  arVrAgent:                createARVRAgent,
  widgetsExtensionsAgent:   createWidgetsExtensionsAgent,
  otaUpdatesAgent:          createOTAUpdatesAgent,
  // Quality
  errorHandlingAgent:       createErrorHandlingAgent,
  codeDeduplicationAgent:   createCodeDeduplicationAgent,
  codeCleanupAgent:         createCodeCleanupAgent,
  performanceAgent:         createPerformanceAgent,
  accessibilityAgent:       createAccessibilityAgent,
  loadTestingAgent:         createLoadTestingAgent,
  dependencyManagementAgent: createDependencyManagementAgent,
  webPerformanceAgent:      createWebPerformanceAgent,
  // PM Review
  pmReviewer:               createPmReviewerAgent,
  // Operations
  analyticsMonitoring:      createAnalyticsMonitoringAgent,
  localizationAgent:        createLocalizationAgent,
  privacyEthicsAgent:       createPrivacyEthicsAgent,
  appStorePublisher:        createAppStorePublisherAgent,
  userTestingAgent:         createUserTestingAgent,
  asoMarketingAgent:        createASOMarketingAgent,
  seoAgent:                 createSeoAgent,
};

// ── Layer definitions ─────────────────────────────────────────────────────────
// Layer 3b and all optional agents are filtered to only those the PM selected.
const LAYER_DEFINITIONS = [
  {
    id: 1,
    name: 'Discovery',
    parallel: false,
    agents: ['requirementsAnalyst', 'systemArchitect', 'mobileTechAdvisor', 'businessPlanningAgent', 'webTechAdvisor'],
  },
  {
    id: 2,
    name: 'Design',
    parallel: true,
    agents: ['dataArchitect', 'apiDesigner', 'frontendArchitect', 'renderingStrategyAgent', 'uxDesignerAgent', 'designSystemAgent', 'localizationAgent'],
  },
  {
    id: '2b',
    name: 'Platform Build',
    parallel: false,
    agents: ['uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent'],
  },
  {
    id: 3,
    name: 'Implementation',
    parallel: true,
    agents: ['backendDev', 'frontendDev', 'authAgent', 'integrationAgent'],
  },
  {
    id: '3b',
    name: 'Mobile Features',
    parallel: true,
    agents: [
      'notificationsAgent', 'deepLinksAgent', 'offlineFirstAgent', 'realtimeAgent',
      'animationsAgent', 'onboardingAgent', 'monetizationAgent', 'mlMobileAgent',
      'arVrAgent', 'widgetsExtensionsAgent', 'otaUpdatesAgent', 'cmsAgent',
    ],
  },
  {
    id: '3c',
    name: 'Web Features',
    parallel: true,
    agents: [
      'responsiveDesignAgent', 'pwaAgent', 'webMonetizationAgent', 'cmsAgent',
    ],
  },
  {
    id: '3d',
    name: 'CMS Integration',
    parallel: false,
    agents: ['cmsIntegratorAgent'],
  },
  {
    id: '3e',
    name: 'Error Handling',
    parallel: false,
    agents: ['errorHandlingAgent'],
  },
  {
    id: '3f',
    name: 'Code Refinement',
    parallel: false,
    agents: ['codeDeduplicationAgent', 'codeCleanupAgent'],
  },
  {
    id: 4,
    name: 'Quality',
    parallel: true,
    agents: ['testWriter', 'security', 'reviewer', 'performanceAgent', 'accessibilityAgent', 'loadTestingAgent', 'dependencyManagementAgent', 'webPerformanceAgent', 'userTestingAgent', 'privacyEthicsAgent'],
  },
  {
    id: '4b',
    name: 'Test Run',
    parallel: false,
    agents: ['testRunner'],
  },
  {
    id: '4c',
    name: 'Test Fix',
    parallel: false,
    agents: ['testFixer'],
  },
  {
    id: 5,
    name: 'Operations',
    parallel: true,
    skipApprovalGate: true,
    agents: [
      'devops', 'documentation', 'analyticsMonitoring',
      'appStorePublisher', 'asoMarketingAgent', 'seoAgent',
    ],
  },
];

// Agents that require shell access (run_command tool)
const SHELL_AGENTS = new Set(['devops', 'testRunner']);

// Agents whose failure should trigger a user decision (abort vs continue)
const CRITICAL_AGENTS = new Set([
  'requirementsAnalyst', 'systemArchitect',
  'dataArchitect', 'apiDesigner',
  'backendDev', 'frontendDev', 'authAgent',
]);

// Agents re-run during quality fix rounds
const FIX_ROUND_AGENTS = ['backendDev', 'frontendDev', 'authAgent'];
const MAX_FIX_ROUNDS = 2;

// Agents re-run during PM fix rounds (same dev team)
const PM_FIX_ROUND_AGENTS = ['backendDev', 'frontendDev', 'authAgent'];
const MAX_PM_FIX_ROUNDS = 2;

// ── PM Plan schema ────────────────────────────────────────────────────────────
const PM_PLAN_SCHEMA = `{
  "projectName": "string",
  "description": "string (2-3 sentences about what this app does)",
  "techStack": {
    "backend": "e.g. Node.js + Express + MongoDB",
    "frontend": "e.g. React Native + Expo OR React + Next.js OR none",
    "database": "e.g. MongoDB OR PostgreSQL OR SQLite",
    "deployment": "e.g. Docker + GitHub Actions",
    "auth": "e.g. JWT OR session OR OAuth2 OR none"
  },
  "layers": {
    "layer1": { "agents": ["requirementsAnalyst", "systemArchitect"] },
    "layer2": { "agents": ["dataArchitect", "apiDesigner", "frontendArchitect"] },
    "layer3": {
      "agents": ["backendDev", "authAgent"],
      "includeFrontend": true,
      "includeIntegration": false,
      "integrationReason": "why integration agent is or isn't needed"
    },
    "layer4": { "agents": ["testWriter", "testRunner", "testFixer", "security", "reviewer"] },
    "layer5": { "agents": ["devops", "documentation"] }
  },
  "optionalAgents": [],
  "estimatedFiles": 52
}`;

const OPTIONAL_AGENTS_GUIDE = `
## Optional Agents — select in the "optionalAgents" array only those needed for THIS project:

### Discovery & Planning (Layer 1):
- mobileTechAdvisor    : Include when technology choice is unclear, or requirements mention mobile (React Native/Expo/Flutter)
- webTechAdvisor       : Include for web projects — framework selection (Next.js/Nuxt/Remix/Vite), TypeScript setup, monorepo, ESLint/Prettier/Husky
- businessPlanningAgent: Include when requirements mention cost estimate, MVP scope, or business model

### UX & Design (Layer 2) — Include whenever project has a frontend (web or mobile):
- uxDesignerAgent      : Include for ANY project with a UI — defines user flows, text wireframes for every screen, empty/error/loading states, form UX patterns, microcopy. Essential for consistent UX.
- designSystemAgent    : Include when project needs a consistent visual language — design tokens (colors/typography/spacing), base components (Button/Input/Modal/Toast/Skeleton), dark mode, Storybook stories. Depends on uxDesignerAgent.
- localizationAgent    : Include when app needs multiple languages OR Hebrew/Arabic (RTL). Runs in Layer 2 so frontendDev builds components with i18n hooks from the start — avoids retroactive refactor.

### Web Design (Layer 2) — ONLY for web projects:
- renderingStrategyAgent: Include for Next.js/Nuxt/Remix projects — CSR/SSR/SSG/ISR per-page decisions, App Router structure, React Query setup, protected routes, loading/error states

### Web Features (Layer 3c) — ONLY for web (React/Next.js/Nuxt/Vite) frontends:
- responsiveDesignAgent : Mobile-first CSS, breakpoints, fluid typography, responsive images, container queries, touch vs hover states
- pwaAgent              : Progressive Web App — Service Worker, Web App Manifest, offline support, push notifications from browser, installability
- webMonetizationAgent  : Stripe Billing + SaaS pricing — checkout, customer portal, webhook handler, feature gating, usage-based billing
- cmsAgent              : Content Management System — discovers all hardcoded text, sets up CMS (Payload CMS for Next.js, Strapi for others), creates contentService + useContent() hook, seed data, and cms-migration.md plan. Pair with cmsIntegratorAgent to apply the migration automatically.
- cmsIntegratorAgent    : Applies the CMS migration — reads cms-migration.md and replaces every hardcoded string in components with t('key', 'fallback') calls. Requires cmsAgent to have run first.

### Mobile Features (Layer 3b) — ONLY for React Native / Expo / Flutter frontends:
- cmsAgent             : Content Management System — discovers all hardcoded text, sets up Strapi CMS with offline AsyncStorage cache, creates contentService + useContent() hook, seed data, and cms-migration.md plan. Pair with cmsIntegratorAgent.
- cmsIntegratorAgent   : Applies the CMS migration — replaces every hardcoded string in screens/components with t('key', 'fallback') calls. Requires cmsAgent.
- notificationsAgent   : Push notifications, local reminders, FCM/APNs
- deepLinksAgent       : Deep links, Universal Links, QR codes, social sharing URLs
- offlineFirstAgent    : Offline support, sync without internet, WatermelonDB/TanStack persistence
- realtimeAgent        : Real-time features, chat, live updates, WebSockets, Socket.io
- animationsAgent      : Custom animations, Lottie, shared transitions, micro-interactions
- onboardingAgent      : First-run experience, splash screen, permission rationale, empty states
- monetizationAgent    : In-app purchases, subscriptions (RevenueCat), ads (AdMob)
- mlMobileAgent        : On-device ML, OCR, face detection, translation, classification (ML Kit / TFLite)
- arVrAgent            : Augmented reality (ARKit/ARCore), 3D object placement
- widgetsExtensionsAgent: Home screen widgets, Apple Watch, Android widgets, Share extensions
- otaUpdatesAgent      : Over-the-air updates (Expo EAS Update / CodePush) without App Store review

### Quality (Layer 4):
- performanceAgent     : Mobile app startup optimization, memory leaks, 60fps animations, profiling
- webPerformanceAgent  : Web Core Web Vitals (LCP/CLS/INP), bundle analysis, code splitting, image optimization, Lighthouse CI
- accessibilityAgent   : VoiceOver/TalkBack/NVDA, WCAG 2.1, keyboard navigation, ARIA, color contrast
- loadTestingAgent     : k6 load/stress/soak scripts for backend scalability testing
- dependencyManagementAgent: npm audit, license compliance, outdated packages
- userTestingAgent     : TestFlight beta, Firebase App Distribution / Vercel previews, A/B testing, usability scripts
- privacyEthicsAgent   : GDPR/CCPA compliance, cookie consent, data export/deletion endpoints — compliance gate like security

### Operations (Layer 5):
- analyticsMonitoring  : Crash reporting (Sentry), Google Analytics 4 / Plausible, RUM, feature flags
- seoAgent             : Technical SEO — meta tags, Open Graph, JSON-LD structured data, sitemap.xml, robots.txt, canonical URLs
- appStorePublisher    : App Store Connect + Google Play setup, Fastlane, code signing, release checklist
- asoMarketingAgent    : App Store Optimization — keywords, store listing copy, screenshot strategy`;

// ── PM Plan creation ──────────────────────────────────────────────────────────
async function createPlan(requirements, projectName) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    system: [
      {
        type: 'text',
        text: `You are a Project Manager AI. Analyze requirements and produce a JSON execution plan for a multi-layer agent build system.

Available agents by layer:
- Layer 1 (Discovery, always included): requirementsAnalyst, systemArchitect
- Layer 2 (Design, always included): dataArchitect, apiDesigner; frontendArchitect ONLY if project has a frontend
- Layer 3 (Implementation): backendDev and authAgent always; frontendDev ONLY if project has a frontend; integrationAgent ONLY if requirements explicitly mention third-party APIs or webhooks
- Layer 4 (Quality, always included): testWriter, testRunner, testFixer, security, reviewer
- Layer 5 (Operations, always included): devops, documentation

Rules:
- authAgent is always included (every app needs auth patterns)
- frontendArchitect and frontendDev are OMITTED for API-only or backend-only projects
- integrationAgent is OPTIONAL — only include if requirements explicitly mention external services
- Populate "optionalAgents" with agents from the guide below that match this project's needs
- Return ONLY valid JSON matching this schema exactly:
${PM_PLAN_SCHEMA}
${OPTIONAL_AGENTS_GUIDE}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: `Project Name: ${projectName}\n\nRequirements:\n${requirements}` }],
  }, { timeout: 10 * 60 * 1000 });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('PM Agent failed to generate a valid JSON plan.');
  return JSON.parse(jsonMatch[0]);
}

// ── Agent filtering ───────────────────────────────────────────────────────────
function getActiveAgents(plan) {
  const names = new Set();
  const l3 = plan.layers?.layer3 || {};

  // Core layers always included
  ['layer1', 'layer2', 'layer4', 'layer5'].forEach(layer => {
    (plan.layers?.[layer]?.agents || []).forEach(n => names.add(n));
  });

  // Layer 3 with conditional agents
  (l3.agents || []).forEach(n => names.add(n));
  if (l3.includeFrontend !== false) names.add('frontendDev');
  if (l3.includeIntegration === true) names.add('integrationAgent');

  // Optional agents selected by PM
  (plan.optionalAgents || []).forEach(n => names.add(n));

  // Platform Build agents — always run when project has frontend
  if (l3.includeFrontend !== false) {
    names.add('uiPrimitivesAgent');
    names.add('uiCompositeAgent');
    names.add('apiClientAgent');
  }

  // Always-included implementation agents (run after core implementation)
  names.add('errorHandlingAgent');
  names.add('codeDeduplicationAgent');
  names.add('codeCleanupAgent');

  return names;
}

function filterLayerAgents(layerDef, activeAgents, plan) {
  const l3 = plan.layers?.layer3 || {};
  return layerDef.agents
    .filter(name => {
      if (!activeAgents.has(name)) return false;
      if ((name === 'frontendArchitect' || name === 'frontendDev') && l3.includeFrontend === false) return false;
      return true;
    })
    .map(name => ({ name, needsShell: SHELL_AGENTS.has(name) }));
}

// ── Feedback loop helpers ─────────────────────────────────────────────────────
function buildQualityFeedback(layerResults) {
  const qualityAgents = ['testWriter', 'testRunner', 'testFixer', 'reviewer', 'security', 'performanceAgent', 'accessibilityAgent', 'dependencyManagementAgent'];
  const sections = [];

  for (const agentName of qualityAgents) {
    const result = layerResults[agentName];
    if (result && result.summary && !result.error) {
      sections.push(`### Findings from ${agentName}:\n${result.summary}`);
    }
  }

  return sections.length > 0 ? sections.join('\n\n') : null;
}

function buildPmFeedback(pmReviewResult) {
  if (!pmReviewResult || pmReviewResult.error) return null;
  const summary = pmReviewResult.summary || '';
  // Only return feedback if the PM flagged gaps
  if (summary.includes('VERDICT: ACCEPTED')) return null;
  return summary || null;
}

// ── Display helpers ───────────────────────────────────────────────────────────
function formatPlan(plan) {
  const l3 = plan.layers?.layer3 || {};
  const optional = (plan.optionalAgents || []);
  const lines = [
    `📦  Project : ${plan.projectName}`,
    `📝  ${plan.description}`,
    '',
    '🛠   Tech Stack:',
    `    Backend   : ${plan.techStack.backend}`,
    `    Frontend  : ${plan.techStack.frontend}`,
    `    Database  : ${plan.techStack.database}`,
    `    Auth      : ${plan.techStack.auth}`,
    `    Deployment: ${plan.techStack.deployment}`,
    '',
    '🤖  Layers:',
    `    Layer 1  — Discovery      : requirementsAnalyst, systemArchitect${optional.includes('mobileTechAdvisor') ? ', mobileTechAdvisor' : ''}${optional.includes('webTechAdvisor') ? ', webTechAdvisor' : ''}${optional.includes('businessPlanningAgent') ? ', businessPlanningAgent' : ''}`,
    `    Layer 2  — Design         : dataArchitect, apiDesigner${l3.includeFrontend !== false ? ', frontendArchitect' : ''}${optional.includes('uxDesignerAgent') ? ', uxDesignerAgent' : ''}${optional.includes('designSystemAgent') ? ', designSystemAgent' : ''}${optional.includes('renderingStrategyAgent') ? ', renderingStrategyAgent' : ''}${optional.includes('localizationAgent') ? ', localizationAgent' : ''}`,
    `    Layer 3  — Implementation : backendDev, authAgent${l3.includeFrontend !== false ? ', frontendDev' : ''}${l3.includeIntegration ? ', integrationAgent' : ''}`,
  ];

  const mobileFeatures = optional.filter(a =>
    ['notificationsAgent','deepLinksAgent','offlineFirstAgent','realtimeAgent','animationsAgent',
     'onboardingAgent','monetizationAgent','mlMobileAgent','arVrAgent','widgetsExtensionsAgent','otaUpdatesAgent','cmsAgent'].includes(a)
  );
  if (mobileFeatures.length > 0) {
    lines.push(`    Layer 3b — Mobile Features : ${mobileFeatures.join(', ')}`);
  }

  const webFeatures = optional.filter(a =>
    ['responsiveDesignAgent','pwaAgent','webMonetizationAgent','cmsAgent'].includes(a)
  );
  if (webFeatures.length > 0) {
    lines.push(`    Layer 3c — Web Features    : ${webFeatures.join(', ')}`);
  }

  if (optional.includes('cmsIntegratorAgent')) {
    lines.push(`    Layer 3d — CMS Integration : cmsIntegratorAgent`);
  }

  lines.push(`    Layer 3e — Error Handling  : errorHandlingAgent`);
  lines.push(`    Layer 3f — Code Refinement : codeDeduplicationAgent → codeCleanupAgent`);

  const extraQuality = optional.filter(a => ['performanceAgent','webPerformanceAgent','accessibilityAgent','loadTestingAgent','dependencyManagementAgent','userTestingAgent','privacyEthicsAgent'].includes(a));
  lines.push(`    Layer 4  — Quality        : testWriter, security, reviewer${extraQuality.length > 0 ? ', ' + extraQuality.join(', ') : ''}`);
  lines.push(`    Layer 4b — Test Run       : testRunner`);
  lines.push(`    Layer 4c — Test Fix       : testFixer`);

  const extraOps = optional.filter(a => ['analyticsMonitoring','seoAgent','appStorePublisher','asoMarketingAgent'].includes(a));
  lines.push(`    Layer 5  — Operations     : devops, documentation${extraOps.length > 0 ? ', ' + extraOps.join(', ') : ''}`);

  lines.push(
    '',
    `🔄  Quality Feedback Loop : up to ${MAX_FIX_ROUNDS} fix round(s) after Quality layer`,
    `🔍  PM Review Loop        : up to ${MAX_PM_FIX_ROUNDS} fix round(s) after Operations layer`,
    `📁  Estimated files       : ~${plan.estimatedFiles}`,
  );
  return lines.join('\n');
}

// ── Quality re-run helper ─────────────────────────────────────────────────────
async function runQualityLayers(activeAgents, context, toolSets, plan) {
  const results = {};
  for (const id of [4, '4b', '4c']) {
    const layerDef = LAYER_DEFINITIONS.find(l => l.id === id);
    if (!layerDef) continue;
    const agentConfigs = filterLayerAgents(layerDef, activeAgents, plan);
    if (agentConfigs.length === 0) continue;
    console.log(chalk.bold.cyan(`\n━━━  Quality Re-check — Layer ${layerDef.id}: ${layerDef.name}  ━━━`));
    console.log(chalk.gray(`Agents: ${agentConfigs.map(a => a.name).join(', ')}`));
    const layerResults = layerDef.parallel
      ? await runLayerInParallel(agentConfigs, context, toolSets, AGENT_REGISTRY)
      : await runLayerSequential(agentConfigs, context, toolSets, AGENT_REGISTRY);
    Object.assign(results, layerResults);
  }
  return results;
}

// ── PM review helper ──────────────────────────────────────────────────────────
async function runPmReview(context, toolSets) {
  const agent = createPmReviewerAgent(toolSets.fs);
  try {
    const result = await agent.run(context.buildScopedContext('pmReviewer'));
    context.addAgentOutput('pmReviewer', result.summary, result.filesCreated);
    console.log(chalk.green(`  PM Review done — ${result.filesCreated.length} file(s) written`));
    return result;
  } catch (err) {
    console.log(chalk.red(`  PM Review FAILED: ${err.message}`));
    return null;
  }
}

// ── Main orchestration ────────────────────────────────────────────────────────
async function orchestrate(requirements, projectName, outputDir, checkpoint = null, githubRepo = null) {
  console.log(chalk.bold.cyan('\n🚀  App Builder Agents — Multi-Layer Edition\n'));

  let context;

  if (checkpoint) {
    // ── Resume from checkpoint ──────────────────────────────────────────────
    console.log(chalk.bold.green('♻️   ממשיך מנקודת עצירה קודמת...'));
    console.log(chalk.gray(`    Layers שהושלמו: ${[...new Set(checkpoint.completedLayers)].join(', ')}`));
    context = ProjectContext.fromCheckpoint({ ...checkpoint, outputDir });
  } else {
    // ── Fresh build ─────────────────────────────────────────────────────────
    console.log(chalk.yellow('⏳  Generating project plan...'));
    const plan = await createPlan(requirements, projectName);
    // plan is block-scoped to this else branch intentionally — context.plan is the source of truth

    const planApproved = await approveStep(
      'תוכנית הפרויקט',
      'בדוק את התוכנית לפני שנתחיל לבנות:',
      formatPlan(plan),
    );
    if (!planApproved) {
      console.log(chalk.red('\n❌  הופסק על ידי המשתמש.'));
      return;
    }

    context = new ProjectContext(requirements, plan, outputDir);

    // ── Squad planning ────────────────────────────────────────────────────────
    console.log(chalk.yellow('⏳  Generating squad breakdown...'));
    try {
      const squadPlan = await createSquadPlan(requirements, plan);
      const squadApproved = await approveStep(
        '🏢  חלוקה לצוותים',
        'המערכת זיהתה את הדומיינים הבאים — כל צוות agents יהיה אחראי על תחום אחד:',
        formatSquadPlan(squadPlan),
      );
      if (squadApproved) {
        context.setSquadPlan(squadPlan);
        console.log(chalk.green(`✅  Squad plan אושר — ${squadPlan.squads.length} צוותים\n`));
      } else {
        console.log(chalk.gray('  Squad plan דולג — agents יבנו את האפליקציה ללא חלוקה לצוותים.\n'));
      }
    } catch (err) {
      console.log(chalk.yellow(`  ⚠️  Squad planning נכשל: ${err.message} — ממשיך ללא חלוקה לצוותים.\n`));
    }
  }
  const fsTools = createFileSystemTools(outputDir);
  const shellTools = createShellTools(outputDir);
  const toolSets = {
    fs:  fsTools,
    all: { tools: [...fsTools.tools, ...shellTools.tools], handlers: { ...fsTools.handlers, ...shellTools.handlers } },
  };

  const activeAgents = getActiveAgents(context.plan);

  // ── Checkpoint helper — saves locally + pushes to GitHub ─────────────────────
  function saveCheckpoint(layerLabel) {
    context.saveCheckpoint();
    if (!githubRepo) return;
    const result = pushCheckpoint(outputDir, githubRepo.owner, githubRepo.repo, githubRepo.token, layerLabel);
    if (result.success) {
      console.log(chalk.gray(`  ☁️   checkpoint נשמר ב-GitHub (${layerLabel})`));
    } else {
      console.log(chalk.yellow(`  ⚠️   push ל-GitHub נכשל (${layerLabel}): ${result.error}`));
    }
  }

  // 4. Execute layers
  const allQualityResults = {};  // accumulates results from layers 4, 4b, 4c

  for (const layerDef of LAYER_DEFINITIONS) {
    // Skip layers already completed in a previous run (checkpoint resume)
    if (context.isLayerComplete(layerDef.id)) {
      console.log(chalk.gray(`\nLayer ${layerDef.id} (${layerDef.name}): skipped (already completed in previous run)`));
      continue;
    }

    const agentConfigs = filterLayerAgents(layerDef, activeAgents, context.plan);

    if (agentConfigs.length === 0) {
      console.log(chalk.gray(`\nLayer ${layerDef.id} (${layerDef.name}): all agents skipped — moving on`));
      continue;
    }

    console.log(chalk.bold.cyan(`\n━━━  Layer ${layerDef.id}: ${layerDef.name}  ━━━`));
    console.log(chalk.gray(`Agents: ${agentConfigs.map(a => a.name).join(', ')}`));
    console.log(chalk.gray(`Mode  : ${layerDef.parallel ? 'parallel' : 'sequential'}`));

    let layerResults;
    if (layerDef.id === 3 && context.squadPlan) {
      // ── Squad mode: run each squad's agents in parallel, sequential within squad
      console.log(chalk.bold.cyan(`\n  Running ${context.squadPlan.squads.length} squads in parallel...`));
      layerResults = await runAllSquads(context.squadPlan, context, toolSets, AGENT_REGISTRY, activeAgents);
    } else if (layerDef.parallel) {
      layerResults = await runLayerInParallel(agentConfigs, context, toolSets, AGENT_REGISTRY);
    } else {
      layerResults = await runLayerSequential(agentConfigs, context, toolSets, AGENT_REGISTRY);
    }

    // Accumulate quality results from layers 4, 4b, 4c
    if (layerDef.id === 4 || layerDef.id === '4b' || layerDef.id === '4c') {
      Object.assign(allQualityResults, layerResults);
    }

    // ── Failure handling ──────────────────────────────────────────────────────
    const failed = getFailedAgents(layerResults);
    if (failed.length > 0) {
      const criticalFailed = failed.filter(f => CRITICAL_AGENTS.has(f.name));
      const nonCriticalFailed = failed.filter(f => !CRITICAL_AGENTS.has(f.name));

      if (nonCriticalFailed.length > 0) {
        console.log(chalk.yellow(`\n⚠️   agents שנכשלו (לא קריטיים): ${nonCriticalFailed.map(f => f.name).join(', ')}`));
      }

      if (criticalFailed.length > 0) {
        console.log(chalk.bold.red(`\n🚨  agents קריטיים נכשלו: ${criticalFailed.map(f => f.name).join(', ')}`));
        criticalFailed.forEach(f => console.log(chalk.red(`    ${f.name}: ${f.error}`)));

        const proceed = await approveStep(
          '⚠️  כשלון קריטי',
          'agent קריטי נכשל לאחר 2 ניסיונות. המשך עלול לייצר קוד חסר או שגוי.',
          `נכשלו: ${criticalFailed.map(f => `${f.name} — ${f.error}`).join('\n')}`,
        );
        if (!proceed) {
          console.log(chalk.yellow('\n⏹️   הופסק על ידי המשתמש.'));
          console.log(chalk.gray('💾  התקדמות נשמרה — ניתן להמשיך מנקודה זו בהרצה הבאה.'));
          saveCheckpoint(`Layer ${layerDef.id} — ${layerDef.name} (aborted)`);
          return;
        }
        console.log(chalk.gray('  ממשיך למרות הכשלון...'));
      }
    }

    if (!layerDef.skipApprovalGate) {
      const proceed = await approveLayer(`Layer ${layerDef.id} — ${layerDef.name}`, layerResults);
      if (!proceed) {
        console.log(chalk.yellow('\n⏹️   הופסק על ידי המשתמש.'));
        console.log(chalk.gray(`💾  התקדמות נשמרה — ניתן להמשיך מנקודה זו בהרצה הבאה.`));
        context.markLayerComplete(layerDef.id);
        saveCheckpoint(`Layer ${layerDef.id} — ${layerDef.name}`);
        return;
      }
    }

    // Mark layer complete and save checkpoint after every layer
    context.markLayerComplete(layerDef.id);
    saveCheckpoint(`Layer ${layerDef.id} — ${layerDef.name}`);

    // ── Feedback loop: run after Layer 4c (all quality agents done) ───────────
    if (layerDef.id === '4c') {
      let currentQualityFeedback = buildQualityFeedback(allQualityResults);

      for (let round = 1; round <= MAX_FIX_ROUNDS; round++) {
        if (!currentQualityFeedback) {
          console.log(chalk.green('  ✅  No quality issues found — skipping fix rounds.'));
          break;
        }

        const runFix = await approveStep(
          `🔄  Fix Round ${round} / ${MAX_FIX_ROUNDS}`,
          'ה-Quality agents סיימו. agents הפיתוח יקראו את הממצאים ויתקנו בעיות. להריץ סבב תיקונים?',
          currentQualityFeedback.slice(0, 1200) + (currentQualityFeedback.length > 1200 ? '\n...(truncated)' : ''),
        );

        if (!runFix) {
          console.log(chalk.gray('  Fix round skipped — continuing to Layer 5.'));
          break;
        }

        console.log(chalk.bold.cyan(`\n━━━  Fix Round ${round}: backendDev + frontendDev + authAgent  ━━━`));
        context.setFeedbackNotes(currentQualityFeedback);

        const fixConfigs = FIX_ROUND_AGENTS
          .filter(name => activeAgents.has(name))
          .map(name => ({ name, needsShell: false }));

        await runLayerInParallel(fixConfigs, context, toolSets, AGENT_REGISTRY);
        context.setFeedbackNotes(null);

        console.log(chalk.green(`  ✅  Fix Round ${round} complete — re-running Quality to verify...`));
        const rerunResults = await runQualityLayers(activeAgents, context, toolSets, context.plan);

        const proceed = await approveLayer(`Quality Re-check — after Fix Round ${round}`, rerunResults);
        if (!proceed) {
          console.log(chalk.yellow('\n⏹️   הופסק על ידי המשתמש.'));
          return;
        }

        currentQualityFeedback = buildQualityFeedback(rerunResults);

        if (!currentQualityFeedback) {
          console.log(chalk.bold.green(`  ✅  All quality checks passed after Fix Round ${round}!`));
          break;
        }
        if (round >= MAX_FIX_ROUNDS) {
          console.log(chalk.gray(`  Max fix rounds (${MAX_FIX_ROUNDS}) reached — continuing to Layer 5.`));
        }
      }
    }
  }

  // 5. PM Acceptance Review loop
  console.log(chalk.bold.cyan('\n━━━  PM Acceptance Review  ━━━'));
  console.log(chalk.gray('Running PM reviewer to verify requirements coverage...'));

  let pmReviewResult = await runPmReview(context, toolSets);
  let pmFeedback = pmReviewResult ? buildPmFeedback(pmReviewResult) : null;

  if (pmFeedback) {
    console.log(chalk.yellow('\n⚠️  PM found gaps — triggering PM fix rounds'));

    for (let round = 1; round <= MAX_PM_FIX_ROUNDS; round++) {
      const runFix = await approveStep(
        `🔴  PM Fix Round ${round} / ${MAX_PM_FIX_ROUNDS}`,
        'מנהל המוצר מצא פערים בין הדרישות לבין המימוש. agents הפיתוח יקראו את הממצאים וישלימו את החסר. להריץ סבב תיקוני PM?',
        pmFeedback.slice(0, 1400) + (pmFeedback.length > 1400 ? '\n...(truncated)' : ''),
      );

      if (!runFix) {
        console.log(chalk.gray('  PM fix round skipped.'));
        break;
      }

      console.log(chalk.bold.cyan(`\n━━━  PM Fix Round ${round}: backendDev + frontendDev + authAgent  ━━━`));
      context.setPmFeedbackNotes(pmFeedback);

      const pmFixConfigs = PM_FIX_ROUND_AGENTS
        .filter(name => activeAgents.has(name))
        .map(name => ({ name, needsShell: false }));

      await runLayerInParallel(pmFixConfigs, context, toolSets, AGENT_REGISTRY);
      context.setPmFeedbackNotes(null);

      console.log(chalk.green(`  ✅  PM Fix Round ${round} complete — re-running Quality to verify...`));
      await runQualityLayers(activeAgents, context, toolSets, context.plan);

      console.log(chalk.bold.cyan(`\n━━━  PM Re-check after Fix Round ${round}  ━━━`));
      pmReviewResult = await runPmReview(context, toolSets);
      pmFeedback = pmReviewResult ? buildPmFeedback(pmReviewResult) : null;

      if (!pmFeedback) {
        console.log(chalk.bold.green(`  ✅  PM Verdict: ACCEPTED after Fix Round ${round}!`));
        break;
      }
      if (round >= MAX_PM_FIX_ROUNDS) {
        console.log(chalk.gray(`  Max PM fix rounds (${MAX_PM_FIX_ROUNDS}) reached.`));
      }
    }
  } else {
    console.log(chalk.bold.green('  ✅  PM Verdict: ACCEPTED — all requirements satisfied!'));
  }

  // 6. Push to GitHub
  if (githubRepo) {
    console.log(chalk.bold.cyan(`\n━━━  מעלה קוד ל-GitHub: ${githubRepo.full}  ━━━`));
    try {
      pushToGithub(outputDir, githubRepo.owner, githubRepo.repo, githubRepo.token);
      console.log(chalk.bold.green(`✅  הקוד הועלה בהצלחה → https://github.com/${githubRepo.full}`));
    } catch (err) {
      console.log(chalk.red(`❌  העלאה ל-GitHub נכשלה: ${err.message}`));
      console.log(chalk.gray('    הקוד שמור מקומית ב: ' + outputDir));
      console.log(chalk.gray('    לניסיון ידני: cd ' + outputDir + ' && git push -u origin main'));
    }
  }

  // 7. Done
  console.log(chalk.bold.green('\n✅  הבנייה הושלמה!'));
  console.log(chalk.white(`📂  קבצים ב: ${outputDir}`));
  if (githubRepo) console.log(chalk.white(`🐙  GitHub: https://github.com/${githubRepo.full}`));
  console.log(chalk.white(`📊  סה"כ קבצים: ${context.allFilesCreated.length}`));
  context.allFilesCreated.forEach(f => console.log(chalk.green(`   ✓ ${f}`)));
}

// ── Update Mode orchestration ─────────────────────────────────────────────────
async function orchestrateUpdate(changeRequest, checkpointData, outputDir, githubRepo = null) {
  console.log(chalk.bold.cyan('\n🔄  App Builder Agents — Update Mode\n'));

  const context = ProjectContext.fromCheckpoint({ ...checkpointData, outputDir });

  if (!context.squadPlan) {
    console.log(chalk.red('❌  לא נמצאה תוכנית צוותים. מצב עדכון דורש פרויקט שנבנה עם squad plan.'));
    return;
  }

  // Analyze the change request
  console.log(chalk.yellow('⏳  מנתח את בקשת השינוי...'));
  let updatePlan;
  try {
    updatePlan = await analyzeUpdate(changeRequest, context.squadPlan);
  } catch (err) {
    console.log(chalk.red(`❌  ניתוח הבקשה נכשל: ${err.message}`));
    return;
  }

  if (updatePlan.affectedSquads.length === 0 && updatePlan.newSquads.length === 0) {
    console.log(chalk.yellow('⚠️  לא זוהו צוותים מושפעים. נסה לנסח את הבקשה בצורה יותר ספציפית.'));
    return;
  }

  const approved = await approveStep(
    '🔄  תוכנית עדכון',
    'ניתוח הבקשה — זה מה שישתנה:',
    formatUpdatePlan(updatePlan),
  );
  if (!approved) return;

  // Add new squads to the squad plan
  if (updatePlan.newSquads.length > 0) {
    context.setSquadPlan({
      ...context.squadPlan,
      squads: [...context.squadPlan.squads, ...updatePlan.newSquads],
    });
  }

  const fsTools = createFileSystemTools(outputDir);
  const shellTools = createShellTools(outputDir);
  const toolSets = {
    fs:  fsTools,
    all: { tools: [...fsTools.tools, ...shellTools.tools], handlers: { ...fsTools.handlers, ...shellTools.handlers } },
  };
  const activeAgents = getActiveAgents(context.plan);

  function saveCheckpoint(label) {
    context.saveCheckpoint();
    if (!githubRepo) return;
    const result = pushCheckpoint(outputDir, githubRepo.owner, githubRepo.repo, githubRepo.token, label);
    if (!result.success) console.log(chalk.yellow(`  ⚠️   push ל-GitHub נכשל (${label}): ${result.error}`));
    else console.log(chalk.gray(`  ☁️   checkpoint נשמר ב-GitHub (${label})`));
  }

  // Run platform agents that need updating (before squads so they can import new components)
  const { platformUpdates } = updatePlan;
  if (platformUpdates) {
    const platformMap = {
      uiPrimitives: 'uiPrimitivesAgent',
      uiComposite:  'uiCompositeAgent',
      apiClient:    'apiClientAgent',
    };
    for (const [key, agentName] of Object.entries(platformMap)) {
      if (!platformUpdates[key] || !activeAgents.has(agentName)) continue;
      console.log(chalk.bold.cyan(`\n━━━  Platform Update — ${agentName}  ━━━`));
      context.setPlatformUpdateNote(agentName, platformUpdates[key]);
      try {
        const agentConfig = [{ name: agentName, needsShell: false }];
        await runLayerSequential(agentConfig, context, toolSets, AGENT_REGISTRY);
      } finally {
        context.setPlatformUpdateNote(agentName, null);
      }
    }
    saveCheckpoint('Update — Platform');
  }

  // Run squads
  console.log(chalk.bold.cyan('\n━━━  עדכון צוותים  ━━━'));
  await runAllSquadsUpdate(updatePlan, context, toolSets, AGENT_REGISTRY, activeAgents);
  saveCheckpoint('Update — Squads');

  // Quality re-run
  console.log(chalk.bold.cyan('\n━━━  Quality Re-check  ━━━'));
  const qualityResults = await runQualityLayers(activeAgents, context, toolSets, context.plan);

  const proceed = await approveLayer('Quality after Update', qualityResults);
  if (!proceed) {
    saveCheckpoint('Update — Quality');
    return;
  }

  // PM review
  console.log(chalk.bold.cyan('\n━━━  PM Acceptance Review  ━━━'));
  const pmResult = await runPmReview(context, toolSets);
  const pmFeedback = pmResult ? buildPmFeedback(pmResult) : null;

  if (pmFeedback) {
    const runFix = await approveStep(
      '🔴  PM Fix Round',
      'PM מצא פערים בין הדרישות למימוש. להריץ סבב תיקונים?',
      pmFeedback.slice(0, 1400) + (pmFeedback.length > 1400 ? '\n...(truncated)' : ''),
    );
    if (runFix) {
      context.setPmFeedbackNotes(pmFeedback);
      const fixConfigs = PM_FIX_ROUND_AGENTS
        .filter(name => activeAgents.has(name))
        .map(name => ({ name, needsShell: false }));
      await runLayerInParallel(fixConfigs, context, toolSets, AGENT_REGISTRY);
      context.setPmFeedbackNotes(null);
      await runQualityLayers(activeAgents, context, toolSets, context.plan);
      await runPmReview(context, toolSets);
    }
  } else {
    console.log(chalk.bold.green('  ✅  PM Verdict: ACCEPTED'));
  }

  saveCheckpoint('Update — Complete');

  if (githubRepo) {
    console.log(chalk.bold.cyan(`\n━━━  מעלה קוד ל-GitHub  ━━━`));
    try {
      pushToGithub(outputDir, githubRepo.owner, githubRepo.repo, githubRepo.token);
      console.log(chalk.bold.green(`✅  הקוד הועלה → https://github.com/${githubRepo.full}`));
    } catch (err) {
      console.log(chalk.red(`❌  העלאה נכשלה: ${err.message}`));
    }
  }

  console.log(chalk.bold.green('\n✅  העדכון הושלם!'));
  console.log(chalk.white(`📂  קבצים ב: ${outputDir}`));
  if (githubRepo) console.log(chalk.white(`🐙  GitHub: https://github.com/${githubRepo.full}`));
}

module.exports = { orchestrate, orchestrateUpdate };
