#!/bin/sh
cek() {
  label="$1"
  url="$2"
  code=$(curl -A 'TugasBesar-TST/1.0 (kelompok-aiko)' -sS -o /dev/null -w '%{http_code}' "$url")
  printf '%s %s\n' "$label" "$code"
}

cek AikoHealth "https://aiko.stei.site/api/health"
