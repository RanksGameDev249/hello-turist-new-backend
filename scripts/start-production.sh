#!/bin/sh
set -eu

if [ "${NODE_ENV:-}" = "production" ]; then
  echo "Applying Prisma migrations..."
  npx prisma migrate deploy
fi

echo "Starting Hello Turist backend..."
exec npm start
