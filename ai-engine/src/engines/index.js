import { ClaudeEngine } from './claude.js';
import { CerebrasEngine } from './cerebras.js';

const engines = {
  claude: new ClaudeEngine(),
  cerebras: new CerebrasEngine()
};

export function getEngine(name) {
  const engine = engines[name.toLowerCase()];
  if (!engine) {
    throw new Error(`Unknown engine: ${name}. Available: ${Object.keys(engines).join(', ')}`);
  }
  return engine;
}

export function getAllEngines() {
  return Object.entries(engines).map(([key, engine]) => ({
    id: key,
    ...engine.getInfo()
  }));
}

export { engines };
