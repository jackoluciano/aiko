#!/bin/sh
set -eu

echo "== Layanan lokal ==" 
curl -fsS http://127.0.0.1:8080/api/health || echo "Kesehatan lokal gagal"
echo "== Layanan publik == "
curl -fsS https://aiko.stei.site/api/health || echo "Kesehatan publik gagal"
docker stats --no-stream
free -h
df -h /
used=$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')
if [ "$used" -gt 85 ]; then echo "Peringatan: penggunaan disk di atas 85%"; fi
