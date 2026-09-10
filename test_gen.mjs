import { generateConceptIllustration } from './src/lib/ai/image-generator.js';
import fs from 'fs';

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.join('=').trim();
});

console.log('Testing generateConceptIllustration...');
const res = await generateConceptIllustration(
  'Cute conceptual cartoon explainer illustration of a friendly person typing a simple text message to a cute robot computer',
  'Bayangin CLI itu kayak kamu lagi WhatsApp-an langsung sama jeroan komputer kamu!'
);
console.log('Result:', {
  imageUrl: res?.imageUrl,
  hasSvg: Boolean(res?.svgContent),
  svgLength: res?.svgContent?.length
});
