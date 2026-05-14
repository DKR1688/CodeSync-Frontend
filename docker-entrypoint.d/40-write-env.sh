#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/env.js
window.__env = {
  apiUrl: "${FRONTEND_API_URL:-}",
  authUrl: "${FRONTEND_AUTH_URL:-}",
  collabWsUrl: "${FRONTEND_COLLAB_WS_URL:-}",
  executionEnabled: "${FRONTEND_EXECUTION_ENABLED:-}"
};
EOF
