declare global {
  interface Window {
    __env?: {
      apiUrl?: string;
      collabWsUrl?: string;
    };
  }
}

const browserOrigin = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : '';
const runtimeEnv = typeof window !== 'undefined' ? window.__env : undefined;

const isLocalBrowser = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(browserOrigin);
const defaultApiUrl = isLocalBrowser
  ? 'http://127.0.0.1:8080'
  : browserOrigin || 'http://127.0.0.1:8080';

const apiUrl = runtimeEnv?.apiUrl?.trim() || defaultApiUrl;
const collabWsUrl = runtimeEnv?.collabWsUrl?.trim() || apiUrl;

export const environment = {
  production: false,
  apiUrl,
  collabWsUrl,
};
