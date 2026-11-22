#!/bin/sh
set -eu
# Crontab contoh: 0 2 * * * cd /path/aiko && ./scripts/backup-stb.sh
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M)
docker compose exec -T core-service node scripts/backup.js
docker compose cp core-service:/data/backups/. ./backups/
ls -1t backups/aiko-* 2>/dev/null | tail -n +8 | xargs -r rm -f
