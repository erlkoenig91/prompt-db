#!/bin/sh
set -eu

mkdir -p /etc/nginx/conf.d

cp /etc/nginx/templates/nginx-extra.conf.template /etc/nginx/conf.d/nginx-extra.inc

RUNTIME_API_URL="${API_PUBLIC_URL:-${VITE_API_URL:-}}"

if [ -n "${API_UPSTREAM:-}" ]; then
  envsubst '${API_UPSTREAM}' < /etc/nginx/templates/nginx-api-proxy.conf.template > /etc/nginx/conf.d/api-locations.inc
  RUNTIME_API_URL=""
  export CONNECT_SRC="'self'"
else
  : > /etc/nginx/conf.d/api-locations.inc
  if [ -n "${RUNTIME_API_URL}" ]; then
    export CONNECT_SRC="'self' ${RUNTIME_API_URL}"
  else
    export CONNECT_SRC="'self'"
  fi
fi

printf 'window.__PROMPT_DB_CONFIG__ = { apiUrl: "%s" };\n' "${RUNTIME_API_URL}" > /usr/share/nginx/html/config.js

if [ -f /etc/nginx/ssl/tls.crt ] && [ -f /etc/nginx/ssl/tls.key ]; then
  envsubst '${CONNECT_SRC}' < /etc/nginx/templates/nginx-redirect.conf.template > /etc/nginx/conf.d/default.conf
  envsubst '${CONNECT_SRC}' < /etc/nginx/templates/nginx-ssl.conf.template > /etc/nginx/conf.d/ssl.conf
else
  envsubst '${CONNECT_SRC}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
