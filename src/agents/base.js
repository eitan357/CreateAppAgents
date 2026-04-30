'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// Global model config — set once before orchestrate() via setModelConfig()
let _modelConfig = {
  thinking: { type: 'adaptive' },
  max_tokens: 8096,
};

function setModelConfig(config) {
  _modelConfig = config;
}

function getModelConfig() {
  return _modelConfig;
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
    const messages = [{ role: 'user', content: userMessage }];
    this.filesCreated = [];

    while (true) {
      const params = {
        model: 'claude-opus-4-7',
        max_tokens: _modelConfig.max_tokens,
        system: [
          {
            type: 'text',
            text: this.systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      };

      if (_modelConfig.thinking) {
        params.thinking = _modelConfig.thinking;
      }

      if (this.tools.length > 0) {
        params.tools = this.tools;
      }

      const response = await this.client.messages.create(params, { timeout: 20 * 60 * 1000 });
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

module.exports = { BaseAgent, setModelConfig, getModelConfig };
