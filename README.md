# GlowDigital — Landing Page Produk Digital (Frontend)

Frontend statis untuk GitHub Pages. Backend: Google Apps Script (REST API) + Google Sheets.

| Halaman | Isi |
|---|---|
| `index.html` | Landing page: hero & kartu modul slideshow, CTA berkilau, testimoni flip/menyala/popup, hitung mundur, FAQ, WhatsApp mengambang, kupu-kupu interaktif, checkout + pelacakan UTM |
| `admin.html` | Dashboard admin: laporan klik & konversi, link kampanye, pesanan, CRM kontak, WhatsApp & notifikasi (blast per batch), konten & cache, import & migrasi, pengaturan & keamanan |

## Mulai cepat
1. Pasang backend (`Kode.gs`, `Notifikasi.gs`, `CRM.gs`, `Migrasi.gs`, `appsscript.json`) → jalankan `setupAppEnvironment()` → Deploy Web App.
2. Isi URL `/exec` di **`js/config.js`** (satu-satunya konfigurasi frontend).
3. Push folder ini (yang berisi `index.html`) ke GitHub → Settings → Pages → `main` / `(root)`.

Langkah lengkap: **PANDUAN-INSTALASI.md**.

## Struktur
```
index.html · admin.html · README.md · PANDUAN-INSTALASI.md
css/  style.css (landing) · admin.css (dashboard)
js/   config.js · api.js · tracker.js · fx.js · butterfly.js · app.js · admin.js · demo-data.js (hanya dimuat di mode demo)
assets/ favicon.svg · og-image.jpg · img/ (ilustrasi bawaan — ganti lewat Google Sheets)
```

Mode demo aktif selama `GAS_URL` masih berisi `GANTI` — cukup buka `index.html` untuk pratinjau (dashboard demo: `demo` / `demo`).
Tidak ada token, sandi, atau kunci API di repo ini; semua rahasia ada di Script Properties Apps Script.
