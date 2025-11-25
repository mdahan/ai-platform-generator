/**
 * Base class for AI engines
 */
export class AIEngine {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.speed = 'medium';
    this.quality = 'good';
    this.costPer1kTokens = 0.01;
  }

  async generate(prompt, options = {}) {
    throw new Error('Must implement generate()');
  }

  async analyze(prompt, options = {}) {
    return this.generate(prompt, options);
  }

  getInfo() {
    return {
      name: this.name,
      speed: this.speed,
      quality: this.quality,
      costPer1kTokens: this.costPer1kTokens
    };
  }
}
