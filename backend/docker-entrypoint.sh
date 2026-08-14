#!/bin/sh
# Apply migrations before the server accepts traffic, then optionally seed.
#
# `migrate deploy` is idempotent: it applies only migrations that have not run
# yet, so restarting the container is safe. Seeding is opt-in via SEED_ON_START
# because it is not idempotent for reports — leave it on for a fresh demo
# database, off for anything long-lived.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is not set" >&2
  exit 1
fi

echo "==> Applying database migrations"
npx prisma migrate deploy --schema=prisma/postgres/schema.prisma

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> Seeding database"
  node dist-seed/prisma/seed.js
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "WARNING: ADMIN_TOKEN is not set — the moderation API stays disabled," >&2
  echo "         which means submitted community reports can never be approved." >&2
fi

echo "==> Starting backend"
exec "$@"
