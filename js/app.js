/**
 * App landing page — merender konten dari Google Sheets (via GAS) + semua interaksi:
 * hero & kartu modul slideshow, CTA berkilau, testimoni flip/glow/popup, penawaran
 * dengan hitung mundur, FAQ, WhatsApp mengambang, checkout & pelacakan klik.
 */
(function () {
  'use strict';
  var Api = window.Api, Fx = window.Fx, Tracker = window.Tracker;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var K = null, sliders = [], flipT = 0, cdStop = null, pembuka = null, tombolAktif = '';
  var VERSI = (window.APP_CONFIG && window.APP_CONFIG.VERSI) || '1';

  // ======================================================================
  // UTILITAS
  // ======================================================================
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s) { return esc(s).replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
  function rp(n) { return 'Rp ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function ik(n, cls) { return '<span class="ms' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(String(n || '').replace(/[^a-z0-9_]/gi, '').toLowerCase()) + '</span>'; }
  function src(u) { u = String(u || ''); return /^https:\/\//i.test(u) || /^assets\/[\w\-./]+$/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)[:/]/i.test(u) ? u : ''; }
  function t(kode, ganti) { var s = (K.teks && K.teks[kode]) || ''; if (ganti) Object.keys(ganti).forEach(function (k) { s = s.split('{' + k + '}').join(ganti[k]); }); return s; }
  function inisial(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  var WARNA = ['#d6316d', '#b40f55', '#a16900', '#E8407A', '#8f0041', '#c2410c'];
  function waUrl(teks) { return 'https://wa.me/' + K.produk.wa62 + (teks ? '?text=' + encodeURIComponent(teks) : ''); }
  function pesanOrder(id, nama) {
    var tpl = K.produk.pesanWa || 'Halo Admin, saya mau order *{produk}* seharga *{harga}*.\nID Pesanan: {pesanan}\nNama: {nama}';
    return tpl.replace(/\{produk\}/g, K.produk.nama).replace(/\{harga\}/g, rp(K.produk.harga)).replace(/\{pesanan\}/g, id || '-').replace(/\{nama\}/g, nama || '');
  }
  function acakId(n) { var h = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', a = new Uint8Array(n), s = ''; crypto.getRandomValues(a); for (var i = 0; i < n; i++) s += h[a[i] % h.length]; return s; }
  function toast(msg, err) { var el = $('#toast'); el.textContent = msg; el.className = 'toast on' + (err ? ' err' : ''); clearTimeout(el._t); el._t = setTimeout(function () { el.className = 'toast'; }, 3600); }
  function muatScript(u) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = u; s.onload = ok; s.onerror = function () { no(new Error('Gagal memuat ' + u)); }; document.head.appendChild(s); }); }
  function sidik(o) { try { var c = JSON.parse(JSON.stringify(o)); delete c.dibuat; return JSON.stringify(c); } catch (e) { return ''; } }
  function bintang(n) { var s = ''; for (var i = 1; i <= 5; i++) s += ik('star', i > n ? 'kosong' : ''); return '<div class="bintang" role="img" aria-label="Rating ' + n + ' dari 5">' + s + '</div>'; }

  function slideshow(imgs, o) {
    o = o || {};
    if (!imgs || !imgs.length) return '<div class="sl"><div class="sl-ikon">' + ik(o.ikon || 'image') + '</div></div>';
    var items = imgs.map(function (u, i) {
      var a = esc(o.alt + (imgs.length > 1 ? ' — gambar ' + (i + 1) : ''));
      return '<div class="sl-item"><img ' + (i === 0 ? 'src="' + esc(u) + '"' + (o.eager ? ' fetchpriority="high"' : ' loading="lazy"') : 'data-src="' + esc(u) + '"') + ' alt="' + a + '" decoding="async"></div>';
    }).join('');
    var dots = imgs.length > 1 ? '<div class="sl-dots">' + imgs.map(function (u, i) { return '<button type="button" class="sl-dot" aria-label="Gambar ' + (i + 1) + '"></button>'; }).join('') + '</div>' : '';
    var nav = imgs.length > 1 && o.nav ? '<button type="button" class="sl-nav sl-prev" aria-label="Gambar sebelumnya">' + ik('chevron_left') + '</button><button type="button" class="sl-nav sl-next" aria-label="Gambar berikutnya">' + ik('chevron_right') + '</button>' : '';
    return '<div class="sl' + (o.kb ? ' sl-kb' : '') + '" data-sl data-interval="' + (o.interval || 4200) + '">' + items + dots + nav + '</div>';
  }

  // ======================================================================
  // RENDER
  // ======================================================================
  function renderHero() {
    var P = K.produk, el = $('#overview');
    var hero = P.gambarHero && P.gambarHero.length ? P.gambarHero.map(src).filter(String) : ['assets/img/hero-1.svg'];
    var ava = (K.testimoni || []).slice(0, 3).map(function (x, i) { return '<span style="background:' + WARNA[i % WARNA.length] + '">' + esc(inisial(x.nama)) + '</span>'; }).join('');
    el.removeAttribute('aria-busy');
    el.innerHTML = '<div class="wrap hero-grid">' +
      '<div class="hero-teks">' +
        (t('HERO_BADGE') ? '<span class="pill" data-reveal>' + ik('auto_awesome', 'fill') + esc(t('HERO_BADGE')) + '</span>' : '') +
        '<h1 class="h-xl" data-reveal data-reveal-delay="80">' + esc(t('HERO_JUDUL')) + ' <span class="sorot">' + esc(t('HERO_JUDUL_SOROT')) + '</span></h1>' +
        '<p class="lead" data-reveal data-reveal-delay="160">' + fmt(t('HERO_SUB') || P.deskripsi) + '</p>' +
        '<div class="hero-cta" data-reveal data-reveal-delay="240">' +
          '<button class="btn btn-primary btn-lg" data-buy="hero" data-kupu data-magnet><span>' + esc(t('HERO_CTA_UTAMA') || 'Beli Sekarang') + '</span>' + ik('arrow_forward') + '</button>' +
          '<a class="btn btn-ghost btn-lg" href="#modul" data-magnet><span>' + esc(t('HERO_CTA_KEDUA') || 'Lihat Isi Produk') + '</span>' + ik('inventory_2') + '</a>' +
        '</div>' +
        (t('HERO_BUKTI') ? '<div class="bukti" data-reveal data-reveal-delay="320">' + (ava ? '<div class="ava-stack" aria-hidden="true">' + ava + '</div>' : '') + '<p style="margin:0">' + fmt(t('HERO_BUKTI', { jumlah: P.jumlahPembeli })) + '</p></div>' : '') +
      '</div>' +
      '<div class="hero-visual" data-reveal="zoom" data-reveal-delay="120">' +
        '<div class="hero-halo"></div>' +
        '<div class="hero-frame">' + slideshow(hero, { kb: true, eager: true, nav: true, alt: P.nama, interval: 4600 }) +
          (P.tagHero ? '<span class="tag-hero"><i class="titik-hidup"></i>' + esc(P.tagHero) + '</span>' : '') + '</div>' +
        (P.lencanaAngka ? '<div class="lencana" aria-label="' + esc(P.lencanaAngka + ' ' + P.lencanaTeks) + '"><div>' + ik(P.lencanaIkon || 'verified', 'fill') + '<b>' + esc(P.lencanaAngka) + '</b><small>' + esc(P.lencanaTeks) + '</small></div></div>' : '') +
      '</div></div>';
  }

  function renderTrust() {
    var el = $('#trust');
    if (!K.keunggulan.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="wrap"><div class="trust-bar" data-reveal>' + K.keunggulan.map(function (x) {
      return '<div class="trust-item"><span class="trust-ikon">' + ik(x.ikon) + '</span><div><h3>' + esc(x.judul) + '</h3><p>' + esc(x.deskripsi) + '</p></div></div>';
    }).join('') + '</div></div>';
  }

  function kepala(label, judul, sub, kiri) {
    return '<div class="sec-head' + (kiri ? ' kiri' : '') + '" data-reveal>' + (label ? '<span class="eyebrow">' + esc(label) + '</span>' : '') + '<h2 class="h-lg">' + esc(judul) + '</h2>' + (sub ? '<p class="lead" style="margin:0">' + fmt(sub) + '</p>' : '') + '</div>';
  }

  function renderMasalah() {
    var el = $('#masalah');
    if (!K.masalah.length) { el.hidden = true; return; } el.hidden = false;
    el.innerHTML = '<div class="wrap">' + kepala(t('PROBLEM_LABEL'), t('PROBLEM_JUDUL'), t('PROBLEM_SUB')) +
      '<div class="grid-3">' + K.masalah.map(function (x, i) {
        return '<article class="card p-card w-' + esc(x.warna) + '" data-reveal data-reveal-delay="' + i * 90 + '"><span class="p-ikon">' + ik(x.ikon) + '</span><h3 class="h-md">' + esc(x.judul) + '</h3><p>' + fmt(x.deskripsi) + '</p></article>';
      }).join('') + '</div></div>';
  }

  function renderSolusi() {
    var el = $('#solusi'), S = K.solusi;
    el.innerHTML = '<div class="wrap sol-grid">' +
      '<div style="display:grid;gap:14px;justify-items:start">' +
        (t('SOLUSI_LABEL') ? '<span class="pill" data-reveal style="font-size:12px;letter-spacing:.08em;text-transform:uppercase">' + esc(t('SOLUSI_LABEL')) + '</span>' : '') +
        '<h2 class="h-lg" data-reveal>' + esc(t('SOLUSI_JUDUL')) + '</h2>' +
        '<p class="lead" data-reveal style="margin:0">' + fmt(t('SOLUSI_SUB')) + '</p>' +
        '<div class="cek">' + S.poin.map(function (x, i) {
          return '<div class="cek-item" data-reveal="kiri" data-reveal-delay="' + i * 90 + '"><span class="cek-ikon">' + ik('check') + '</span><span><strong>' + esc(x.judul) + (x.deskripsi ? ':' : '') + '</strong> ' + esc(x.deskripsi) + '</span></div>';
        }).join('') + '</div>' +
      '</div>' +
      (S.stat.length ? '<div class="bento" data-reveal="zoom">' + S.stat.map(function (x) {
        return '<div class="stat c-' + esc(x.warna) + '"><b data-count="' + esc(x.nilai) + '">' + esc(x.nilai) + '</b><span class="t">' + esc(x.judul) + '</span><span class="d">' + esc(x.deskripsi) + '</span></div>';
      }).join('') + '</div>' : '') +
      '</div>';
  }

  function renderModul() {
    var el = $('#modul'), M = K.modul;
    if (!M.length) { el.hidden = true; return; } el.hidden = false;
    el.innerHTML = '<div class="wrap">' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px 40px;align-items:flex-end;justify-content:space-between;margin-bottom:34px">' +
        '<div class="sec-head kiri" data-reveal style="margin:0"><span class="eyebrow">' + esc(t('MODUL_LABEL')) + '</span><h2 class="h-lg">' + esc(t('MODUL_JUDUL')) + '</h2></div>' +
        (t('MODUL_SUB') ? '<p class="lead" data-reveal style="margin:0;max-width:440px">' + fmt(t('MODUL_SUB')) + '</p>' : '') +
      '</div>' +
      '<div class="m-grid' + (M.length === 5 ? ' lima' : '') + '">' + M.map(function (x, i) {
        var g = (x.gambar || []).map(src).filter(String);
        return '<article class="m-card" data-spot data-tilt data-modul="' + i + '" tabindex="0" role="button" aria-label="Lihat sampel ' + esc(x.judul) + '" data-reveal data-reveal-delay="' + (i % 5) * 80 + '">' +
          '<div class="m-media">' + slideshow(g, { ikon: x.ikon, alt: x.judul, nav: true, interval: 3400 }) + (g.length > 1 ? '<span class="m-hit">' + ik('photo_library') + g.length + '</span>' : '') + '</div>' +
          '<div class="m-body"><span class="m-label">' + ik(x.ikon) + esc(x.label) + '</span><h3>' + esc(x.judul) + '</h3><p>' + fmt(x.deskripsi) + '</p></div>' +
          '<div class="m-link"><span>' + (g.length ? 'Lihat Sample' : 'Detail Modul') + '</span>' + ik('arrow_forward') + '</div></article>';
      }).join('') + '</div></div>';
  }

  function renderTesti() {
    var el = $('#testimoni'), T = K.testimoni;
    if (!T.length) { el.hidden = true; return; } el.hidden = false;
    el.innerHTML = '<div class="wrap">' + kepala(t('TESTI_LABEL'), t('TESTI_JUDUL'), t('TESTI_SUB')) +
      '<div class="t-track" id="tTrack">' + T.map(function (x, i) {
        var foto = src(x.foto), shot = src(x.screenshot);
        var ava = '<span class="ava" style="background:' + WARNA[i % WARNA.length] + '">' + (foto ? '<img src="' + esc(foto) + '" alt="" loading="lazy">' : esc(inisial(x.nama))) + '</span>';
        var kalimat = (String(x.ulasan).match(/^[\s\S]*?[.!?](?=\s|$)/) || [String(x.ulasan)])[0];
        var back = shot
          ? '<div class="t-shot"><img src="' + esc(shot) + '" alt="Bukti testimoni ' + esc(x.nama) + '" loading="lazy"></div><div class="t-back-isi">' + ik('verified', 'fill') + '<b>Bukti dari ' + esc(x.nama) + '</b><span class="t-back-tombol">' + ik('zoom_in') + 'Lihat lengkap</span></div>'
          : '<p class="t-back-kutip">“' + esc(kalimat.length > 140 ? kalimat.slice(0, 137) + '…' : kalimat) + '”</p><div class="t-back-isi">' + bintang(x.rating) + '<b>— ' + esc(x.nama) + '</b><span class="t-back-tombol">' + ik('open_in_full') + 'Baca lengkap</span></div>';
        return '<div class="t-card" data-testi="' + i + '" tabindex="0" role="button" aria-label="Baca testimoni lengkap dari ' + esc(x.nama) + '" data-reveal data-reveal-delay="' + (i % 3) * 100 + '">' +
          '<div class="t-inner"><div class="t-face t-front"><span class="t-hint">' + ik('360') + '</span>' + bintang(x.rating) +
          '<p class="t-kutip">' + esc(x.ulasan) + '</p><div class="t-orang">' + ava + '<div><b>' + esc(x.nama) + '</b><small>' + esc(x.ket) + '</small></div></div></div>' +
          '<div class="t-face t-back">' + back + '</div></div></div>';
      }).join('') + '</div>' +
      '<div class="t-nav" id="tNav" aria-hidden="true">' + T.map(function (x, i) { return '<span' + (i ? '' : ' class="aktif"') + '></span>'; }).join('') + '</div>' +
      '</div>';
  }

  function akhirPromo() {
    var P = K.produk, now = Date.now();
    if (P.promoBerakhir) { var a = Date.parse(P.promoBerakhir); if (a > now) return a; }
    if (P.promoEvergreenJam > 0) {
      var k = 'promo_' + P.promoEvergreenJam, v = Api.lokal.get(k);
      if (!v) { v = now + P.promoEvergreenJam * 3600e3; Api.lokal.set(k, v); }
      return v > now ? v : 0;
    }
    return 0;
  }

  function renderOffer() {
    var P = K.produk, el = $('#penawaran');
    var judul = P.hemat ? t('OFFER_JUDUL', { hemat: P.hemat }) : 'Miliki ' + P.nama + ' Sekarang';
    var sub = t('OFFER_SUB', { kuota: P.kuotaPromo || '-', hargaNormal: rp(P.hargaNormal || P.harga) });
    if (!P.hemat) sub = t('OFFER_CATATAN');
    var akhir = akhirPromo();
    var cd = akhir ? '<div data-reveal><div class="cd-label">Promo berakhir dalam:</div><div class="cd" id="cd" role="timer" aria-live="off">' +
      ['hari', 'jam', 'menit', 'detik'].map(function (u, i) { return (i ? '<span class="cd-sep" aria-hidden="true">:</span>' : '') + '<div class="cd-box"><b data-u="' + u + '">00</b><span>' + u + '</span></div>'; }).join('') + '</div></div>' : '';
    el.innerHTML = '<div class="wrap"><div class="offer" data-reveal="zoom"><div class="offer-grid">' +
      '<div style="display:grid;gap:16px;justify-items:start">' +
        (t('OFFER_BADGE') ? '<span class="pill-kaca">' + ik('local_fire_department', 'fill') + esc(t('OFFER_BADGE')) + '</span>' : '') +
        '<h2 class="h-xl" style="font-size:clamp(30px,5.4vw,48px)">' + esc(judul) + '</h2>' +
        '<p class="lead" style="margin:0">' + fmt(sub) + '</p>' + cd +
      '</div>' +
      '<div class="harga-card">' +
        '<div class="harga-atas"><span class="eyebrow">' + esc(t('OFFER_KARTU_LABEL') || 'AKSES LENGKAP') + '</span>' + (P.hemat ? '<span class="chip-hemat">HEMAT ' + P.hemat + '%</span>' : '') + '</div>' +
        '<div class="harga">' + (P.hargaDiskon ? '<s>' + rp(P.hargaNormal) + '</s>' : '') + '<b id="hargaUtama" data-dari="' + (P.hargaNormal || P.harga) + '">' + (P.harga ? rp(P.harga) : 'Hubungi CS') + '</b></div>' +
        (t('OFFER_CATATAN') ? '<p class="muted" style="margin:0;font-size:14px">' + fmt(t('OFFER_CATATAN')) + '</p>' : '') +
        (K.bonus.length ? '<ul class="bonus">' + K.bonus.map(function (b) {
          return '<li class="' + (b.habis ? 'habis' : '') + '">' + ik(b.habis ? 'block' : 'check_circle') + '<span class="nm">' + esc(b.nama) + (b.nilai ? '<small>Senilai ' + rp(b.nilai) + '</small>' : (b.nilaiTeks ? '<small>' + esc(b.nilaiTeks) + '</small>' : '')) + '</span><span class="st ' + (b.habis ? 'st-habis' : 'st-ok') + '">' + (b.habis ? 'Habis' : 'Tersedia') + '</span></li>';
        }).join('') + '</ul>' : '<div style="height:18px"></div>') +
        '<button class="btn btn-primary btn-lg btn-block" data-buy="offer" data-kupu><span>' + esc(t('OFFER_CTA') || 'Beli Sekarang') + '</span>' + ik('arrow_forward') + '</button>' +
        (t('OFFER_JAMINAN') ? '<p class="aman">' + ik('lock', 'fill') + esc(t('OFFER_JAMINAN')) + '</p>' : '') +
      '</div></div></div></div>';
    if (cdStop) cdStop();
    if (akhir) {
      var box = {}; $$('#cd [data-u]').forEach(function (b) { box[b.dataset.u] = b; });
      cdStop = Fx.countdown(akhir, function (w) { ['hari', 'jam', 'menit', 'detik'].forEach(function (u) { var v = ('0' + w[u]).slice(-2); if (box[u].textContent !== v) box[u].textContent = v; }); }, function () { var c = $('#cd'); if (c) c.parentNode.style.display = 'none'; });
    }
  }

  function renderFaq() {
    var el = $('#faq');
    if (!K.faq.length) { el.hidden = true; return; } el.hidden = false;
    el.innerHTML = '<div class="wrap">' + kepala(t('FAQ_LABEL'), t('FAQ_JUDUL'), t('FAQ_SUB')) + '<div class="faq">' + K.faq.map(function (x, i) {
      return '<div class="faq-item" data-reveal data-reveal-delay="' + i * 60 + '"><button class="faq-q" aria-expanded="false" aria-controls="faqA' + i + '" id="faqQ' + i + '"><span>' + esc(x.q) + '</span>' + ik('add') + '</button>' +
        '<div class="faq-a" id="faqA' + i + '" role="region" aria-labelledby="faqQ' + i + '"><div><p>' + fmt(x.a) + '</p></div></div></div>';
    }).join('') + '</div></div>';
  }

  function renderCs() {
    $('#cs').innerHTML = '<div class="wrap cs-in"><div><span class="cs-ikon">' + ik('forum', 'fill') + '</span><div><h3 class="h-md">' + esc(t('CS_JUDUL')) + '</h3><p class="muted" style="margin:2px 0 0;font-size:14px">' + fmt(t('CS_SUB')) + '</p></div></div>' +
      '<a class="btn btn-ghost" href="' + esc(waUrl('Halo, saya mau tanya tentang ' + K.produk.nama)) + '" target="_blank" rel="noopener" data-wa="cs_strip" data-magnet>' + esc(t('CS_TOMBOL') || 'Hubungi CS WhatsApp') + ik('open_in_new') + '</a></div>';
  }

  function renderFooter() {
    var brand = K.setelan.brand || 'GlowDigital';
    $('#footer').innerHTML = '<div class="wrap ftr-in"><span class="logo">' + $('.hdr .logo svg').outerHTML + '<span>' + esc(brand) + '</span></span>' +
      (t('FOOTER_TEKS') ? '<p class="muted" style="margin:0;max-width:520px">' + esc(t('FOOTER_TEKS')) + '</p>' : '') +
      '<div class="ftr-link"><button type="button" data-policy="KEBIJAKAN_PRIVASI">Kebijakan Privasi</button><button type="button" data-policy="SYARAT_KETENTUAN">Syarat & Ketentuan</button><a href="' + esc(waUrl()) + '" target="_blank" rel="noopener" data-wa="footer">WhatsApp CS ' + esc(K.produk.waCs) + '</a></div>' +
      '<small>© ' + new Date().getFullYear() + ' ' + esc(brand) + '. Semua hak dilindungi.</small></div>';
  }

  function renderBar() {
    var P = K.produk;
    $('#bar').innerHTML = '<div class="wrap bar-in"><div class="bar-info"><div><span class="eyebrow">' + esc(t('STICKY_LABEL') || 'Promo Spesial') + '</span><div class="bar-nama">' + esc(P.nama) + '</div></div>' +
      '<div class="bar-harga"><b>' + (P.harga ? rp(P.harga) : '') + '</b>' + (P.hargaDiskon ? '<s>' + rp(P.hargaNormal) + '</s>' : '') + '</div></div>' +
      '<button class="btn btn-primary" data-buy="sticky" data-kupu tabindex="-1"><span>Beli Sekarang</span>' + ik('bolt', 'fill') + '</button></div>';
  }

  function renderWa() {
    var el = $('#waFloat');
    if (!K.setelan.waMengambang || !K.produk.wa62) { el.innerHTML = ''; return; }
    el.innerHTML = '<button class="wa-btn" id="waBtn" aria-label="Chat WhatsApp dengan CS" aria-expanded="false">' + ik('chat', 'fill') + '<span class="wa-notif" id="waNotif">1</span></button>';
    $('#waBtn .ms').style.fontSize = '30px';
    var k = 'gd_wa_bubble';
    var sudah = false; try { sudah = sessionStorage.getItem(k); } catch (e) {}
    if (!sudah) setTimeout(function () {
      if ($('#waPanel') || !$('#waBtn')) return;
      var b = document.createElement('div'); b.className = 'wa-bubble'; b.id = 'waBubble';
      b.innerHTML = '<button type="button" aria-label="Tutup">' + ik('close') + '</button>' + esc((K.produk.sapaanWa || 'Halo kak 👋 Ada yang bisa kami bantu?').replace('{produk}', K.produk.nama));
      el.insertBefore(b, el.firstChild);
      b.querySelector('button').onclick = function (e) { e.stopPropagation(); b.remove(); };
      b.onclick = function () { b.remove(); bukaWaPanel(); };
      try { sessionStorage.setItem(k, '1'); } catch (e) {}
    }, 7000);
  }

  function renderSeo() {
    if (t('SEO_JUDUL')) document.title = t('SEO_JUDUL');
    var m = $('meta[name="description"]'); if (m && t('SEO_DESKRIPSI')) m.setAttribute('content', t('SEO_DESKRIPSI'));
    $$('[data-brand]').forEach(function (b) { b.textContent = K.setelan.brand || 'GlowDigital'; });
  }

  // ======================================================================
  // INTERAKSI SETELAH RENDER
  // ======================================================================
  function aktifkan() {
    sliders.forEach(function (s) { s.stop(); }); sliders = [];
    $$('[data-sl]').forEach(function (el, i) {
      var hero = !!el.closest('.hero');
      sliders.push(Fx.Slideshow(el, { interval: Number(el.dataset.interval) || 4200, mulaiSetelah: hero ? 0 : 600 + (i % 5) * 650 }));
    });
    Fx.reveal(); Fx.spotlight(); Fx.magnet();
    $$('.stat b[data-count]').forEach(function (b) { Fx.countUp(b); });
    var h = $('#hargaUtama'); if (h && K.produk.hargaDiskon) Fx.countUp(h, { dari: Number(h.dataset.dari), dur: 1600 });
    pasangFlip(); pasangNavTesti();
  }

  /** Testimoni: flip otomatis bergiliran (jeda saat kursor di atas kartu / tidak terlihat). */
  function pasangFlip() {
    clearInterval(flipT);
    if (Fx.reduce) return;
    var kartu = $$('.t-card'); if (!kartu.length) return;
    var i = 0, terlihat = false, sec = $('#testimoni');
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { terlihat = es[0].isIntersecting; }, { threshold: 0.25 }).observe(sec);
    kartu.forEach(function (c) {
      c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { c._hover = 1; c.classList.remove('is-flipped'); } });
      c.addEventListener('pointerleave', function () { c._hover = 0; });
    });
    flipT = setInterval(function () {
      if (!terlihat || document.hidden || $('#modal').classList.contains('buka')) return;
      var tr = $('#tTrack').getBoundingClientRect();
      var kandidat = kartu.filter(function (c) { var r = c.getBoundingClientRect(); return !c._hover && r.right > tr.left + 20 && r.left < tr.right - 20; });
      if (!kandidat.length) return;
      var c = kandidat[i++ % kandidat.length];
      c.classList.add('is-flipped', 'menyala');
      setTimeout(function () { c.classList.remove('is-flipped'); }, 3000);
      setTimeout(function () { c.classList.remove('menyala'); }, 3600);
    }, 3300);
  }
  function pasangNavTesti() {
    var tr = $('#tTrack'), dots = $$('#tNav span'); if (!tr || !dots.length) return;
    var raf = 0;
    tr.addEventListener('scroll', function () {
      if (raf) return; raf = requestAnimationFrame(function () {
        raf = 0; var c = $$('.t-card', tr), tengah = tr.scrollLeft + tr.clientWidth / 2, best = 0, jarak = Infinity;
        c.forEach(function (k, i) { var d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - tengah); if (d < jarak) { jarak = d; best = i; } });
        dots.forEach(function (d, i) { d.classList.toggle('aktif', i === best); });
      });
    }, { passive: true });
  }

  // ---------- header, nav aktif, bar bawah ----------
  function pasangHalaman() {
    var hdr = $('#hdr'), bar = $('#bar');
    var onScroll = function () { hdr.classList.toggle('scrolled', scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    var mb = $('#menuBtn'), mn = $('#mNav');
    mb.addEventListener('click', function () { var b = !mn.classList.contains('buka'); mn.classList.toggle('buka', b); mb.setAttribute('aria-expanded', String(b)); mb.innerHTML = ik(b ? 'close' : 'menu'); });
    $$('a', mn).forEach(function (a) { a.addEventListener('click', function () { mn.classList.remove('buka'); mb.setAttribute('aria-expanded', 'false'); mb.innerHTML = ik('menu'); }); });
    if (!('IntersectionObserver' in window)) { bar.classList.add('tampil'); return; }
    new IntersectionObserver(function (es) {
      var tampil = !es[0].isIntersecting;
      bar.classList.toggle('tampil', tampil); bar.setAttribute('aria-hidden', String(!tampil));
      var btn = $('button', bar); if (btn) btn.tabIndex = tampil ? 0 : -1;
      document.documentElement.style.setProperty('--bar', tampil ? bar.offsetHeight + 'px' : '0px');
    }, { threshold: 0 }).observe($('#overview'));
    var links = $$('.nav a');
    var ioNav = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('aktif', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['overview', 'modul', 'testimoni', 'penawaran', 'faq'].forEach(function (id) { var s = document.getElementById(id); if (s) ioNav.observe(s); });
  }

  // ======================================================================
  // MODAL (checkout, lightbox, testimoni, kebijakan)
  // ======================================================================
  function bukaModal(html, kelas) {
    var m = $('#modal'), c = $('#modalCard');
    pembuka = document.activeElement;
    c.className = 'modal-card' + (kelas ? ' ' + kelas : '');
    c.innerHTML = '<button type="button" class="modal-x" data-tutup aria-label="Tutup">' + ik('close') + '</button>' + html;
    m.hidden = false; void m.offsetWidth; m.classList.add('buka');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var f = c.querySelector('input:not(.hp), [data-fokus]') || c.querySelector('.modal-x'); if (f) f.focus({ preventScroll: true }); }, 60);
    return c;
  }
  function tutupModal() {
    var m = $('#modal'); if (!m.classList.contains('buka')) return;
    m.classList.remove('buka'); document.documentElement.style.overflow = '';
    setTimeout(function () { if (!m.classList.contains('buka')) { m.hidden = true; $('#modalCard').innerHTML = ''; } }, 320);
    if (pembuka && pembuka.focus) try { pembuka.focus({ preventScroll: true }); } catch (e) {}
  }
  function jebakFokus(e) {
    if (e.key !== 'Tab' || !$('#modal').classList.contains('buka')) return;
    var f = $$('#modalCard button, #modalCard a, #modalCard input:not(.hp), #modalCard [tabindex="0"]').filter(function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  // ---------- alur beli ----------
  function beli(tombol, ev) {
    if (!K) return;
    var P = K.produk;
    if (ev && ev.clientX) Fx.kilau(ev.clientX, ev.clientY, 16);
    if (K.setelan.formOrder) { Tracker.klik(tombol, 'FORM'); bukaCheckout(tombol); return; }
    var tujuan = P.linkBayar ? 'PAYMENT' : 'WA';
    Tracker.klik(tombol, tujuan);
    var url = P.linkBayar || waUrl(pesanOrder('-', ''));
    if (Api.demo) { toast('Mode demo: diarahkan ke ' + (P.linkBayar ? 'link pembayaran' : 'WhatsApp CS')); return; }
    setTimeout(function () { location.href = url; }, 180);
  }

  function bukaCheckout(tombol) {
    tombolAktif = tombol;
    var P = K.produk, simpan = Api.lokal.get('pembeli') || {};
    var thumb = src(P.thumbnail) || 'assets/img/thumb.svg';
    var metode = P.linkBayar
      ? '<fieldset class="metode" style="border:0;padding:0;margin:0"><legend class="eyebrow" style="margin-bottom:8px">Metode</legend>' +
          '<label class="opsi"><input type="radio" name="metode" value="PAYMENT" checked><span><b>Bayar Online</b><small>QRIS, e-wallet, transfer bank / VA</small></span>' + ik('credit_card') + '</label>' +
          '<label class="opsi"><input type="radio" name="metode" value="WA"><span><b>Order via WhatsApp</b><small>Konfirmasi & pembayaran dibantu CS</small></span>' + ik('chat') + '</label></fieldset>'
      : '<input type="hidden" name="metode" value="WA"><p class="muted" style="margin:0;font-size:13px">' + ik('chat') + ' Setelah ini Anda diarahkan ke WhatsApp CS untuk konfirmasi & pembayaran.</p>';
    var c = bukaModal(
      '<span class="chip-aman">' + ik('lock', 'fill') + 'Pemesanan Aman</span>' +
      '<h3 class="h-md" id="modalJudul" style="margin-top:12px;font-size:22px">' + esc(t('CHECKOUT_JUDUL') || 'Selesaikan Pesanan') + '</h3>' +
      '<p class="muted" style="margin:4px 0 0;font-size:14px">' + fmt(t('CHECKOUT_SUB')) + '</p>' +
      '<div class="ringkas"><img src="' + esc(thumb) + '" alt=""><div><h4>' + esc(P.nama) + '</h4><p>' + esc(P.tagline) + '</p><div class="harga"><b>' + rp(P.harga) + '</b>' + (P.hargaDiskon ? '<s>' + rp(P.hargaNormal) + '</s>' : '') + '</div></div></div>' +
      '<form class="form" id="formOrder" novalidate>' +
        '<div class="alert" id="oAlert" role="alert"></div>' +
        '<div class="fld"><label for="oNama">Nama Lengkap</label><input id="oNama" name="nama" autocomplete="name" maxlength="80" required placeholder="Contoh: Luna Clarissa" value="' + esc(simpan.nama || '') + '"><span class="err">Nama minimal 2 huruf.</span></div>' +
        '<div class="fld"><label for="oWa">Nomor WhatsApp <small>(akses produk dikirim ke sini)</small></label><input id="oWa" name="wa" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required placeholder="081234567890" value="' + esc(simpan.wa || '') + '"><span class="err">Isi nomor WhatsApp aktif, contoh 081234567890.</span></div>' +
        '<div class="fld"><label for="oEmail">Email <small>(opsional)</small></label><input id="oEmail" name="email" type="email" autocomplete="email" maxlength="120" placeholder="nama@email.com" value="' + esc(simpan.email || '') + '"><span class="err">Format email belum benar.</span></div>' +
        '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' + metode +
        '<div class="total">' + (P.hargaDiskon ? '<div><span class="muted">Harga normal</span><s class="muted">' + rp(P.hargaNormal) + '</s></div><div class="hemat"><span>Diskon (' + P.hemat + '%)</span><span>- ' + rp(P.hargaNormal - P.harga) + '</span></div>' : '') +
        '<div class="akhir"><span>Total</span><span>' + rp(P.harga) + '</span></div></div>' +
        '<button class="btn btn-primary btn-lg btn-block" type="submit" id="oKirim" data-kupu><span>Lanjutkan Pesanan</span>' + ik('arrow_forward') + '</button>' +
        '<p class="kecil">' + ik('verified_user') + ' Data hanya dipakai untuk memproses pesanan · <button type="button" data-policy="KEBIJAKAN_PRIVASI" style="color:var(--pk);font-weight:600">Kebijakan privasi</button></p>' +
      '</form>');
    $('#formOrder', c).addEventListener('submit', kirimOrder);
    $$('#formOrder input', c).forEach(function (i) { i.addEventListener('input', function () { i.removeAttribute('aria-invalid'); }); });
  }

  function hp08(v) { var s = String(v || '').replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (s.indexOf('62') === 0) s = '0' + s.slice(2); else if (s.indexOf('8') === 0) s = '0' + s; return s; }

  function kirimOrder(e) {
    e.preventDefault();
    var f = e.target, nama = f.nama.value.trim(), wa = hp08(f.wa.value), email = f.email.value.trim();
    var salah = null;
    if (nama.length < 2) { f.nama.setAttribute('aria-invalid', 'true'); salah = salah || f.nama; }
    if (!/^08\d{8,12}$/.test(wa)) { f.wa.setAttribute('aria-invalid', 'true'); salah = salah || f.wa; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { f.email.setAttribute('aria-invalid', 'true'); salah = salah || f.email; }
    if (salah) { salah.focus(); return; }
    var metodeEl = f.querySelector('input[name="metode"]:checked') || f.querySelector('input[name="metode"]');
    var metode = metodeEl ? metodeEl.value : 'WA';
    var id = 'GD-' + acakId(7);
    Api.lokal.set('pembeli', { nama: nama, wa: wa, email: email });
    var data = Tracker.data(); data.nama = nama; data.wa = wa; data.email = email; data.metode = metode; data.tombol = tombolAktif; data.id = id; data.website = f.website.value;
    var btn = $('#oKirim'), alert = $('#oAlert');
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Menyiapkan pesanan…</span>'; alert.className = 'alert';
    var url = metode === 'PAYMENT' && K.produk.linkBayar ? K.produk.linkBayar : waUrl(pesanOrder(id, nama));
    var req = Api.post('order.create', data, { keepalive: true, timeout: 20000 }).then(function (r) { return { r: r }; }, function (err) { return { err: err }; });
    var batas = new Promise(function (ok) { setTimeout(function () { ok({ timeout: true }); }, 4000); });
    Promise.race([req, batas]).then(function (h) {
      if (h.r && !h.r.success) { alert.textContent = h.r.message || 'Pesanan gagal diproses.'; alert.className = 'alert on'; btn.disabled = false; btn.innerHTML = '<span>Coba Lagi</span>' + ik('refresh'); return; }
      if (h.r && h.r.data && h.r.data.redirect) url = h.r.data.redirect;
      if (h.r && h.r.nq) Api.beacon('drain', {});
      if (Api.demo) { tampilDemoSelesai(id, url); return; }
      btn.innerHTML = '<span class="spin"></span><span>Mengalihkan ke ' + (metode === 'PAYMENT' ? 'pembayaran' : 'WhatsApp') + '…</span>';
      setTimeout(function () { location.href = url; }, 250);
    });
  }
  function tampilDemoSelesai(id, url) {
    bukaModal('<div style="text-align:center;display:grid;gap:12px;justify-items:center;padding-top:8px"><span class="cs-ikon" style="background:var(--ok-bg)">' + ik('task_alt', 'fill') + '</span>' +
      '<h3 class="h-md" id="modalJudul">Simulasi pesanan berhasil</h3><p class="muted" style="margin:0">Mode demo: data <b>tidak</b> dikirim. Setelah GAS_URL diisi, pesanan <b>' + esc(id) + '</b> tersimpan di sheet <b>Pesanan</b>, masuk CRM, lalu pembeli diarahkan ke:</p>' +
      '<a class="btn btn-ghost" href="' + esc(url) + '" target="_blank" rel="noopener" data-fokus>' + ik('open_in_new') + 'Buka tujuan</a></div>');
  }

  // ---------- WhatsApp chat ----------
  function bukaWaPanel() {
    var el = $('#waFloat'); if ($('#waPanel')) return tutupWaPanel();
    var b = $('#waBubble'); if (b) b.remove();
    var n = $('#waNotif'); if (n) n.remove();
    var P = K.produk, p = document.createElement('div');
    p.className = 'wa-panel'; p.id = 'waPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Chat WhatsApp');
    var jam = new Date().toTimeString().slice(0, 5);
    p.innerHTML = '<div class="wa-head"><span class="ava">' + ik('spa', 'fill') + '</span><div><b>' + esc(K.setelan.brand || 'CS') + '</b><small><i></i>Biasanya membalas dalam beberapa menit</small></div><button class="tutup" type="button" aria-label="Tutup chat">' + ik('close') + '</button></div>' +
      '<div class="wa-body" id="waBody"><div class="wa-ketik"><i></i><i></i><i></i></div></div>' +
      '<form class="wa-form" id="waForm"><input id="waInput" placeholder="Tulis pesan…" maxlength="500" aria-label="Pesan"><button type="submit" aria-label="Kirim lewat WhatsApp">' + ik('send', 'fill') + '</button></form>';
    el.insertBefore(p, el.firstChild);
    $('#waBtn').setAttribute('aria-expanded', 'true');
    setTimeout(function () {
      var body = $('#waBody'); if (!body) return;
      body.innerHTML = '<div class="wa-msg">' + esc((P.sapaanWa || 'Halo kak 👋 Ada yang bisa kami bantu?').replace('{produk}', P.nama)) + '<small>' + jam + '</small></div>' +
        '<div class="wa-chip">' + ['Mau tanya isi produk', 'Cara pembayarannya?', 'Bisa minta contoh file?', 'Saya mau order 🛒'].map(function (q) { return '<button type="button">' + esc(q) + '</button>'; }).join('') + '</div>';
      $$('.wa-chip button', body).forEach(function (b) { b.onclick = function () { kirimWa(b.textContent); }; });
    }, 900);
    $('.tutup', p).onclick = tutupWaPanel;
    $('#waForm').onsubmit = function (e) { e.preventDefault(); kirimWa($('#waInput').value.trim() || 'Halo kak, saya mau tanya tentang ' + P.nama); };
    setTimeout(function () { var i = $('#waInput'); if (i && Fx.halus) i.focus(); }, 950);
  }
  function tutupWaPanel() { var p = $('#waPanel'); if (p) p.remove(); var b = $('#waBtn'); if (b) b.setAttribute('aria-expanded', 'false'); }
  function kirimWa(teks) {
    Tracker.klik('wa_float', 'WA_CHAT');
    window.open(waUrl(teks + '\n\n(' + K.produk.nama + ')'), '_blank', 'noopener');
    tutupWaPanel();
  }

  // ---------- lightbox modul ----------
  function bukaLightbox(idx) {
    var m = K.modul[idx], g = (m.gambar || []).map(src).filter(String), i = 0;
    if (!g.length) {
      bukaModal('<span class="m-label" style="color:var(--pk)">' + ik(m.ikon) + esc(m.label) + '</span><h3 class="h-md" id="modalJudul" style="margin:8px 0">' + esc(m.judul) + '</h3><p class="muted">' + fmt(m.deskripsi) + '</p><button class="btn btn-primary btn-block" data-buy="modul" data-kupu style="margin-top:12px"><span>Dapatkan Sekarang</span>' + ik('arrow_forward') + '</button>');
      return;
    }
    var c = bukaModal('<div class="lb"><div class="lb-stage">' + g.map(function (u, n) { return '<img src="' + esc(u) + '" alt="' + esc(m.judul + ' — sampel ' + (n + 1)) + '"' + (n ? '' : ' class="aktif"') + '>'; }).join('') +
      (g.length > 1 ? '<button type="button" class="sl-nav sl-prev" aria-label="Sebelumnya">' + ik('chevron_left') + '</button><button type="button" class="sl-nav sl-next" aria-label="Berikutnya">' + ik('chevron_right') + '</button>' : '') + '</div>' +
      (g.length > 1 ? '<div class="lb-thumbs">' + g.map(function (u, n) { return '<button type="button" aria-label="Sampel ' + (n + 1) + '"' + (n ? '' : ' class="aktif"') + '><img src="' + esc(u) + '" alt=""></button>'; }).join('') + '</div>' : '') +
      '<div class="lb-cap"><span class="m-label" style="color:#ffb1c2">' + ik(m.ikon) + esc(m.label) + '</span><h3 id="modalJudul">' + esc(m.judul) + '</h3><p>' + fmt(m.deskripsi) + '</p>' +
      '<button class="btn btn-primary btn-block" data-buy="modul" data-kupu style="margin-top:14px"><span>Dapatkan Semua Modul</span>' + ik('arrow_forward') + '</button></div></div>', 'lebar gelap');
    var imgs = $$('.lb-stage img', c), th = $$('.lb-thumbs button', c);
    function ke(n) { i = (n + g.length) % g.length; imgs.forEach(function (x, k) { x.classList.toggle('aktif', k === i); }); th.forEach(function (x, k) { x.classList.toggle('aktif', k === i); }); }
    var pv = $('.sl-prev', c), nx = $('.sl-next', c);
    if (pv) pv.onclick = function () { ke(i - 1); }; if (nx) nx.onclick = function () { ke(i + 1); };
    th.forEach(function (b, n) { b.onclick = function () { ke(n); }; });
    c._kiri = function () { ke(i - 1); }; c._kanan = function () { ke(i + 1); };
    var sx = 0; var st = $('.lb-stage', c);
    st.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    st.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 40) ke(i + (d < 0 ? 1 : -1)); }, { passive: true });
  }

  // ---------- popup testimoni ----------
  function bukaTesti(idx) {
    var T = K.testimoni, x = T[idx]; if (!x) return;
    var shot = src(x.screenshot), foto = src(x.foto);
    var c = bukaModal('<div class="tp' + (shot ? ' ada-shot' : '') + '">' + (shot ? '<div class="tp-shot"><img src="' + esc(shot) + '" alt="Bukti testimoni ' + esc(x.nama) + '"></div>' : '') +
      '<div class="tp-isi">' + bintang(x.rating) + '<blockquote id="modalJudul">“' + fmt(x.ulasan) + '”</blockquote>' +
      '<div class="t-orang" style="margin-top:4px"><span class="ava" style="background:' + WARNA[idx % WARNA.length] + '">' + (foto ? '<img src="' + esc(foto) + '" alt="">' : esc(inisial(x.nama))) + '</span><div><b>' + esc(x.nama) + '</b><small>' + esc(x.ket) + (x.tanggal ? ' · ' + esc(x.tanggal) : '') + '</small></div></div>' +
      (T.length > 1 ? '<div class="tp-nav"><button type="button" class="btn btn-ghost btn-sm" data-tp="-1">' + ik('chevron_left') + 'Sebelumnya</button><button type="button" class="btn btn-ghost btn-sm" data-tp="1">Berikutnya' + ik('chevron_right') + '</button></div>' : '') +
      '<button class="btn btn-primary btn-block" data-buy="testimoni" data-kupu style="margin-top:6px"><span>Saya Juga Mau</span>' + ik('arrow_forward') + '</button></div></div>', shot ? 'lebar' : '');
    c.style.padding = shot ? '0' : '';
    $$('[data-tp]', c).forEach(function (b) { b.onclick = function () { bukaTesti((idx + Number(b.dataset.tp) + T.length) % T.length); }; });
    c._kiri = function () { bukaTesti((idx - 1 + T.length) % T.length); }; c._kanan = function () { bukaTesti((idx + 1) % T.length); };
  }

  function bukaKebijakan(kode) {
    var judul = kode === 'SYARAT_KETENTUAN' ? 'Syarat & Ketentuan' : 'Kebijakan Privasi';
    bukaModal('<h3 class="h-md" id="modalJudul" style="font-size:22px;margin-bottom:12px">' + judul + '</h3><div class="teks-kebijakan">' + fmt(t(kode) || '-') + '</div>');
  }

  // ---------- delegasi klik global ----------
  function pasangEvent() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-buy]');
      if (el) { e.preventDefault(); if ($('#modal').classList.contains('buka') && el.dataset.buy !== 'checkout') tutupModal(); setTimeout(function () { beli(el.dataset.buy, e); }, $('#modal').hidden ? 0 : 330); return; }
      if (e.target.closest('[data-tutup]') || e.target === $('#modal')) { tutupModal(); return; }
      el = e.target.closest('[data-policy]'); if (el) { bukaKebijakan(el.dataset.policy); return; }
      el = e.target.closest('[data-wa]'); if (el) { Tracker.klik(el.dataset.wa, 'WA_CS'); return; }
      if (e.target.closest('#waBtn')) { Tracker.klik('wa_float_buka', 'WA_CHAT'); bukaWaPanel(); return; }
      el = e.target.closest('.faq-q');
      if (el) {
        var item = el.parentNode, buka = !item.classList.contains('buka');
        $$('.faq-item.buka').forEach(function (x) { x.classList.remove('buka'); x.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
        item.classList.toggle('buka', buka); el.setAttribute('aria-expanded', String(buka)); return;
      }
      el = e.target.closest('[data-modul]');
      if (el && !e.target.closest('.sl-dot, .sl-nav')) { var sl = el.querySelector('[data-sl]'); if (sl && sl.dataset.swiped) return; bukaLightbox(Number(el.dataset.modul)); return; }
      el = e.target.closest('[data-testi]');
      if (el) { var tr = $('#tTrack'); if (tr && tr._drag) return; bukaTesti(Number(el.dataset.testi)); return; }
      if (!e.target.closest('#waFloat') && $('#waPanel')) tutupWaPanel();
    });
    document.addEventListener('keydown', function (e) {
      var m = $('#modal');
      if (e.key === 'Escape') { if (m.classList.contains('buka')) tutupModal(); else tutupWaPanel(); }
      if (m.classList.contains('buka')) {
        var c = $('#modalCard');
        if (e.key === 'ArrowLeft' && c._kiri && e.target.tagName !== 'INPUT') c._kiri();
        if (e.key === 'ArrowRight' && c._kanan && e.target.tagName !== 'INPUT') c._kanan();
        jebakFokus(e);
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-modul], [data-testi]')) { e.preventDefault(); e.target.click(); }
    });
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest && e.target.closest('.btn-primary'); if (!b) return;
      var r = b.getBoundingClientRect(); b.style.setProperty('--rx', (e.clientX - r.left) + 'px'); b.style.setProperty('--ry', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // ======================================================================
  // MUAT & TERAPKAN KONTEN
  // ======================================================================
  function terapkan(k) {
    K = k;
    if (!K.setelan) K.setelan = {};
    renderSeo(); renderHero(); renderTrust(); renderMasalah(); renderSolusi(); renderModul(); renderTesti(); renderOffer(); renderFaq(); renderCs(); renderFooter(); renderBar(); renderWa();
    aktifkan();
    if (!terapkan._kupu && window.Kupu) { terapkan._kupu = 1; window.Kupu.mulai(K.setelan.kupu !== false); }
  }
  function tampilGagal(pesan) {
    $('#overview').innerHTML = '<div class="wrap gagal"><span class="cs-ikon" style="background:var(--pk-soft);color:var(--pk)">' + ik('cloud_off') + '</span><h1 class="h-md">Halaman belum bisa dimuat</h1><p class="muted" style="margin:0">' + esc(pesan) + '</p><button class="btn btn-primary" onclick="location.reload()"><span>Muat Ulang</span>' + ik('refresh') + '</button></div>';
  }
  function tampilDemoBar() {
    var d = document.createElement('div'); d.className = 'demo-bar'; d.setAttribute('role', 'status');
    d.innerHTML = ik('science') + '<span>Mode demo — data contoh. Isi <b>GAS_URL</b> di js/config.js untuk data asli.</span><button type="button" aria-label="Tutup info demo">' + ik('close') + '</button>';
    d.querySelector('button').onclick = function () { d.remove(); };
    document.body.appendChild(d); setTimeout(function () { if (d.parentNode) d.remove(); }, 12000);
  }

  function mulai() {
    Tracker.init();
    pasangEvent(); pasangHalaman();
    var siap = Api.demo ? muatScript('js/demo-data.js?v=' + VERSI) : Promise.resolve();
    var cache = Api.lokal.get('konten', 7 * 864e5);
    siap.then(function () {
      if (cache) { try { terapkan(cache); } catch (e) { console.error(e); cache = null; } }
      return Api.get('konten', {}, { timeout: 20000 }).then(function (r) {
        if (!r || !r.success) throw new Error((r && r.message) || 'Konten gagal dimuat.');
        Api.lokal.set('konten', r.data);
        if (!cache || sidik(cache) !== sidik(r.data)) terapkan(r.data);
      });
    }).catch(function (e) {
      if (K) { console.warn('[konten] memakai cache lokal:', e.message); return; }
      // cadangan statis opsional (data/konten.json di repo) bila server sedang sibuk/kuota habis
      fetch('data/konten.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) { terapkan(d.data || d); }).catch(function () { tampilGagal(e.message); });
    });
    if (Api.demo) tampilDemoBar(); else Api.warm('pub');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
