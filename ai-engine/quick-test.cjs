require('dotenv').config();
const { getEngine } = require('./src/engines');

async function quickTest() {
  const prompt = 'Write a hello world function in JavaScript. Just the function, nothing else.';

  console.log('Testing Cerebras speed...\n');
  const start = Date.now();

  const cerebras = getEngine('cerebras');
  const result = await cerebras.generate(prompt, {
    maxTokens: 500  // Keep it small
  });

  const elapsed = Date.now() - start;

  console.log('Result:', result.content);
  console.log('\nStats:');
  console.log('- Time:', elapsed, 'ms');
  console.log('- Input tokens:', result.tokens.input);
  console.log('- Output tokens:', result.tokens.output);
  console.log('- Tokens/sec:', Math.round(result.tokens.output / (elapsed / 1000)));
}

quickTest().catch(console.error);
