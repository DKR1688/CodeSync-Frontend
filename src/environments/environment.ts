declare global {
    interface Window {
        __env?: {
            apiUrl?: string;
            collabWsUrl?: string;
        };
    }
}

const LOCAL_API_URL = 'http://127.0.0.1:8080';

const PROD_API_URL = 'https://codesync-api-gateway.onrender.com';

const runtimeEnv =
    typeof window !== 'undefined' ? window.__env : undefined;

const browserOrigin =
    typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';

const isLocalBrowser =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(browserOrigin);

const apiUrl =
    runtimeEnv?.apiUrl?.trim() ||
    (isLocalBrowser ? LOCAL_API_URL : PROD_API_URL);

const collabWsUrl =
    runtimeEnv?.collabWsUrl?.trim() ||
    apiUrl.replace(/^http/, 'ws');

export const environment = {
    production: !isLocalBrowser,
    apiUrl,
    collabWsUrl
};