'use strict';

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
    this.feedbackNotes = null; // Quality findings injected during fix rounds
  }

  addAgentOutput(agentName, summary, files) {
    this.agentOutputs[agentName] = { summary, files };
    this.allFilesCreated.push(...files);
  }

  // Called before a fix round to inject quality findings into dev agent context
  setFeedbackNotes(notes) {
    this.feedbackNotes = notes;
  }

  buildScopedContext(agentName) {
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

    // Inject quality findings for development agents during a fix round
    if (this.feedbackNotes && FIX_ROUND_AGENTS.has(agentName)) {
      lines.push(
        '# ⚠️  Quality Findings — Fix Round',
        'The Quality layer (tester, reviewer, security, performance, accessibility) identified the following issues.',
        'Read the relevant existing files using read_file and fix ALL issues listed below before writing updated files:',
        '',
        this.feedbackNotes,
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

  // Alias kept for backward compatibility
  buildContextMessage(agentName) {
    return this.buildScopedContext(agentName);
  }
}

module.exports = { ProjectContext };
