# COPILOT INSTRUCTIONS: Projek `aiko` (LiterasiGizi)

Kerjakan implementasi secara bertahap satu fase per sesi, dari Fase 0 sampai Fase 13.
Gunakan bahasa teknis Inggris pada kode dan bahasa Indonesia ramah anak pada teks
user-facing. Ikuti keputusan teknologi, arsitektur, aturan keamanan, dan Acceptance
Criteria yang tercantum dalam brief proyek.

## Aturan inti

- Core-service tunggal menggunakan Node.js 20, Express, SQLite melalui
  `better-sqlite3`, Zod, JWT, bcryptjs, Pino, dan Jest.
- STB hanya menjalankan `gateway`, `core-service`, dan `tunnel` beserta volume SQLite.
- Semua kontainer wajib `restart: unless-stopped`, `mem_limit`, dan `cpus`.
- Rahasia hanya berasal dari `.env` dan tidak boleh di-commit.
- Database tidak dipublikasikan; akses publik hanya melalui Cloudflare Tunnel ke
  `gateway:80`.
- API publik dan pengguna harus memiliki rate limit; autentikasi pengguna memakai JWT
  dan kelompok lain memakai satu API key per grup.
- Layanan integrasi tidak dijalankan di STB.
- Tulis materi dan soal berbahasa Indonesia dengan hanya data uji.

Untuk detail endpoint, skema tabel, seed, testing, dokumentasi, dan operasional,
ikuti brief fase lengkap yang disampaikan pada tugas implementasi.
