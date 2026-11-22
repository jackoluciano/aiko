FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY core-service/package*.json ./
RUN npm ci --omit=dev
FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node core-service/src ./src
COPY --chown=node:node core-service/scripts ./scripts
COPY --chown=node:node docs/openapi.yaml ./docs/openapi.yaml
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["sh","-c","node src/db/migrate.js && node src/server.js"]
