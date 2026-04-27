'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');

const { ProjectContext } = require('./context');
const { approveStep, approveLayer } = require('./approval');
const { createFileSystemTools } = require('./tools/fileSystem');
const { createShellTools } = require('./tools/shell');
const { runLayerInParallel, runLayerSequential } = require('./layerRunner');

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
const { createTesterAgent }              = require('./agents/tester');
const { createReviewerAgent }            = require('./agents/reviewer');
const { createDevOpsAgent }              = require('./agents/devops');
const { createDocumentationAgent }       = require('./agents/documentation');

// ── Discovery & Planning agents ───────────────────────────────────────────────
const { createMobileTechAdvisorAgent }   = require('./agents/mobileTechAdvisor');
const { createBusinessPlanningAgent }    = require('./agents/businessPlanningAgent');

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

// ── Quality agents ────────────────────────────────────────────────────────────
const { createPerformanceAgent }         = require('./agents/performanceAgent');
const { createAccessibilityAgent }       = require('./agents/accessibilityAgent');
const { createLoadTestingAgent }         = require('./agents/loadTestingAgent');
const { createDependencyManagementAgent } = require('./agents/dependencyManagementAgent');

// ── Operations agents ─────────────────────────────────────────────────────────
const { createAnalyticsMonitoringAgent } = require('./agents/analyticsMonitoring');
const { createLocalizationAgent }        = require('./agents/localizationAgent');
const { createPrivacyEthicsAgent }       = require('./agents/privacyEthicsAgent');
const { createAppStorePublisherAgent }   = require('./agents/appStorePublisher');
const { createUserTestingAgent }         = require('./agents/userTestingAgent');
const { createASOMarketingAgent }        = require('./agents/asoMarketingAgent');

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
  tester:                   createTesterAgent,
  security:                 createSecurityAgent,
  reviewer:                 createReviewerAgent,
  devops:                   createDevOpsAgent,
  documentation:            createDocumentationAgent,
  // Discovery & Planning
  mobileTechAdvisor:        createMobileTechAdvisorAgent,
  businessPlanningAgent:    createBusinessPlanningAgent,
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
  performanceAgent:         createPerformanceAgent,
  accessibilityAgent:       createAccessibilityAgent,
  loadTestingAgent:         createLoadTestingAgent,
  dependencyManagementAgent: createDependencyManagementAgent,
  // Operations
  analyticsMonitoring:      createAnalyticsMonitoringAgent,
  localizationAgent:        createLocalizationAgent,
  privacyEthicsAgent:       createPrivacyEthicsAgent,
  appStorePublisher:        createAppStorePublisherAgent,
  userTestingAgent:         createUserTestingAgent,
  asoMarketingAgent:        createASOMarketingAgent,
};

// ── Layer definitions ─────────────────────────────────────────────────────────
// Layer 3b and all optional agents are filtered to only those the PM selected.
const LAYER_DEFINITIONS = [
  {
    id: 1,
    name: 'Discovery',
    parallel: false,
    agents: ['requirementsAnalyst', 'systemArchitect', 'mobileTechAdvisor', 'businessPlanningAgent'],
  },
  {
    id: 2,
    name: 'Design',
    parallel: true,
    agents: ['dataArchitect', 'apiDesigner', 'frontendArchitect'],
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
      'arVrAgent', 'widgetsExtensionsAgent', 'otaUpdatesAgent',
    ],
  },
  {
    id: 4,
    name: 'Quality',
    parallel: true,
    agents: ['tester', 'security', 'reviewer', 'performanceAgent', 'accessibilityAgent', 'loadTestingAgent', 'dependencyManagementAgent'],
  },
  {
    id: 5,
    name: 'Operations',
    parallel: true,
    skipApprovalGate: true,
    agents: [
      'devops', 'documentation', 'analyticsMonitoring', 'localizationAgent',
      'privacyEthicsAgent', 'appStorePublisher', 'userTestingAgent', 'asoMarketingAgent',
    ],
  },
];

// Agents re-run during fix rounds to apply quality findings
const FIX_ROUND_AGENTS = ['backendDev', 'frontendDev', 'authAgent'];
const MAX_FIX_ROUNDS = 2;

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
    "layer4": { "agents": ["tester", "security", "reviewer"] },
    "layer5": { "agents": ["devops", "documentation"] }
  },
  "optionalAgents": [],
  "estimatedFiles": 52
}`;

const OPTIONAL_AGENTS_GUIDE = `
## Optional Agents — select in the "optionalAgents" array only those needed for THIS project:

### Discovery & Planning (Layer 1):
- mobileTechAdvisor   : Include when technology choice is unclear, or requirements mention mobile (React Native/Expo/Flutter)
- businessPlanningAgent: Include when requirements mention cost estimate, MVP scope, or business model

### Mobile Features (Layer 3b) — ONLY for React Native / Expo / Flutter frontends:
- notificationsAgent  : Push notifications, local reminders, FCM/APNs
- deepLinksAgent      : Deep links, Universal Links, QR codes, social sharing URLs
- offlineFirstAgent   : Offline support, sync without internet, WatermelonDB/TanStack persistence
- realtimeAgent       : Real-time features, chat, live updates, WebSockets, Socket.io
- animationsAgent     : Custom animations, Lottie, shared transitions, micro-interactions
- onboardingAgent     : First-run experience, splash screen, permission rationale, empty states
- monetizationAgent   : In-app purchases, subscriptions (RevenueCat), ads (AdMob)
- mlMobileAgent       : On-device ML, OCR, face detection, translation, classification (ML Kit / TFLite)
- arVrAgent           : Augmented reality (ARKit/ARCore), 3D object placement
- widgetsExtensionsAgent: Home screen widgets, Apple Watch, Android widgets, Share extensions
- otaUpdatesAgent     : Over-the-air updates (Expo EAS Update / CodePush) without App Store review

### Quality (Layer 4):
- performanceAgent    : App startup optimization, memory leaks, 60fps animations, profiling
- accessibilityAgent  : VoiceOver/TalkBack, WCAG 2.1, dynamic type, color contrast
- loadTestingAgent    : k6 load/stress/soak scripts for backend scalability testing
- dependencyManagementAgent: npm audit, license compliance, outdated packages

### Operations (Layer 5):
- analyticsMonitoring : Crash reporting (Sentry/Crashlytics), Firebase Analytics, feature flags
- localizationAgent   : Multi-language (i18n), RTL support (Hebrew/Arabic), date/currency formatting
- privacyEthicsAgent  : GDPR/CCPA compliance, Apple Privacy Labels, data export/deletion endpoints
- appStorePublisher   : App Store Connect + Google Play setup, Fastlane, code signing, release checklist
- userTestingAgent    : TestFlight beta, Firebase App Distribution, A/B testing, usability testing
- asoMarketingAgent   : App Store Optimization — keywords, store listing copy, screenshot strategy`;

// ── PM Plan creation ──────────────────────────────────────────────────────────
async function createPlan(requirements, projectName) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 3000,
    system: [
      {
        type: 'text',
        text: `You are a Project Manager AI. Analyze requirements and produce a JSON execution plan for a multi-layer agent build system.

Available agents by layer:
- Layer 1 (Discovery, always included): requirementsAnalyst, systemArchitect
- Layer 2 (Design, always included): dataArchitect, apiDesigner; frontendArchitect ONLY if project has a frontend
- Layer 3 (Implementation): backendDev and authAgent always; frontendDev ONLY if project has a frontend; integrationAgent ONLY if requirements explicitly mention third-party APIs or webhooks
- Layer 4 (Quality, always included): tester, security, reviewer
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
  });

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
    .map(name => ({ name, needsShell: name === 'devops' }));
}

// ── Feedback loop helpers ─────────────────────────────────────────────────────
function buildQualityFeedback(layerResults) {
  const qualityAgents = ['tester', 'reviewer', 'security', 'performanceAgent', 'accessibilityAgent', 'dependencyManagementAgent'];
  const sections = [];

  for (const agentName of qualityAgents) {
    const result = layerResults[agentName];
    if (result && result.summary && !result.error) {
      sections.push(`### Findings from ${agentName}:\n${result.summary}`);
    }
  }

  return sections.length > 0 ? sections.join('\n\n') : null;
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
    `    Layer 1  — Discovery      : requirementsAnalyst, systemArchitect${optional.includes('mobileTechAdvisor') ? ', mobileTechAdvisor' : ''}${optional.includes('businessPlanningAgent') ? ', businessPlanningAgent' : ''}`,
    `    Layer 2  — Design         : dataArchitect, apiDesigner${l3.includeFrontend !== false ? ', frontendArchitect' : ''}`,
    `    Layer 3  — Implementation : backendDev, authAgent${l3.includeFrontend !== false ? ', frontendDev' : ''}${l3.includeIntegration ? ', integrationAgent' : ''}`,
  ];

  const mobileFeatures = optional.filter(a =>
    ['notificationsAgent','deepLinksAgent','offlineFirstAgent','realtimeAgent','animationsAgent',
     'onboardingAgent','monetizationAgent','mlMobileAgent','arVrAgent','widgetsExtensionsAgent','otaUpdatesAgent'].includes(a)
  );
  if (mobileFeatures.length > 0) {
    lines.push(`    Layer 3b — Mobile Features : ${mobileFeatures.join(', ')}`);
  }

  const extraQuality = optional.filter(a => ['performanceAgent','accessibilityAgent','loadTestingAgent','dependencyManagementAgent'].includes(a));
  lines.push(`    Layer 4  — Quality        : tester, security, reviewer${extraQuality.length > 0 ? ', ' + extraQuality.join(', ') : ''}`);

  const extraOps = optional.filter(a => ['analyticsMonitoring','localizationAgent','privacyEthicsAgent','appStorePublisher','userTestingAgent','asoMarketingAgent'].includes(a));
  lines.push(`    Layer 5  — Operations     : devops, documentation${extraOps.length > 0 ? ', ' + extraOps.join(', ') : ''}`);

  lines.push(
    '',
    `🔄  Feedback Loop: up to ${MAX_FIX_ROUNDS} fix round(s) after Quality layer`,
    `📁  Estimated files : ~${plan.estimatedFiles}`,
  );
  return lines.join('\n');
}

// ── Main orchestration ────────────────────────────────────────────────────────
async function orchestrate(requirements, projectName, outputDir) {
  console.log(chalk.bold.cyan('\n🚀  App Builder Agents — Multi-Layer Edition\n'));

  // 1. Generate plan
  console.log(chalk.yellow('⏳  Generating project plan...'));
  const plan = await createPlan(requirements, projectName);

  // 2. Show plan → user approval
  const planApproved = await approveStep(
    'תוכנית הפרויקט',
    'בדוק את התוכנית לפני שנתחיל לבנות:',
    formatPlan(plan),
  );
  if (!planApproved) {
    console.log(chalk.red('\n❌  הופסק על ידי המשתמש.'));
    return;
  }

  // 3. Setup shared state
  const context = new ProjectContext(requirements, plan, outputDir);
  const fsTools = createFileSystemTools(outputDir);
  const shellTools = createShellTools(outputDir);
  const toolSets = {
    fs:  fsTools,
    all: { tools: [...fsTools.tools, ...shellTools.tools], handlers: { ...fsTools.handlers, ...shellTools.handlers } },
  };

  const activeAgents = getActiveAgents(plan);

  // 4. Execute layers
  let layer4Results = null;

  for (const layerDef of LAYER_DEFINITIONS) {
    const agentConfigs = filterLayerAgents(layerDef, activeAgents, plan);

    if (agentConfigs.length === 0) {
      console.log(chalk.gray(`\nLayer ${layerDef.id} (${layerDef.name}): all agents skipped — moving on`));
      continue;
    }

    console.log(chalk.bold.cyan(`\n━━━  Layer ${layerDef.id}: ${layerDef.name}  ━━━`));
    console.log(chalk.gray(`Agents: ${agentConfigs.map(a => a.name).join(', ')}`));
    console.log(chalk.gray(`Mode  : ${layerDef.parallel ? 'parallel' : 'sequential'}`));

    let layerResults;
    if (layerDef.parallel) {
      layerResults = await runLayerInParallel(agentConfigs, context, toolSets, AGENT_REGISTRY);
    } else {
      layerResults = await runLayerSequential(agentConfigs, context, toolSets, AGENT_REGISTRY);
    }

    // Save Layer 4 results for the feedback loop
    if (layerDef.id === 4) {
      layer4Results = layerResults;
    }

    if (!layerDef.skipApprovalGate) {
      const proceed = await approveLayer(`Layer ${layerDef.id} — ${layerDef.name}`, layerResults);
      if (!proceed) {
        console.log(chalk.yellow('\n⏹️   הופסק על ידי המשתמש.'));
        return;
      }
    }

    // ── Feedback loop: run after Layer 4 ─────────────────────────────────────
    if (layerDef.id === 4 && layer4Results) {
      const qualityFeedback = buildQualityFeedback(layer4Results);

      if (qualityFeedback) {
        for (let round = 1; round <= MAX_FIX_ROUNDS; round++) {
          const runFix = await approveStep(
            `🔄  Fix Round ${round} / ${MAX_FIX_ROUNDS}`,
            'ה-Quality agents סיימו. agents הפיתוח יקראו את הממצאים ויתקנו בעיות. להריץ סבב תיקונים?',
            qualityFeedback.slice(0, 1200) + (qualityFeedback.length > 1200 ? '\n...(truncated)' : ''),
          );

          if (!runFix) {
            console.log(chalk.gray('  Fix round skipped — continuing to Layer 5.'));
            break;
          }

          console.log(chalk.bold.cyan(`\n━━━  Fix Round ${round}: backendDev + frontendDev + authAgent  ━━━`));
          context.setFeedbackNotes(qualityFeedback);

          const fixConfigs = FIX_ROUND_AGENTS
            .filter(name => activeAgents.has(name))
            .map(name => ({ name, needsShell: false }));

          await runLayerInParallel(fixConfigs, context, toolSets, AGENT_REGISTRY);
          context.setFeedbackNotes(null);

          console.log(chalk.green(`  ✅  Fix Round ${round} complete.`));
          if (round >= MAX_FIX_ROUNDS) {
            console.log(chalk.gray(`  Max fix rounds (${MAX_FIX_ROUNDS}) reached — continuing to Layer 5.`));
          }
        }
      }
    }
  }

  // 5. Done
  console.log(chalk.bold.green('\n✅  הבנייה הושלמה!'));
  console.log(chalk.white(`📂  קבצים ב: ${outputDir}`));
  console.log(chalk.white(`📊  סה"כ קבצים: ${context.allFilesCreated.length}`));
  context.allFilesCreated.forEach(f => console.log(chalk.green(`   ✓ ${f}`)));
}

module.exports = { orchestrate };
