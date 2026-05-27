#!/bin/sh
set -e
mkdir -p /app/storage/uploads /app/storage/cache/pdf
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /app/storage
  exec su-exec nextjs:nodejs "$@"
fi
exec "$@"
