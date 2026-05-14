declare global {
    interface Window {
        __env?: {
            apiUrl?: string;
            authUrl?: string;
            collabWsUrl?: string;
            executionEnabled?: boolean | string;
        };
    }
}

const LOCAL_API_URL = 'http://127.0.0.1:8080';
const LOCAL_EXECUTION_ENABLED = true;

const PROD_API_URL = 'https://codesync-api-gateway.onrender.com';
const PROD_AUTH_URL = 'https://codesync-api-gateway.onrender.com';
const PROD_COLLAB_WS_URL = 'wss://codesync-api-gateway.onrender.com';
const PROD_EXECUTION_ENABLED = false;

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

const parseBoolean = (value: boolean | string | undefined): boolean | undefined => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
            return true;
        }
        if (normalized === 'false') {
            return false;
        }
    }

    return undefined;
};

const executionEnabled =
    parseBoolean(runtimeEnv?.executionEnabled) ??
    (isLocalBrowser ? LOCAL_EXECUTION_ENABLED : PROD_EXECUTION_ENABLED);

export const environment = {
    production: !isLocalBrowser,
    apiUrl,
    authUrl,
    collabWsUrl,
    executionEnabled
};
