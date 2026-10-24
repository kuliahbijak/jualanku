/**
 * Kupu — kupu-kupu "hidup" yang mengikuti kursor.
 * - Sayap depan & belakang dikepak terpisah (sayap belakang sedikit tertinggal) dengan
 *   foreshortening 3D + perubahan cahaya, tubuh naik-turun mengikuti kepakan.
 * - Fisika kemudi (steering) + getaran terbang acak, menghadap arah terbang.
 * - Kursor diam → hinggap di dekat ujung kursor; kursor di atas tombol beli → hinggap di tombol.
 * - Layar sentuh: menjelajah sendiri, terbang ke titik yang disentuh lalu hinggap.
 * - Tidak menghalangi klik (pointer-events: none), berhenti saat tab tidak terlihat,
 *   menghormati prefers-reduced-motion (bisa dinyalakan manual lewat tombol 🦋).
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var SVG = '' +
    '<svg viewBox="-56 -52 112 104" width="100%" height="100%" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<radialGradient id="kpF" cx="0.05" cy="0.9" r="1.15"><stop offset="0" stop-color="#5a0026"/><stop offset=".22" stop-color="#9e0c4b"/><stop offset=".5" stop-color="#e8407a"/><stop offset=".78" stop-color="#ff8db5"/><stop offset="1" stop-color="#ffd3e2"/></radialGradient>' +
    '<radialGradient id="kpH" cx="0.05" cy="0.1" r="1.1"><stop offset="0" stop-color="#5a0026"/><stop offset=".25" stop-color="#b40f55"/><stop offset=".6" stop-color="#f0679a"/><stop offset="1" stop-color="#ffc2d6"/></radialGradient>' +
    '<linearGradient id="kpS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#ffe7a3" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="kpB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b0a10"/><stop offset=".5" stop-color="#4a2030"/><stop offset="1" stop-color="#1b0a10"/></linearGradient>' +
    '<clipPath id="kpCF"><path d="M2-9C10-30 30-44 46-42 52-41 53-34 49-27 45-17 43-8 40-2 30 1 14 2 3 1Z"/></clipPath>' +
    '<clipPath id="kpCH"><path d="M3 0C18-2 34 0 39 6 43 12 39 24 31 30 24 35 16 37 11 33 7 28 4 16 3 6Z"/></clipPath>' +
    // sayap depan
    '<g id="kpFW"><path d="M2-9C10-30 30-44 46-42 52-41 53-34 49-27 45-17 43-8 40-2 30 1 14 2 3 1Z" fill="url(#kpF)"/>' +
    '<g clip-path="url(#kpCF)"><path d="M30-46C40-40 50-36 56-30L56-50Z" fill="#2a0a16" opacity=".9"/>' +
    '<path d="M2-9C10-30 30-44 46-42 52-41 53-34 49-27 45-17 43-8 40-2" fill="none" stroke="#2a0a16" stroke-width="6"/>' +
    '<g fill="none" stroke="#3a0d1f" stroke-opacity=".45" stroke-width=".8"><path d="M4-4L45-39"/><path d="M5-3C20-16 34-25 49-29"/><path d="M5-2C20-9 32-14 46-16"/><path d="M5-1L42-5"/><path d="M14-14C20-10 25-10 30-12"/></g>' +
    '<path d="M2-9C10-30 30-44 46-42 52-41 53-34 49-27 45-17 43-8 40-2 30 1 14 2 3 1Z" fill="url(#kpS)"/></g>' +
    '<g fill="#fff"><circle cx="44" cy="-39.5" r="1.3"/><circle cx="48.5" cy="-35" r="1.1"/><circle cx="50" cy="-29.5" r="1.2"/><circle cx="47.6" cy="-22.5" r="1"/><circle cx="45.5" cy="-16" r="1"/><circle cx="43.4" cy="-9.5" r=".9"/><circle cx="38" cy="-40" r="1.6" fill="#ffd9e6"/><circle cx="42" cy="-33" r="1.8" fill="#ffd9e6"/></g></g>' +
    // sayap belakang
    '<g id="kpHW"><path d="M3 0C18-2 34 0 39 6 43 12 39 24 31 30 24 35 16 37 11 33 7 28 4 16 3 6Z" fill="url(#kpH)"/>' +
    '<g clip-path="url(#kpCH)"><path d="M39 6C43 12 39 24 31 30 24 35 16 37 11 33" fill="none" stroke="#2a0a16" stroke-width="7"/>' +
    '<g fill="none" stroke="#3a0d1f" stroke-opacity=".4" stroke-width=".8"><path d="M4 2L38 7"/><path d="M4 3C18 10 28 17 34 25"/><path d="M4 4C12 14 18 24 22 33"/><path d="M4 5L12 32"/></g>' +
    '<path d="M3 0C18-2 34 0 39 6 43 12 39 24 31 30 24 35 16 37 11 33 7 28 4 16 3 6Z" fill="url(#kpS)" opacity=".7"/></g>' +
    '<g fill="#fff"><circle cx="38.5" cy="11" r="1.1"/><circle cx="37" cy="18" r="1.1"/><circle cx="33" cy="25" r="1.1"/><circle cx="26.5" cy="30.5" r="1"/><circle cx="19" cy="33.5" r="1"/><circle cx="13" cy="31.5" r=".9"/></g></g>' +
    '</defs>' +
    '<g class="kp-all">' +
    '<g class="kp-lh"><use href="#kpHW"/><path class="kp-sh" d="M3 0C18-2 34 0 39 6 43 12 39 24 31 30 24 35 16 37 11 33 7 28 4 16 3 6Z" fill="#1b0610" opacity="0"/></g>' +
    '<g class="kp-rh"><use href="#kpHW"/><path class="kp-sh" d="M3 0C18-2 34 0 39 6 43 12 39 24 31 30 24 35 16 37 11 33 7 28 4 16 3 6Z" fill="#1b0610" opacity="0"/></g>' +
    '<g class="kp-lf"><use href="#kpFW"/><path class="kp-sh" d="M2-9C10-30 30-44 46-42 52-41 53-34 49-27 45-17 43-8 40-2 30 1 14 2 3 1Z" fill="#1b0610" opacity="0"/></g>' +
    '<g class="kp-rf"><use href="#kpFW"/><path class="kp-sh" d="M2-9C10-30 30-44 46-42 52-41 53-34 49-27 45-17 43-8 40-2 30 1 14 2 3 1Z" fill="#1b0610" opacity="0"/></g>' +
    // tubuh
    '<g class="kp-body"><path d="M-1.4-16C-4-24-7-31-12-38" fill="none" stroke="#2a0a16" stroke-width=".9" stroke-linecap="round"/><path d="M1.4-16C4-24 7-31 12-38" fill="none" stroke="#2a0a16" stroke-width=".9" stroke-linecap="round"/>' +
    '<ellipse cx="-12.2" cy="-38.4" rx="1.5" ry="2" fill="#2a0a16"/><ellipse cx="12.2" cy="-38.4" rx="1.5" ry="2" fill="#2a0a16"/>' +
    '<ellipse cx="0" cy="12" rx="3.1" ry="15" fill="url(#kpB)"/><g stroke="#ffb1c2" stroke-opacity=".35" stroke-width=".6"><path d="M-2.8 2h5.6M-3 6h6M-3 10h6M-2.9 14h5.8M-2.6 18h5.2M-2.1 22h4.2"/></g>' +
    '<ellipse cx="0" cy="-5" rx="4.3" ry="7.5" fill="url(#kpB)"/><ellipse cx="-1.2" cy="-7" rx="1.2" ry="3.4" fill="#fff" opacity=".18"/>' +
    '<circle cx="0" cy="-14" r="3.6" fill="#24101a"/><circle cx="-2.1" cy="-15" r="1.3" fill="#3b1a28"/><circle cx="2.1" cy="-15" r="1.3" fill="#3b1a28"/><circle cx="-2.4" cy="-15.4" r=".45" fill="#fff" opacity=".8"/><circle cx="1.8" cy="-15.4" r=".45" fill="#fff" opacity=".8"/></g>' +
    '</g></svg>';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el, shadow, wings = {}, shades = [], dust = [], dustI = 0, raf = 0, aktif = false;
  var W = 70, H = 66, skala = 1;
  var s = { x: -80, y: 120, vx: 160, vy: 40, head: 1.6, phase: 0, mode: 'ikut', glide: 0, perchT: 0, orbit: Math.random() * 6 };
  var p = { x: innerWidth * 0.6, y: innerHeight * 0.35, t: 0, touch: false, hinggap: null };
  var wander = { x: innerWidth * 0.5, y: innerHeight * 0.4, t: 0 };
  var last = 0, lastDust = 0;

  function buat() {
    el = document.createElement('div'); el.className = 'kupu'; el.innerHTML = SVG; el.setAttribute('aria-hidden', 'true');
    shadow = document.createElement('div'); shadow.className = 'kupu-bayang';
    document.body.appendChild(shadow); document.body.appendChild(el);
    ['lf', 'rf', 'lh', 'rh'].forEach(function (k) { wings[k] = el.querySelector('.kp-' + k); });
    shades = Array.prototype.slice.call(el.querySelectorAll('.kp-sh'));
    for (var i = 0; i < 14; i++) { var d = document.createElement('span'); d.className = 'kupu-debu'; document.body.appendChild(d); dust.push(d); }
    skala = innerWidth < 640 ? 0.78 : 1;
    // ID unik bila ada lebih dari satu halaman memuat (aman)
  }

  function onMove(e) {
    if (e.pointerType === 'touch') return;
    p.x = e.clientX; p.y = e.clientY; p.t = performance.now(); p.touch = false;
  }
  function onDown(e) {
    if (e.pointerType !== 'touch') return;
    p.x = e.clientX; p.y = e.clientY; p.t = performance.now(); p.touch = true;
    wander.x = e.clientX; wander.y = e.clientY - 30; wander.t = performance.now() + 3500;
  }
  function onOver(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-kupu]') : null;
    p.hinggap = t || null;
  }

  function sudut(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  function langkah(now) {
    raf = requestAnimationFrame(langkah);
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!dt) return;
    var tx, ty, maxV, idle = now - p.t, adaKursor = p.t && !p.touch && idle < 12000;
    var perch = false;

    if (adaKursor) {
      if (p.hinggap && idle < 4000) {
        var r = p.hinggap.getBoundingClientRect();
        tx = Math.max(r.left + 16, Math.min(r.right - 16, p.x + 18)); ty = r.top - 4; maxV = 620; perch = true;
      } else if (idle > 900) {
        tx = p.x + 16; ty = p.y - 20; maxV = 380; perch = true;            // hinggap dekat ujung kursor
      } else {
        s.orbit += dt * 1.4;
        tx = p.x + Math.cos(s.orbit) * 52; ty = p.y - 26 + Math.sin(s.orbit * 1.3) * 26; maxV = 640;
      }
    } else {
      if (now > wander.t) {                                                 // jelajah sendiri
        var m = 50;
        wander.x = m + Math.random() * (innerWidth - 2 * m); wander.y = 70 + Math.random() * (innerHeight * 0.75 - 70);
        wander.t = now + 3000 + Math.random() * 3500;
      }
      tx = wander.x; ty = wander.y; maxV = p.touch && now < wander.t ? 420 : 190;
      perch = p.touch && Math.hypot(tx - s.x, ty - s.y) < 40;
    }

    var dx = tx - s.x, dy = ty - s.y, dist = Math.hypot(dx, dy);
    var k = perch && dist < 60 ? 2.4 : 3.4;
    var dvx = dx * k, dvy = dy * k, dv = Math.hypot(dvx, dvy);
    if (dv > maxV) { dvx *= maxV / dv; dvy *= maxV / dv; }
    s.vx += (dvx - s.vx) * Math.min(1, dt * 4.2);
    s.vy += (dvy - s.vy) * Math.min(1, dt * 4.2);
    var spd = Math.hypot(s.vx, s.vy);
    var duduk = perch && dist < 5 && spd < 25;
    if (!duduk) {                                                          // getaran terbang khas kupu-kupu
      var tt = now / 1000, f = Math.min(1, spd / 120 + 0.35);
      var n = (Math.sin(tt * 7.1 + s.orbit) * 38 + Math.sin(tt * 3.3) * 26) * f;
      var nx = spd > 1 ? -s.vy / spd : 0, ny = spd > 1 ? s.vx / spd : 1;
      s.x += (s.vx + nx * n) * dt; s.y += (s.vy + ny * n + Math.sin(tt * 5.3) * 14 * f) * dt;
    } else { s.x += dx * Math.min(1, dt * 6); s.y += dy * Math.min(1, dt * 6); }

    // arah hadap
    var target = spd > 30 && !duduk ? Math.atan2(s.vy, s.vx) + Math.PI / 2 : (duduk ? -0.35 : s.head);
    s.head += sudut(target - s.head) * Math.min(1, dt * (duduk ? 2.5 : 6));

    // kepakan
    var frek, open;
    if (duduk) {
      s.perchT += dt;
      frek = 0.75;                                                           // buka-tutup perlahan saat hinggap
      s.phase += dt * Math.PI * 2 * frek * (Math.sin(s.perchT * 0.9) > 0.6 ? 0.15 : 1);
    } else {
      s.perchT = 0;
      if (s.glide > 0) s.glide -= dt;
      else if (spd > 140 && Math.random() < dt * 0.35) s.glide = 0.18 + Math.random() * 0.25;   // sesekali meluncur
      frek = Math.min(11, 6.5 + spd / 130);
      if (s.glide <= 0) s.phase += dt * Math.PI * 2 * frek;
    }
    var c = s.glide > 0 && !duduk ? 0.95 : 0.5 + 0.5 * Math.cos(s.phase);
    var eased = Math.pow(c, 0.8);
    open = duduk ? 0.16 + 0.78 * eased : 0.1 + 0.9 * eased;
    var c2 = s.glide > 0 && !duduk ? 0.92 : 0.5 + 0.5 * Math.cos(s.phase - 0.45);
    var open2 = duduk ? 0.2 + 0.74 * Math.pow(c2, 0.8) : 0.14 + 0.86 * Math.pow(c2, 0.8);
    var bob = duduk ? 0 : Math.sin(s.phase) * 2.2;

    wings.rf.setAttribute('transform', 'scale(' + open.toFixed(3) + ' 1)');
    wings.lf.setAttribute('transform', 'scale(' + (-open).toFixed(3) + ' 1)');
    wings.rh.setAttribute('transform', 'scale(' + open2.toFixed(3) + ' 1)');
    wings.lh.setAttribute('transform', 'scale(' + (-open2).toFixed(3) + ' 1)');
    var gelap = ((1 - open) * 0.42).toFixed(3), gelap2 = ((1 - open2) * 0.38).toFixed(3);
    shades[0].setAttribute('opacity', gelap2); shades[1].setAttribute('opacity', gelap2); shades[2].setAttribute('opacity', gelap); shades[3].setAttribute('opacity', gelap);

    el.style.transform = 'translate3d(' + (s.x - W / 2).toFixed(1) + 'px,' + (s.y - H / 2 + bob).toFixed(1) + 'px,0) rotate(' + s.head.toFixed(3) + 'rad) scale(' + skala + ')';
    var alt = duduk ? 6 : 26 + Math.sin(s.phase) * 3;
    shadow.style.transform = 'translate3d(' + (s.x - 20 + alt * 0.5).toFixed(1) + 'px,' + (s.y + alt).toFixed(1) + 'px,0) scale(' + ((0.5 + open * 0.5) * skala).toFixed(2) + ',' + (0.6 * skala).toFixed(2) + ')';
    shadow.style.opacity = duduk ? '.32' : '.18';

    // debu berkilau saat terbang cepat
    if (spd > 280 && now - lastDust > 70) {
      lastDust = now;
      var d = dust[dustI++ % dust.length];
      d.style.left = (s.x - s.vx * 0.03 + (Math.random() - 0.5) * 10).toFixed(0) + 'px';
      d.style.top = (s.y - s.vy * 0.03 + (Math.random() - 0.5) * 10).toFixed(0) + 'px';
      d.style.background = Math.random() < 0.5 ? '#ff8db5' : '#ffd36b';
      d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
    }
  }

  function nyalakan() {
    if (aktif) return; aktif = true;
    if (!el) buat();
    el.style.display = ''; shadow.style.display = '';
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    last = 0; raf = requestAnimationFrame(langkah);
    tandaiTombol(true);
  }
  function matikan() {
    if (!aktif) return; aktif = false;
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerover', onOver);
    if (el) { el.style.display = 'none'; shadow.style.display = 'none'; }
    tandaiTombol(false);
  }
  function pref() { try { return localStorage.getItem('gd_kupu'); } catch (e) { return null; } }
  function setPref(v) { try { localStorage.setItem('gd_kupu', v); } catch (e) {} }
  function tandaiTombol(on) {
    var b = document.getElementById('kupuToggle');
    if (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Sembunyikan kupu-kupu' : 'Tampilkan kupu-kupu'; }
  }

  document.addEventListener('visibilitychange', function () {
    if (!aktif) return;
    if (document.hidden) cancelAnimationFrame(raf); else { last = 0; raf = requestAnimationFrame(langkah); }
  });
  addEventListener('resize', function () { skala = innerWidth < 640 ? 0.78 : 1; }, { passive: true });

  window.Kupu = {
    /** izinkan = setelan dari Sheets (KUPU_KUPU_AKTIF). Pilihan pengunjung (tombol 🦋) diutamakan. */
    mulai: function (izinkan) {
      var b = document.getElementById('kupuToggle');
      if (!izinkan) { if (b) b.hidden = true; return; }
      if (b) {
        b.hidden = false;
        b.onclick = function () { if (aktif) { matikan(); setPref('off'); } else { nyalakan(); setPref('on'); } };
      }
      var pr = pref();
      if (pr === 'on' || (pr !== 'off' && !reduce)) nyalakan(); else tandaiTombol(false);
    },
    nyalakan: nyalakan, matikan: matikan,
    status: function () { return { aktif: aktif, x: s.x, y: s.y, mode: s.mode }; }
  };
})();
