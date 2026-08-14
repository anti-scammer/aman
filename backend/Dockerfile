# Backend image — Express + Prisma against PostgreSQL.
#
# Build context is backend/. The runtime stage keeps the Prisma CLI (a runtime
# dependency here) because the container applies migrations on start.

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build

# Prisma's query engine links against OpenSSL; Alpine does not ship it.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.seed.json ./
COPY prisma ./prisma
COPY src ./src

# Generate the client from the PostgreSQL schema, then compile the server and
# the seed script (the seed is compiled so the runtime image doesn't need tsx).
RUN npx prisma generate --schema=prisma/postgres/schema.prisma \
 && npm run build \
 && npm run build:seed

# ---- runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime

RUN apk add --no-cache openssl

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-seed ./dist-seed

# Regenerate the client for this image's node_modules.
RUN npx prisma generate --schema=prisma/postgres/schema.prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as the unprivileged user the node image already provides. /app must be
# owned by it: `prisma migrate deploy` writes into node_modules/@prisma/engines.
RUN chown -R node:node /app
USER node

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
