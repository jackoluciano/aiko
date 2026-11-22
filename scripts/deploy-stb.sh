#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Kesalahan: file .env tidak ditemukan."
  exit 1
fi

git pull
docker compose --profile tunnel up -d --build
docker compose ps
docker compose logs tunnel --tail 20 | grep -i registered || true
curl -fsS https://aiko.stei.site/api/health
