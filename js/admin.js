/**
 * Dashboard Admin — Intelligence Hub
 * Laporan klik & konversi · link kampanye · pesanan · CRM kontak · WhatsApp & notifikasi
 * · konten & cache · import & migrasi · pengaturan & keamanan.
 * Performa (gas-scale-turbo): dedupe permintaan baca, epoch tulis, penggabung batch otomatis,
 * stale-while-revalidate (sessionStorage), polling adaptif, warmup server.
 */
(function () {
  'use strict';
  var Api = window.Api;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ======================================================================
  // UTILITAS
  // ======================================================================
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ik(n, c) { return '<span class="ms' + (c ? ' ' + c : '') + '" aria-hidden="true">' + esc(n) + '</span>'; }
  function rp(n) { return 'Rp ' + angka(n); }
  function angka(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tglPendek(ymd) { var p = String(ymd).slice(0, 10).split('-'); return p.length === 3 ? Number(p[2]) + ' ' + BLN[Number(p[1]) - 1] : ymd; }
  function waktu(iso) {
    if (!iso) return '-';
    var d = new Date(iso); if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  }
  function relatif(ms) {
    if (!ms) return 'belum pernah'; var d = (Date.now() - ms) / 1000;
    if (d < 60) return 'baru saja'; if (d < 3600) return Math.floor(d / 60) + ' menit lalu'; if (d < 86400) return Math.floor(d / 3600) + ' jam lalu'; return Math.floor(d / 86400) + ' hari lalu';
  }
  function hp62(v) { var s = String(v || '').replace(/[^0-9]/g, ''); return s.indexOf('0') === 0 ? '62' + s.slice(1) : s; }
  function inisial(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  var WARNA = ['#d6316d', '#b40f55', '#a16900', '#E8407A', '#8f0041', '#c2410c', '#7c3aed', '#0f766e'];
  function warnaDari(s) { var h = 0; String(s).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return WARNA[h % WARNA.length]; }
  function toast(msg, err) { var t = $('#toast'); t.innerHTML = ik(err ? 'error' : 'check_circle', 'fill') + '<span>' + esc(msg) + '</span>'; t.className = 'toast on' + (err ? ' err' : ''); clearTimeout(t._t); t._t = setTimeout(function () { t.className = 'toast'; }, 3800); }
  function sibuk(btn, on, teks) { if (!btn) return; if (on) { btn._h = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + (teks ? '<span>' + esc(teks) + '</span>' : ''); } else { btn.disabled = false; if (btn._h) btn.innerHTML = btn._h; } }
  function unduh(nama, isi, tipe) { var b = new Blob([isi], { type: tipe || 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function csv(header, rows) { var q = function (v) { v = String(v == null ? '' : v); return /[;"\n,]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return '﻿' + [header].concat(rows).map(function (r) { return r.map(q).join(';'); }).join('\r\n'); }
  function salin(teks) { (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(function () { toast('Disalin ke clipboard.'); }, function () { var t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast('Disalin.'); } catch (e) {} t.remove(); }); }
  var LABEL_TOMBOL = { hero: 'Beli Sekarang (Hero)', header: 'Header', sticky: 'Bar Bawah (Sticky)', offer: 'Kartu Penawaran', modul: 'Popup Modul', testimoni: 'Popup Testimoni', wa_float: 'WA Mengambang (kirim)', wa_float_buka: 'WA Mengambang (buka)', cs_strip: 'Strip CS WhatsApp', footer: 'Footer WhatsApp', lainnya: 'Lainnya' };
  var LABEL_TUJUAN = { FORM: ['Form Checkout', 'c-pk'], PAYMENT: ['Link Pembayaran', 'c-info'], WA: ['WhatsApp Order', 'c-ok'], WA_CHAT: ['Chat WA', 'c-ok'], WA_CS: ['WA CS', 'c-ok'] };
  var IKON_SUMBER = { 'Facebook Ads': 'campaign', Instagram: 'photo_camera', TikTok: 'music_note', 'Google Ads': 'search', 'Lynk.id': 'link', WhatsApp: 'chat', Langsung: 'language', Referral: 'share', Email: 'mail' };
  function lblTombol(k) { return LABEL_TOMBOL[k] || k; }

  // ---------- modal & konfirmasi ----------
  function modal(html, kelas) {
    var lap = $('#lapisan'), m = document.createElement('div');
    m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="modal-c ' + (kelas || '') + '">' + html + '</div>';
    lap.appendChild(m);
    var tutup = function () { m.remove(); document.removeEventListener('keydown', esc1); };
    var esc1 = function (e) { if (e.key === 'Escape') tutup(); };
    document.addEventListener('keydown', esc1);
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-tutup]')) tutup(); });
    setTimeout(function () { var f = m.querySelector('input,textarea,select,button.btn-p'); if (f) f.focus(); }, 50);
    return { el: m, tutup: tutup };
  }
  function konfirmasi(judul, isi, tombol, bahaya) {
    return new Promise(function (ok) {
      var m = modal('<h3 style="font-size:18px;font-weight:800">' + esc(judul) + '</h3><p class="muted" style="margin:8px 0 18px">' + isi + '</p><div class="row" style="justify-content:flex-end"><button class="btn btn-n" data-tutup>Batal</button><button class="btn ' + (bahaya ? 'btn-err' : 'btn-p') + '" id="kfOk">' + esc(tombol || 'Lanjutkan') + '</button></div>');
      $('#kfOk', m.el).onclick = function () { m.tutup(); ok(true); };
      m.el.addEventListener('click', function (e) { if (e.target === m.el || e.target.closest('[data-tutup]')) ok(false); });
    });
  }

  // ======================================================================
  // SESI & API (dedupe + epoch tulis + batch otomatis + SWR)
  // ======================================================================
  var Sesi = {
    k: 'gd_admin_sesi',
    get: function () { try { var s = JSON.parse(localStorage.getItem(this.k) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } },
    set: function (s) { try { localStorage.setItem(this.k, JSON.stringify(s)); } catch (e) {} },
    del: function () { try { localStorage.removeItem(this.k); sessionStorage.clear(); } catch (e) {} }
  };
  var sesi = Sesi.get();
  var READ = /^(laporan|laporan\.csv|pesanan\.list|crm\.(list|stats|detail|duplikat)|notif\.(config|queue)|wa\.(blastList|audience)|pengaturan\.get|konten\.cek|sistem\.status|migrasi\.status)$/;
  var inflight = {}, epoch = 0;
  function panggil(action, data, opt) {
    opt = opt || {};
    var token = sesi ? sesi.token : '';
    return Api.post(action, data || {}, { token: token, timeout: opt.timeout || 60000 }).then(function (r) {
      if (r && r.code === 'AUTH' && action.indexOf('auth.') !== 0) { keluar('Sesi berakhir. Silakan masuk lagi.'); throw new Error(r.message); }
      if (r && r.v && Api.demo === false) window.__serverV = r.v;
      return r;
    });
  }
  function api(action, data, opt) {
    if (!READ.test(action)) { epoch++; cacheBersih(); return panggil(action, data, opt); }
    var k = epoch + '|' + action + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    var p = panggil(action, data, opt); inflight[k] = p;
    p.then(function () { delete inflight[k]; }, function () { delete inflight[k]; });
    return p;
  }
  var Batcher = {
    q: null,
    add: function (action, data) {
      var self = this;
      return new Promise(function (res, rej) {
        if (!self.q) { self.q = []; setTimeout(function () { self.flush(); }, 0); }
        self.q.push({ action: action, data: data || {}, res: res, rej: rej });
      });
    },
    flush: function () {
      var q = this.q; this.q = null; if (!q || !q.length) return;
      if (q.length === 1) { api(q[0].action, q[0].data).then(q[0].res, q[0].rej); return; }
      for (var i = 0; i < q.length; i += 10) (function (part) {
        api('batch', { calls: part.map(function (c) { return { action: c.action, data: c.data }; }) }).then(function (r) {
          if (!r.success) return part.forEach(function (c) { c.res(r); });
          part.forEach(function (c, j) { c.res(r.data[j]); });
        }, function (e) { part.forEach(function (c) { c.rej(e); }); });
      })(q.slice(i, i + 10));
    }
  };
  function apiQ(action, data) { return READ.test(action) ? Batcher.add(action, data) : api(action, data); }
  // cache tampilan (SWR) — sessionStorage: hilang saat tab ditutup (data pribadi tidak menumpuk)
  var mem = {};
  function ck(a, d) { return 'gdc_' + a + '|' + JSON.stringify(d || {}); }
  function cacheGet(a, d) { var k = ck(a, d); if (mem[k]) return mem[k]; try { var v = JSON.parse(sessionStorage.getItem(k) || 'null'); if (v) mem[k] = v; return v; } catch (e) { return null; } }
  function cacheSet(a, d, v) { var k = ck(a, d), o = { t: Date.now(), v: v }; mem[k] = o; try { sessionStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
  function cacheBersih() { mem = {}; try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf('gdc_') === 0) sessionStorage.removeItem(k); }); } catch (e) {} }
  /** Muat dengan SWR: tampilkan cache dulu, ambil server bila basi (>30 dtk) atau dipaksa. */
  function muat(action, data, render, opt) {
    opt = opt || {};
    var c = cacheGet(action, data), id = halaman.id;
    if (c && c.v && c.v.success) render(c.v, true);
    if (c && !opt.fresh && !paksaSegar && Date.now() - c.t < (opt.segar || 30000)) return Promise.resolve(c.v);
    var d = Object.assign({}, data || {}); if (opt.fresh || paksaSegar) d._fresh = true;
    return apiQ(action, d).then(function (r) {
      if (halaman.id !== id) return r;
      if (r && r.success) { cacheSet(action, data, r); render(r, false); }
      else if (!c) render(r, false);
      else toast(r.message || 'Gagal memuat data.', true);
      return r;
    }).catch(function (e) { if (!c && halaman.id === id) render({ success: false, message: e.message }, false); });
  }
  var paksaSegar = false;

  // ======================================================================
  // LOGIN / LOGOUT
  // ======================================================================
  function tampilLogin(pesan) {
    $('#vApp').hidden = true; $('#vLogin').hidden = false;
    $('#loginPesan').hidden = !pesan; $('#loginPesanT').textContent = pesan || '';
    if (Api.demo) $('#loginInfo').innerHTML = '<b>Mode demo</b> — masuk dengan nama pengguna <b>demo</b> dan sandi <b>demo</b>. Isi GAS_URL di js/config.js untuk data asli.';
    setTimeout(function () { $('#lUser').focus(); }, 50);
    Api.warm('admin');
  }
  function keluar(pesan) {
    if (sesi) panggil('auth.logout', {}).catch(function () {});
    sesi = null; Sesi.del(); mem = {}; clearInterval(polling);
    tampilLogin(pesan || '');
  }
  $('#lLihat').onclick = function () { var p = $('#lPass'); p.type = p.type === 'password' ? 'text' : 'password'; this.innerHTML = '<span class="ms" style="position:static;transform:none">' + (p.type === 'password' ? 'visibility' : 'visibility_off') + '</span>'; };
  $('#fLogin').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('#lUser').value.trim(), p = $('#lPass').value, b = $('#lBtn');
    if (!u || !p) { $('#loginPesan').hidden = false; $('#loginPesanT').textContent = 'Isi nama pengguna dan kata sandi.'; return; }
    sibuk(b, true, 'Memeriksa…');
    var landing = location.href.replace(/admin\.html.*$/, '').replace(/#.*$/, '');
    panggil('auth.login', { username: u, password: p, appUrl: landing }).then(function (r) {
      sibuk(b, false);
      if (!r.success) { $('#loginPesan').hidden = false; $('#loginPesanT').textContent = r.message; $('#lPass').select(); return; }
      sesi = { token: r.data.token, user: r.data.me.user, exp: r.data.me.exp || Date.now() + 432e5, wajibGanti: r.data.wajibGanti };
      Sesi.set(sesi); $('#lPass').value = '';
      masukApp();
    }).catch(function (err) { sibuk(b, false); $('#loginPesan').hidden = false; $('#loginPesanT').textContent = err.message; });
  });

  // ======================================================================
  // RANGKA APLIKASI & ROUTER
  // ======================================================================
  var JUDUL = { laporan: 'Laporan Klik & Konversi', kampanye: 'Link Kampanye', pesanan: 'Pesanan', crm: 'CRM Kontak', wa: 'WhatsApp & Notifikasi', konten: 'Konten & Cache', migrasi: 'Import & Migrasi', pengaturan: 'Pengaturan & Keamanan' };
  var halaman = { id: '' }, polling = 0, aktivitas = Date.now();
  function masukApp() {
    $('#vLogin').hidden = true; $('#vApp').hidden = false;
    $('#akunNama').textContent = sesi.user;
    if (Api.demo && !$('.demo-pita')) { var d = document.createElement('div'); d.className = 'demo-pita'; d.textContent = 'MODE DEMO · data contoh'; document.body.appendChild(d); }
    Api.warm('admin');
    route();
    // lencana pesanan baru
    setTimeout(perbaruiBadge, 1200);
  }
  function perbaruiBadge() { apiQ('pesanan.list', { status: 'Baru', per: 10 }).then(function (r) { if (r && r.success) { var n = r.data.hitung.Baru || 0, b = $('#bBaru'); b.hidden = !n; b.textContent = n; } }).catch(function () {}); }
  function route() {
    var id = (location.hash || '#laporan').slice(1).split('?')[0];
    if (!JUDUL[id]) id = 'laporan';
    halaman = { id: id };
    $$('#nav a').forEach(function (a) { a.classList.toggle('aktif', a.dataset.p === id); if (a.dataset.p === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#judul').textContent = JUDUL[id]; document.title = JUDUL[id] + ' — Intelligence Hub';
    tutupSide();
    clearInterval(polling);
    var p = $('#page'); p.innerHTML = ''; p.scrollTop = 0; window.scrollTo(0, 0);
    if (sesi && sesi.wajibGanti && id !== 'pengaturan') p.insertAdjacentHTML('afterbegin', '<div class="banner warn"><div class="row" style="flex-wrap:nowrap"><span class="ik">' + ik('key') + '</span><div><b>Ganti sandi awal Anda</b><small>Sandi dari log setup tersimpan di riwayat Apps Script. Ganti sekarang demi keamanan.</small></div></div><a class="btn btn-p btn-s" href="#pengaturan">Ganti sandi</a></div>');
    HAL[id](p);
  }
  function bukaSide() { $('#side').classList.add('buka'); $('#scrim').classList.add('on'); $('#ham').setAttribute('aria-expanded', 'true'); }
  function tutupSide() { $('#side').classList.remove('buka'); $('#scrim').classList.remove('on'); $('#ham').setAttribute('aria-expanded', 'false'); }
  $('#ham').onclick = bukaSide; $('#scrim').onclick = tutupSide;
  window.addEventListener('hashchange', function () { if (sesi) route(); });
  $('#btnSegar').onclick = function () { var b = this; b.querySelector('.ms').classList.add('putar'); paksaSegar = true; route(); setTimeout(function () { paksaSegar = false; b.querySelector('.ms').classList.remove('putar'); }, 1500); };
  $('#akunBtn').onclick = function (e) { e.stopPropagation(); var m = $('#akunMenu'); m.hidden = !m.hidden; this.setAttribute('aria-expanded', String(!m.hidden)); };
  document.addEventListener('click', function () { $('#akunMenu').hidden = true; });
  $('#btnLogout').onclick = function () { keluar('Anda telah keluar.'); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { addEventListener(ev, function () { aktivitas = Date.now(); }, { passive: true }); });
  /** Polling adaptif: cepat saat admin aktif, jarang saat diam, berhenti saat tab tersembunyi. */
  function jadwalPolling(fn, aktifMs, diamMs) {
    var last = Date.now();
    polling = setInterval(function () {
      if (document.hidden) return;
      var jeda = Date.now() - aktivitas > 120000 ? diamMs : aktifMs;
      if (Date.now() - last >= jeda) { last = Date.now(); fn(); }
    }, 5000);
  }

  // ======================================================================
  // GRAFIK (SVG ringan, 1 sumbu, tooltip hover)
  // ======================================================================
  function grafikGaris(wadah, data, opt) {
    opt = opt || {};
    var W = Math.max(280, wadah.clientWidth || 600), H = opt.tinggi || 240, pl = 36, pr = 14, pt = 16, pb = 30;
    var maks = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.v; })));
    var skala = Math.pow(10, Math.floor(Math.log10(maks))); maks = Math.ceil(maks / skala * 1.1) * skala;
    var x = function (i) { return pl + (data.length < 2 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (data.length - 1)); };
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / maks); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(opt.label || 'Grafik') + '"><defs><linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b40f55" stop-opacity=".28"/><stop offset=".8" stop-color="#b40f55" stop-opacity=".03"/><stop offset="1" stop-color="#b40f55" stop-opacity="0"/></linearGradient></defs>';
    for (var g = 0; g <= 4; g++) { var gv = maks * g / 4, gy = y(gv); s += '<line class="' + (g ? 'grid-l' : 'base-l') + '" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + gy + '" y2="' + gy + '"/><text class="ax" x="' + (pl - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + (gv >= 1000 ? (gv / 1000).toFixed(gv % 1000 ? 1 : 0) + 'rb' : Math.round(gv)) + '</text>'; }
    var pts = data.map(function (d, i) { return x(i).toFixed(1) + ',' + y(d.v).toFixed(1); });
    s += '<polygon fill="url(#gArea)" points="' + x(0) + ',' + y(0) + ' ' + pts.join(' ') + ' ' + x(data.length - 1) + ',' + y(0) + '"/>';
    s += '<polyline fill="none" stroke="#b40f55" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + pts.join(' ') + '"/>';
    var langkahLbl = Math.max(1, Math.ceil(data.length / Math.max(3, Math.floor(W / 78))));
    data.forEach(function (d, i) {
      var akhir = i === data.length - 1;
      if (data.length <= 31 || akhir) s += '<circle cx="' + x(i) + '" cy="' + y(d.v) + '" r="' + (akhir ? 5.5 : 4) + '" fill="' + (akhir ? '#b40f55' : '#fff') + '" stroke="' + (akhir ? '#fff' : '#b40f55') + '" stroke-width="2"/>';
      var dekatAkhir = !akhir && (x(data.length - 1) - x(i)) < (opt.hariIni ? 92 : 46);
      if ((i % langkahLbl === 0 && !dekatAkhir) || akhir) s += '<text class="ax' + (akhir && opt.hariIni ? ' hari-ini' : '') + '" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="' + (akhir ? 'end' : i === 0 ? 'start' : 'middle') + '">' + esc(d.lbl) + (akhir && opt.hariIni ? ' (hari ini)' : '') + '</text>';
    });
    var lebar = (W - pl - pr) / Math.max(1, data.length - 1);
    data.forEach(function (d, i) { s += '<rect class="hit" data-i="' + i + '" x="' + (x(i) - lebar / 2) + '" y="' + pt + '" width="' + lebar + '" height="' + (H - pt - pb) + '"/>'; });
    s += '<line id="xh" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#b40f55" stroke-opacity=".35" stroke-dasharray="3 3" visibility="hidden" pointer-events="none"/></svg>';
    wadah.innerHTML = '<div class="chart">' + s + '<div class="tip" role="tooltip"></div></div>';
    var tip = $('.tip', wadah), xh = $('#xh', wadah);
    $$('.hit', wadah).forEach(function (r) {
      var on = function () { var i = Number(r.dataset.i), d = data[i]; xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('visibility', 'visible'); tip.innerHTML = opt.tip ? opt.tip(d) : '<b>' + esc(d.lbl) + '</b><br>' + angka(d.v); tip.style.left = Math.min(W - 70, Math.max(70, x(i))) + 'px'; tip.style.top = y(d.v) + 'px'; tip.classList.add('on'); };
      r.addEventListener('pointerenter', on); r.addEventListener('pointerdown', on);
      r.addEventListener('pointerleave', function () { tip.classList.remove('on'); xh.setAttribute('visibility', 'hidden'); });
    });
  }
  function grafikKolom(wadah, data, opt) {
    opt = opt || {};
    var W = Math.max(260, wadah.clientWidth || 500), H = opt.tinggi || 180, pl = 8, pr = 8, pt = 10, pb = 24;
    var maks = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.v; })));
    var bw = (W - pl - pr) / data.length, gap = Math.min(4, bw * 0.25);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(opt.label || '') + '"><line class="base-l" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '"/>';
    var puncak = data.reduce(function (m, d, i) { return d.v > data[m].v ? i : m; }, 0);
    data.forEach(function (d, i) {
      var h = (H - pt - pb) * d.v / maks, xx = pl + i * bw + gap / 2, yy = H - pb - h, w = bw - gap;
      if (h > 0) s += '<path d="M' + xx + ',' + (H - pb) + ' V' + (yy + Math.min(4, h)) + ' Q' + xx + ',' + yy + ' ' + (xx + Math.min(4, w / 2)) + ',' + yy + ' H' + (xx + w - Math.min(4, w / 2)) + ' Q' + (xx + w) + ',' + yy + ' ' + (xx + w) + ',' + (yy + Math.min(4, h)) + ' V' + (H - pb) + 'Z" fill="' + (i === puncak ? '#b40f55' : '#e39ab5') + '"/>';
      if (i % (opt.tiap || 3) === 0) s += '<text class="ax" x="' + (xx + w / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(d.lbl) + '</text>';
      s += '<rect class="hit" data-i="' + i + '" x="' + (pl + i * bw) + '" y="' + pt + '" width="' + bw + '" height="' + (H - pt - pb) + '"/>';
    });
    s += '</svg>';
    wadah.innerHTML = '<div class="chart">' + s + '<div class="tip" role="tooltip"></div></div>';
    var tip = $('.tip', wadah);
    $$('.hit', wadah).forEach(function (r) {
      var on = function () { var i = Number(r.dataset.i), d = data[i]; tip.innerHTML = opt.tip ? opt.tip(d) : '<b>' + esc(d.lbl) + '</b> · ' + angka(d.v); tip.style.left = Math.min(W - 60, Math.max(60, pl + i * bw + bw / 2)) + 'px'; tip.style.top = (H - pb - (H - pt - pb) * d.v / maks) + 'px'; tip.classList.add('on'); };
      r.addEventListener('pointerenter', on); r.addEventListener('pointerdown', on);
      r.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
    });
  }
  function daftarBatang(list, opt) {
    opt = opt || {};
    if (!list.length) return '<div class="empty">' + ik('bar_chart') + '<span>Belum ada data pada periode ini.</span></div>';
    var maks = Math.max.apply(null, list.map(function (x) { return x.klik; }));
    return '<div class="bars">' + list.slice(0, opt.maks || 6).map(function (x) {
      return '<div class="bar-r"><div class="row"><span class="nm">' + (opt.ikon ? ik(opt.ikon(x.nama)) : '') + '<span>' + esc(opt.label ? opt.label(x.nama) : x.nama) + '</span></span><span class="row" style="gap:10px;flex-wrap:nowrap"><span class="v">' + angka(x.klik) + '</span><span class="p">' + x.persen + '%</span></span></div><div class="trk"><i style="width:' + Math.max(2, x.klik / maks * 100) + '%"></i></div></div>';
    }).join('') + '</div>';
  }
  function pager(d, onKe) {
    var n = Math.max(1, Math.ceil(d.total / d.per)), h = d.halaman;
    var nomor = []; for (var i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - h) <= 1) nomor.push(i); else if (nomor[nomor.length - 1] !== '…') nomor.push('…');
    var el = document.createElement('div'); el.className = 'pg';
    el.innerHTML = '<span>Menampilkan <b>' + (d.total ? (h - 1) * d.per + 1 : 0) + '–' + Math.min(d.total, h * d.per) + '</b> dari <b>' + angka(d.total) + '</b></span><div class="row"><button aria-label="Sebelumnya" data-h="' + (h - 1) + '"' + (h <= 1 ? ' disabled' : '') + '>' + ik('chevron_left') + '</button>' +
      nomor.map(function (x) { return x === '…' ? '<span>…</span>' : '<button data-h="' + x + '"' + (x === h ? ' aria-current="true"' : '') + '>' + x + '</button>'; }).join('') +
      '<button aria-label="Berikutnya" data-h="' + (h + 1) + '"' + (h >= n ? ' disabled' : '') + '>' + ik('chevron_right') + '</button></div>';
    $$('button', el).forEach(function (b) { b.onclick = function () { onKe(Number(b.dataset.h)); }; });
    return el;
  }
  function delta(v, teks) {
    if (v === null || v === undefined) return '<div class="delta datar">' + ik('remove') + '<span class="muted">' + esc(teks || 'belum ada pembanding') + '</span></div>';
    var cls = v > 0 ? 'naik' : v < 0 ? 'turun' : 'datar';
    return '<div class="delta ' + cls + '">' + ik(v > 0 ? 'trending_up' : v < 0 ? 'trending_down' : 'trending_flat') + '<span>' + (v > 0 ? '+' : '') + v + '%</span><span class="muted">' + esc(teks) + '</span></div>';
  }
  function gagalBox(r) { return '<div class="card"><div class="empty">' + ik('cloud_off') + '<b>Data gagal dimuat</b><span>' + esc((r && r.message) || 'Periksa koneksi lalu tekan Segarkan.') + '</span></div></div>'; }

  // ======================================================================
  // HALAMAN
  // ======================================================================
  var HAL = {};
  var S = { lap: { hari: 7, halaman: 1, sumber: '', tombol: '', cari: '' }, pes: { status: 'Semua', halaman: 1, cari: '' }, crm: { halaman: 1, segmen: 'Semua', filter: '', cari: '', statusWA: '', tag: '', pilih: {} }, wa: { tab: 'blast' } };

  // ---------------------------------------------------------------- LAPORAN
  HAL.laporan = function (p) {
    var st = S.lap;
    p.insertAdjacentHTML('beforeend',
      '<div id="lapBanner"></div>' +
      '<div class="card hero-card"><div><div class="row" style="gap:6px"><span class="eyebrow">' + esc(document.querySelector('[data-brand]').textContent) + ' Intelligence</span><span class="muted" style="font-size:12px">• Sumber: sheet KlikOrder & Pesanan</span></div><h2>Dashboard Laporan Klik & Konversi</h2><p class="muted" style="margin:2px 0 0">Performa klik tombol beli & pelacakan UTM kampanye multi-kanal</p></div>' +
        '<div class="row"><div class="seg" role="group" aria-label="Rentang waktu" id="segHari">' + [[1, 'Hari ini'], [7, '7 Hari'], [30, '30 Hari'], [90, '90 Hari']].map(function (h) { return '<button data-h="' + h[0] + '" aria-pressed="' + (st.hari === h[0]) + '">' + h[1] + '</button>'; }).join('') + '</div>' +
        '<button class="btn btn-p" id="btnCache">' + ik('refresh') + 'Segarkan Cache</button></div></div>' +
      '<div class="grid g4" id="kpi">' + [1, 2, 3, 4].map(function () { return '<div class="card skel" style="height:150px"></div>'; }).join('') + '</div>' +
      '<div class="grid g-7-5"><div class="card"><div class="card-h"><div><h2>Tren Klik Beli Harian</h2><p id="trenSub">Semua tombol CTA</p></div><span class="legend"><i></i>Klik CTA</span></div><div id="gTren" class="skel" style="height:240px"></div></div>' +
        '<div class="card"><div class="card-h"><div><h2>Sumber Traffic</h2><p>Berdasarkan utm_source & referrer</p></div><span class="chip c-mut" id="nSumber"></span></div><div id="gSumber"><div class="skel" style="height:220px"></div></div><div class="row sb" style="margin-top:16px;font-size:13px"><span class="muted" id="totSumber"></span><a href="#kampanye" class="row" style="gap:2px;color:var(--pk);font-weight:700">Detail UTM' + ik('chevron_right') + '</a></div></div></div>' +
      '<div class="grid g3"><div class="card"><div class="card-h"><div><h2>Tombol / CTA</h2><p>Tombol mana yang paling sering diklik</p></div></div><div id="gTombol"></div></div>' +
        '<div class="card"><div class="card-h"><div><h2>Jam Ramai</h2><p>Waktu klik terbanyak (WIB) — pakai untuk jadwal iklan</p></div></div><div id="gJam"></div></div>' +
        '<div class="card"><div class="card-h"><div><h2>Perangkat & Konversi</h2><p>Klik → pesanan pada periode ini</p></div></div><div id="gDev"></div></div></div>' +
      '<div class="card" style="padding-bottom:12px"><div class="card-h"><div><div class="row" style="gap:8px"><h2>Log Klik Pembelian Terbaru</h2><span class="chip c-pk">' + ik('fiber_manual_record', 'fill') + 'Live</span></div><p>Catatan interaksi tombol beli dari landing page</p></div><button class="btn btn-g btn-s" id="btnCsv">' + ik('download') + 'Unduh CSV</button></div>' +
        '<div class="row" style="margin-bottom:12px"><select class="sel" id="fSumber" style="width:auto;min-width:150px" aria-label="Filter sumber"><option value="">Semua sumber</option></select><select class="sel" id="fTombol" style="width:auto;min-width:150px" aria-label="Filter tombol"><option value="">Semua tombol</option></select><div class="inp-ikon" style="flex:1;min-width:180px">' + ik('search') + '<input class="inp" id="fCari" placeholder="Cari kampanye, medium…" value="' + esc(st.cari) + '"></div></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Sumber Traffic</th><th>Tombol / CTA</th><th>Tujuan</th><th>Perangkat</th></tr></thead><tbody id="tKlik"><tr><td colspan="5"><div class="skel" style="height:180px"></div></td></tr></tbody></table></div><div id="pgKlik"></div></div>');
    $$('#segHari button').forEach(function (b) { b.onclick = function () { st.hari = Number(b.dataset.h); st.halaman = 1; $$('#segHari button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); muatLap(); }; });
    $('#btnCache').onclick = function () {
      var b = this; sibuk(b, true, 'Menyegarkan…');
      api('konten.segarkan', {}).then(function (r) {
        sibuk(b, false); if (!r.success) return toast(r.message, true);
        $('#lapBanner').innerHTML = '<div class="banner"><div class="row" style="flex-wrap:nowrap"><span class="ik">' + ik('sync') + '</span><div><b>Cache Google Sheets berhasil diperbarui</b><small>Sinkronisasi baru saja • konten landing page & laporan dibaca ulang dari Sheets</small></div></div><div class="row"><span class="chip c-warn">Real-time aktif</span><button class="btn btn-n btn-i btn-s" aria-label="Tutup" onclick="this.closest(\'.banner\').remove()">' + ik('close') + '</button></div></div>';
        paksaSegar = true; muatLap(); setTimeout(function () { paksaSegar = false; }, 500);
      });
    };
    var cariT; $('#fCari').oninput = function () { clearTimeout(cariT); var v = this.value; cariT = setTimeout(function () { st.cari = v; st.halaman = 1; muatTabel(); }, 350); };
    $('#fSumber').onchange = function () { st.sumber = this.value; st.halaman = 1; muatLap(); };
    $('#fTombol').onchange = function () { st.tombol = this.value; st.halaman = 1; muatTabel(); };
    $('#btnCsv').onclick = function () {
      var b = this; sibuk(b, true, 'Menyiapkan…');
      api('laporan.csv', { hari: st.hari, sumber: st.sumber, tombol: st.tombol, cari: st.cari }).then(function (r) {
        sibuk(b, false); if (!r.success) return toast(r.message, true);
        unduh('laporan-klik_' + r.data.rentang.dari + '_sd_' + r.data.rentang.sampai + '.csv', csv(r.data.header, r.data.rows.map(function (x) { var y = x.slice(); y[6] = lblTombol(y[6]); return y; })));
        toast(r.data.rows.length + ' baris diunduh. Buka dengan Excel / Google Sheets.');
      });
    };
    var resizeT; window.onresize = function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (halaman.id === 'laporan' && HAL._lap) gambarLap(HAL._lap); }, 200); };
    muatLap();
    jadwalPolling(function () { muatLap(true); }, 30000, 120000);
  };
  function dataLap(tabelSaja) { var st = S.lap; return { hari: st.hari, sumber: st.sumber, tombol: tabelSaja ? st.tombol : st.tombol, cari: st.cari, halaman: st.halaman, per: 20 }; }
  function muatLap(diam) { muat('laporan', dataLap(), function (r) { if (!r.success) { $('#kpi').innerHTML = gagalBox(r); return; } HAL._lap = r.data; gambarLap(r.data); }, { segar: diam ? 25000 : 30000 }); }
  function muatTabel() { muat('laporan', dataLap(true), function (r) { if (r.success) { HAL._lap = r.data; isiTabelKlik(r.data); } }); }
  function gambarLap(d) {
    var k = d.kpi, st = S.lap;
    var label = { 1: 'hari ini', 7: '7 hari', 14: '14 hari', 30: '30 hari', 90: '90 hari' }[st.hari];
    $('#kpi').innerHTML =
      '<div class="card kpi"><div class="kpi-h"><div><small>Realtime</small><h3>Klik Tombol Beli Hari Ini</h3></div><span class="kpi-ik">' + ik('ads_click', 'fill') + '</span></div><div><div class="kpi-v"><b>' + angka(k.hariIni) + '</b><span>klik</span></div>' + delta(k.deltaHari, 'vs kemarin (' + angka(k.kemarin) + ')') + '</div></div>' +
      '<div class="card kpi"><div class="kpi-h"><div><small>Akumulasi ' + esc(label) + '</small><h3>Total Klik Periode</h3></div><span class="kpi-ik">' + ik('show_chart', 'fill') + '</span></div><div><div class="kpi-v"><b>' + angka(k.periode) + '</b><span>klik · ' + angka(k.pengunjungUnik) + ' pengunjung</span></div>' + delta(k.deltaPeriode, 'vs periode sebelumnya') + '</div></div>' +
      '<div class="card kpi"><div class="kpi-h"><div><small>Konversi</small><h3>Pesanan Masuk</h3></div><span class="kpi-ik ok">' + ik('shopping_bag', 'fill') + '</span></div><div><div class="kpi-v"><b>' + angka(k.pesanan) + '</b><span>pesanan · ' + angka(k.lunas) + ' lunas</span></div><div class="delta naik">' + ik('conversion_path') + '<span>' + k.konversi + '%</span><span class="muted">klik → pesanan</span></div></div></div>' +
      '<div class="card kpi"><div class="kpi-h"><div><small>Omzet</small><h3>Penjualan Terkonfirmasi</h3></div><span class="kpi-ik amber">' + ik('payments', 'fill') + '</span></div><div><div class="kpi-v"><span class="rp">Rp</span><b>' + angka(k.omzetLunas) + '</b></div><div class="delta datar">' + ik('verified') + '<span class="muted">Potensi ' + rp(k.potensiOmzet) + ' • harga ' + rp(k.harga) + '</span></div></div></div>';
    var tren = $('#gTren'); tren.classList.remove('skel'); tren.style.height = '';
    $('#trenSub').textContent = (st.hari === 1 ? 'Hari ini' : st.hari + ' hari terakhir') + ' • ' + (st.sumber || 'semua sumber') + (st.tombol ? ' • ' + lblTombol(st.tombol) : '');
    if (st.hari === 1) grafikKolom(tren, d.jam.map(function (v, i) { return { lbl: ('0' + i).slice(-2), v: v }; }), { label: 'Klik per jam hari ini', tinggi: 240, tip: function (x) { return '<b>Pukul ' + x.lbl + '.00</b><br>' + angka(x.v) + ' klik'; } });
    else grafikGaris(tren, d.harian.map(function (h) { return { lbl: tglPendek(h.tgl), v: h.klik, p: h.pesanan, l: h.lunas }; }), { label: 'Tren klik harian', hariIni: true, tip: function (x) { return '<b>' + esc(x.lbl) + '</b><br><i style="background:#b40f55"></i>' + angka(x.v) + ' klik<br><i style="background:#D97706"></i>' + angka(x.p) + ' pesanan · ' + angka(x.l) + ' lunas'; } });
    $('#gSumber').innerHTML = daftarBatang(d.sumber, { ikon: function (n) { return IKON_SUMBER[n] || 'public'; } });
    $('#nSumber').textContent = d.sumber.length + ' saluran';
    $('#totSumber').textContent = 'Total klik terlacak: ' + angka(k.periode);
    $('#gTombol').innerHTML = daftarBatang(d.tombol, { label: lblTombol });
    if (st.hari !== 1) grafikKolom($('#gJam'), d.jam.map(function (v, i) { return { lbl: ('0' + i).slice(-2), v: v }; }), { label: 'Klik per jam', tip: function (x) { return '<b>Pukul ' + x.lbl + '.00</b> · ' + angka(x.v) + ' klik'; } });
    else $('#gJam').innerHTML = '<p class="muted" style="margin:0">Grafik per jam sudah tampil di atas untuk tampilan "Hari ini".</p>';
    var dev = d.perangkat, tot = dev.reduce(function (s, x) { return s + x.klik; }, 0) || 1, mob = (dev.filter(function (x) { return x.nama === 'mobile'; })[0] || { klik: 0 }).klik;
    $('#gDev').innerHTML = '<div class="split" role="img" aria-label="Ponsel ' + Math.round(mob / tot * 100) + '%"><i style="width:' + (mob / tot * 100) + '%;background:#b40f55"></i><i style="flex:1;background:#D97706"></i></div>' +
      '<div class="row sb" style="margin:10px 0 18px;font-size:13px"><span>' + ik('smartphone') + ' Ponsel <b>' + Math.round(mob / tot * 100) + '%</b></span><span>' + ik('computer') + ' Lainnya <b>' + (100 - Math.round(mob / tot * 100)) + '%</b></span></div>' +
      '<dl class="kv"><dt>Klik periode</dt><dd class="num">' + angka(k.periode) + '</dd><dt>Pesanan</dt><dd class="num">' + angka(k.pesanan) + ' (' + k.konversi + '%)</dd><dt>Lunas</dt><dd class="num">' + angka(k.lunas) + ' (' + (k.pesanan ? Math.round(k.lunas / k.pesanan * 100) : 0) + '% dari pesanan)</dd><dt>Omzet / klik</dt><dd class="num">' + rp(k.periode ? k.omzetLunas / k.periode : 0) + '</dd></dl>';
    var fs = $('#fSumber'), ft = $('#fTombol');
    if (fs && fs.options.length <= 1) d.opsi.sumber.forEach(function (s) { fs.insertAdjacentHTML('beforeend', '<option' + (s === st.sumber ? ' selected' : '') + '>' + esc(s) + '</option>'); });
    if (ft && ft.options.length <= 1) d.opsi.tombol.forEach(function (s) { ft.insertAdjacentHTML('beforeend', '<option value="' + esc(s) + '"' + (s === st.tombol ? ' selected' : '') + '>' + esc(lblTombol(s)) + '</option>'); });
    isiTabelKlik(d);
  }
  function isiTabelKlik(d) {
    var tb = $('#tKlik'); if (!tb) return;
    var rows = d.tabel.rows;
    tb.innerHTML = rows.length ? rows.map(function (r) {
      var tj = LABEL_TUJUAN[r.Tujuan] || [r.Tujuan, 'c-mut'];
      return '<tr><td><span class="t1 num">' + esc(String(r.Jam).slice(0, 8)) + ' WIB</span><span class="t2">' + esc(tglPendek(r.Tanggal)) + ' ' + esc(String(r.Tanggal).slice(0, 4)) + '</span></td>' +
        '<td><span class="t1 row" style="gap:6px;flex-wrap:nowrap">' + ik(IKON_SUMBER[r.Sumber] || 'public') + esc(r.Kampanye || r.Sumber) + '</span><span class="t2">' + esc(r.Sumber) + (r.Medium ? ' • ' + esc(r.Medium) : '') + (r.Konten ? ' • ' + esc(r.Konten) : '') + '</span></td>' +
        '<td><span class="chip c-pk">' + esc(lblTombol(r.Tombol)) + '</span></td><td><span class="chip ' + tj[1] + '"><i></i>' + esc(tj[0]) + '</span></td>' +
        '<td>' + ik(r.Perangkat === 'mobile' ? 'smartphone' : r.Perangkat === 'tablet' ? 'tablet' : 'computer') + ' <span class="t2" style="display:inline">' + esc(r.Perangkat) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="empty">' + ik('ads_click') + '<b>Belum ada klik</b><span>Klik tombol beli di landing page akan tercatat di sini.</span></div></td></tr>';
    var pg = $('#pgKlik'); pg.innerHTML = ''; pg.appendChild(pager(d.tabel, function (h) { S.lap.halaman = h; muatTabel(); }));
  }

  // ---------------------------------------------------------------- KAMPANYE
  HAL.kampanye = function (p) {
    var dasar = (window.__appUrl || location.href.replace(/admin\.html.*$/, '').replace(/#.*$/, ''));
    var PRESET = [['Facebook Ads', 'facebook', 'cpc'], ['Instagram Bio', 'instagram', 'bio'], ['Instagram Ads', 'instagram', 'cpc'], ['TikTok Ads', 'tiktok', 'cpc'], ['Google Ads', 'google', 'cpc'], ['Lynk.id', 'lynkid', 'referral'], ['WhatsApp Broadcast', 'whatsapp', 'broadcast'], ['Email', 'email', 'newsletter']];
    p.insertAdjacentHTML('beforeend',
      '<div class="grid g-5-7"><div class="card"><div class="card-h"><div><h2>Pembuat Link Kampanye (UTM)</h2><p>Pasang link ini di iklan / bio agar sumber klik tercatat otomatis.</p></div></div>' +
        '<div class="stack"><div class="fld"><label for="uBase">URL landing page</label><input class="inp" id="uBase" value="' + esc(dasar) + '"></div>' +
        '<div class="fld"><span class="lbl-f">Saluran</span><div class="preset" id="uPreset">' + PRESET.map(function (x, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(x[0]) + '</button>'; }).join('') + '</div></div>' +
        '<div class="grid g2" style="gap:12px"><div class="fld"><label for="uSrc">utm_source</label><input class="inp" id="uSrc" value="facebook"></div><div class="fld"><label for="uMed">utm_medium</label><input class="inp" id="uMed" value="cpc"></div></div>' +
        '<div class="fld"><label for="uKmp">utm_campaign (nama kampanye)</label><input class="inp" id="uKmp" placeholder="contoh: promo_payday_okt" value="promo_' + BLN[new Date().getMonth()].toLowerCase() + '"></div>' +
        '<div class="fld"><label for="uKon">utm_content <small>(opsional — versi iklan/creative)</small></label><input class="inp" id="uKon" placeholder="video_a"></div>' +
        '<div class="url-box"><span id="uHasil"></span><button class="btn btn-p btn-s" id="uSalin">' + ik('content_copy') + 'Salin</button></div>' +
        '<p class="hint" style="margin:0">' + ik('lightbulb') + ' Iklan Facebook/Google/TikTok yang menambahkan fbclid/gclid/ttclid otomatis juga dikenali walau tanpa UTM.</p></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>Performa Kampanye (30 hari)</h2><p>Klik & pesanan per utm_campaign</p></div></div><div id="tKmp"><div class="skel" style="height:260px"></div></div></div></div>');
    var buat = function () {
      var b = $('#uBase').value.trim(), q = [['utm_source', $('#uSrc').value], ['utm_medium', $('#uMed').value], ['utm_campaign', $('#uKmp').value], ['utm_content', $('#uKon').value]].filter(function (x) { return x[1].trim(); })
        .map(function (x) { return x[0] + '=' + encodeURIComponent(x[1].trim().toLowerCase().replace(/\s+/g, '_')); }).join('&');
      $('#uHasil').textContent = b + (b.indexOf('?') > -1 ? '&' : '?') + q;
    };
    $$('#uPreset button').forEach(function (bt) { bt.onclick = function () { var x = PRESET[Number(bt.dataset.i)]; $('#uSrc').value = x[1]; $('#uMed').value = x[2]; $$('#uPreset button').forEach(function (y) { y.setAttribute('aria-pressed', String(y === bt)); }); buat(); }; });
    ['uBase', 'uSrc', 'uMed', 'uKmp', 'uKon'].forEach(function (id) { $('#' + id).oninput = buat; });
    $('#uSalin').onclick = function () { salin($('#uHasil').textContent); };
    buat();
    apiQ('pengaturan.get', {}).then(function (r) { if (r.success && r.data.nilai.APP_URL && $('#uBase')) { window.__appUrl = r.data.nilai.APP_URL; $('#uBase').value = r.data.nilai.APP_URL; buat(); } });
    muat('laporan', { hari: 30, per: 10 }, function (r) {
      if (!r.success) { $('#tKmp').innerHTML = gagalBox(r); return; }
      var k = r.data.kampanye;
      $('#tKmp').innerHTML = k.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:520px"><thead><tr><th>Kampanye</th><th>Sumber</th><th class="ac">Klik</th><th class="ac">Pesanan</th><th class="ac">Konversi</th></tr></thead><tbody>' + k.map(function (x) {
        return '<tr><td><span class="t1">' + esc(x.kampanye) + '</span><span class="t2">' + esc(x.medium || '-') + '</span></td><td>' + ik(IKON_SUMBER[x.sumber] || 'public') + ' ' + esc(x.sumber) + '</td><td class="ac num">' + angka(x.klik) + '</td><td class="ac num">' + angka(x.pesanan) + '</td><td class="ac"><span class="chip ' + (x.pesanan ? 'c-ok' : 'c-mut') + '">' + (x.klik ? (x.pesanan / x.klik * 100).toFixed(1) : 0) + '%</span></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">' + ik('campaign') + '<b>Belum ada klik berkampanye</b><span>Gunakan link UTM di samping pada iklan Anda.</span></div>';
    });
  };

  // ---------------------------------------------------------------- PESANAN
  var STATUS = ['Baru', 'Dihubungi', 'Lunas', 'Batal'], CHIP_ST = { Baru: 'c-warn', Dihubungi: 'c-info', Lunas: 'c-ok', Batal: 'c-mut' };
  HAL.pesanan = function (p) {
    var st = S.pes;
    p.insertAdjacentHTML('beforeend',
      '<div class="kpi6" id="pesKpi" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"></div>' +
      '<div class="card" style="padding-bottom:12px"><div class="card-h"><div><h2>Daftar Pesanan</h2><p>Dari formulir checkout landing page. Ubah status → notifikasi otomatis (bila aktif).</p></div><div class="inp-ikon" style="min-width:220px">' + ik('search') + '<input class="inp" id="pCari" placeholder="Cari nama, WA, email, ID…" value="' + esc(st.cari) + '"></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pembeli</th><th>Total</th><th>Sumber</th><th>Status</th><th class="ac">Aksi</th></tr></thead><tbody id="tPes"><tr><td colspan="6"><div class="skel" style="height:200px"></div></td></tr></tbody></table></div><div id="pgPes"></div></div>');
    var t; $('#pCari').oninput = function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { st.cari = v; st.halaman = 1; muatPes(); }, 350); };
    muatPes();
    jadwalPolling(function () { muatPes(); }, 45000, 180000);
  };
  function muatPes() {
    var st = S.pes;
    muat('pesanan.list', { status: st.status, cari: st.cari, halaman: st.halaman, per: 25 }, function (r) {
      if (!r.success) { $('#tPes').innerHTML = '<tr><td colspan="6">' + gagalBox(r) + '</td></tr>'; return; }
      var d = r.data;
      $('#pesKpi').innerHTML = ['Semua'].concat(STATUS).map(function (s) { return '<button class="card mini-kpi" data-s="' + s + '" aria-pressed="' + (st.status === s) + '"><span><i class="chip ' + (CHIP_ST[s] || 'c-pk') + '" style="padding:0;width:8px;height:8px"></i>' + s + '</span><b>' + angka(d.hitung[s] || 0) + '</b></button>'; }).join('') +
        '<div class="card mini-kpi" style="cursor:default"><span>' + ik('payments') + 'Omzet lunas</span><b style="font-size:19px">' + rp(d.omzetLunas) + '</b></div>';
      $$('#pesKpi [data-s]').forEach(function (b) { b.onclick = function () { st.status = b.dataset.s; st.halaman = 1; muatPes(); }; });
      var bb = $('#bBaru'); if (bb) { bb.hidden = !d.hitung.Baru; bb.textContent = d.hitung.Baru; }
      $('#tPes').innerHTML = d.rows.length ? d.rows.map(function (o) {
        var pesan = 'Halo ' + o.Nama + ' 👋 Terima kasih sudah order (ID ' + o.PesananID + ', total ' + rp(o.Total) + '). Ada yang bisa kami bantu untuk pembayarannya?';
        return '<tr data-id="' + esc(o.PesananID) + '"><td><span class="t1">' + esc(waktu(o.Waktu)) + '</span><span class="t2 mono">' + esc(o.PesananID) + '</span></td>' +
          '<td><span class="t1">' + esc(o.Nama) + '</span><span class="t2">' + esc(o.WhatsApp) + (o.StatusWA === 'Terdaftar' ? ' <span class="wa-b ya">✓ WA</span>' : '') + (o.Email ? ' • ' + esc(o.Email) : '') + '</span></td>' +
          '<td class="num"><span class="t1">' + rp(o.Total) + '</span><span class="t2">' + (o.Metode === 'PAYMENT' ? 'Bayar online' : 'Via WhatsApp') + '</span></td>' +
          '<td><span class="t1">' + esc(o.Sumber) + '</span><span class="t2">' + esc(o.Kampanye || lblTombol(o.Tombol)) + '</span></td>' +
          '<td><select class="sel" data-st aria-label="Status pesanan" style="width:auto;padding:6px 10px">' + STATUS.map(function (s) { return '<option' + (s === o.Status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' + (o.DiingatkanPada ? '<span class="t2">' + ik('notifications') + ' diingatkan</span>' : '') + '</td>' +
          '<td class="ac"><a class="btn btn-n btn-s" href="https://wa.me/' + hp62(o.WhatsApp) + '?text=' + encodeURIComponent(pesan) + '" target="_blank" rel="noopener" title="Chat pembeli">' + ik('chat') + 'Chat</a> ' + (o.Status !== 'Lunas' ? '<button class="btn btn-ok btn-s" data-lunas>' + ik('task_alt') + 'Lunas</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="6"><div class="empty">' + ik('shopping_cart') + '<b>Belum ada pesanan' + (st.status !== 'Semua' ? ' berstatus ' + esc(st.status) : '') + '</b><span>Pesanan dari formulir checkout landing page muncul di sini.</span></div></td></tr>';
      $$('#tPes tr[data-id]').forEach(function (tr) {
        var sel = $('[data-st]', tr), lama = sel.value;
        var ubah = function (status) {
          (status === 'Lunas' ? konfirmasi('Tandai lunas?', 'Pembeli akan menerima <b>link akses produk</b> lewat WhatsApp/email (bila notifikasi aktif & LINK_AKSES_PRODUK diisi).', 'Tandai Lunas') : Promise.resolve(true)).then(function (ya) {
            if (!ya) { sel.value = lama; return; }
            sel.disabled = true;
            api('pesanan.update', { id: tr.dataset.id, status: status }).then(function (r) { sel.disabled = false; if (!r.success) { sel.value = lama; return toast(r.message, true); } toast(r.message); lama = status; muatPes(); });
          });
        };
        sel.onchange = function () { ubah(sel.value); };
        var bl = $('[data-lunas]', tr); if (bl) bl.onclick = function () { sel.value = 'Lunas'; ubah('Lunas'); };
      });
      var pg = $('#pgPes'); pg.innerHTML = ''; pg.appendChild(pager(d, function (h) { st.halaman = h; muatPes(); }));
    });
  }

  // ---------------------------------------------------------------- CRM
  HAL.crm = function (p) {
    var st = S.crm;
    p.insertAdjacentHTML('beforeend',
      '<div class="card hero-card"><div><h2>CRM Kontak</h2><p class="muted" style="margin:2px 0 0">Satu layar untuk semua kontak: nama · email · WhatsApp. Sinkron otomatis dari Pesanan.</p></div><div class="row"><span class="muted" style="font-size:12.5px" id="crmSync"></span><button class="btn btn-n btn-s" id="cSync">' + ik('sync') + 'Sinkron Sekarang</button><button class="btn btn-n btn-s" id="cImport">' + ik('upload') + 'Import CSV</button><button class="btn btn-n btn-s" id="cDup">' + ik('content_copy') + 'Periksa Duplikat</button></div></div>' +
      '<div class="kpi6" id="crmKpi">' + [1, 2, 3, 4, 5, 6].map(function () { return '<div class="card skel" style="height:78px"></div>'; }).join('') + '</div>' +
      '<div class="card" style="padding-bottom:12px"><div class="row" id="crmSeg" style="margin-bottom:12px"></div>' +
        '<div class="row" style="margin-bottom:12px"><div class="inp-ikon" style="flex:1;min-width:200px">' + ik('search') + '<input class="inp" id="cCari" placeholder="Cari nama, email, nomor, tag…" value="' + esc(st.cari) + '"></div><select class="sel" id="cWa" style="width:auto"><option value="">Status WA: semua</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option>Belum dicek</option></select><select class="sel" id="cTag" style="width:auto"><option value="">Semua tag</option></select></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" class="cek" id="cAll" aria-label="Pilih semua di halaman ini"></th><th>Kontak</th><th>Email</th><th>WhatsApp</th><th>Tag</th><th>Terakhir dihubungi</th><th class="ac">Pesan</th></tr></thead><tbody id="tCrm"><tr><td colspan="7"><div class="skel" style="height:220px"></div></td></tr></tbody></table></div><div id="pgCrm"></div></div>' +
      '<div class="massal" id="massal" hidden><b id="mJml"></b><button class="btn btn-s" data-m="deteksiWA">' + ik('verified') + 'Deteksi WA</button><button class="btn btn-s" data-m="tag">' + ik('sell') + 'Beri Tag</button><button class="btn btn-s" data-m="blast">' + ik('campaign') + 'Blast ke Terpilih</button><button class="btn btn-s" data-m="optout">' + ik('block') + 'Opt-out</button><button class="btn btn-s" data-m="optin">' + ik('check') + 'Opt-in</button><button class="btn btn-s" data-m="ekspor">' + ik('download') + 'Ekspor</button><span style="flex:1"></span><button class="btn btn-s" data-m="batal">' + ik('close') + 'Batal</button></div>');
    var t; $('#cCari').oninput = function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { st.cari = v; st.halaman = 1; muatCrm(); }, 350); };
    $('#cWa').value = st.statusWA; $('#cWa').onchange = function () { st.statusWA = this.value; st.halaman = 1; muatCrm(); };
    $('#cTag').onchange = function () { st.tag = this.value; st.halaman = 1; muatCrm(); };
    $('#cSync').onclick = function () { var b = this; sibuk(b, true); api('crm.sync', {}).then(function (r) { sibuk(b, false); toast(r.message, !r.success); muatCrm(true); }); };
    $('#cImport').onclick = importCsv;
    $('#cDup').onclick = periksaDuplikat;
    $$('#massal [data-m]').forEach(function (b) { b.onclick = function () { aksiMassal(b.dataset.m, b); }; });
    muatCrm();
  };
  function crmData() { var st = S.crm; return { cari: st.cari, segmen: st.segmen, filter: st.filter, statusWA: st.statusWA, tag: st.tag, halaman: st.halaman, per: 50 }; }
  function muatCrm(fresh) {
    var st = S.crm;
    muat('crm.stats', {}, function (r) {
      if (!r.success) return;
      var s = r.data;
      var K = [['', 'Total Kontak', s.total, 'group'], ['waTerverifikasi', 'WA Terverifikasi', s.waTerdaftar, 'verified'], ['emailValid', 'Email Valid', s.emailValid, 'mail'], ['belumCek', 'Belum Dicek WA', s.belumCek, 'help'], ['optOut', 'Opt-out', s.optOut, 'block'], ['duplikat', 'Duplikat', s.duplikat, 'content_copy']];
      $('#crmKpi').innerHTML = K.map(function (k) { return '<button class="card mini-kpi" data-f="' + k[0] + '" aria-pressed="' + (st.filter === k[0]) + '"><span>' + ik(k[3]) + k[1] + '</span><b>' + angka(k[2]) + '</b></button>'; }).join('');
      $$('#crmKpi [data-f]').forEach(function (b) { b.onclick = function () { st.filter = b.dataset.f; st.halaman = 1; $$('#crmKpi [data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); muatCrm(); }; });
      $('#crmSync').textContent = 'Sinkron: ' + relatif(s.syncTerakhir);
      var seg = s.segmen || {};
      $('#crmSeg').innerHTML = '<div class="seg">' + ['Semua'].concat(Object.keys(seg)).map(function (k) { return '<button data-seg="' + esc(k) + '" aria-pressed="' + (st.segmen === k) + '">' + esc(k) + ' <span class="muted">' + angka(k === 'Semua' ? s.total : seg[k]) + '</span></button>'; }).join('') + '</div>';
      $$('#crmSeg [data-seg]').forEach(function (b) { b.onclick = function () { st.segmen = b.dataset.seg; st.halaman = 1; muatCrm(); }; });
    }, { fresh: fresh });
    muat('crm.list', crmData(), function (r) {
      if (!r.success) { $('#tCrm').innerHTML = '<tr><td colspan="7">' + gagalBox(r) + '</td></tr>'; return; }
      var d = r.data, ct = $('#cTag');
      if (ct && ct.options.length <= 1) Object.keys(d.facet.tag || {}).forEach(function (tg) { ct.insertAdjacentHTML('beforeend', '<option' + (tg === st.tag ? ' selected' : '') + '>' + esc(tg) + '</option>'); });
      $('#tCrm').innerHTML = d.rows.length ? d.rows.map(function (k) {
        var wa = k.statusWA === 'Terdaftar' ? '<span class="wa-b ya">✓ WA</span>' : k.statusWA === 'Tidak Terdaftar' ? '<span class="wa-b tidak">✕ bukan WA</span>' : '<span class="wa-b belum">? belum dicek</span>';
        return '<tr data-id="' + esc(k.id) + '" class="' + (st.pilih[k.id] ? 'terpilih ' : '') + (k.masalah || k.duplikat ? 'masalah' : '') + '"><td><input type="checkbox" class="cek" data-pilih aria-label="Pilih ' + esc(k.nama) + '"' + (st.pilih[k.id] ? ' checked' : '') + '></td>' +
          '<td><button class="row" data-detail style="gap:10px;flex-wrap:nowrap;text-align:left"><span class="ava-s" style="background:' + warnaDari(k.nama) + '">' + esc(inisial(k.nama)) + '</span><span><span class="t1">' + esc(k.nama) + (k.optOut ? ' <span class="chip c-err" style="font-size:10px">opt-out</span>' : '') + '</span><span class="t2"><span class="chip ' + (k.segmen === 'Pembeli' ? 'c-ok' : 'c-pk') + '" style="font-size:10.5px;padding:0 7px">' + esc(k.segmen) + '</span>' + (k.duplikat ? ' <span class="chip c-warn" style="font-size:10.5px;padding:0 7px">duplikat</span>' : '') + '</span></span></button></td>' +
          '<td>' + (k.email ? ik(k.emailValid === 'YA' ? 'check_circle' : 'warning', k.emailValid === 'YA' ? '' : '') + ' ' + esc(k.email) : '<span class="muted">—</span>') + '</td>' +
          '<td><span class="mono">' + esc(k.wa || '—') + '</span> ' + (k.wa ? wa + ' <a href="https://wa.me/' + hp62(k.wa) + '" target="_blank" rel="noopener" title="Buka chat" style="color:var(--ok)">' + ik('open_in_new') + '</a>' : '') + '</td>' +
          '<td>' + (k.tag ? k.tag.split(/\s*,\s*/).map(function (x) { return '<span class="chip c-info" style="margin:1px">' + esc(x) + '</span>'; }).join('') : '<span class="muted">—</span>') + '</td>' +
          '<td><span class="t2">' + (k.terakhir ? esc(waktu(k.terakhir)) : 'belum pernah') + '</span></td><td class="ac num">' + angka(k.jumlahPesan) + '</td></tr>';
      }).join('') : '<tr><td colspan="7"><div class="empty">' + ik('group') + '<b>Tidak ada kontak</b><span>Ubah filter, atau tekan Sinkron Sekarang.</span></div></td></tr>';
      $$('#tCrm tr[data-id]').forEach(function (tr) {
        $('[data-pilih]', tr).onchange = function () { if (this.checked) st.pilih[tr.dataset.id] = 1; else delete st.pilih[tr.dataset.id]; tr.classList.toggle('terpilih', this.checked); barMassal(); };
        $('[data-detail]', tr).onclick = function () { detailKontak(tr.dataset.id); };
      });
      $('#cAll').checked = false;
      $('#cAll').onchange = function () { var on = this.checked; $$('#tCrm [data-pilih]').forEach(function (c) { c.checked = on; c.onchange(); }); };
      var pg = $('#pgCrm'); pg.innerHTML = ''; pg.appendChild(pager(d, function (h) { st.halaman = h; muatCrm(); }));
      barMassal();
    }, { fresh: fresh });
  }
  function barMassal() { var n = Object.keys(S.crm.pilih).length, m = $('#massal'); if (!m) return; m.hidden = !n; $('#mJml').textContent = n + ' dipilih'; }
  function aksiMassal(aksi, btn) {
    var ids = Object.keys(S.crm.pilih);
    if (aksi === 'batal') { S.crm.pilih = {}; $$('#tCrm [data-pilih]').forEach(function (c) { c.checked = false; c.closest('tr').classList.remove('terpilih'); }); barMassal(); return; }
    if (aksi === 'blast') { S.wa.presetIds = ids; S.wa.tab = 'blast'; location.hash = '#wa'; return; }
    if (aksi === 'ekspor') { sibuk(btn, true); api('crm.export', { filter: { ids: ids } }).then(function (r) { sibuk(btn, false); if (!r.success) return toast(r.message, true); unduh('kontak-terpilih.csv', csv(r.data.header, r.data.rows)); }); return; }
    var lanjut = function (nilai) {
      if (aksi === 'deteksiWA') {
        var bagian = []; for (var i = 0; i < ids.length; i += 50) bagian.push(ids.slice(i, i + 50));
        sibuk(btn, true, '0/' + ids.length);
        var selesai = 0;
        var jalan = function (n) {
          if (n >= bagian.length) { sibuk(btn, false); toast('Deteksi WA selesai untuk ' + ids.length + ' kontak.'); muatCrm(true); return; }
          api('crm.bulk', { ids: bagian[n], aksi: 'deteksiWA' }).then(function (r) { if (!r.success) { sibuk(btn, false); return toast(r.message, true); } selesai += bagian[n].length; btn.innerHTML = '<span class="spin"></span> ' + selesai + '/' + ids.length; jalan(n + 1); });
        };
        return jalan(0);
      }
      sibuk(btn, true);
      api('crm.bulk', { ids: ids, aksi: aksi, nilai: nilai }).then(function (r) { sibuk(btn, false); toast(r.message, !r.success); if (r.success) { S.crm.pilih = {}; muatCrm(true); } });
    };
    if (aksi === 'tag') {
      var m = modal('<h3 style="font-size:18px;font-weight:800">Beri tag ke ' + ids.length + ' kontak</h3><div class="fld" style="margin:14px 0"><label for="mTag">Nama tag</label><input class="inp" id="mTag" maxlength="30" placeholder="contoh: VIP, webinar-okt"></div><div class="row" style="justify-content:flex-end"><button class="btn btn-n" data-tutup>Batal</button><button class="btn btn-p" id="mTagOk">Simpan</button></div>');
      $('#mTagOk', m.el).onclick = function () { var v = $('#mTag', m.el).value.trim(); if (!v) return; m.tutup(); lanjut(v); };
      return;
    }
    if (aksi === 'optout') return konfirmasi('Opt-out ' + ids.length + ' kontak?', 'Kontak opt-out tidak akan masuk blast (notifikasi transaksional seperti status pesanan tetap terkirim).', 'Opt-out').then(function (ya) { if (ya) lanjut(); });
    lanjut();
  }
  function detailKontak(id) {
    var lap = $('#lapisan'), dr = document.createElement('div');
    dr.className = 'drawer'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-label', 'Detail kontak');
    dr.innerHTML = '<div class="drawer-h"><h3 style="font-size:17px;font-weight:800;flex:1">Detail Kontak</h3><button class="btn btn-n btn-i" data-x aria-label="Tutup">' + ik('close') + '</button></div><div class="drawer-b"><div class="skel" style="height:300px"></div></div>';
    var scrim = document.createElement('div'); scrim.className = 'scrim on'; scrim.style.zIndex = 84; scrim.style.display = 'block';
    lap.appendChild(scrim); lap.appendChild(dr);
    var tutup = function () { dr.remove(); scrim.remove(); document.removeEventListener('keydown', ek); };
    var ek = function (e) { if (e.key === 'Escape') tutup(); };
    document.addEventListener('keydown', ek); scrim.onclick = tutup; $('[data-x]', dr).onclick = tutup;
    api('crm.detail', { id: id }).then(function (r) {
      if (!r.success) { $('.drawer-b', dr).innerHTML = gagalBox(r); return; }
      var k = r.data.kontak, info = k.info || {};
      $('.drawer-b', dr).innerHTML =
        '<div class="row" style="flex-wrap:nowrap;gap:12px"><span class="ava-s" style="width:52px;height:52px;font-size:17px;background:' + warnaDari(k.nama) + '">' + esc(inisial(k.nama)) + '</span><div><b style="font:800 17px var(--fh)">' + esc(k.nama) + '</b><div class="row" style="gap:6px;margin-top:4px"><span class="chip ' + (k.segmen === 'Pembeli' ? 'c-ok' : 'c-pk') + '">' + esc(k.segmen) + '</span><span class="chip c-mut">' + esc(k.sumber) + '</span></div></div></div>' +
        '<div class="row">' + (k.wa ? '<a class="btn btn-ok btn-s" href="https://wa.me/' + hp62(k.wa) + '" target="_blank" rel="noopener">' + ik('chat') + 'WhatsApp</a>' : '') + (k.email ? '<a class="btn btn-n btn-s" href="mailto:' + esc(k.email) + '">' + ik('mail') + 'Email</a>' : '') + (k.wa ? '<button class="btn btn-n btn-s" data-salin="' + esc(k.wa) + '">' + ik('content_copy') + 'Salin nomor</button>' : '') + '</div>' +
        '<div class="grid g2" style="gap:12px"><div class="fld"><label>Nama</label><input class="inp" id="dNama" value="' + esc(k.nama) + '"></div><div class="fld"><label>WhatsApp</label><input class="inp" id="dWa" value="' + esc(k.wa) + '"></div></div>' +
        '<div class="fld"><label>Email</label><input class="inp" id="dEmail" value="' + esc(k.email) + '"></div>' +
        '<div class="fld"><label>Tag <small>(pisahkan dengan koma)</small></label><input class="inp" id="dTag" value="' + esc(k.tag) + '"></div>' +
        '<div class="fld"><label>Catatan</label><textarea class="ta" id="dCat" style="min-height:70px">' + esc(k.catatan) + '</textarea></div>' +
        '<label class="sw"><input type="checkbox" id="dOpt"' + (k.optOut ? ' checked' : '') + '><span class="tr"></span>Opt-out (jangan masukkan ke blast)</label>' +
        '<button class="btn btn-p" id="dSimpan">' + ik('save') + 'Simpan Kontak</button>' +
        (info.JumlahOrder ? '<dl class="kv"><dt>Jumlah order</dt><dd>' + info.JumlahOrder + ' (' + (info.Lunas || 0) + ' lunas)</dd><dt>Total belanja</dt><dd>' + rp(info.TotalBelanja) + '</dd><dt>Sumber pertama</dt><dd>' + esc(info.Sumber || '-') + '</dd><dt>Status WA</dt><dd>' + esc(k.statusWA || 'belum dicek') + '</dd></dl>' : '') +
        (r.data.pesanan.length ? '<div><b style="font:800 14px var(--fh)">Pesanan</b><div class="stack" style="gap:6px;margin-top:8px">' + r.data.pesanan.map(function (o) { return '<div class="row sb" style="padding:8px 10px;border-radius:10px;background:var(--side);font-size:13px"><span class="mono">' + esc(o.id) + '</span><span>' + rp(o.total) + '</span><span class="chip ' + (CHIP_ST[o.status] || '') + '">' + esc(o.status) + '</span></div>'; }).join('') + '</div></div>' : '') +
        '<div><b style="font:800 14px var(--fh)">Catat interaksi</b><div class="row" style="margin-top:8px"><select class="sel" id="iKanal" style="width:auto"><option>Telepon</option><option>WA Manual</option><option>Email Manual</option><option>Kunjungan</option><option>Catatan</option></select><input class="inp" id="iRing" placeholder="Ringkasan…" style="flex:1;min-width:160px"><button class="btn btn-n btn-s" id="iOk">' + ik('add') + 'Catat</button></div></div>' +
        '<div><b style="font:800 14px var(--fh)">Timeline</b><div class="tl" style="margin-top:10px">' + (r.data.timeline.length ? r.data.timeline.map(function (x) { return '<div class="tl-i"><span class="tl-d">' + ik(x.kanal === 'WhatsApp' || x.kanal === 'WA Manual' ? 'chat' : x.kanal === 'Email' || x.kanal === 'Email Manual' ? 'mail' : x.kanal === 'Telepon' ? 'call' : 'sticky_note_2') + '</span><div><div style="font-size:13.5px">' + esc(x.ringkasan) + '</div><small>' + esc(waktu(x.waktu)) + ' · ' + esc(x.kanal) + ' · ' + esc(x.oleh || '') + (x.status ? ' · ' + esc(x.status) : '') + '</small></div></div>'; }).join('') : '<p class="muted" style="margin:0">Belum ada interaksi.</p>') + '</div></div>';
      var sl = $('[data-salin]', dr); if (sl) sl.onclick = function () { salin(sl.dataset.salin); };
      $('#dSimpan', dr).onclick = function () {
        var b = this; sibuk(b, true);
        api('crm.save', { kontak: { id: k.id, nama: $('#dNama', dr).value, wa: $('#dWa', dr).value, email: $('#dEmail', dr).value, tag: $('#dTag', dr).value, catatan: $('#dCat', dr).value, optOut: $('#dOpt', dr).checked } }).then(function (x) { sibuk(b, false); toast(x.message, !x.success); if (x.success) muatCrm(true); });
      };
      $('#iOk', dr).onclick = function () {
        var v = $('#iRing', dr).value.trim(); if (!v) return;
        var b = this; sibuk(b, true);
        api('crm.interaksi', { kontakId: k.id, kanal: $('#iKanal', dr).value, ringkasan: v }).then(function (x) { sibuk(b, false); toast(x.message, !x.success); if (x.success) { tutup(); detailKontak(id); } });
      };
    });
  }
  function parseCsv(teks) {
    teks = teks.replace(/^﻿/, '');
    var baris1 = teks.split(/\r?\n/)[0] || '', pemisah = (baris1.match(/;/g) || []).length > (baris1.match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < teks.length; i++) {
      var c = teks[i];
      if (q) { if (c === '"' && teks[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true; else if (c === pemisah) { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }
  function importCsv() {
    var m = modal('<h3 style="font-size:18px;font-weight:800">Import kontak dari CSV</h3><p class="muted" style="margin:6px 0 14px">Kolom: <b>nama, email, wa, segmen, tag</b> (tag boleh dipisah titik koma). Cocok untuk ekspor marketplace, peserta webinar, dll. Nomor dinormalisasi otomatis ke 08…</p>' +
      '<div class="row" style="margin-bottom:12px"><button class="btn btn-n btn-s" id="tpl">' + ik('description') + 'Unduh template CSV</button></div><input type="file" accept=".csv,text/csv" id="fCsv" class="inp"><div id="pv" style="margin-top:12px"></div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-n" data-tutup>Batal</button><button class="btn btn-p" id="iJalan" disabled>' + ik('upload') + 'Import</button></div>');
    var data = [];
    $('#tpl', m.el).onclick = function () { unduh('template-kontak.csv', csv(['nama', 'email', 'wa', 'segmen', 'tag'], [['Siti Aminah', 'siti@email.com', '081234567890', 'Webinar', 'webinar-okt;prospek']])); };
    $('#fCsv', m.el).onchange = function () {
      var f = this.files[0]; if (!f) return;
      f.text().then(function (t) {
        var r = parseCsv(t); if (r.length < 2) { $('#pv', m.el).innerHTML = '<div class="isu error">' + ik('error') + 'File kosong atau tanpa baris data.</div>'; return; }
        var h = r[0].map(function (x) { return x.trim().toLowerCase().replace(/[^a-z]/g, ''); });
        var idx = function (al) { for (var i = 0; i < al.length; i++) { var j = h.indexOf(al[i]); if (j > -1) return j; } return -1; };
        var iN = idx(['nama', 'name', 'namalengkap']), iE = idx(['email', 'surel']), iW = idx(['wa', 'whatsapp', 'nowa', 'hp', 'nohp', 'telepon', 'phone', 'nomor']), iS = idx(['segmen', 'segment', 'kategori']), iT = idx(['tag', 'tags', 'label']);
        data = r.slice(1).map(function (x) { return { nama: x[iN] || '', email: iE > -1 ? x[iE] : '', wa: iW > -1 ? x[iW] : '', segmen: iS > -1 ? x[iS] : '', tag: iT > -1 ? x[iT] : '' }; }).slice(0, 5000);
        $('#pv', m.el).innerHTML = '<div class="isu info">' + ik('info') + '<span><b>' + data.length + '</b> baris terbaca. Kolom dikenali: ' + [['nama', iN], ['email', iE], ['wa', iW], ['segmen', iS], ['tag', iT]].filter(function (x) { return x[1] > -1; }).map(function (x) { return x[0]; }).join(', ') + '.</span></div>';
        $('#iJalan', m.el).disabled = !data.length || (iW < 0 && iE < 0);
      });
    };
    $('#iJalan', m.el).onclick = function () { var b = this; sibuk(b, true, 'Mengimpor…'); api('crm.import', { rows: data }).then(function (r) { sibuk(b, false); toast(r.message, !r.success); if (r.success) { m.tutup(); muatCrm(true); } }); };
  }
  function periksaDuplikat() {
    var m = modal('<h3 style="font-size:18px;font-weight:800">Kontak duplikat</h3><p class="muted" style="margin:6px 0 14px">Kontak dengan nomor WA atau email yang sama. Pilih kontak utama lalu gabungkan — tag, catatan, dan jumlah pesan digabung.</p><div id="dupIsi"><div class="skel" style="height:160px"></div></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-n" data-tutup>Tutup</button></div>', 'lebar');
    api('crm.duplikat', {}).then(function (r) {
      var el = $('#dupIsi', m.el); if (!r.success) { el.innerHTML = gagalBox(r); return; }
      if (!r.data.length) { el.innerHTML = '<div class="empty">' + ik('task_alt') + '<b>Tidak ada duplikat</b></div>'; return; }
      el.innerHTML = r.data.map(function (g, gi) {
        return '<div class="card" style="box-shadow:none;border:1.5px solid var(--line);margin-bottom:10px;padding:14px"><div class="row sb" style="margin-bottom:8px"><b>' + esc(g.kunci) + '</b><button class="btn btn-p btn-s" data-g="' + gi + '">' + ik('merge') + 'Gabungkan</button></div>' +
          g.kontak.map(function (k, i) { return '<label class="cek" style="display:flex;padding:6px 0;font-size:13.5px"><input type="radio" name="u' + gi + '" value="' + esc(k.id) + '"' + (i === 0 ? ' checked' : '') + '><b>' + esc(k.nama) + '</b> <span class="muted">· ' + esc(k.sumber) + ' · ' + esc(k.segmen) + ' · ' + esc(k.email || k.wa) + '</span></label>'; }).join('') + '</div>';
      }).join('');
      $$('[data-g]', el).forEach(function (b) {
        b.onclick = function () {
          var g = r.data[Number(b.dataset.g)], utama = $('input[name="u' + b.dataset.g + '"]:checked', el).value;
          sibuk(b, true);
          api('crm.merge', { utama: utama, gabung: g.kontak.map(function (k) { return k.id; }).filter(function (x) { return x !== utama; }) }).then(function (x) { sibuk(b, false); toast(x.message, !x.success); if (x.success) { b.closest('.card').remove(); muatCrm(true); } });
        };
      });
    });
  }

  // ---------------------------------------------------------------- WHATSAPP & NOTIFIKASI
  HAL.wa = function (p) {
    p.insertAdjacentHTML('beforeend', '<div class="card" style="padding:0 20px"><div class="tabs" role="tablist">' + [['blast', 'campaign', 'Blast WhatsApp'], ['antrean', 'outbox', 'Antrean & Riwayat'], ['konfig', 'tune', 'Konfigurasi']].map(function (t) { return '<button role="tab" data-t="' + t[0] + '" aria-selected="' + (S.wa.tab === t[0]) + '">' + ik(t[1]) + t[2] + '</button>'; }).join('') + '</div></div><div id="waIsi" class="stack" style="gap:18px"></div>');
    $$('.tabs [data-t]', p).forEach(function (b) { b.onclick = function () { S.wa.tab = b.dataset.t; $$('.tabs [data-t]', p).forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); tabWa(); }; });
    tabWa();
  };
  function tabWa() { clearInterval(polling); clearInterval(S.wa.oto); var el = $('#waIsi'); el.innerHTML = ''; ({ blast: tabBlast, antrean: tabAntrean, konfig: tabKonfig })[S.wa.tab](el); }

  function tabBlast(el) {
    var B = S.wa;
    B.rows = B.rows || []; B.batch = B.batch || 20;
    el.insertAdjacentHTML('beforeend',
      '<div id="blastAktif"></div>' +
      '<div class="grid g2"><div class="card"><div class="card-h"><div><h2>1. Pilih Sasaran</h2><p>Sumber default CRM Kontak (opt-out otomatis dibuang).</p></div></div><div class="stack">' +
        '<div class="grid g2" style="gap:10px"><div class="fld"><label for="bSum">Sumber</label><select class="sel" id="bSum"><option value="crm">CRM Kontak</option><option value="pesanan">Pesanan</option><option value="manual">Tempel manual</option></select></div><div class="fld" id="bF1"></div></div>' +
        '<div id="bF2"></div>' +
        '<div class="row"><button class="btn btn-p btn-s" id="bMuat">' + ik('group_add') + 'Muat Penerima</button><button class="btn btn-n btn-s" id="bDeteksi" disabled>' + ik('verified') + 'Deteksi Nomor WA</button></div>' +
        '<div id="bRing" class="row" style="gap:6px"></div>' +
        '<label class="cek" style="font-size:13.5px"><input type="checkbox" id="bHanyaWa"> Kirim hanya ke nomor terdeteksi WhatsApp</label>' +
        '<div class="tbl-wrap" style="max-height:340px;overflow:auto;margin:0;border:1px solid var(--line);border-radius:12px"><table class="tbl" style="min-width:420px"><thead><tr><th style="width:36px"><input type="checkbox" class="cek" id="bAll" checked aria-label="Pilih semua"></th><th>Nama</th><th>Nomor</th><th>WA</th></tr></thead><tbody id="bTbl"><tr><td colspan="4"><div class="empty">' + ik('group') + '<span>Tekan <b>Muat Penerima</b>.</span></div></td></tr></tbody></table></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><div><h2>2. Tulis Pesan</h2><p>Variabel diisi otomatis per penerima.</p></div></div><div class="stack">' +
        '<div class="fld"><label for="bJudul">Judul internal</label><input class="inp" id="bJudul" placeholder="contoh: Promo payday Oktober" maxlength="80"></div>' +
        '<div class="row" style="gap:6px">' + ['{nama}', '{produk}', '{link}', '{brand}'].map(function (v) { return '<button class="btn btn-n btn-s" data-var="' + v + '">' + v + '</button>'; }).join('') + '</div>' +
        '<textarea class="ta" id="bPesan" placeholder="Halo {nama} 👋 …">' + esc(B.pesan || 'Halo {nama} 💖\nPromo spesial {produk} masih berlaku hari ini. Cek di {link}\n\nBalas STOP bila tidak ingin menerima pesan lagi.') + '</textarea>' +
        '<div class="wa-prev"><div class="bub" id="bPrev"></div></div>' +
        '<h2 style="font-size:15px;font-weight:800;margin-top:6px">3. Ukuran Batch & Jeda</h2>' +
        '<div class="row"><div class="seg" id="bBatch">' + [10, 20, 50].map(function (n) { return '<button data-n="' + n + '" aria-pressed="' + (B.batch === n) + '">' + n + '/batch</button>'; }).join('') + '</div><div class="fld" style="width:150px"><input class="inp" id="bJeda" value="' + esc(B.jeda || '5') + '" aria-label="Jeda antar pesan (detik)" placeholder="5 atau 3-8"></div></div>' +
        '<p class="hint" id="bRingkas" style="margin:0"></p>' +
        '<button class="btn btn-p" id="bMulai" style="min-height:46px" disabled>' + ik('rocket_launch') + 'Mulai Blast</button>' +
        '<p class="hint" style="margin:0">' + ik('shield') + ' Tips anti-banned: mulai batch 10, jeda acak ≥5 detik (mis. 3-8), gunakan nomor yang sudah "hangat", hindari link sama ke ratusan orang dalam 1 jam.</p>' +
      '</div></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>Riwayat Blast</h2><p>Server tetap mengirim 1 batch per menit walau halaman ini ditutup.</p></div></div><div id="bRiwayat"><div class="skel" style="height:120px"></div></div></div>');
    var isiFilter = function () {
      var s = $('#bSum').value;
      $('#bF1').innerHTML = s === 'crm' ? '<label for="bSeg">Segmen</label><select class="sel" id="bSeg"><option>Semua</option></select>' : s === 'pesanan' ? '<label for="bSt">Status pesanan</label><select class="sel" id="bSt"><option>Semua</option>' + STATUS.map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select>' : '';
      $('#bF2').innerHTML = s === 'manual' ? '<div class="fld"><label for="bMan">Nomor (satu per baris, format <span class="mono">0812xxxx|Nama</span>)</label><textarea class="ta" id="bMan" placeholder="081234567890|Siti\n085712345678|Budi"></textarea></div>' : s === 'crm' ? '<div class="grid g2" style="gap:10px"><div class="fld"><label for="bTag">Tag (opsional)</label><input class="inp" id="bTag" placeholder="mis. VIP"></div><div class="fld"><label for="bSwa">Status WA</label><select class="sel" id="bSwa"><option value="">Semua</option><option>Terdaftar</option></select></div></div>' : '';
      if (s === 'crm') apiQ('crm.stats', {}).then(function (r) { if (r.success && $('#bSeg')) Object.keys(r.data.segmen || {}).forEach(function (k) { $('#bSeg').insertAdjacentHTML('beforeend', '<option>' + esc(k) + '</option>'); }); });
    };
    $('#bSum').onchange = isiFilter; isiFilter();
    var produk = 'produk', link = '', brand = document.querySelector('[data-brand]').textContent;
    apiQ('pengaturan.get', {}).then(function (r) { if (r.success) { link = r.data.nilai.APP_URL || ''; brand = r.data.nilai.NAMA_BRAND || brand; preview(); } });
    if (Api.demo && window.DEMO) produk = window.DEMO.konten.produk.nama;
    else Api.get('konten', {}).then(function (r) { if (r.success) { produk = r.data.produk.nama; preview(); } }).catch(function () {});
    function terpilih() { var hanya = $('#bHanyaWa').checked; return B.rows.filter(function (r) { return r._pilih && r.valid && !r.ganda && !r.optOut && (!hanya || r.statusWA === 'Terdaftar'); }); }
    function preview() {
      var t = terpilih()[0], pesan = $('#bPesan').value;
      $('#bPrev').innerHTML = esc(pesan.replace(/\{nama\}/g, t ? t.nama || 'Kak' : 'Siti').replace(/\{produk\}/g, produk).replace(/\{link\}/g, link || '(APP_URL)').replace(/\{brand\}/g, brand)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') + '<small>' + new Date().toTimeString().slice(0, 5) + ' ✓✓</small>';
      var n = terpilih().length, jeda = String($('#bJeda').value || '5').split('-').map(Number), rata = jeda.length > 1 ? (jeda[0] + jeda[1]) / 2 : jeda[0] || 5;
      var putaran = Math.ceil(n / B.batch);
      $('#bRingkas').innerHTML = n ? '<b>' + n + '</b> penerima → <b>' + putaran + '</b> batch × ' + B.batch + ' · perkiraan ±' + Math.max(1, Math.round((putaran * Math.max(60, B.batch * rata)) / 60)) + ' menit' : 'Belum ada penerima terpilih.';
      $('#bMulai').disabled = !n; $('#bMulai').innerHTML = ik('rocket_launch') + 'Mulai Blast (' + n + ' nomor)';
    }
    function tabel() {
      var tb = $('#bTbl');
      tb.innerHTML = B.rows.length ? B.rows.slice(0, 1000).map(function (r, i) {
        var wa = r.statusWA === 'Terdaftar' ? '<span class="wa-b ya">✓ WA</span>' : r.statusWA === 'Tidak Terdaftar' ? '<span class="wa-b tidak">✕ bukan WA</span>' : '<span class="wa-b belum">?</span>';
        var mati = !r.valid || r.ganda || r.optOut;
        return '<tr style="' + (mati ? 'opacity:.45' : '') + '"><td><input type="checkbox" class="cek" data-i="' + i + '"' + (r._pilih ? ' checked' : '') + (mati ? ' disabled' : '') + '></td><td>' + esc(r.nama || '—') + (r.optOut ? ' <span class="chip c-err">opt-out</span>' : '') + (r.ganda ? ' <span class="chip c-warn">ganda</span>' : '') + '</td><td class="mono">' + esc(r.hp) + (r.valid ? '' : ' <span class="chip c-err">tidak valid</span>') + '</td><td>' + wa + '</td></tr>';
      }).join('') + (B.rows.length > 1000 ? '<tr><td colspan="4" class="muted">… dan ' + (B.rows.length - 1000) + ' lainnya</td></tr>' : '') : '<tr><td colspan="4"><div class="empty">' + ik('group_off') + '<span>Tidak ada penerima.</span></div></td></tr>';
      $$('[data-i]', tb).forEach(function (c) { c.onchange = function () { B.rows[Number(c.dataset.i)]._pilih = c.checked; preview(); }; });
      $('#bDeteksi').disabled = !B.rows.length;
      preview();
    }
    function ringkas(r) { $('#bRing').innerHTML = [['Total', r.total, 'c-mut'], ['Valid', r.valid, 'c-ok'], ['Tidak valid', r.tidakValid, 'c-err'], ['Ganda', r.ganda, 'c-warn'], ['Terdaftar WA', r.terdaftarWA, 'c-ok'], ['Bukan WA', r.tidakTerdaftarWA, 'c-err'], ['Opt-out', r.optOut, 'c-err']].map(function (x) { return '<span class="chip ' + x[2] + '">' + x[0] + ' ' + angka(x[1]) + '</span>'; }).join(''); }
    $('#bMuat').onclick = function () {
      var b = this, s = $('#bSum').value, d = { sumber: s };
      if (s === 'crm') { d.segmen = $('#bSeg').value; d.tag = $('#bTag').value.trim(); d.statusWA = $('#bSwa').value; if (B.presetIds && B.presetIds.length) d.ids = B.presetIds; }
      if (s === 'pesanan') d.status = $('#bSt').value;
      if (s === 'manual') d.manual = $('#bMan').value;
      sibuk(b, true, 'Memuat…');
      api('wa.audience', d).then(function (r) {
        sibuk(b, false); if (!r.success) return toast(r.message, true);
        B.rows = r.data.rows.map(function (x) { x._pilih = x.valid && !x.ganda && !x.optOut; return x; });
        B.sasaran = s === 'crm' ? 'CRM · ' + (d.segmen || 'Semua') + (d.ids ? ' · ' + d.ids.length + ' terpilih' : '') + (d.tag ? ' · tag ' + d.tag : '') : s === 'pesanan' ? 'Pesanan · ' + d.status : 'Manual';
        B.presetIds = null; ringkas(r.data.ringkas); tabel();
      });
    };
    if (B.presetIds && B.presetIds.length) { toast(B.presetIds.length + ' kontak terpilih dari CRM — tekan Muat Penerima.'); setTimeout(function () { $('#bMuat').click(); }, 300); }
    $('#bDeteksi').onclick = function () {
      var b = this, nomor = B.rows.filter(function (r) { return r.valid && !r.ganda && !r.statusWA; }).map(function (r) { return r.hp; });
      if (!nomor.length) return toast('Semua nomor sudah dicek.');
      var bag = []; for (var i = 0; i < nomor.length; i += 50) bag.push(nomor.slice(i, i + 50));
      var n = 0; sibuk(b, true, 'Mengecek 0/' + nomor.length);
      var jalan = function (k) {
        if (k >= bag.length) { sibuk(b, false); toast('Deteksi selesai: ' + nomor.length + ' nomor.'); tabel(); return; }
        api('wa.validate', { nomor: bag[k] }).then(function (r) {
          if (!r.success) { sibuk(b, false); return toast(r.message, true); }
          B.rows.forEach(function (x) { if (r.data.peta[x.hp]) x.statusWA = r.data.peta[x.hp]; });
          n += bag[k].length; b.innerHTML = '<span class="spin"></span> Mengecek ' + n + '/' + nomor.length; tabel(); jalan(k + 1);
        });
      };
      jalan(0);
    };
    $('#bAll').onchange = function () { var on = this.checked; B.rows.forEach(function (r) { if (r.valid && !r.ganda && !r.optOut) r._pilih = on; }); tabel(); };
    $('#bHanyaWa').onchange = preview;
    $('#bPesan').oninput = function () { B.pesan = this.value; preview(); };
    $('#bJeda').oninput = function () { B.jeda = this.value; preview(); };
    $$('[data-var]').forEach(function (v) { v.onclick = function () { var t = $('#bPesan'), a = t.selectionStart || t.value.length; t.value = t.value.slice(0, a) + v.dataset.var + t.value.slice(t.selectionEnd || a); t.focus(); t.oninput(); }; });
    $$('#bBatch [data-n]').forEach(function (b) { b.onclick = function () { B.batch = Number(b.dataset.n); $$('#bBatch [data-n]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); preview(); }; });
    $('#bMulai').onclick = function () {
      var pen = terpilih(); if (!pen.length) return;
      var judul = $('#bJudul').value.trim() || 'Blast ' + new Date().toLocaleDateString('id-ID');
      konfirmasi('Mulai blast ke ' + pen.length + ' nomor?', 'Dikirim bertahap ' + B.batch + ' pesan per batch dengan jeda ' + esc($('#bJeda').value) + ' detik. Anda bisa menghentikannya kapan saja.', 'Mulai Blast').then(function (ya) {
        if (!ya) return;
        var b = $('#bMulai'); sibuk(b, true, 'Membuat antrean…');
        api('wa.blastCreate', { judul: judul, pesan: $('#bPesan').value, ukuranBatch: B.batch, jeda: $('#bJeda').value.trim() || '5', penerima: pen.map(function (r) { return { hp: r.hp, nama: r.nama, id: r.id }; }), sasaran: B.sasaran || '' }).then(function (r) {
          sibuk(b, false); toast(r.message, !r.success); if (r.success) { riwayat(); }
        });
      });
    };
    tabel();
    function riwayat() {
      api('wa.blastList', {}).then(function (r) {
        if (!r.success || !$('#bRiwayat')) return;
        var list = r.data, aktif = list.filter(function (x) { return x.Status === 'Berjalan'; });
        $('#blastAktif').innerHTML = aktif.map(function (x) {
          return '<div class="card" style="border:2px solid var(--ok-bg)"><div class="card-h"><div><span class="chip c-ok"><i></i>Berjalan</span><h2 style="margin-top:6px">' + esc(x.Judul) + '</h2><p>' + esc(x.Sasaran || '') + ' · batch ' + x.UkuranBatch + ' · jeda ' + esc(x.JedaDetik) + ' dtk</p></div><div class="row"><button class="btn btn-p btn-s" data-proses="' + esc(x.BlastID) + '">' + ik('send') + 'Kirim Batch Berikutnya</button><label class="sw" style="font-size:12.5px"><input type="checkbox" data-oto="' + esc(x.BlastID) + '"' + (S.wa.otoId === x.BlastID ? ' checked' : '') + '><span class="tr"></span>Otomatis <span id="otoCd" class="muted"></span></label><button class="btn btn-err btn-s" data-stop="' + esc(x.BlastID) + '">' + ik('stop_circle') + 'Hentikan</button></div></div>' +
            '<div class="prog"><i style="width:' + x.persen + '%"></i></div><div class="row sb" style="margin-top:8px;font-size:13px"><span><b>' + angka(x.Terkirim) + '</b> terkirim · <b>' + angka(x.Gagal) + '</b> gagal · <b>' + angka(x.sisa) + '</b> sisa</span><b>' + x.persen + '%</b></div></div>';
        }).join('');
        $$('[data-proses]').forEach(function (b) { b.onclick = function () { proses(b.dataset.proses, b); }; });
        $$('[data-stop]').forEach(function (b) { b.onclick = function () { konfirmasi('Hentikan blast?', 'Pesan yang belum terkirim akan dibatalkan.', 'Hentikan', true).then(function (ya) { if (!ya) return; sibuk(b, true); api('wa.blastStop', { blastId: b.dataset.stop }).then(function (x) { toast(x.message, !x.success); clearInterval(S.wa.oto); S.wa.otoId = null; riwayat(); }); }); }; });
        $$('[data-oto]').forEach(function (c) { c.onchange = function () { clearInterval(S.wa.oto); S.wa.otoId = c.checked ? c.dataset.oto : null; if (c.checked) otomatis(c.dataset.oto); }; });
        $('#bRiwayat').innerHTML = list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Blast</th><th>Sasaran</th><th>Batch · Jeda</th><th>Progres</th><th>Status</th></tr></thead><tbody>' + list.map(function (x) {
          return '<tr><td><span class="t1">' + esc(x.Judul) + '</span><span class="t2">' + esc(waktu(x.Tanggal)) + '</span></td><td class="t2">' + esc(x.Sasaran || '-') + '</td><td>' + x.UkuranBatch + ' · ' + esc(x.JedaDetik) + ' dtk</td><td style="min-width:140px"><div class="prog" style="height:8px"><i style="width:' + x.persen + '%"></i></div><span class="t2">' + angka(x.Terkirim) + '/' + angka(x.Total) + (x.Gagal ? ' · ' + x.Gagal + ' gagal' : '') + '</span></td><td><span class="chip ' + (x.Status === 'Selesai' ? 'c-ok' : x.Status === 'Berjalan' ? 'c-info' : 'c-mut') + '">' + esc(x.Status) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">' + ik('campaign') + '<span>Belum ada blast.</span></div>';
      });
    }
    function proses(bid, b) { if (b) sibuk(b, true, 'Mengirim…'); return api('wa.blastProcess', { blastId: bid }).then(function (r) { if (b) sibuk(b, false); toast(r.message, !r.success); riwayat(); return r; }); }
    function otomatis(bid) {
      var blast = (S.wa.rowsBlast || {}), jeda = String($('#bJeda').value || '5').split('-').map(Number), rata = jeda.length > 1 ? (jeda[0] + jeda[1]) / 2 : jeda[0] || 5;
      var tunggu = Math.max(30, Math.round(B.batch * rata)), sisa = tunggu;
      S.wa.oto = setInterval(function () {
        if (!document.body.contains($('#bRiwayat'))) { clearInterval(S.wa.oto); return; }
        sisa--; var cd = $('#otoCd'); if (cd) cd.textContent = '(' + sisa + ' dtk)';
        if (sisa <= 0) { sisa = tunggu; proses(bid).then(function (r) { if (r && r.data && r.data.blast && r.data.blast.Status !== 'Berjalan') { clearInterval(S.wa.oto); S.wa.otoId = null; } }); }
      }, 1000);
    }
    riwayat();
    jadwalPolling(riwayat, 20000, 90000);
  }

  function tabAntrean(el) {
    var f = S.wa.qf = S.wa.qf || { status: 'Semua', kanal: 'Semua' };
    el.insertAdjacentHTML('beforeend', '<div class="kpi6" id="qKpi" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"></div>' +
      '<div class="card" style="padding-bottom:12px"><div class="card-h"><div><h2>Antrean Notifikasi</h2><p>300 pesan terakhir (WhatsApp & email)</p></div><div class="row"><select class="sel" id="qSt" style="width:auto"><option>Semua</option><option>Antri</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select><select class="sel" id="qKn" style="width:auto"><option>Semua</option><option value="WA">WhatsApp</option><option value="EMAIL">Email</option></select><button class="btn btn-p btn-s" id="qProses">' + ik('send') + 'Proses Sekarang</button><button class="btn btn-n btn-s" id="qUlang">' + ik('replay') + 'Ulangi yang Gagal</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th>Event</th><th>Pesan</th><th>Status</th></tr></thead><tbody id="qTbl"><tr><td colspan="6"><div class="skel" style="height:200px"></div></td></tr></tbody></table></div></div>');
    $('#qSt').value = f.status; $('#qKn').value = f.kanal;
    var muatQ = function () {
      muat('notif.queue', { status: f.status, kanal: f.kanal }, function (r) {
        if (!r.success) { $('#qTbl').innerHTML = '<tr><td colspan="6">' + gagalBox(r) + '</td></tr>'; return; }
        var rg = r.data.ringkas;
        $('#qKpi').innerHTML = [['Antri', 'Menunggu', 'schedule', 'c-warn'], ['Terkirim', 'Terkirim', 'done_all', 'c-ok'], ['Gagal', 'Gagal', 'error', 'c-err'], ['Batal', 'Dibatalkan', 'block', 'c-mut']].map(function (k) { return '<div class="card mini-kpi" style="cursor:default"><span>' + ik(k[2]) + k[1] + '</span><b>' + angka(rg[k[0]] || 0) + '</b></div>'; }).join('');
        $('#qTbl').innerHTML = r.data.rows.length ? r.data.rows.map(function (x) {
          var c = { Antri: 'c-warn', Terkirim: 'c-ok', Gagal: 'c-err', Batal: 'c-mut' }[x.status] || '';
          return '<tr><td><span class="t1">' + esc(waktu(x.dikirim || x.dibuat)) + '</span></td><td><span class="chip ' + (x.kanal === 'WA' ? 'c-ok' : 'c-info') + '">' + ik(x.kanal === 'WA' ? 'chat' : 'mail') + (x.kanal === 'WA' ? 'WhatsApp' : 'Email') + '</span></td><td><span class="t1">' + esc(x.nama || '-') + '</span><span class="t2 mono">' + esc(x.tujuan) + '</span></td><td><span class="chip c-pk">' + esc(x.event) + '</span></td><td class="t2" style="max-width:280px;white-space:normal">' + esc(x.pesan) + '</td><td><span class="chip ' + c + '"><i></i>' + esc(x.status) + '</span>' + (x.respon && x.status !== 'Terkirim' ? '<span class="t2">' + esc(x.respon) + '</span>' : '') + '</td></tr>';
        }).join('') : '<tr><td colspan="6"><div class="empty">' + ik('outbox') + '<span>Antrean kosong.</span></div></td></tr>';
      });
    };
    $('#qSt').onchange = function () { f.status = this.value; muatQ(); };
    $('#qKn').onchange = function () { f.kanal = this.value; muatQ(); };
    $('#qProses').onclick = function () { var b = this; sibuk(b, true); api('notif.processNow', {}).then(function (r) { sibuk(b, false); toast(r.message, !r.success); muatQ(); }); };
    $('#qUlang').onclick = function () { var b = this; sibuk(b, true); api('notif.retry', {}).then(function (r) { sibuk(b, false); toast(r.message, !r.success); muatQ(); }); };
    muatQ(); jadwalPolling(muatQ, 20000, 90000);
  }

  function tabKonfig(el) {
    el.innerHTML = '<div class="skel" style="height:400px"></div>';
    api('notif.config', {}).then(function (r) {
      if (!r.success) { el.innerHTML = gagalBox(r); return; }
      var c = r.data;
      el.innerHTML =
        '<div class="grid g2"><div class="card"><div class="card-h"><div><h2>' + ik('chat') + ' WhatsApp (Fonnte)</h2><p>Token disimpan aman di Script Properties — tidak pernah tampil utuh.</p></div></div><div class="stack">' +
          '<label class="sw besar"><input type="checkbox" id="kWa"' + (c.waAktif ? ' checked' : '') + '><span class="tr"></span><span>Notifikasi WhatsApp <b id="kWaL">' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</b></span></label>' +
          '<div class="fld"><label for="kTok">Token Fonnte</label><input class="inp" id="kTok" type="password" autocomplete="off" placeholder="' + (c.tokenAda ? esc(c.token) + ' (tersimpan — kosongkan bila tidak diubah)' : 'Tempel token dari fonnte.com → Device') + '"><small>Ketik <span class="mono">__HAPUS__</span> untuk menghapus token.</small></div>' +
          '<div class="row"><button class="btn btn-n btn-s" id="kDev">' + ik('cell_tower') + 'Cek Perangkat</button><span id="kDevH" class="muted" style="font-size:13px"></span></div>' +
          '<div class="row"><input class="inp" id="kTesNo" placeholder="08… untuk tes" style="flex:1;min-width:150px" value="' + esc(c.adminWa) + '"><button class="btn btn-n btn-s" id="kTesWa">' + ik('send') + 'Kirim Tes WA</button></div>' +
          '<div class="grid g2" style="gap:10px"><div class="fld"><span class="lbl-f">Batch default</span><div class="seg" id="kBatch">' + [10, 20, 50].map(function (n) { return '<button data-n="' + n + '" aria-pressed="' + (c.batchDefault === n) + '">' + n + '</button>'; }).join('') + '</div></div><div class="fld"><label for="kJeda">Jeda (detik)</label><input class="inp" id="kJeda" value="' + esc(c.jeda) + '"></div></div>' +
          '<label class="sw"><input type="checkbox" id="kDet"' + (c.deteksiOtomatis ? ' checked' : '') + '><span class="tr"></span>Deteksi otomatis nomor WA kontak baru (±10 menit)</label>' +
        '</div></div>' +
        '<div class="card"><div class="card-h"><div><h2>' + ik('mail') + ' Email</h2><p>Dikirim dari akun Google pemilik script. Sisa kuota hari ini: <b>' + (c.kuotaEmail == null ? '-' : c.kuotaEmail) + '</b></p></div></div><div class="stack">' +
          '<label class="sw besar"><input type="checkbox" id="kEm"' + (c.emailAktif ? ' checked' : '') + '><span class="tr"></span><span>Notifikasi Email <b id="kEmL">' + (c.emailAktif ? 'AKTIF' : 'NONAKTIF') + '</b></span></label>' +
          '<div class="fld"><label for="kNama">Nama pengirim</label><input class="inp" id="kNama" value="' + esc(c.namaPengirim) + '"></div>' +
          '<div class="row"><input class="inp" id="kTesEm" type="email" placeholder="email@contoh.com" style="flex:1;min-width:150px" value="' + esc(c.adminEmail) + '"><button class="btn btn-n btn-s" id="kTesEmail">' + ik('send') + 'Kirim Tes Email</button></div>' +
          '<div class="grid g2" style="gap:10px"><div class="fld"><label for="kAwa">WA pemilik (notif order baru)</label><input class="inp" id="kAwa" value="' + esc(c.adminWa) + '" placeholder="08…"></div><div class="fld"><label for="kAem">Email pemilik</label><input class="inp" id="kAem" value="' + esc(c.adminEmail) + '"></div></div>' +
          '<div class="fld"><label for="kUrl">URL landing page <small>(untuk variabel {link})</small></label><input class="inp" id="kUrl" value="' + esc(c.appUrl) + '"></div>' +
          '<p class="hint" style="margin:0">' + ik(c.trigger ? 'check_circle' : 'warning') + ' Trigger pengirim (tiap 1 menit): <b>' + (c.trigger ? 'aktif' : 'belum terpasang — jalankan pasangTrigger() di editor') + '</b></p>' +
        '</div></div></div>' +
        '<div class="card"><div class="card-h"><div><h2>Matriks Notifikasi Otomatis</h2><p>Pilih kejadian mana yang dikirim lewat WhatsApp / email, dan ubah isi pesannya.</p></div></div>' +
          '<div class="tbl-wrap"><table class="tbl" style="min-width:560px"><thead><tr><th>Kejadian</th><th>WhatsApp</th><th>Email</th><th class="ac">Template</th></tr></thead><tbody>' + c.matriks.map(function (m, i) {
            return '<tr><td><span class="t1">' + esc(m.label) + '</span><span class="t2 mono">' + esc(m.kode) + '</span></td><td><label class="sw"><input type="checkbox" data-mw="' + i + '"' + (m.wa ? ' checked' : '') + '><span class="tr"></span></label></td><td><label class="sw"><input type="checkbox" data-me="' + i + '"' + (m.email ? ' checked' : '') + '><span class="tr"></span></label></td><td class="ac"><button class="btn btn-n btn-s" data-ed="' + i + '">' + ik('edit') + 'Ubah</button></td></tr>' +
              '<tr data-row="' + i + '" hidden><td colspan="4" style="background:#fbfaff"><div class="grid g2"><div class="stack"><div class="fld"><label>Subjek email</label><input class="inp" data-sj="' + i + '" value="' + esc(m.subjek) + '"></div><div class="fld"><label>Isi pesan</label><textarea class="ta" data-ps="' + i + '">' + esc(m.pesan) + '</textarea><small>Variabel: {nama} {produk} {pesanan} {total} {metode} {linkBayar} {linkAkses} {cs} {wa} {email} {sumber} {brand} {link}</small></div><button class="btn btn-n btn-s" data-def="' + i + '" style="justify-self:start">' + ik('restart_alt') + 'Kembalikan bawaan</button></div><div><span class="lbl-f">Pratinjau</span><div class="wa-prev" style="margin-top:6px"><div class="bub" data-pv="' + i + '"></div></div></div></div></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-p" id="kSimpan" style="min-height:46px">' + ik('save') + 'Simpan Konfigurasi</button></div></div>';
      var contoh = { nama: 'Siti', produk: 'GlowDigital Master Bundle', pesanan: 'GD-AB12CDE', total: 'Rp 149.000', metode: 'WhatsApp', linkBayar: 'https://…/bayar', linkAkses: 'https://drive.google.com/…', cs: '0812…', wa: '0812…', email: 'siti@mail.com', sumber: 'Facebook Ads', tombol: 'hero', brand: 'GlowDigital', link: c.appUrl || 'https://…' };
      var pv = function (i) { var t = $('[data-ps="' + i + '"]').value.replace(/\{(\w+)\}/g, function (a, k) { return contoh[k] != null ? contoh[k] : a; }); $('[data-pv="' + i + '"]').innerHTML = esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>'); };
      c.matriks.forEach(function (m, i) { pv(i); $('[data-ps="' + i + '"]').oninput = function () { pv(i); }; });
      $$('[data-ed]').forEach(function (b) { b.onclick = function () { var r = $('[data-row="' + b.dataset.ed + '"]'); r.hidden = !r.hidden; }; });
      $$('[data-def]').forEach(function (b) { b.onclick = function () { var i = b.dataset.def; $('[data-ps="' + i + '"]').value = c.matriks[i].pesanDefault; $('[data-sj="' + i + '"]').value = c.matriks[i].subjekDefault; pv(i); }; });
      var batch = c.batchDefault;
      $$('#kBatch [data-n]').forEach(function (b) { b.onclick = function () { batch = Number(b.dataset.n); $$('#kBatch [data-n]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }; });
      $('#kWa').onchange = function () { $('#kWaL').textContent = this.checked ? 'AKTIF' : 'NONAKTIF'; };
      $('#kEm').onchange = function () { $('#kEmL').textContent = this.checked ? 'AKTIF' : 'NONAKTIF'; };
      $('#kDev').onclick = function () { var b = this; sibuk(b, true); api('wa.device', {}).then(function (r) { sibuk(b, false); $('#kDevH').innerHTML = r.success ? '<span class="chip ' + (r.data.status === 'connect' ? 'c-ok' : 'c-err') + '"><i></i>' + esc(r.data.status) + '</span> ' + esc(r.data.device) + ' · paket ' + esc(r.data.paket) + ' · kuota ' + esc(r.data.kuota) : '<span class="chip c-err">' + esc(r.message) + '</span>'; }); };
      $('#kTesWa').onclick = function () { var b = this; sibuk(b, true); api('wa.test', { nomor: $('#kTesNo').value }).then(function (r) { sibuk(b, false); toast(r.message, !r.success); }); };
      $('#kTesEmail').onclick = function () { var b = this; sibuk(b, true); api('email.test', { email: $('#kTesEm').value }).then(function (r) { sibuk(b, false); toast(r.message, !r.success); }); };
      $('#kSimpan').onclick = function () {
        var b = this, matriks = {};
        c.matriks.forEach(function (m, i) { matriks[m.kode] = { wa: $('[data-mw="' + i + '"]').checked, email: $('[data-me="' + i + '"]').checked, pesan: $('[data-ps="' + i + '"]').value, subjek: $('[data-sj="' + i + '"]').value }; });
        sibuk(b, true, 'Menyimpan…');
        api('notif.configSave', { token: $('#kTok').value.trim(), waAktif: $('#kWa').checked, emailAktif: $('#kEm').checked, batchDefault: batch, jeda: $('#kJeda').value.trim(), deteksiOtomatis: $('#kDet').checked, namaPengirim: $('#kNama').value, appUrl: $('#kUrl').value.trim(), adminWa: $('#kAwa').value.trim(), adminEmail: $('#kAem').value.trim(), matriks: matriks }).then(function (r) {
          sibuk(b, false); toast(r.message, !r.success); if (r.success) { $('#kTok').value = ''; tabKonfig(el); }
        });
      };
    });
  }

  // ---------------------------------------------------------------- KONTEN
  HAL.konten = function (p) {
    p.insertAdjacentHTML('beforeend', '<div class="card hero-card"><div><h2>Konten dikelola di Google Sheets</h2><p class="muted" style="margin:2px 0 0">Ubah harga, bonus, testimoni, FAQ, dan gambar langsung di spreadsheet — tanpa menyentuh kode.</p></div><div class="row"><a class="btn btn-n" id="kSheet" target="_blank" rel="noopener" href="#">' + ik('table_view') + 'Buka Google Sheets</a><button class="btn btn-n" id="kJson" title="Cadangan statis untuk folder data/ di repo">' + ik('backup') + 'Unduh konten.json</button><button class="btn btn-p" id="kSegar">' + ik('refresh') + 'Segarkan Cache</button></div></div>' +
      '<div class="grid g-7-5"><div class="card"><div class="card-h"><div><h2>Pemeriksaan Konten</h2><p>Validasi otomatis isi Sheets (harga angka, status testimoni, gambar…)</p></div></div><div id="kIsu" class="stack"><div class="skel" style="height:160px"></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>Ringkasan</h2><p id="kCache"></p></div></div><div id="kRing"></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>Peta Sheet → Bagian Halaman</h2><p>Tab mana mengatur bagian apa di landing page.</p></div></div><div class="tbl-wrap"><table class="tbl" style="min-width:520px"><thead><tr><th>Sheet</th><th>Mengatur</th><th>Catatan</th></tr></thead><tbody>' + [
        ['Produk', 'Nama, harga normal & diskon, link pembayaran, WA CS, gambar hero (slideshow), lencana, hitung mundur', 'Gambar: satu link per baris (Alt+Enter) — link Google Drive otomatis dikompres'],
        ['Konten', 'Semua teks: headline, sub-headline, judul tiap seksi, penawaran, footer, kebijakan privasi', 'Pakai *teks* untuk huruf tebal'],
        ['Keunggulan', 'Bilah 4 keunggulan di bawah hero', 'Ikon = nama Material Symbols'],
        ['Masalah · Solusi', 'Kartu masalah · daftar solusi & angka statistik', 'Tipe POIN atau STAT'],
        ['Modul', 'Kartu isi produk + slideshow gambar per kartu', 'Banyak gambar → slideshow otomatis'],
        ['Bonus', 'Daftar bonus di kartu harga', 'Status "Habis" → tampil dicoret'],
        ['Testimoni', 'Kartu testimoni (flip otomatis + popup)', 'Status "Sembunyi" → tidak tampil; Screenshot tampil di sisi belakang'],
        ['FAQ', 'Tanya-jawab akordeon', ''],
        ['Pengaturan', 'Form checkout on/off, kupu-kupu, WA mengambang, cache, notifikasi', 'Lebih mudah diubah dari menu Pengaturan']
      ].map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td class="t2" style="white-space:normal">' + r[2] + '</td></tr>'; }).join('') + '</tbody></table></div></div>');
    $('#kJson').onclick = function () { var b = this; sibuk(b, true); Api.get('konten', {}).then(function (r) { sibuk(b, false); if (!r.success) return toast(r.message, true); unduh('konten.json', JSON.stringify({ data: r.data }), 'application/json'); toast('Simpan sebagai data/konten.json di repo (opsional) — dipakai bila server sibuk.'); }).catch(function (e) { sibuk(b, false); toast(e.message, true); }); };
    $('#kSegar').onclick = function () { var b = this; sibuk(b, true, 'Menyegarkan…'); api('konten.segarkan', {}).then(function (r) { sibuk(b, false); toast(r.message, !r.success); muatK(true); }); };
    var muatK = function (fresh) {
      muat('konten.cek', {}, function (r) {
        if (!r.success) { $('#kIsu').innerHTML = gagalBox(r); return; }
        var d = r.data; $('#kSheet').href = d.sheetUrl;
        $('#kCache').textContent = 'Cache konten: ' + d.cacheMenit + ' menit (edit di Sheets langsung terbaca lewat trigger onEdit).';
        $('#kIsu').innerHTML = d.isu.length ? d.isu.map(function (x) { return '<div class="isu ' + x.level + '">' + ik(x.level === 'error' ? 'error' : x.level === 'warning' ? 'warning' : 'info') + '<span><b>' + esc(x.sheet) + ':</b> ' + esc(x.pesan) + '</span></div>'; }).join('') : '<div class="isu info" style="background:var(--ok-bg);color:#065f46">' + ik('task_alt') + '<span>Semua konten valid.</span></div>';
        var g = d.ringkas;
        $('#kRing').innerHTML = '<dl class="kv"><dt>Testimoni tampil</dt><dd>' + g.testimoniTampil + '</dd><dt>Testimoni disembunyikan</dt><dd>' + g.testimoniSembunyi + '</dd><dt>Modul</dt><dd>' + g.modul + ' (' + g.gambarModul + ' gambar)</dd><dt>Bonus</dt><dd>' + g.bonus + ' (' + g.bonusHabis + ' habis)</dd><dt>FAQ</dt><dd>' + g.faq + '</dd></dl><a class="btn btn-g btn-s" href="./" target="_blank" rel="noopener" style="margin-top:14px">' + ik('open_in_new') + 'Pratinjau landing page</a>';
      }, { fresh: fresh });
    };
    muatK();
  };

  // ---------------------------------------------------------------- MIGRASI
  var SHEET_IMPORT = [['Produk', 1], ['Konten', 1], ['Pengaturan', 0], ['Keunggulan', 1], ['Masalah', 1], ['Solusi', 1], ['Modul', 1], ['Bonus', 1], ['Testimoni', 1], ['FAQ', 1], ['Pesanan', 1], ['KlikOrder', 0], ['CRM_Kontak', 1]];
  HAL.migrasi = function (p) {
    p.insertAdjacentHTML('beforeend',
      '<div class="card"><div class="card-h"><div><h2>Struktur Database</h2><p>Migrasi skema bersifat aditif: sheet/kolom yang kurang ditambahkan di akhir — data lama tidak pernah dihapus.</p></div><button class="btn btn-p btn-s" id="mSkema">' + ik('build') + 'Periksa & Perbarui Struktur</button></div><div id="mStatus"><div class="skel" style="height:140px"></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>Import dari Spreadsheet Lama</h2><p>Spreadsheet lama hanya <b>dibaca</b>. Kolom dicocokkan per nama header (alias didukung), aman diulang tanpa data dobel.</p></div></div><div class="stack">' +
        '<div class="fld"><label for="mSrc">URL atau ID spreadsheet lama</label><input class="inp" id="mSrc" placeholder="https://docs.google.com/spreadsheets/d/…/edit"><small>Harus bisa dibuka oleh akun Google pemilik Apps Script ini.</small></div>' +
        '<div class="fld"><span class="lbl-f">Data yang diimpor</span><div class="row" style="gap:6px 16px">' + SHEET_IMPORT.map(function (s) { return '<label class="cek" style="font-size:13.5px"><input type="checkbox" data-sh="' + s[0] + '"' + (s[1] ? ' checked' : '') + '>' + s[0] + '</label>'; }).join('') + '</div><small>KlikOrder (log klik) default mati karena bisa sangat besar — impor terpisah bila perlu.</small></div>' +
        '<label class="sw"><input type="checkbox" id="mTimpa"><span class="tr"></span>Timpa data yang sudah ada (konten). Pesanan berstatus Baru selalu diperbarui (delta sync).</label>' +
        '<div class="row"><button class="btn btn-n" id="mPindai">' + ik('plagiarism') + 'Pindai (Dry-run)</button><button class="btn btn-p" id="mJalan">' + ik('download') + 'Jalankan Import</button></div>' +
        '<div id="mHasil"></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>Checklist Pindah (Cutover)</h2></div></div><ol style="margin:0;padding-left:20px;display:grid;gap:6px"><li>Pasang app baru → login admin → <b>Pindai</b> → <b>Jalankan Import</b>.</li><li>Cek Pesanan, CRM, Testimoni, gambar & harga. Uji satu pesanan dari landing page.</li><li>Tepat sebelum pindah: <b>Jalankan Import sekali lagi</b> (menangkap data baru di app lama).</li><li>Ganti link iklan & bio ke alamat baru. Arsipkan deployment lama (datanya tetap aman).</li></ol></div>');
    var muatS = function () {
      api('migrasi.status', {}).then(function (r) {
        if (!r.success) { $('#mStatus').innerHTML = gagalBox(r); return; }
        var d = r.data;
        $('#mStatus').innerHTML = '<div class="row" style="margin-bottom:12px"><span class="chip ' + (d.perluMigrasi ? 'c-warn' : 'c-ok') + '"><i></i>' + (d.perluMigrasi ? 'Perlu diperbarui' : 'Struktur lengkap') + '</span><span class="muted" style="font-size:13px">Versi skema ' + d.versi + ' / ' + d.target + '</span></div><div class="tbl-wrap"><table class="tbl" style="min-width:420px"><thead><tr><th>Sheet</th><th>Status</th><th class="ac">Baris data</th></tr></thead><tbody>' +
          d.sheets.map(function (s) { return '<tr><td><b>' + esc(s.nama) + '</b></td><td>' + (!s.ada ? '<span class="chip c-err">belum ada</span>' : s.kolomKurang.length ? '<span class="chip c-warn">kurang kolom: ' + esc(s.kolomKurang.join(', ')) + '</span>' : '<span class="chip c-ok">lengkap</span>') + '</td><td class="ac num">' + angka(s.baris) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      });
    };
    $('#mSkema').onclick = function () { var b = this; sibuk(b, true, 'Memeriksa…'); api('migrasi.skema', {}).then(function (r) { sibuk(b, false); toast(r.message, !r.success); muatS(); }); };
    var jalan = function (dry, b) {
      var src = $('#mSrc').value.trim(); if (!src) { toast('Tempel URL spreadsheet lama dulu.', true); return; }
      var sheets = $$('[data-sh]').filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.sh; });
      sibuk(b, true, dry ? 'Memindai…' : 'Mengimpor…');
      api(dry ? 'import.pindai' : 'import.jalankan', { sumber: src, sheets: sheets, timpa: $('#mTimpa').checked }, { timeout: 330000 }).then(function (r) {
        sibuk(b, false);
        if (!r.success) { $('#mHasil').innerHTML = '<div class="isu error">' + ik('error') + esc(r.message) + '</div>'; return; }
        var d = r.data;
        $('#mHasil').innerHTML = '<div class="isu ' + (d.dryRun ? 'info' : '') + '" style="' + (d.dryRun ? '' : 'background:var(--ok-bg);color:#065f46') + '">' + ik(d.dryRun ? 'plagiarism' : 'task_alt') + '<span><b>' + (d.dryRun ? 'Hasil pindai (belum ada yang ditulis)' : 'Import selesai') + '</b> — sumber: ' + esc(d.sumber.nama) + '</span></div>' +
          '<div class="tbl-wrap" style="margin-top:10px"><table class="tbl" style="min-width:460px"><thead><tr><th>Data</th><th class="ac">Di app lama</th><th class="ac">Ditambah</th><th class="ac">Diperbarui</th><th class="ac">Dilewati</th></tr></thead><tbody>' +
          Object.keys(d.report).map(function (k) { var x = d.report[k]; return '<tr><td><b>' + esc(k) + '</b>' + (x.tidakAda ? ' <span class="chip c-mut">tidak ada di sumber</span>' : '') + (x.error ? ' <span class="chip c-err">' + esc(x.error) + '</span>' : '') + '</td><td class="ac num">' + angka(x.sumber || 0) + '</td><td class="ac num"><b>' + angka(x.ditambah || 0) + '</b></td><td class="ac num">' + angka(x.diperbarui || 0) + '</td><td class="ac num">' + angka(x.dilewati || 0) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
          (d.warnings.length ? '<div class="stack" style="margin-top:10px;gap:6px">' + d.warnings.map(function (w) { return '<div class="isu warning">' + ik('warning') + esc(w) + '</div>'; }).join('') + '</div>' : '');
        if (!d.dryRun) muatS();
      });
    };
    $('#mPindai').onclick = function () { jalan(true, this); };
    $('#mJalan').onclick = function () { var b = this; konfirmasi('Jalankan import?', 'Data dari spreadsheet lama ditulis ke database app ini. Aman diulang — tidak membuat data dobel.', 'Jalankan Import').then(function (ya) { if (ya) jalan(false, b); }); };
    muatS();
  };

  // ---------------------------------------------------------------- PENGATURAN
  HAL.pengaturan = function (p) {
    p.insertAdjacentHTML('beforeend', '<div class="grid g2"><div class="card"><div class="card-h"><div><h2>Setelan Landing Page</h2><p>Tersimpan di sheet Pengaturan.</p></div></div><div id="pSet"><div class="skel" style="height:300px"></div></div></div>' +
      '<div class="stack" style="gap:18px"><div class="card"><div class="card-h"><div><h2>' + ik('key') + ' Akun Admin</h2><p>Sandi disimpan sebagai hash + salt di Script Properties.</p></div></div><div class="stack">' +
        '<div class="fld"><label for="aUser">Nama pengguna</label><input class="inp" id="aUser" value="' + esc(sesi.user) + '" autocomplete="username"></div>' +
        '<div class="fld"><label for="aLama">Sandi lama</label><input class="inp" id="aLama" type="password" autocomplete="current-password"></div>' +
        '<div class="fld"><label for="aBaru">Sandi baru <small>(min. 10 karakter, huruf + angka)</small></label><input class="inp" id="aBaru" type="password" autocomplete="new-password"></div>' +
        '<div class="row"><button class="btn btn-p" id="aSimpan">' + ik('lock_reset') + 'Ganti Sandi</button><button class="btn btn-err" id="aSemua">' + ik('devices') + 'Keluar dari semua perangkat</button></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>' + ik('lock') + ' Link Akses Produk</h2><p>Dikirim otomatis saat pesanan ditandai Lunas. Disimpan rahasia (Script Properties).</p></div></div><div class="stack"><div id="rStat" class="muted" style="font-size:13px"></div><div class="row"><input class="inp" id="rLink" type="password" autocomplete="off" placeholder="https://drive.google.com/drive/folders/…" style="flex:1;min-width:200px"><button class="btn btn-p btn-s" id="rSimpan">' + ik('save') + 'Simpan</button></div></div></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h2>Status Sistem</h2><p>Trigger, cache, kuota, dan ukuran data.</p></div><button class="btn btn-n btn-s" id="sSegar">' + ik('refresh') + 'Periksa ulang</button></div><div id="sStat"><div class="skel" style="height:160px"></div></div></div>');
    var LBL = { NAMA_BRAND: ['Nama brand', 'text'], FORM_ORDER_AKTIF: ['Formulir checkout sebelum diarahkan', 'sw'], KUPU_KUPU_AKTIF: ['Kupu-kupu mengikuti kursor', 'sw'], WA_MENGAMBANG_AKTIF: ['Tombol WhatsApp mengambang', 'sw'], CACHE_MENIT: ['Cache konten (menit)', 'num'], ADMIN_WA: ['WA pemilik (notif pesanan baru)', 'text'], ADMIN_EMAIL: ['Email pemilik', 'text'], PENGINGAT_BAYAR_JAM: ['Pengingat bayar otomatis setelah (jam, 0 = mati)', 'num'], CRM_SYNC_MENIT: ['Sinkron CRM otomatis (menit)', 'num'], KLIK_MAKS_PER_MENIT: ['Batas klik tercatat / pengunjung / menit', 'num'], APP_URL: ['URL landing page', 'text'] };
    api('pengaturan.get', {}).then(function (r) {
      if (!r.success) { $('#pSet').innerHTML = gagalBox(r); return; }
      var d = r.data;
      $('#pSet').innerHTML = '<div class="stack">' + Object.keys(LBL).map(function (k) {
        var l = LBL[k], v = d.nilai[k];
        if (l[1] === 'sw') return '<label class="sw"><input type="checkbox" data-k="' + k + '"' + (/^ya$/i.test(v) ? ' checked' : '') + '><span class="tr"></span><span>' + esc(l[0]) + '<br><small class="muted">' + esc(d.keterangan[k] || '') + '</small></span></label>';
        return '<div class="fld"><label for="s_' + k + '">' + esc(l[0]) + '</label><input class="inp" id="s_' + k + '" data-k="' + k + '" value="' + esc(v) + '"' + (l[1] === 'num' ? ' inputmode="numeric"' : '') + '></div>';
      }).join('') + '<button class="btn btn-p" id="pSimpan">' + ik('save') + 'Simpan Setelan</button></div>';
      $('#pSimpan').onclick = function () {
        var b = this, nilai = {};
        $$('#pSet [data-k]').forEach(function (i) { nilai[i.dataset.k] = i.type === 'checkbox' ? (i.checked ? 'YA' : 'TIDAK') : i.value.trim(); });
        sibuk(b, true, 'Menyimpan…'); api('pengaturan.simpan', { nilai: nilai }).then(function (x) { sibuk(b, false); toast(x.message, !x.success); if (x.success) $$('[data-brand]').forEach(function (e) { e.textContent = nilai.NAMA_BRAND || e.textContent; }); });
      };
      var rk = d.rahasia.filter(function (x) { return x.kunci === 'LINK_AKSES_PRODUK'; })[0];
      $('#rStat').innerHTML = rk && rk.ada ? ik('check_circle') + ' Tersimpan: <span class="mono">' + esc(rk.samar) + '</span>' : ik('warning') + ' Belum diisi — pembeli lunas akan menerima pesan "(link akses dikirim oleh admin)".';
    });
    $('#rSimpan').onclick = function () { var b = this, v = $('#rLink').value.trim(); if (!v) return; sibuk(b, true); api('rahasia.simpan', { kunci: 'LINK_AKSES_PRODUK', nilai: v }).then(function (r) { sibuk(b, false); toast(r.message, !r.success); if (r.success) { $('#rLink').value = ''; $('#rStat').innerHTML = ik('check_circle') + ' Tersimpan: <span class="mono">' + esc(r.data.samar) + '</span>'; } }); };
    $('#aSimpan').onclick = function () {
      var b = this; sibuk(b, true);
      api('auth.gantiSandi', { username: $('#aUser').value.trim(), lama: $('#aLama').value, baru: $('#aBaru').value }).then(function (r) {
        sibuk(b, false); toast(r.message, !r.success);
        if (r.success && r.data && r.data.token) { sesi.token = r.data.token; sesi.user = r.data.user; sesi.wajibGanti = false; sesi.exp = Date.now() + 432e5; Sesi.set(sesi); $('#akunNama').textContent = sesi.user; $('#aLama').value = ''; $('#aBaru').value = ''; }
      });
    };
    $('#aSemua').onclick = function () { konfirmasi('Keluar dari semua perangkat?', 'Semua sesi admin (termasuk perangkat ini) akan diakhiri.', 'Keluar Semua', true).then(function (ya) { if (ya) api('auth.logoutAll', {}).then(function () { keluar('Semua sesi telah diakhiri. Silakan masuk lagi.'); }); }); };
    var muatSys = function (fresh) {
      api('sistem.status', fresh ? { _fresh: true } : {}).then(function (r) {
        if (!r.success) { $('#sStat').innerHTML = gagalBox(r); return; }
        var s = r.data, w = s.warmTerakhir;
        $('#sStat').innerHTML = '<div class="grid g2"><dl class="kv"><dt>Versi backend</dt><dd>' + esc(s.versi) + '</dd><dt>Skema database</dt><dd>' + s.skema + ' / ' + s.skemaTarget + '</dd><dt>Trigger tiap menit</dt><dd>' + (s.trigger.tickMenit ? '<span class="chip c-ok">aktif</span>' : '<span class="chip c-err">belum — jalankan pasangTrigger()</span>') + '</dd><dt>Trigger edit Sheets</dt><dd>' + (s.trigger.onEdit ? '<span class="chip c-ok">aktif</span>' : '<span class="chip c-warn">belum</span>') + '</dd><dt>Warmup server</dt><dd>' + (s.keepWarm ? 'aktif' : 'dimatikan') + (w ? ' · ' + esc(waktu(w.at)) : '') + '</dd></dl>' +
          '<dl class="kv"><dt>Script Properties</dt><dd>' + s.propsKB + ' KB / 500 KB</dd><dt>Buffer klik</dt><dd>' + s.bufferKlik + ' klik menunggu</dd><dt>Antrean notifikasi</dt><dd>' + (s.antrianAda ? 'ada yang menunggu' : 'kosong') + '</dd><dt>Kuota email hari ini</dt><dd>' + (s.kuotaEmail == null ? '-' : s.kuotaEmail) + '</dd><dt>Baris data</dt><dd>' + Object.keys(s.baris || {}).map(function (k) { return k + ' ' + angka(s.baris[k]); }).join(' · ') + '</dd><dt>Database</dt><dd><a href="' + esc(s.spreadsheetUrl) + '" target="_blank" rel="noopener" style="color:var(--pk)">Buka spreadsheet</a></dd></dl></div>';
      });
    };
    $('#sSegar').onclick = function () { muatSys(true); };
    muatSys();
  };

  // ======================================================================
  // MULAI
  // ======================================================================
  function mulai() {
    if (sesi) { masukApp(); api('auth.me', {}).then(function (r) { if (r.success) { $$('[data-brand]').forEach(function (e) { e.textContent = r.data.brand || e.textContent; }); sesi.wajibGanti = r.data.wajibGanti; Sesi.set(sesi); } }).catch(function () {}); }
    else tampilLogin('');
  }
  var siap = Api.demo ? new Promise(function (ok) { var s = document.createElement('script'); s.src = 'js/demo-data.js?v=1.0.0'; s.onload = ok; s.onerror = ok; document.head.appendChild(s); }) : Promise.resolve();
  siap.then(mulai);
})();
