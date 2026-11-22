FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 3000
CMD ["sh","-c","node src/db/migrate.js && node src/server.js"]
