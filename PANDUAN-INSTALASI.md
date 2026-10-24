# 📘 Panduan Instalasi — GlowDigital Landing Page (Full-Stack)

Landing page penjualan produk digital + dashboard admin, dengan **Google Apps Script sebagai REST API**, **Google Sheets sebagai database**, dan **frontend statis di GitHub Pages**.

> Ikuti urutan **Bagian A → B → C**. Bagian D–I dikerjakan setelah halaman sudah online.

---

## 0. Isi paket & gambaran sistem

| Berkas | Untuk apa | Ke mana |
|---|---|---|
| `Kode.gs` | Inti backend: router API, keamanan, cache, konten, klik, pesanan, laporan, setup | Editor Apps Script |
| `Notifikasi.gs` | WhatsApp (Fonnte) + Email, antrean, blast per batch, deteksi nomor WA | Editor Apps Script |
| `CRM.gs` | CRM kontak (nama · email · WA), tag, opt-out, import, gabung duplikat | Editor Apps Script |
| `Migrasi.gs` | Migrasi struktur database + import dari spreadsheet lama + data contoh | Editor Apps Script |
| `appsscript.json` | Manifest (zona waktu, izin, setelan Web App) | Editor Apps Script |
| `glowdigital-landing.zip` | Frontend: `index.html` (landing), `admin.html` (dashboard), `css/`, `js/`, `assets/` | GitHub Pages |
| `PANDUAN-INSTALASI.md` | Dokumen ini (salinannya juga ada di dalam ZIP) | Dibaca 🙂 |

```
 Pengunjung (HP/laptop)                    Pemilik (admin.html)
        │  fetch() JSON                            │  fetch() JSON + token
        ▼                                          ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  GitHub Pages — index.html · admin.html · css/ · js/ · assets/ │
 └──────────────────────────────┬───────────────────────────────┘
                                │  https://script.google.com/…/exec
 ┌──────────────────────────────▼───────────────────────────────┐
 │  Google Apps Script (REST API)                                │
 │  Kode.gs · Notifikasi.gs · CRM.gs · Migrasi.gs                │
 │  Script Properties (rahasia) · CacheService · Trigger 1 menit │
 └───────┬───────────────────────┬─────────────────┬────────────┘
         ▼                       ▼                 ▼
   Google Sheets            Google Drive      Fonnte (WA) / Gmail
   (konten, klik,           (gambar,          (notifikasi & blast)
    pesanan, CRM)            screenshot)
```

---

## A. Backend — Google Apps Script

### A1. Buat proyek
1. Buka **https://script.google.com** (login dengan akun Google pemilik usaha) → **Proyek baru**.
2. Klik judul "Proyek tanpa judul" → ganti menjadi **GlowDigital Landing API**.

### A2. Tempel 4 file kode + manifest
1. File `Kode.gs` sudah ada → hapus isinya → tempel seluruh isi **Kode.gs**.
2. Klik **＋ (Tambah file) → Skrip**, beri nama `Notifikasi` → tempel isi **Notifikasi.gs**. Ulangi untuk `CRM` dan `Migrasi`.
3. Klik **⚙️ Setelan Proyek** → centang **Tampilkan file manifes "appsscript.json" di editor** → kembali ke **Editor** → buka `appsscript.json` → ganti seluruh isinya dengan isi **appsscript.json** dari paket.
4. Tekan **💾 Simpan** (Ctrl+S).

### A3. Jalankan setup — SEKALI (aman diulang)
1. Di toolbar, pilih fungsi **`setupAppEnvironment`** → klik **▶ Jalankan**.
2. Muncul "Perlu otorisasi" → **Tinjau izin** → pilih akun → **Lanjutan** → **Buka GlowDigital Landing API (tidak aman)** → **Izinkan**.
   *(Peringatan ini normal untuk skrip buatan sendiri.)*
3. Buka **Log eksekusi**. Hasilnya kira-kira:

```
🚀 Menyiapkan GlowDigital Landing v1.0.0 …
🗂️ Skema: {"dibuat":["Produk","Konten",…],"kolomBaru":{},…}
🔐 LOGIN ADMIN (catat SEKARANG — hanya tampil sekali, wajib diganti setelah login pertama)
   Nama pengguna : admin
   Kata sandi    : Xy7…(14 karakter)
✅ Setup selesai.
   Spreadsheet : https://docs.google.com/spreadsheets/d/…
   Folder Drive: https://drive.google.com/drive/folders/…
```

4. **Catat kata sandi admin** di tempat aman. (Lupa? Jalankan fungsi `resetAksesAdmin()` → sandi baru muncul di log.)

Yang dibuat otomatis:
- Folder Drive **📁 GlowDigital Landing** berisi `🖼️ Gambar Produk`, `💬 Screenshot Testimoni`, `📤 Ekspor`, dan spreadsheet **🗃️ Database — GlowDigital Landing** dengan 18 tab (Produk, Konten, Keunggulan, Masalah, Solusi, Modul, Bonus, Testimoni, FAQ, KlikOrder, Pesanan, Pengaturan, AntrianNotif, BlastWA, CRM_Kontak, CRM_Interaksi, AppConfig, Log) + data contoh.
- Trigger **`tickMenit`** (tiap 1 menit: kirim antrean notifikasi, tulis buffer klik, hangatkan cache) dan **`saatSheetDiedit`** (edit di Sheets langsung tampil di landing page).
- Rahasia di **Script Properties**: `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASS_HASH`, `ADMIN_SALT`.

### A4. Deploy sebagai Web App
1. Klik **Terapkan (Deploy) → Deployment baru**.
2. ⚙️ Pilih jenis → **Aplikasi web**.
3. Isi: **Jalankan sebagai: Saya (Me)** · **Yang memiliki akses: Siapa saja (Anyone)**.
4. Klik **Terapkan** → **salin URL yang berakhiran `/exec`**.
5. Tes: buka `URL_EXEC?action=ping` di browser → harus tampil `{"success":true,…"siap":true}`.

> 🔁 **Setiap kali kode backend diubah:** Terapkan → **Kelola deployment** → ✏️ **Edit** → Versi: **Versi baru** → Terapkan. **Jangan** buat "Deployment baru" (URL akan berubah).

---

## B. Frontend — GitHub Pages

### B1. Ekstrak ZIP & isi konfigurasi
1. Ekstrak `glowdigital-landing.zip`. Anda mendapat folder **`glowdigital-landing`** berisi `index.html`, `admin.html`, `css/`, `js/`, `assets/`.
   **Folder inilah yang nanti di-`git init`** — jangan naik satu level, jangan masuk lebih dalam.
2. Buka `js/config.js` dengan Notepad/VS Code, ganti URL:

```js
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/ID_DEPLOYMENT_ANDA/exec',
  VERSI: '1.0.0'
};
```
> Selama masih berisi `GANTI`, halaman berjalan dalam **mode demo** (data contoh, tidak menyimpan apa pun). Dashboard demo: pengguna `demo`, sandi `demo`.

### B2. Pasang Git & identitas (sekali saja)
- Windows: unduh **https://git-scm.com/download/win** → install default → buka **PowerShell**. Mac: buka Terminal → `git --version`.
```bash
git --version
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### B3. Buat repository di GitHub
**github.com → ＋ → New repository** → nama mis. `glowdigital-landing` → **Public** → **jangan** centang README/.gitignore/license → **Create repository**.

### B4. Masuk ke folder yang BENAR lalu cek isinya
```powershell
cd "C:\Users\NAMA\Downloads\glowdigital-landing"
dir
```
✅ Harus terlihat `index.html`, `admin.html`, folder `css`, `js`, `assets` di daftar teratas.
❌ Kalau yang terlihat malah folder `glowdigital-landing` lagi → `cd glowdigital-landing` dulu.
⚠️ Jangan ada file `.gs` di folder ini (file backend tidak boleh ikut ke GitHub).

### B5. Kirim ke GitHub (jalankan satu per satu)
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/glowdigital-landing.git
git push -u origin main
```
- **Username**: username GitHub. **Password**: **Personal Access Token** (bukan sandi akun). Saat menempel token **layar tetap kosong — itu normal**.
- Buat token: **github.com/settings/tokens → Generate new token (classic)** → centang **repo** → Generate → salin (`ghp_…`, hanya tampil sekali).
- Sukses bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.
- ❗ Jangan pakai "Upload files" di web GitHub — struktur folder `css/` & `js/` bisa rusak.

### B6. Aktifkan GitHub Pages
Repo → **Settings → Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → **Save** → centang **Enforce HTTPS**. Tunggu 1–2 menit:
- Landing page: `https://USERNAME.github.io/glowdigital-landing/`
- Dashboard admin: `https://USERNAME.github.io/glowdigital-landing/admin.html` *(tidak ditautkan dari landing page — simpan sebagai bookmark)*

### B7. Update di kemudian hari
```bash
git add .
git commit -m "Perbarui tampilan"
git push
```
Halaman masih versi lama? Tekan **Ctrl+Shift+R**. Bila mengubah CSS/JS, naikkan angka `?v=1.0.0` di `index.html`/`admin.html` agar pengunjung langsung mendapat versi baru.

> 💡 Gambar pratinjau link (WhatsApp/Facebook): ganti `content="assets/og-image.jpg"` di `index.html` menjadi URL lengkap, mis. `https://USERNAME.github.io/glowdigital-landing/assets/og-image.jpg`.

---

## C. Langkah pertama setelah online

1. Buka `…/admin.html` → login `admin` + sandi dari log setup → **Pengaturan & Keamanan → Ganti Sandi** (min. 10 karakter, huruf + angka). Banner kuning hilang setelah diganti.
2. **Pengaturan & Keamanan → Link Akses Produk** → tempel link folder Google Drive produk (dikirim otomatis ke pembeli saat pesanan ditandai **Lunas**).
3. Isi **WA pemilik** & **Email pemilik** (notifikasi pesanan baru).
4. Buka Google Sheets (**Konten & Cache → Buka Google Sheets**) → sheet **Produk**: isi `WA_CS`, `LINK_PEMBAYARAN` (Lynk.id/Mayar/Midtrans/Xendit… — kosong = diarahkan ke WhatsApp), harga.
5. **Ganti semua konten contoh** (testimoni berlabel "(contoh)", angka statistik, jumlah pembeli) dengan data asli usaha Anda. Testimoni harus berasal dari pembeli sungguhan.
6. Uji: buka landing page dari HP → klik **Beli Sekarang** → isi form → pastikan pesanan muncul di menu **Pesanan** dan klik muncul di **Laporan Klik**.

---

## D. Mengelola konten di Google Sheets

| Sheet | Mengatur | Tips |
|---|---|---|
| **Produk** | Nama, harga normal & diskon, link pembayaran, WA CS, gambar hero (slideshow), lencana bulat, hitung mundur | Harga cukup angka: `149000`. Diskon kosong/tidak valid → hanya harga normal tampil |
| **Konten** | Semua teks: headline, sub-headline, judul seksi, penawaran, checkout, footer, kebijakan privasi, SEO | `*teks*` = **tebal**. Baris baru dalam sel: Alt+Enter |
| **Keunggulan** | 4 poin di bawah hero | Kolom Ikon = nama ikon dari fonts.google.com/icons (mis. `all_inclusive`) |
| **Masalah** | Kartu masalah | Warna: `merah` / `pink` / `kuning` |
| **Solusi** | Checklist (Tipe `POIN`) & kotak angka (Tipe `STAT`) | Warna STAT: `pink` / `hijau` / `kuning` / `gelap` |
| **Modul** | Kartu isi produk + **slideshow otomatis** | Kolom Gambar: satu link per baris (Alt+Enter) atau pisahkan dengan `\|` |
| **Bonus** | Daftar bonus di kartu harga | Status `Habis` → tampil dicoret (tidak hilang) |
| **Testimoni** | Kartu testimoni (flip otomatis, menyala saat disorot, popup lengkap) | Status `Sembunyi` → tidak tampil. Kolom Screenshot tampil di sisi belakang kartu |
| **FAQ** | Akordeon tanya-jawab | Kolom Tampil `TIDAK` untuk menyembunyikan |
| **Pengaturan** | Form checkout on/off, kupu-kupu, WA mengambang, cache, notifikasi | Lebih nyaman diubah dari dashboard |

**Gambar dari Google Drive:** unggah ke folder `🖼️ Gambar Produk` → klik kanan → **Bagikan → Siapa saja yang memiliki link** → **Salin link** → tempel ke sel. Link otomatis diubah menjadi gambar terkompres (ringan di HP).

**Hitung mundur:** isi `PROMO_BERAKHIR` (mis. `2026-12-31 23:59` WIB). Bila kosong/lewat, dipakai `PROMO_EVERGREEN_JAM` (hitung mundur pribadi per pengunjung, tidak diulang setelah habis). `0` = sembunyikan.

**Kapan perubahan tampil?** Langsung (trigger edit Sheets), paling lambat sesuai `CACHE_MENIT` (default 10 menit). Butuh seketika: dashboard → **Segarkan Cache**.

**Alur tombol beli** (`FORM_ORDER_AKTIF`):
- `YA` (bawaan): popup checkout (nama, WA, email opsional) → pesanan tersimpan + masuk CRM + notifikasi → diarahkan ke link pembayaran atau WhatsApp (pesan sudah berisi produk, harga, ID pesanan).
- `TIDAK`: sekali klik langsung ke `LINK_PEMBAYARAN`, atau WhatsApp CS bila link kosong.
Setiap klik tombol beli dicatat ke sheet **KlikOrder** sebelum pengunjung diarahkan.

---

## E. WhatsApp (Fonnte), Email, CRM & Blast

### E1. Setup Fonnte
1. Daftar di **fonnte.com** → **Device** → tambah nomor WA usaha → scan QR.
2. Salin **token** device.
3. Dashboard → **WhatsApp & Notifikasi → Konfigurasi** → tempel token → **Cek Perangkat** (harus `connect`) → **Kirim Tes WA** → nyalakan **Notifikasi WhatsApp** → **Simpan Konfigurasi**.
   Token disimpan di Script Properties dan hanya tampil tersamar (`ABCD••••••xyz`).

### E2. Email
Nyalakan **Notifikasi Email** → **Kirim Tes Email**. Kuota Gmail biasa ±100 email/hari (Workspace ±1.500) — sisa kuota tampil di layar.

### E3. Matriks notifikasi otomatis

| Kejadian | Penerima | Bawaan |
|---|---|---|
| Pesanan baru | Pembeli | WA ✅ Email ✅ |
| Pesanan baru | Pemilik (WA/Email pemilik) | WA ✅ Email ✅ |
| Pengingat pembayaran (setelah `PENGINGAT_BAYAR_JAM`, sekali) | Pembeli | WA ✅ |
| Lunas + link akses produk | Pembeli | WA ✅ Email ✅ |

Isi pesan bisa diubah (tombol **Ubah**) dengan variabel `{nama} {produk} {pesanan} {total} {linkBayar} {linkAkses} {brand}` dll. Pengiriman lewat **antrean**: tombol di landing page tetap instan; pesan terkirim dalam hitungan detik (atau ≤1 menit lewat trigger).

### E4. CRM Kontak
- Kontak masuk otomatis dari setiap pesanan (1 orang = 1 kontak walau order berkali-kali). Segmen **Pembeli** (pernah lunas) / **Prospek**.
- Kartu KPI bisa diklik sebagai filter: WA terverifikasi, email valid, belum dicek, opt-out, duplikat.
- Centang kontak → **Deteksi WA**, **Beri Tag**, **Blast ke Terpilih**, **Opt-out**, **Ekspor**.
- Klik nama → panel detail: ubah data (ditulis balik ke sheet Pesanan), tag, catatan, catat interaksi, timeline pesan terkirim.
- **Import CSV** (kolom `nama, email, wa, segmen, tag`) untuk kontak luar (webinar, marketplace). **Periksa Duplikat** → gabungkan.

### E5. Blast WhatsApp per batch
1. Tab **Blast** → pilih sasaran (CRM / Pesanan / tempel manual) → **Muat Penerima** → (opsional) **Deteksi Nomor WA**.
2. Tulis pesan (pakai `{nama}`), pilih batch **10 / 20 / 50** dan jeda (mis. `3-8` detik acak) → **Mulai Blast**.
3. Server mengirim 1 batch per menit walau halaman ditutup; bisa dipercepat dengan **Kirim Batch Berikutnya** / saklar **Otomatis**, dan dihentikan kapan saja.
- Kontak opt-out, nomor ganda & tidak valid otomatis dibuang. Tips anti-banned: mulai batch 10, jeda acak ≥5 detik, nomor yang sudah "hangat", hindari link sama ke ratusan orang dalam 1 jam.

> Batasan: pengiriman bergantung status perangkat Fonnte; balasan WA masuk tidak tercatat otomatis (butuh webhook Fonnte); fitur cek nomor WA tergantung paket Fonnte.

---

## F. Link kampanye & laporan

- **Link Kampanye** → pilih saluran (Facebook Ads, Instagram, TikTok, Google, Lynk.id, WhatsApp) → isi nama kampanye → **Salin** → pasang di iklan/bio. Klik `fbclid/gclid/ttclid` dari iklan juga dikenali tanpa UTM.
- **Laporan Klik**: klik hari ini vs kemarin, total periode vs periode sebelumnya, pesanan & konversi, omzet lunas, grafik harian, sumber traffic, tombol terlaris, jam ramai (untuk jadwal iklan), tabel klik terbaru dengan filter, **Unduh CSV** (pemisah `;` — langsung rapi di Excel Indonesia).
- Data diperbarui otomatis tiap ±30 detik saat dashboard terbuka (melambat saat Anda tidak aktif).

---

## G. Import data dari app/spreadsheet lama (migrasi)

1. Pastikan spreadsheet lama bisa dibuka akun Google yang sama dengan pemilik script (cukup akses lihat).
2. Dashboard → **Import & Migrasi** → tempel URL spreadsheet lama → pilih data (Produk, Konten, Testimoni, FAQ, Modul, Bonus, Pesanan, CRM; KlikOrder opsional) → **Pindai (Dry-run)** — tidak ada yang ditulis.
3. Periksa tabel hasil (ditambah/diperbarui/dilewati) & peringatan → **Jalankan Import**.
- Kolom dicocokkan per **nama header** (alias seperti `Name/Review/No WA/Order ID` dikenali). Nomor WA tetap diawali `0`, email di-lowercase, link Drive lama tetap dipakai.
- **Aman diulang** — tidak membuat data dobel. Konten yang sudah Anda ubah tidak ditimpa kecuali opsi **Timpa** dinyalakan; pesanan berstatus Baru diperbarui (delta sync).
- **Cutover:** import → cek → tepat sebelum pindah **import sekali lagi** → ganti link iklan/bio ke alamat baru → arsipkan deployment lama.
- **Struktur database** (versi baru app): tombol **Periksa & Perbarui Struktur** menambah sheet/kolom yang kurang di akhir tanpa menghapus data (bisa juga lewat fungsi `migrasiSkema()` di editor).

---

## H. Keamanan & rahasia

| Nilai | Disimpan di | Diisi oleh |
|---|---|---|
| `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASS_HASH`, `ADMIN_SALT` | Script Properties | Otomatis saat setup (sandi hanya tampil sekali di log) |
| `FONNTE_TOKEN` | Script Properties | Anda, lewat dashboard → Konfigurasi |
| `LINK_AKSES_PRODUK` | Script Properties | Anda, lewat dashboard → Pengaturan |
| `SPREADSHEET_ID`, `DRIVE_ROOT_FOLDER_ID`, `FOLDER_*` | Script Properties (+ catatan di sheet AppConfig) | Otomatis |
| URL `/exec` | `js/config.js` (publik, bukan rahasia) | Anda |

- Sandi tidak pernah disimpan — hanya hash + salt. Token sesi HMAC berlaku 12 jam.
- 5× salah sandi → login dikunci 15 menit.
- **Keluar dari semua perangkat**: dashboard → Pengaturan. Darurat: fungsi `rotasiSecretSesi()` (semua sesi berakhir) atau `resetAksesAdmin()`.
- Cadangan manual: Apps Script → ⚙️ Setelan Proyek → **Properti skrip**.
- ⚠️ Jangan menambah editor proyek Apps Script sembarangan (editor bisa melihat Script Properties) dan jangan membagikan spreadsheet database ke publik.
- Rotasi token Fonnte: buat token baru di Fonnte → simpan di dashboard → hapus token lama di Fonnte.

---

## I. Performa & kuota

- **Cache berlapis**: konten landing page di CacheService (dipecah otomatis bila >100 KB) + localStorage pengunjung (kunjungan ulang tampil instan). Laporan admin di-cache per versi data.
- **Pencatatan klik**: ditulis langsung (1× tulis); saat server sibuk, klik masuk buffer lalu ditulis sekaligus (batch) — tidak ada klik hilang saat iklan ramai.
- **Warmup 3 lapis**: (1) browser memanaskan server saat halaman dibuka, (2) trigger tiap menit menjaga cache tetap hangat, (3) data admin ikut dipanaskan bila admin aktif 30 menit terakhir. Ini menjamin cache siap, bukan menjamin mesin Google selalu "panas".
- **Kuota trigger**: akun Gmail ±90 menit/hari, Workspace ±6 jam/hari. `tickMenit` biasanya memakai ±10–20 menit/hari. Untuk menghemat: jalankan `matikanKeepWarm()` (antrean & buffer klik tetap diproses); nyalakan lagi dengan `nyalakanKeepWarm()`.
- **Cek kesehatan**: fungsi `cekPerforma()` atau dashboard → Pengaturan → **Status Sistem**.
- **Cadangan statis (opsional)**: dashboard → Konten → **Unduh konten.json** → simpan sebagai `data/konten.json` di repo. Dipakai otomatis bila server sedang sibuk saat pengunjung baru membuka halaman.

---

## Kendala umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Halaman tampil "Mode demo" | `GAS_URL` belum diisi | Isi `js/config.js` → push ulang |
| "Halaman belum bisa dimuat" | URL `/exec` salah / akses bukan "Anyone" | Cek `URL?action=ping`; deploy ulang dengan akses **Siapa saja** |
| Respons "Database belum disiapkan" | `setupAppEnvironment()` belum dijalankan | Jalankan dari editor |
| Perubahan kode backend tidak berefek | Belum deploy versi baru | Kelola deployment → Edit → Versi baru |
| Perubahan Sheets belum tampil | Cache | Dashboard → Segarkan Cache (atau tunggu ≤ CACHE_MENIT) |
| Gambar Drive tidak muncul | File belum dibagikan publik | Bagikan → "Siapa saja yang memiliki link" |
| Nomor WA kehilangan angka 0 | Diketik di kolom bukan teks | Kolom WA sudah diformat teks oleh setup; sistem juga menormalkan otomatis |
| Notifikasi menumpuk di antrean | Trigger mati / token salah / perangkat Fonnte putus | Jalankan `pasangTrigger()`, cek token & **Cek Perangkat** |
| "Cek nomor gagal" | Paket Fonnte tanpa fitur validate | Blast tetap bisa tanpa filter WA |
| Kuota email habis | Batas harian Gmail | Tunggu besok / pakai Workspace |
| Situs GitHub Pages 404 | `index.html` tidak di root repo | Lihat B4: push dari folder yang berisi `index.html` |
| CSS/JS tidak termuat | Upload lewat web GitHub merusak folder | Push ulang lewat terminal |
| Login admin dikunci | 5× salah sandi | Tunggu 15 menit atau `resetAksesAdmin()` |
| `Password authentication is not supported` | GitHub butuh token | Buat Personal Access Token (B5) |

---

## Hasil uji sebelum diserahkan

- **108 uji backend** di simulator Apps Script (Sheets tiruan yang meniru konversi angka/tanggal, Cache 100 KB, Properties 500 KB, Lock, Fonnte & Gmail palsu): setup idempoten, rahasia tidak bocor ke Sheets/log/respons, klik + buffer batch, order idempoten, anti-spam, laporan, notifikasi dikirim **di luar lock**, fallback Fonnte, blast per batch, deteksi WA, CRM (sinkron, tag, opt-out, import, gabung), migrasi skema & import dry-run/delta.
- **54 uji end-to-end di Chromium** (ponsel & desktop): render dari Sheets, slideshow hero & modul, testimoni flip/menyala/popup, lightbox, FAQ, bar beli, checkout → pesanan tersimpan → diarahkan ke WhatsApp, kupu-kupu mengikuti & hinggap, chat WA mengambang, login/laporan/CSV/pesanan/CRM/konfigurasi WA/blast/antrean/konten/migrasi/ganti sandi, tanpa error JavaScript & tanpa scroll horizontal di ponsel.
- Uji dilakukan di simulator; perilaku Google asli (kecepatan, kuota) bisa sedikit berbeda.
