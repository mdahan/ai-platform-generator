import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { AIEngine } from './base.js';

export class CerebrasEngine extends AIEngine {
  constructor() {
    super('Cerebras', {});
    this.speed = 'ultra-fast';
    this.quality = 'good';
    this.costPer1kTokens = 0.001;

    this.client = new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY
    });
  }

  async generate(prompt, options = {}) {
    const start = Date.now();

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: options.model || 'llama3.3-70b',
      max_tokens: options.maxTokens || 16384,
      messages
    });

    const elapsed = Date.now() - start;
    console.log(`[Cerebras] Generated in ${elapsed}ms`);

    return {
      content: response.choices[0].message.content,
      tokens: {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens
      },
      elapsed
    };
  }
}
