const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

db.exec(fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8'));

const modules = [
  ['mengenal-kelompok-makanan','Mengenal Kelompok Makanan','jajanan',1,2,1,'Kenali lima kelompok makanan untuk tubuh sehat.', '# Mengenal Kelompok Makanan\n\nTubuh kita memakai makanan sebagai bahan bakar. Kita perlu makanan beragam: makanan pokok, lauk, sayur, buah, dan susu sesuai kebutuhan.'],
  ['sayur-buah-setiap-hari','Sayur dan Buah Setiap Hari','sayur-buah',1,6,2,'Sayur dan buah memberi vitamin untuk tumbuh sehat.', '# Sayur dan Buah\n\nCobalah makan beragam warna sayur dan buah setiap hari. Bagi piringmu agar separuh berisi sayur dan buah.'],
  ['protein-hebat','Sumber Protein Hebat','protein',2,6,3,'Protein membantu membangun otot dan memperbaiki tubuh.', '# Protein Hebat\n\nTelur, ikan, tahu, tempe, kacang, dan ayam adalah sumber protein. Pilih variasi agar tubuh mendapat nutrisi lengkap.'],
  ['air-putih-sahabatku','Air Putih Sahabatku','air-putih',1,6,4,'Air putih menjaga tubuh tetap segar dan sehat.', '# Air Putih\n\nBawa botol air dan minum saat haus. Air putih tidak menambah gula pada tubuhmu.'],
  ['awas-minuman-manis','Awas Minuman Manis','minuman-manis',3,6,5,'Pahami gula pada minuman agar pilihanmu sehat.', '# Minuman Manis\n\nMinuman manis memberi banyak gula. Pilih air putih atau susu rendah gula sebagai pilihan sehari-hari.'],
  ['membaca-label-gizi','Membaca Label Gizi','label-gizi',5,6,6,'Label gizi membantu memilih makanan yang tepat.', '# Membaca Label Gizi\n\nLihat takaran saji, gula, garam, dan lemak pada label. Bandingkan produk memakai ukuran takaran yang sama.']
];

for (const [slug,title,topic,gradeMin,gradeMax,position,summary,contentMd] of modules) {
  const id = `mod_${slug}`;
  db.prepare(`INSERT INTO modules (id,slug,title,topic,grade_min,grade_max,position,summary,content_md,source_ref,is_active)
    VALUES (?,?,?,?,?,?,?,?,?,?,1)
    ON CONFLICT(slug) DO UPDATE SET title=excluded.title,topic=excluded.topic,grade_min=excluded.grade_min,
    grade_max=excluded.grade_max,position=excluded.position,summary=excluded.summary,content_md=excluded.content_md,
    source_ref=excluded.source_ref`).run(id,slug,title,topic,gradeMin,gradeMax,position,summary,contentMd,'Permenkes 41/2014');
}

const questionTemplates = {
  'mengenal-kelompok-makanan': [
    ['Nasi termasuk kelompok makanan apa?', ['Makanan pokok','Buah','Minuman manis'],0,1,'Nasi memberi energi sebagai makanan pokok.'],
    ['Mana yang termasuk lauk?', ['Ikan','Apel','Air'],0,2,'Ikan adalah lauk yang kaya protein.'],
    ['Kelompok mana yang membantu melancarkan pencernaan?', ['Sayur dan buah','Permen','Minuman soda'],0,1,'Sayur dan buah mengandung serat.'],
    ['Apa makanan yang sebaiknya bervariasi tiap hari?', ['Satu jenis saja','Beragam kelompok','Hanya camilan'],1,2,'Tubuh membutuhkan beragam nutrisi.'],
    ['Mana pilihan bekal paling seimbang?', ['Nasi, telur, sayur, buah','Permen dan soda','Keripik saja'],0,3,'Bekal seimbang punya makanan pokok, lauk, sayur, dan buah.'],
    ['Minuman sehat untuk makan adalah?', ['Air putih','Minuman bersoda','Minuman sangat manis'],0,1,'Air putih menjaga tubuh tanpa tambahan gula.']
  ],
  'sayur-buah-setiap-hari': [
    ['Apa manfaat sayur dan buah?', ['Memberi vitamin','Menghilangkan tidur','Membuat rumah'],0,1,'Sayur dan buah memberi vitamin dan serat.'],
    ['Berapa warna sayur yang bagus dicoba?', ['Beragam warna','Satu warna saja','Tidak perlu warna'],0,2,'Beragam warna memberi beragam nutrisi.'],
    ['Mana buah yang bisa dipilih?', ['Jeruk','Soda','Permen'],0,1,'Jeruk adalah buah yang segar.'],
    ['Kapan buah boleh dimakan?', ['Sebagai bagian makan atau camilan','Tidak pernah','Hanya malam'],0,2,'Buah bisa menjadi camilan atau bagian makan.'],
    ['Setengah piring ideal berisi?', ['Sayur dan buah','Kue','Minuman manis'],0,2,'Separuh piring sayur dan buah membantu makan beragam.'],
    ['Pilihan sayur hijau adalah?', ['Bayam','Permen','Kerupuk'],0,3,'Bayam adalah sayur hijau kaya nutrisi.']
  ],
  'protein-hebat': [
    ['Apa manfaat protein?', ['Membantu membangun tubuh','Menghapus rasa haus','Mengubah warna rambut'],0,1,'Protein membantu tubuh tumbuh dan memperbaiki sel.'],
    ['Mana sumber protein nabati?', ['Tempe','Apel','Air putih'],0,1,'Tempe dibuat dari kacang kedelai.'],
    ['Mana sumber protein hewani?', ['Ikan','Roti putih','Lettuce'],0,2,'Ikan mengandung protein untuk tubuh.'],
    ['Telur cocok sebagai?', ['Lauk','Minuman manis','Permen'],0,1,'Telur bisa menjadi lauk bergizi.'],
    ['Mengkonsumsi protein sebaiknya?', ['Beragam sumber','Satu sumber saja','Tidak pernah'],0,3,'Beragam sumber protein memberi nutrisi lebih lengkap.'],
    ['Mana pilihan rendah pemanis untuk bekal?', ['Ayam panggang','Permen','Soda'],0,2,'Ayam panggang dapat menjadi lauk tanpa pemanis berlebih.']
  ],
  'air-putih-sahabatku': [
    ['Minuman paling baik saat haus?', ['Air putih','Soda','Sirup manis'],0,1,'Air putih memenuhi kebutuhan cairan tanpa gula tambahan.'],
    ['Apa yang dibawa ke sekolah?', ['Botol air putih','Botol soda','Jus sangat manis'],0,1,'Bawa botol air agar mudah minum saat haus.'],
    ['Air putih membantu?', ['Menjaga tubuh segar','Membuat energi hilang','Mengurangi tidur'],0,2,'Tubuh membutuhkan air untuk bekerja baik.'],
    ['Saat berolahraga sebaiknya minum?', ['Air putih','Minuman bersoda','Sirup pekat'],0,2,'Air putih cocok untuk mengganti cairan saat berolahraga.'],
    ['Mana yang tidak ada gula tambahan?', ['Air putih','Teh sangat manis','Minuman ringan'],0,3,'Air putih tidak memiliki gula tambahan.'],
    ['Berapa botol air yang aman dibawa?', ['Sesuai kebutuhan','Sepuluh tanpa minum','Tidak perlu'],0,1,'Bawa cukup air sesuai kebutuhan harimu.']
  ],
  'awas-minuman-manis': [
    ['Mana minuman yang paling sedikit gula?', ['Air putih','Soda','Minuman sirup'],0,1,'Air putih tidak mengandung gula tambahan.'],
    ['Minuman manis berlebih dapat?', ['Menambah gula pada tubuh','Menambah air putih','Menguatkan tulang'],0,2,'Gula berlebih tidak baik jika sering diminum.'],
    ['Label gula tinggi sebaiknya?', ['Hati-hati memilih','Diminum tanpa batas','Tidak dibaca'],0,2,'Baca label untuk mengetahui kadar gula.'],
    ['Pilihan minuman sehat saat makan?', ['Air putih','Soda','Minuman gula pekat'],0,1,'Air putih adalah pilihan paling sederhana.'],
    ['Teh tanpa gula termasuk?', ['Lebih sedikit gula','Lebih banyak gula','Tanpa air'],0,3,'Teh tanpa gula menghindari gula tambahan.'],
    ['Sebaiknya minuman manis?', ['Jarang diminum','Setiap jam','Tidak terbatas'],0,2,'Minuman manis sebaiknya jarang dan dalam jumlah wajar.']
  ],
  'membaca-label-gizi': [
    ['Apa yang dilihat pertama pada label?', ['Takaran saji','Nama guru','Hari lahir'],0,1,'Takaran saji menunjukkan jumlah untuk satu kali makan.'],
    ['Untuk membandingkan gula, gunakan?', ['Ukuran takaran sama','Gambar kemasan','Harga saja'],0,2,'Bandingkan dengan takaran yang sama agar adil.'],
    ['Informasi gizi terdapat pada?', ['Label kemasan','Bendera','Peta'],0,1,'Informasi gizi dicantumkan pada kemasan.'],
    ['Gula yang terlalu banyak sebaiknya?', ['Dibatasi','Diminum banyak','Diabaikan'],0,2,'Batasi makanan dan minuman tinggi gula.'],
    ['Apa arti keterangan rendah gula?', ['Gula tidak terlalu banyak','Tidak ada kemasan','Label palsu'],0,3,'Keterangan rendah gula membantu memilih yang lebih sedikit.'],
    ['Sebelum membeli camilan, kita perlu?', ['Membaca label','Membuka semua bungkus','Menebak rasa'],0,2,'Membaca label membantu membuat pilihan yang bijak.']
  ]
};

for (const [slug, questions] of Object.entries(questionTemplates)) {
  const module = db.prepare('SELECT id FROM modules WHERE slug=?').get(slug);
  questions.forEach(([text, options, correctIndex, difficulty, explanation], index) => {
    const id = `q_${slug}_${index + 1}`;
    db.prepare(`INSERT INTO questions (id,module_id,topic,text,options_json,correct_index,difficulty,explanation,image_url,source)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET text=excluded.text,options_json=excluded.options_json,
      correct_index=excluded.correct_index,difficulty=excluded.difficulty,explanation=excluded.explanation`)
      .run(id,module.id,db.prepare('SELECT topic FROM modules WHERE id=?').get(module.id).topic,text,
        JSON.stringify(options),correctIndex,difficulty,explanation,null,'bank');
  });
}

const badges = [
  ['first_quiz','Langkah Pertama','Selesaikan kuis pertama','{"quizCompleted":true}'],
  ['perfect_score','Skor Sempurna','Raih skor 100','{"score":100}'],
  ['streak_3','Tiga Hari Hebat','Selesaikan kuis tiga hari berturut-turut','{"days":3}'],
  ['water_hero','Pahlawan Air','Lulus modul Air Putih','{"topic":"air-putih"}'],
  ['sugar_detective','Detektif Gula','Lulus modul Minuman Manis','{"topic":"minuman-manis"}'],
  ['veggie_star','Bintang Sayur','Lulus modul Sayur dan Buah','{"topic":"sayur-buah"}'],
  ['level_5','Petualang Level 5','Capai level 5','{"level":5}'],
  ['all_modules','Juara Literasi Gizi','Selesaikan semua modul','{"allModules":true}']
];
for (const [code,name,description,rule] of badges) {
  db.prepare(`INSERT INTO badges (id,code,name,description,rule_json) VALUES (?,?,?,?,?)
    ON CONFLICT(code) DO UPDATE SET name=excluded.name,description=excluded.description,rule_json=excluded.rule_json`)
    .run(`badge_${code}`,code,name,description,rule);
}

const demoEmail = 'demo.parent@aiko.test';
let demoParent = db.prepare('SELECT * FROM users WHERE email=?').get(demoEmail);
if (!demoParent) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id,email,password_hash,role,consent_given,consent_at,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id,demoEmail,bcrypt.hashSync('Demo12345!',10),'parent',1,now,now);
  demoParent = db.prepare('SELECT * FROM users WHERE email=?').get(demoEmail);
}

let demoKid = db.prepare('SELECT * FROM players WHERE username=?').get('demo_kid');
if (!demoKid) {
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO players (id,parent_id,display_name,username,pin_hash,grade,daily_limit_minutes,avatar,share_progress,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,demoParent.id,'Demo Anak','demo_kid',bcrypt.hashSync('1234',10),3,15,null,1,new Date().toISOString());
  demoKid = db.prepare('SELECT * FROM players WHERE username=?').get('demo_kid');
  const gradeModules = db.prepare('SELECT id FROM modules WHERE is_active=1 AND grade_min<=3 AND grade_max>=3 ORDER BY position').all();
  gradeModules.forEach((module,index) => {
    db.prepare('INSERT OR IGNORE INTO player_modules (player_id,module_id,status,best_score) VALUES (?,?,?,0)')
      .run(demoKid.id,module.id,index === 0 ? 'berjalan' : 'terkunci');
  });
}

const demoKeyName = 'Kelompok Demo';
let demoKey = db.prepare('SELECT * FROM api_keys WHERE group_name=?').get(demoKeyName);
if (!demoKey) {
  const raw = `aiko_demo_${crypto.randomBytes(12).toString('hex')}`;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO api_keys (id,group_name,key_hash,prefix,active,created_at,request_count) VALUES (?,?,?,?,?,?,0)')
    .run(id,demoKeyName,crypto.createHash('sha256').update(raw).digest('hex'),raw.slice(0,8),1,new Date().toISOString());
  process.stdout.write(`DEMO_API_KEY=${raw}\n`);
}

process.stdout.write('Seed LiterasiGizi selesai\n');
db.close();
