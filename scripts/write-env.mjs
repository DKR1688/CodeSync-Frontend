import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiUrl = (process.env.FRONTEND_API_URL ?? '').trim();
const collabWsUrl = (process.env.FRONTEND_COLLAB_WS_URL ?? '').trim();

const runtimeEnv = {};
if (apiUrl) {
  runtimeEnv.apiUrl = apiUrl;
}
if (collabWsUrl) {
  runtimeEnv.collabWsUrl = collabWsUrl;
}

const outputPath = resolve('public', 'env.js');
mkdirSync(resolve('public'), { recursive: true });
writeFileSync(outputPath, `window.__env = ${JSON.stringify(runtimeEnv, null, 2)};\n`);
