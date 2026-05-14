import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiUrl = (process.env.API_URL ?? process.env.FRONTEND_API_URL ?? '').trim();
const authUrl = (process.env.AUTH_URL ?? process.env.FRONTEND_AUTH_URL ?? '').trim();
const collabWsUrl = (process.env.COLLAB_WS_URL ?? process.env.FRONTEND_COLLAB_WS_URL ?? '').trim();
const executionEnabled = (process.env.EXECUTION_ENABLED ?? process.env.FRONTEND_EXECUTION_ENABLED ?? '').trim();

const runtimeEnv = {};
if (apiUrl) {
  runtimeEnv.apiUrl = apiUrl;
}
if (authUrl) {
  runtimeEnv.authUrl = authUrl;
}
if (collabWsUrl) {
  runtimeEnv.collabWsUrl = collabWsUrl;
}
if (executionEnabled) {
  runtimeEnv.executionEnabled = executionEnabled;
}

const outputPath = resolve('public', 'env.js');
mkdirSync(resolve('public'), { recursive: true });
writeFileSync(outputPath, `window.__env = ${JSON.stringify(runtimeEnv, null, 2)};\n`);
