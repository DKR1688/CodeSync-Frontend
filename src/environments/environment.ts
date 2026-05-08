declare global {
    interface Window {
        __env?: {
            apiUrl?: string;
            authUrl?: string;
            collabWsUrl?: string;
        };
    }
}

const LOCAL_API_URL = 'http://127.0.0.1:8080';

const PROD_API_URL = 'https://codesync-api-gateway.onrender.com';
const PROD_AUTH_URL = 'https://codesync-api-gateway.onrender.com';
const PROD_COLLAB_WS_URL = 'wss://codesync-api-gateway.onrender.com';

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

const authUrl =
    runtimeEnv?.authUrl?.trim() ||
    (isLocalBrowser ? LOCAL_API_URL : PROD_AUTH_URL);

const collabWsUrl =
    runtimeEnv?.collabWsUrl?.trim() ||
    (isLocalBrowser ? apiUrl.replace(/^http/, 'ws') : PROD_COLLAB_WS_URL);

export const environment = {
    production: !isLocalBrowser,
    apiUrl,
    authUrl,
    collabWsUrl
};
