# LiterasiGizi - aiko

Microservice backend LiterasiGizi untuk TST/PAWM. Core-service Express dijalankan
di balik gateway Nginx dan Cloudflare Tunnel dengan SQLite sebagai penyimpanan tunggal.

## Menjalankan lokal

```bash
cp .env.example .env
docker compose up -d --build
curl http://localhost:8080/api/health
```

Jangan membuka port database ke luar. Gateway lokal tersedia hanya di loopback
`127.0.0.1:8080`.

## Deploy ke STB

```bash
docker compose --profile tunnel up -d --build
docker compose ps
docker compose logs tunnel --tail 20
```

Cloudflare harus menggunakan route HTTP `gateway:80`, bukan `localhost` atau HTTPS.
Hentikan stack lama dan tunnel lama sebelum deploy stack baru. Jangan menjalankan
`docker volume prune`.

## Dokumentasi

- Kontrak API: `docs/`
- Konfigurasi gateway: `gateway/nginx.conf`
- Skrip operasional: `scripts/`
