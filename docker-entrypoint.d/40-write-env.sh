#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/env.js
window.__env = {
  apiUrl: "${FRONTEND_API_URL:-}",
  collabWsUrl: "${FRONTEND_COLLAB_WS_URL:-}"
};
EOF
