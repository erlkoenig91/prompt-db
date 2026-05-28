FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
COPY VERSION ./VERSION

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine

ARG VITE_API_URL=
ENV API_ORIGIN=$VITE_API_URL
ENV API_UPSTREAM=

RUN apk add --no-cache gettext

COPY frontend/nginx.conf.template frontend/nginx-redirect.conf.template frontend/nginx-ssl.conf.template frontend/nginx-api-proxy.conf.template frontend/nginx-extra.conf.template /etc/nginx/templates/
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html

RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /etc/nginx/ssl /etc/nginx/conf.d \
    && chown -R app:app /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/ssl /etc/nginx/conf.d /etc/nginx/templates \
    && touch /var/run/nginx.pid && chown app:app /var/run/nginx.pid

USER app
EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
