FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json jest.config.cjs setup-jest.ts ./
COPY scripts scripts
COPY public public
COPY src src

RUN npm run build

FROM nginx:1.27-alpine

ENV API_UPSTREAM=http://api-gateway:8080
ENV FRONTEND_API_URL=
ENV FRONTEND_COLLAB_WS_URL=

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/40-write-env.sh /docker-entrypoint.d/40-write-env.sh
COPY --from=build /app/dist/codesync-frontend/browser /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-write-env.sh

EXPOSE 80
