'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');
const path = require('path');

const { ProjectContext } = require('./context');
const { approveStep, approveLayer } = require('./approval');
const { createFileSystemTools } = require('./tools/fileSystem');
const { createShellTools } = require('./tools/shell');
const { runLayerInParallel, runLayerSequential } = require('./layerRunner');

const { createRequirementsAnalystAgent } = require('./agents/requirementsAnalyst');
const { createArchitectAgent } = require('./agents/architect');
const { createDataArchitectAgent } = require('./agents/dataArchitect');
const { createApiDesignerAgent } = require('./agents/apiDesigner');
const { createFrontendArchitectAgent } = require('./agents/frontendArchitect');
const { createBackendDevAgent } = require('./agents/backendDev');
const { createFrontendDevAgent } = require('./agents/frontendDev');
const { createAuthAgent } = require('./agents/authAgent');
const { createIntegrationAgent } = require('./agents/integrationAgent');
const { createSecurityAgent } = require('./agents/security');
const { createTesterAgent } = require('./agents/tester');
const { createReviewerAgent } = require('./agents/reviewer');
const { createDevOpsAgent } = require('./agents/devops');
const { createDocumentationAgent } = require('./agents/documentation');

const AGENT_REGISTRY = {
  requirementsAnalyst: createRequirementsAnalystAgent,
  systemArchitect:     createArchitectAgent,
  dataArchitect:       createDataArchitectAgent,
  apiDesigner:         createApiDesignerAgent,
  frontendArchitect:   createFrontendArchitectAgent,
  backendDev:          createBackendDevAgent,
  frontendDev:         createFrontendDevAgent,
  authAgent:           createAuthAgent,
  integrationAgent:    createIntegrationAgent,
  tester:              createTesterAgent,
  security:            createSecurityAgent,
  reviewer:            createReviewerAgent,
  devops:              createDevOpsAgent,
  documentation:       createDocumentationAgent,
};

// Layer definitions — parallel: true means agents in that layer run concurrently
const LAYER_DEFINITIONS = [
  {
    id: 1,
    name: 'Discovery',
    parallel: false,
    agents: ['requirementsAnalyst', 'systemArchitect'],
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
    id: 4,
    name: 'Quality',
    parallel: true,
    agents: ['tester', 'security', 'reviewer'],
  },
  {
    id: 5,
    name: 'Operations',
    parallel: true,
    agents: ['devops', 'documentation'],
    skipApprovalGate: true,
  },
];

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
  "estimatedFiles": 52
}`;

async function createPlan(requirements, projectName) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
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
- Return ONLY valid JSON matching this schema exactly:
${PM_PLAN_SCHEMA}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Project Name: ${projectName}\n\nRequirements:\n${requirements}`,
      },
    ],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('PM Agent failed to generate a valid JSON plan.');
  return JSON.parse(jsonMatch[0]);
}

function getActiveAgents(plan) {
  const names = new Set();
  const l3 = plan.layers?.layer3 || {};

  // Layer 1 + 2 + 4 + 5 always included as-is
  ['layer1', 'layer2', 'layer4', 'layer5'].forEach(layer => {
    (plan.layers?.[layer]?.agents || []).forEach(n => names.add(n));
  });

  // Layer 3 with conditional agents
  (l3.agents || []).forEach(n => names.add(n));
  if (l3.includeFrontend !== false) names.add('frontendDev');
  if (l3.includeIntegration === true) names.add('integrationAgent');

  return names;
}

function filterLayerAgents(layerDef, activeAgents, plan) {
  const l3 = plan.layers?.layer3 || {};
  return layerDef.agents
    .filter(name => {
      if (!activeAgents.has(name)) return false;
      // frontendArchitect and frontendDev only if frontend exists
      if ((name === 'frontendArchitect' || name === 'frontendDev') && l3.includeFrontend === false) return false;
      return true;
    })
    .map(name => ({
      name,
      needsShell: name === 'devops',
    }));
}

function formatPlan(plan) {
  const l3 = plan.layers?.layer3 || {};
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
    `    Layer 1 — Discovery     : requirementsAnalyst, systemArchitect`,
    `    Layer 2 — Design        : dataArchitect, apiDesigner${l3.includeFrontend !== false ? ', frontendArchitect' : ''}`,
    `    Layer 3 — Implementation: backendDev, authAgent${l3.includeFrontend !== false ? ', frontendDev' : ''}${l3.includeIntegration ? ', integrationAgent' : ''}`,
    `    Layer 4 — Quality       : tester, security, reviewer`,
    `    Layer 5 — Operations    : devops, documentation`,
    '',
    `📁  Estimated files : ~${plan.estimatedFiles}`,
  ];
  return lines.join('\n');
}

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
    fs: fsTools,
    all: {
      tools: [...fsTools.tools, ...shellTools.tools],
      handlers: { ...fsTools.handlers, ...shellTools.handlers },
    },
  };

  const activeAgents = getActiveAgents(plan);

  // 4. Execute layers
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

    if (!layerDef.skipApprovalGate) {
      const proceed = await approveLayer(`Layer ${layerDef.id} — ${layerDef.name}`, layerResults);
      if (!proceed) {
        console.log(chalk.yellow('\n⏹️   הופסק על ידי המשתמש.'));
        break;
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
