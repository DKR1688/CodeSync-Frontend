import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// SockJS expects a Node-style global in the browser bundle.
(globalThis as typeof globalThis & { global?: typeof globalThis }).global ??= globalThis;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
