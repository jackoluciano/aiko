# LiterasiGizi - aiko

LiterasiGizi adalah backend untuk jalur belajar dan kuis gizi seimbang bagi anak SD.
Proyek ini dibangun untuk mata kuliah II3160 Teknologi Sistem Terintegrasi dan II3140
Pengembangan Aplikasi Web dan Mobile. Implementasinya menggunakan Node.js 20,
Express, SQLite melalui `better-sqlite3`, JWT, dan Nginx.

Layanan publiknya tersedia di `https://aiko.stei.site`, dengan base URL API
`https://aiko.stei.site/api`. Dokumentasi Swagger tersedia di
`https://aiko.stei.site/api/docs/`.

## Arsitektur

```text
Browser atau aplikasi mobile
             |
             | HTTPS
             v
Cloudflare Tunnel
             |
             | HTTP ke gateway:80
             v
        Nginx gateway
             |
             v
      core-service
      Node.js 20
             |
             v
      SQLite volume

Pengguna aplikasi: Authorization: Bearer <JWT>
Kelompok lain: X-API-Key: <API key>
```

Stack yang digunakan:

- Core: Express dan SQLite dengan volume Docker `aiko_data`
- Gateway: Nginx 1.28
- Akses publik: Cloudflare Tunnel
- Autentikasi: JWT untuk pengguna dan API key untuk server antarkelompok
- Dokumentasi: Swagger UI dan koleksi Postman

Core-service memiliki endpoint `/api/health` sendiri. Nginx dan gateway tidak
menggantikan pemeriksaan kesehatan core-service.

## Menjalankan dengan Docker Compose

Salin contoh environment, lalu isi nilai rahasia pada `.env` lokal.

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8080/api/health
```

Untuk menyertakan Cloudflare Tunnel:

```bash
docker compose --profile tunnel up -d --build
```

Variabel yang dibaca oleh stack:

| Variabel | Kegunaan |
|---|---|
| `TUNNEL_TOKEN` | Token Cloudflare Tunnel |
| `JWT_SECRET` | Kunci tanda tangan JWT; minimal 32 karakter di production |
| `JWT_EXPIRES_IN` | Masa berlaku JWT |
| `DB_PATH` | Lokasi file SQLite di container |
| `PORT` | Port core-service |
| `NODE_ENV` | Mode runtime |
| `TZ` | Zona waktu aplikasi |
| `ADMIN_TOKEN` | Token untuk endpoint administrasi API key |

Lokalisasi gateway hanya mempublikasikan loopback `127.0.0.1:8080`. Port SQLite
tidak dibuka ke host. Jalankan stack lama dan tunnel lama terlebih dahulu sebelum
stack baru; jangan menjalankan `docker volume prune`.

## Seed data uji

Data yang disediakan hanya data uji:

```bash
docker compose exec core-service node scripts/seed.js
```

Akunnya adalah:

- Orang tua: `demo.parent@aiko.test`
- Password: `Demo12345!`
- Anak: `demo_kid`
- PIN: `1234`
- Kelas: 3

API key demo dicetak saat seed pertama kali dijalankan dan disimpan sebagai hash
di database. Nilai mentah key hanya ditampilkan sekali. Untuk membuat atau mencabut
key kelompok lain, lihat bagian akses API.

## Daftar endpoint

Base URL lokal: `http://127.0.0.1:8080/api`

| Method | Path | Autentikasi | Fungsi |
|---|---|---|---|
| GET | `/health` | Tanpa | Status core-service dan SQLite |
| POST | `/auth/register` | Tanpa | Registrasi orang tua dengan persetujuan |
| POST | `/auth/login` | Tanpa | Login orang tua dan penerimaan JWT |
| POST | `/auth/child-login` | Tanpa | Login profil anak dan penerimaan JWT child |
| GET | `/auth/me` | Bearer JWT | Profil dari token |
| POST | `/players` | Parent | Membuat profil anak |
| GET | `/players` | Parent | Daftar anak milik orang tua |
| GET | `/players/{id}` | Parent atau child | Detail profil dengan pemeriksaan kepemilikan |
| PATCH | `/players/{id}` | Parent | Mengubah profil anak |
| DELETE | `/players/{id}` | Parent | Menghapus profil dan data anak |
| GET | `/modules?grade=&topic=` | Bearer JWT | Daftar modul aktif sesuai jenjang |
| GET | `/modules/{id}` | Bearer JWT | Detail modul tanpa daftar soal |
| GET | `/topics` | Bearer JWT | Daftar topik |
| GET | `/players/{id}/path` | Bearer JWT | Jalur modul dan modul berikutnya |
| POST | `/quizzes/{moduleId}/start` | Bearer JWT | Memulai atau melanjutkan kuis |
| POST | `/quizzes/{sessionId}/answer` | Bearer JWT | Menjawab satu soal |
| GET | `/quizzes/{sessionId}` | Bearer JWT | Status sesi kuis |
| GET | `/players/{id}/mastery` | Bearer JWT | Penguasaan per topik |
| GET | `/players/{id}/progress` | Bearer JWT | Poin, level, lencana, dan riwayat |
| GET | `/players/{id}/badges` | Bearer JWT | Lencana diperoleh dan belum diperoleh |
| GET | `/players/{id}/missions?date=` | Bearer JWT | Misi harian |
| POST | `/missions/{id}/check` | Parent | Mencentang misi selesai |
| GET | `/open/topics` | `X-API-Key` | Daftar topik untuk kelompok lain |
| GET | `/open/quizzes` | `X-API-Key` | Kuis tanpa kunci jawaban |
| POST | `/open/quizzes/check` | `X-API-Key` | Memeriksa jawaban open host |
| GET | `/open/progress/{playerId}` | `X-API-Key` | Ringkasan progres yang dibagikan |

Kontrak lengkap terdapat di [OpenAPI](docs/openapi.yaml) dan pada
<https://aiko.stei.site/api/docs/>.

## Akses JWT, API key, dan batas permintaan

Pengguna aplikasi login melalui `/auth/login` atau `/auth/child-login`, lalu mengirim
JWT pada header `Authorization: Bearer <token>`.

Kelompok lain server-ke-server harus mengirim satu key per kelompok pada header
`X-API-Key: <key>`. Key dapat dibuat melalui CLI:

```bash
docker compose exec core-service node scripts/create-api-key.js "Nama Kelompok"
```

Key mentah ditampilkan sekali. Untuk mencabut key:

```bash
docker compose exec core-service node scripts/create-api-key.js --revoke "Nama Kelompok"
```

Minta API key kepada pemilik repository atau Kelompok aiko K02 melalui kontak yang
dicantumkan pada API Registry proyek. Key harus disimpan oleh mitra sebagai rahasia
dan tidak boleh ditempelkan pada dokumentasi publik.

Limit aplikasi adalah 120 permintaan per menit per IP. Endpoint `/open/*` juga
memiliki limit 60 permintaan per menit per API key. Rate limit Nginx juga aktif pada
rute `/api/` dan rute autentikasi.

## Contoh request

### Login orang tua

```bash
curl -sS -X POST http://127.0.0.1:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.parent@aiko.test","password":"Demo12345!"}'
```

Respons ringkas:

```json
{
  "token": "<JWT>",
  "user": {
    "id": "<uuid>",
    "email": "demo.parent@aiko.test",
    "role": "parent"
  }
}
```

### Daftar modul

```bash
curl -sS "http://127.0.0.1:8080/api/modules?grade=3" \
  -H "Authorization: Bearer <JWT>"
```

Respons ringkas:

```json
[
  {
    "id": "<module-id>",
    "slug": "mengenal-kelompok-makanan",
    "title": "Mengenal Kelompok Makanan",
    "topic": "jajanan",
    "grade_min": 1,
    "grade_max": 2,
    "position": 1,
    "is_active": 1
  }
]
```

### Open host topics

```bash
curl -sS http://127.0.0.1:8080/api/open/topics \
  -H "X-API-Key: <API_KEY>"
```

Respons ringkas:

```json
[
  "sayur-buah",
  "protein",
  "air-putih",
  "minuman-manis",
  "label-gizi"
]
```

### Open host quiz

```bash
curl -sS "http://127.0.0.1:8080/api/open/quizzes?grade=3&limit=5" \
  -H "X-API-Key: <API_KEY>"
```

Respons berisi `id`, teks soal, pilihan, tingkat kesulitan, topik, dan gambar.
Respons open host tidak memuat `correct_index` atau kunci jawaban. Untuk memeriksa
jawaban:

```bash
curl -sS -X POST http://127.0.0.1:8080/api/open/quizzes/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{"questionId":"<question-id>","chosenIndex":0}'
```

## Koleksi Postman

Koleksi dan environment tersedia di `docs/postman/`:

- `aiko.postman_collection.json`
- `aiko-local.postman_environment.json`
- `aiko-prod.postman_environment.json`

Jalankan koleksi lokal:

```bash
./scripts/newman-run.sh
```

## Operasi dan backup

Periksa kesehatan lokal dan publik:

```bash
./scripts/healthcheck.sh
./scripts/cek-api.sh
```

Buat backup SQLite:

```bash
./scripts/backup-stb.sh
```

Backup disimpan di folder `backups/`, dengan maksimum tujuh file cadangan terbaru.
Script backup juga menghasilkan file database melalui API backup milik
`better-sqlite3`.

## Bukti uji

Ambil bukti dengan cara berikut pada instalasi STB atau lingkungan lokal:

1. Screenshot halaman `/api/docs/`.
2. Screenshot respons `GET /api/health` dari gateway dan domain publik.
3. Screenshot `docker compose ps` dan `docker stats --no-stream`.
4. Screenshot tes autentikasi:
   - endpoint terproteksi tanpa token menghasilkan `401 UNAUTHORIZED`;
   - path yang tidak ada menghasilkan `404 NOT_FOUND`;
   - child atau parent mengakses data milik akun lain menghasilkan
     `403 FORBIDDEN`.

Jalankan tes aplikasi:

```bash
cd core-service
npm test
```

## Batasan

- Penyimpanan memakai satu file SQLite pada volume Docker.
- Data demo dan akun yang tersedia adalah data uji, bukan data anak asli.
- Deployment STB dibatasi pada gateway, core-service, dan tunnel. Tidak ada frontend,
  database server terpisah, atau model AI pada stack STB.
- Kapasitas baterai, disk, dan memori STB perlu dipantau. Penambahan backup atau log
  dapat mengisi disk; script backup menyimpan tujuh file terbaru.
