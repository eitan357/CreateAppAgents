'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { withRetry } = require('../withRetry');
const costTracker = require('../costTracker');
const { getAgentCategory, getDefaultModels } = require('../agentModels');

// Per-category model configs — set once before orchestrate() via setModelConfigs()
let _modelConfigs = getDefaultModels(3);

function setModelConfigs(configs) {
  _modelConfigs = configs;
}

function getModelConfigs() {
  return _modelConfigs;
}

class BaseAgent {
  constructor(name, systemPrompt, tools, toolHandlers) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.toolHandlers = toolHandlers;
    this.client = new Anthropic();
    this.filesCreated = [];
  }

  async run(userMessage) {
    if (global._mockMode) {
      const { getMockResponse } = require('../mockResponses');
      return getMockResponse(this.name);
    }

    const messages = [{ role: 'user', content: [{ type: 'text', text: userMessage, cache_control: { type: 'ephemeral' } }] }];
    this.filesCreated = [];

    while (true) {
      const category = getAgentCategory(this.name);
      const cfg = _modelConfigs[category] || _modelConfigs.heavy;

      const params = {
        model: cfg.model || 'claude-sonnet-4-6',
        max_tokens: cfg.max_tokens,
        system: [
          {
            type: 'text',
            text: this.systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      };

      if (cfg.thinking) {
        params.thinking = cfg.thinking;
      }

      if (this.tools.length > 0) {
        params.tools = this.tools.map((t, i) =>
          i === this.tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t
        );
      }

      const response = await withRetry(() => this.client.messages.create(params, { timeout: 20 * 60 * 1000 }), this.name);
      costTracker.record(this.name, params.model, response.usage);
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') {
        const textBlock = response.content.find(b => b.type === 'text');
        return {
          summary: textBlock ? textBlock.text : `${this.name} completed.`,
          filesCreated: [...this.filesCreated],
        };
      }

      // Execute all tool calls and collect results
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        const handler = this.toolHandlers[block.name];
        let result;
        try {
          result = handler ? handler(block.input) : { error: `Unknown tool: ${block.name}` };
          if (block.name === 'write_file' && result.success) {
            this.filesCreated.push(block.input.file_path);
          }
        } catch (err) {
          result = { error: err.message };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }
}

module.exports = { BaseAgent, setModelConfigs, getModelConfigs };
