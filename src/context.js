'use strict';

const fs = require('fs');
const path = require('path');

const { DEPENDENCY_MAP } = require('./agentDependencies');

// Agents that receive quality feedback during fix rounds
const FIX_ROUND_AGENTS = new Set(['backendDev', 'frontendDev', 'authAgent']);

// Agents that write code and must produce a self-plan before any files
const SELF_PLANNING_AGENTS = new Set([
  'backendDev', 'frontendDev', 'authAgent', 'integrationAgent',
  'uiPrimitivesAgent', 'uiCompositeAgent', 'apiClientAgent', 'dbSchemaAgent',
  'squadErrorHandlingAgent', 'squadCodeCleanupAgent', 'squadDeduplicationAgent', 'squadQaAgent',
]);

// Guidelines injected per agent role from the Leaders Team
const GUIDELINE_MAP = {
  backendDev:                'docs/guidelines/tech-guidelines.md',
  frontendDev:               'docs/guidelines/tech-guidelines.md',
  authAgent:                 'docs/guidelines/tech-guidelines.md',
  integrationAgent:          'docs/guidelines/tech-guidelines.md',
  squadDesignerAgent:        'docs/guidelines/design-guidelines.md',
  squadQaAgent:              'docs/guidelines/qa-guidelines.md',
  squadSecurityAgent:        'docs/guidelines/security-guidelines.md',
  squadErrorHandlingAgent:   'docs/guidelines/tech-guidelines.md',
  squadCodeCleanupAgent:     'docs/guidelines/tech-guidelines.md',
  squadDeduplicationAgent:   'docs/guidelines/tech-guidelines.md',
  uiPrimitivesAgent:         'docs/guidelines/design-guidelines.md',
  uiCompositeAgent:          'docs/guidelines/design-guidelines.md',
  platformPmAgent:           'docs/guidelines/pm-guidelines.md',
  platformQaAgent:           'docs/guidelines/qa-guidelines.md',
};

function _injectSelfPlanningPrompt(lines, agentName, squadId) {
  if (!SELF_PLANNING_AGENTS.has(agentName)) return;
  const planPath = `docs/agent-plans/${agentName}${squadId ? '-' + squadId : ''}.md`;
  lines.push(
    '# Step 0 — Self-Planning (MANDATORY before writing any code files)',
    `Before creating or modifying ANY files, write a task plan to: ${planPath}`,
    'The plan must list:',
    '  ## Files to create',
    '  - relative/path/to/file.ext — brief description of contents',
    '  ## Files to modify',
    '  - relative/path/to/existing.ext — what changes',
    '  ## Execution order',
    '  1. First: ...',
    'Only after writing the plan, execute it file by file in the listed order.',
    '',
  );
}

function _injectLeadershipGuidelines(lines, agentName, agentOutputs) {
  const guidelinePath = GUIDELINE_MAP[agentName];
  if (!guidelinePath) return;
  // Check if the guideline was produced by a leader agent
  const leaderAgentMap = {
    'docs/guidelines/pm-guidelines.md':       'vpPmAgent',
    'docs/guidelines/tech-guidelines.md':     'techLeadAgent',
    'docs/guidelines/design-guidelines.md':   'designLeadAgent',
    'docs/guidelines/qa-guidelines.md':       'qaLeadAgent',
    'docs/guidelines/security-guidelines.md': 'securityLeadAgent',
  };
  const leaderAgent = leaderAgentMap[guidelinePath];
  const leaderOutput = leaderAgent ? agentOutputs[leaderAgent] : null;
  if (!leaderOutput) return;
  lines.push(
    `# Leadership Guidelines — read before starting`,
    `The ${leaderAgent} has produced guidelines at ${guidelinePath}.`,
    `Use read_file to load it as your first step, before writing any code.`,
    '',
  );
}

function _injectPlatformRules(lines, agentOutputs) {
  const hasUi  = agentOutputs['uiPrimitivesAgent'] || agentOutputs['uiCompositeAgent'];
  const hasApi = agentOutputs['apiClientAgent'];
  const hasDb  = agentOutputs['dbSchemaAgent'];
  if (!hasUi && !hasApi && !hasDb) return;

  lines.push(
    '# ⚠️  Platform Shared Code — MANDATORY',
    'The platform team has created shared modules. You MUST use them — do NOT create duplicates.',
    '',
  );

  if (hasUi) {
    lines.push(
      '## UI Components',
      "Primitive components : shared/components/primitives/  (Button, Input, Select, Typography, Icon, Badge, Avatar, Spinner, Tooltip, ...)",
      "Composite components : shared/components/composite/   (Card, Modal, Drawer, Toast, Table, Carousel, EmptyState, ErrorState, LoadingState, ...)",
      '',
      "Import example (adjust relative depth or use @shared alias if tsconfig has paths):",
      "  import { Button, Input, Typography } from '../../shared/components/primitives';",
      "  import { Card, Modal, EmptyState }   from '../../shared/components/composite';",
      '',
      'DO NOT create your own Button, Input, Card, Modal or any other base component.',
      'If you need a new variant, note it in a comment — do not implement it in squad code.',
      '',
    );
  }

  if (hasApi) {
    lines.push(
      '## API Client',
      'All HTTP calls go through the shared client. All API types are defined in shared/api/types.',
      '',
      "Import example (adjust relative depth or use @shared alias):",
      "  import { api }           from '../../shared/api';",
      "  import type { User, ... } from '../../shared/api/types';",
      '',
      'DO NOT use fetch() or axios directly.',
      'DO NOT define your own API response interfaces — import them from shared/api/types.',
      '',
    );
  }

  if (hasDb) {
    lines.push(
      '## Database Models / Entities',
      'All database schemas, models, and the DB connection are owned by the platform team in shared/db/.',
      '',
      "Import example (adjust relative depth or use @shared alias):",
      "  import { connect, mongoose } from '../../shared/db';          // Mongoose",
      "  import { User, Listing }     from '../../shared/db';          // Models",
      "  import { prisma }            from '../../shared/db';          // Prisma",
      "  import { AppDataSource }     from '../../shared/db';          // TypeORM",
      "  import { db }                from '../../shared/db';          // Drizzle",
      '',
      'DO NOT define your own Mongoose schemas, Prisma models, TypeORM entities, or Sequelize models.',
      'DO NOT create a separate database connection — import the shared one.',
      '',
    );
  }
}

class ProjectContext {
  constructor(requirements, plan, outputDir) {
    this.requirements = requirements;
    this.plan = plan;
    this.outputDir = outputDir;
    this.agentOutputs = {};
    this.allFilesCreated = [];
    this.feedbackNotes = null;
    this.pmFeedbackNotes = null;
    this.completedLayers = new Set();
    this.squadPlan = null;
    this.squadSpecs = {};   // squadId → spec markdown content
    this.squadGaps  = {};   // squadId → gaps markdown content (cleared after fix)
    this.platformUpdateNotes = {}; // agentName → change description (set during update mode)
  }

  setPlatformUpdateNote(agentName, note) {
    if (note === null) {
      delete this.platformUpdateNotes[agentName];
    } else {
      this.platformUpdateNotes[agentName] = note;
    }
  }

  addAgentOutput(agentName, summary, files) {
    this.agentOutputs[agentName] = { summary, files };
    this.allFilesCreated.push(...files);
  }

  setFeedbackNotes(notes) {
    this.feedbackNotes = notes;
  }

  setPmFeedbackNotes(notes) {
    this.pmFeedbackNotes = notes;
  }

  setSquadPlan(squadPlan) {
    this.squadPlan = squadPlan;
  }

  setSquadSpec(squadId, content) {
    this.squadSpecs[squadId] = content;
  }

  setSquadGaps(squadId, content) {
    if (content === null) {
      delete this.squadGaps[squadId];
    } else {
      this.squadGaps[squadId] = content;
    }
  }

  markLayerComplete(layerId) {
    this.completedLayers.add(String(layerId));
  }

  isLayerComplete(layerId) {
    return this.completedLayers.has(String(layerId));
  }

  saveCheckpoint() {
    const checkpointPath = path.join(this.outputDir, '.build-checkpoint.json');
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(checkpointPath, JSON.stringify({
      requirements: this.requirements,
      plan: this.plan,
      squadPlan: this.squadPlan,
      agentOutputs: this.agentOutputs,
      allFilesCreated: this.allFilesCreated,
      completedLayers: [...this.completedLayers],
    }, null, 2), 'utf8');
  }

  static loadCheckpoint(outputDir) {
    const checkpointPath = path.join(outputDir, '.build-checkpoint.json');
    if (!fs.existsSync(checkpointPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    } catch {
      return null;
    }
  }

  static fromCheckpoint(checkpoint) {
    const ctx = new ProjectContext(checkpoint.requirements, checkpoint.plan, checkpoint.outputDir || '');
    ctx.agentOutputs = checkpoint.agentOutputs || {};
    ctx.allFilesCreated = checkpoint.allFilesCreated || [];
    ctx.completedLayers = new Set(checkpoint.completedLayers || []);
    ctx.squadPlan = checkpoint.squadPlan || null;
    return ctx;
  }

  buildScopedContext(agentName) {
    const isFixRound = !!(this.feedbackNotes || this.pmFeedbackNotes) && FIX_ROUND_AGENTS.has(agentName);

    const lines = [
      '# Project Requirements',
      this.requirements,
      '',
      '# Tech Stack Decisions',
      JSON.stringify(this.plan.techStack, null, 2),
      '',
      '# Output Directory',
      this.outputDir,
      '',
    ];

    if (this.squadPlan) {
      lines.push('# Squad Structure');
      lines.push('The application is divided into feature squads. Structure your code under the module paths below.');
      lines.push('');
      this.squadPlan.squads.forEach(squad => {
        lines.push(`## ${squad.name}`);
        lines.push(`Domain   : ${squad.userFacingArea}`);
        lines.push(`Scope    : ${squad.description}`);
        lines.push(`Backend  : backend/src/modules/${squad.backendModule}/`);
        lines.push(`Frontend : frontend/src/${squad.frontendModule}/ (or mobile/src/${squad.frontendModule}/)`);
        lines.push(`Features : ${squad.keyFeatures.join(', ')}`);
        lines.push('');
      });
      lines.push(`Platform Team (cross-squad): ${this.squadPlan.platformNotes}`);
      lines.push('');
    }

    // During fix rounds skip dependency re-injection — agents already have the code,
    // they only need to know what to fix. Saves 5-15K tokens per fix round call.
    if (!isFixRound) {
      const deps = DEPENDENCY_MAP[agentName] || [];
      if (deps.length > 0) {
        lines.push('# Context From Dependencies', '');
        for (const depName of deps) {
          const output = this.agentOutputs[depName];
          if (!output) {
            lines.push(`## ${depName} Agent`, '(not run — optional agent skipped)', '');
            continue;
          }
          lines.push(
            `## ${depName} Agent Output`,
            output.summary,
            '',
            `Files created: ${output.files.join(', ')}`,
            '',
          );
        }
      }
    }

    if (this.feedbackNotes && FIX_ROUND_AGENTS.has(agentName)) {
      lines.push(
        '# ⚠️  Quality Findings — Fix Round',
        'The Quality layer (testWriter, testRunner, testFixer, reviewer, security, performance, accessibility) identified the following issues.',
        'Read the relevant existing files using read_file and fix ALL issues listed below before writing updated files:',
        '',
        this.feedbackNotes,
        '',
      );
    }

    if (this.pmFeedbackNotes && FIX_ROUND_AGENTS.has(agentName)) {
      lines.push(
        '# 🔴  PM Acceptance Review — Fix Round',
        'The Product Manager reviewed the implementation and found gaps against the original requirements.',
        'Read the relevant existing files using read_file, then implement or fix ALL items listed below:',
        '',
        this.pmFeedbackNotes,
        '',
      );
    }

    if (this.platformUpdateNotes[agentName]) {
      lines.push(
        '# ⚠️  UPDATE MODE',
        'Read existing files in your shared/ directory first, then apply ONLY these specific changes:',
        '',
        this.platformUpdateNotes[agentName],
        '',
        'Do NOT remove existing components or endpoints — only add or modify what is listed above.',
        '',
      );
    }

    lines.push(
      `# Your Task — ${agentName} Agent`,
      `You are the ${agentName} agent. Using the context above, complete your specific role.`,
      'Write ALL output files using the write_file tool.',
      'Paths are relative to the output directory — do NOT include the output directory path itself.',
      '',
    );

    return lines.join('\n');
  }

  buildSquadPmSpecContext(squad) {
    const lines = [
      '# Project Requirements',
      this.requirements,
      '',
      '# Tech Stack',
      JSON.stringify(this.plan.techStack, null, 2),
      '',
      '# Output Directory',
      this.outputDir,
      '',
      `# Your Squad: ${squad.name}`,
      `Squad ID  : ${squad.id}`,
      `Domain    : ${squad.userFacingArea}`,
      `Description: ${squad.description}`,
      `Key features: ${squad.keyFeatures.join(', ')}`,
      `Backend module : backend/src/modules/${squad.backendModule}/`,
      `Frontend module: frontend/src/${squad.frontendModule}/  (or mobile/src/${squad.frontendModule}/)`,
      '',
    ];

    const otherSquads = this.squadPlan ? this.squadPlan.squads.filter(s => s.id !== squad.id) : [];
    if (otherSquads.length > 0) {
      lines.push('# Other Squads (do NOT spec their features)');
      otherSquads.forEach(s => lines.push(`- ${s.name}: ${s.userFacingArea}`));
      lines.push('');
    }

    // Platform context
    ['systemArchitect', 'dataArchitect', 'apiDesigner'].forEach(dep => {
      const out = this.agentOutputs[dep];
      if (out) lines.push(`# ${dep} Output`, out.summary, '');
    });

    lines.push(
      `# Your Task`,
      `Write the feature spec for the ${squad.name}.`,
      `Output file: docs/squads/${squad.id}-spec.md`,
      'Write ALL output using the write_file tool.',
      '',
    );
    return lines.join('\n');
  }

  buildSquadPmReviewContext(squad) {
    return [
      '# Output Directory',
      this.outputDir,
      '',
      `# Your Squad: ${squad.name}`,
      `Squad ID       : ${squad.id}`,
      `Domain         : ${squad.userFacingArea}`,
      `Backend module : backend/src/modules/${squad.backendModule}/`,
      `Frontend module: frontend/src/${squad.frontendModule}/  (or mobile/src/${squad.frontendModule}/)`,
      '',
      '# Your Task',
      `Read docs/squads/${squad.id}-spec.md, read all squad files, then write docs/squads/${squad.id}-review.md`,
      'Verdict must be either "VERDICT: ACCEPTED" or "VERDICT: GAPS".',
      'Write ALL output using the write_file tool.',
      '',
    ].join('\n');
  }

  buildSquadScopedContext(agentName, squad) {
    const lines = [
      '# Project Requirements',
      this.requirements,
      '',
      '# Tech Stack Decisions',
      JSON.stringify(this.plan.techStack, null, 2),
      '',
      '# Output Directory',
      this.outputDir,
      '',
      `# Your Squad: ${squad.name}`,
      `You are the **${agentName}** agent working in the **${squad.name}**.`,
      '',
      `Domain      : ${squad.userFacingArea}`,
      `Description : ${squad.description}`,
      `Key features: ${squad.keyFeatures.join(', ')}`,
      '',
      'Write ALL your files under these paths (relative to output directory):',
      `  Backend : backend/src/modules/${squad.backendModule}/`,
      `  Frontend: frontend/src/${squad.frontendModule}/   (or mobile/src/${squad.frontendModule}/)`,
      '',
      'Build ONLY the features listed above. Do not implement features that belong to other squads.',
      '',
    ];

    // Squad PM spec — injected so devs implement exactly what was specified
    const spec = this.squadSpecs[squad.id];
    if (spec) {
      lines.push('# Squad Feature Spec (written by your Squad PM — implement exactly this)', spec, '');
    }

    // Squad PM gaps — injected during fix rounds
    const gaps = this.squadGaps[squad.id];
    if (gaps) {
      lines.push(
        '# ⚠️  Squad PM Review — Fix Round',
        'Your Squad PM reviewed your implementation and found gaps. Fix ALL items listed below:',
        '',
        gaps,
        '',
      );
    }

    // Awareness of other squads so this agent doesn't duplicate their work
    const otherSquads = this.squadPlan ? this.squadPlan.squads.filter(s => s.id !== squad.id) : [];
    if (otherSquads.length > 0) {
      lines.push('# Other Squads (do NOT implement their features)');
      otherSquads.forEach(s => {
        lines.push(`- ${s.name}: ${s.userFacingArea} (${s.keyFeatures.join(', ')})`);
      });
      lines.push('');
    }

    // Platform agent outputs (architecture, design) via DEPENDENCY_MAP
    const deps = DEPENDENCY_MAP[agentName] || [];
    const availableDeps = deps.filter(dep => this.agentOutputs[dep]);
    if (availableDeps.length > 0) {
      lines.push('# Platform Context (Architecture & Design)', '');
      for (const depName of availableDeps) {
        const output = this.agentOutputs[depName];
        lines.push(
          `## ${depName}`,
          output.summary,
          '',
          `Files: ${output.files.join(', ')}`,
          '',
        );
      }
    }

    _injectPlatformRules(lines, this.agentOutputs);
    _injectLeadershipGuidelines(lines, agentName, this.agentOutputs);
    _injectSelfPlanningPrompt(lines, agentName, squad.id);

    lines.push(
      `# Your Task — ${agentName} (${squad.name})`,
      `Implement ONLY the ${squad.name} domain using the context above.`,
      'Write ALL output files using the write_file tool.',
      'Paths are relative to the output directory — do NOT include the output directory path itself.',
      '',
    );

    return lines.join('\n');
  }

  buildSquadPmUpdateSpecContext(squad, changeDescription) {
    return [
      '# Output Directory',
      this.outputDir,
      '',
      `# Your Squad: ${squad.name}`,
      `Squad ID       : ${squad.id}`,
      `Backend module : backend/src/modules/${squad.backendModule}/`,
      `Frontend module: frontend/src/${squad.frontendModule}/  (or mobile/src/${squad.frontendModule}/)`,
      '',
      '# What to change',
      changeDescription,
      '',
      '# Your Task',
      `1. read_file "docs/squads/${squad.id}-spec.md"`,
      `2. list_files + read relevant files in backend/src/modules/${squad.backendModule}/ and frontend/src/${squad.frontendModule}/`,
      '3. Update the spec — DO NOT remove existing items, only add new ones marked with "(NEW)"',
      `4. Write updated spec to: docs/squads/${squad.id}-spec.md`,
      'Write ALL output using the write_file tool.',
      '',
    ].join('\n');
  }

  buildSquadUpdateContext(agentName, squad, changeDescription) {
    const lines = [
      '# Project Requirements',
      this.requirements,
      '',
      '# Tech Stack Decisions',
      JSON.stringify(this.plan.techStack, null, 2),
      '',
      '# Output Directory',
      this.outputDir,
      '',
      `# Your Squad: ${squad.name}`,
      `You are the **${agentName}** agent working in the **${squad.name}**.`,
      '',
      '# ⚠️  UPDATE MODE — Read existing files first',
      'This squad already has existing code. Your task is to ADD or MODIFY — not rebuild from scratch.',
      '',
      '## What to change',
      changeDescription,
      '',
      'Steps:',
      `1. list_files on backend/src/modules/${squad.backendModule}/`,
      `2. list_files on frontend/src/${squad.frontendModule}/ (or mobile/src/${squad.frontendModule}/)`,
      '3. Read all relevant existing files',
      '4. Apply ONLY the changes described in "What to change" above',
      '5. Write updated files using write_file',
      '',
    ];

    const spec = this.squadSpecs[squad.id];
    if (spec) {
      lines.push('# Updated Squad Feature Spec (implement items marked "(NEW)")', spec, '');
    }

    const gaps = this.squadGaps[squad.id];
    if (gaps) {
      lines.push(
        '# ⚠️  Squad PM Review — Fix Round',
        'Your Squad PM found gaps. Fix ALL items listed below:',
        '',
        gaps,
        '',
      );
    }

    const otherSquads = this.squadPlan ? this.squadPlan.squads.filter(s => s.id !== squad.id) : [];
    if (otherSquads.length > 0) {
      lines.push('# Other Squads (do NOT touch their files)');
      otherSquads.forEach(s => lines.push(`- ${s.name}: ${s.userFacingArea}`));
      lines.push('');
    }

    const deps = DEPENDENCY_MAP[agentName] || [];
    const availableDeps = deps.filter(dep => this.agentOutputs[dep]);
    if (availableDeps.length > 0) {
      lines.push('# Platform Context', '');
      for (const depName of availableDeps) {
        const output = this.agentOutputs[depName];
        lines.push(`## ${depName}`, output.summary, '', `Files: ${output.files.join(', ')}`, '');
      }
    }

    _injectPlatformRules(lines, this.agentOutputs);
    _injectLeadershipGuidelines(lines, agentName, this.agentOutputs);
    _injectSelfPlanningPrompt(lines, agentName, squad.id);

    lines.push(
      `# Your Task — ${agentName} (${squad.name}) UPDATE`,
      'Read existing files first. Then apply only the changes listed in "What to change" above.',
      'Write ALL modified/new files using the write_file tool.',
      '',
    );

    return lines.join('\n');
  }

  buildContextMessage(agentName) {
    return this.buildScopedContext(agentName);
  }
}

module.exports = { ProjectContext };
