import Anthropic from '@anthropic-ai/sdk';
import { AIEngine } from './base.js';

export class ClaudeEngine extends AIEngine {
  constructor() {
    super('Claude', {});
    this.speed = 'slow';
    this.quality = 'excellent';
    this.costPer1kTokens = 0.015;

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async generate(prompt, options = {}) {
    const start = Date.now();

    const response = await this.client.messages.create({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 16384,
      system: options.systemPrompt || '',
      messages: [{ role: 'user', content: prompt }]
    });

    const elapsed = Date.now() - start;
    console.log(`[Claude] Generated in ${elapsed}ms`);

    return {
      content: response.content[0].text,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      },
      elapsed
    };
  }
}
