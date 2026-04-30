'use strict';

const fs = require('fs');
const path = require('path');

const { DEPENDENCY_MAP } = require('./agentDependencies');

// Agents that receive quality feedback during fix rounds
const FIX_ROUND_AGENTS = new Set(['backendDev', 'frontendDev', 'authAgent']);

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

    lines.push(
      `# Your Task — ${agentName} (${squad.name})`,
      `Implement ONLY the ${squad.name} domain using the context above.`,
      'Write ALL output files using the write_file tool.',
      'Paths are relative to the output directory — do NOT include the output directory path itself.',
      '',
    );

    return lines.join('\n');
  }

  buildContextMessage(agentName) {
    return this.buildScopedContext(agentName);
  }
}

module.exports = { ProjectContext };
