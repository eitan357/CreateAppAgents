'use strict';

const { DEPENDENCY_MAP } = require('./agentDependencies');

class ProjectContext {
  constructor(requirements, plan, outputDir) {
    this.requirements = requirements;
    this.plan = plan;
    this.outputDir = outputDir;
    this.agentOutputs = {};
    this.allFilesCreated = [];
  }

  addAgentOutput(agentName, summary, files) {
    this.agentOutputs[agentName] = { summary, files };
    this.allFilesCreated.push(...files);
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
