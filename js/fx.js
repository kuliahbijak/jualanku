/**
 * Fx — efek interaktif ringan (tanpa pustaka):
 * reveal saat scroll, hitung naik angka, slideshow otomatis (fade + Ken Burns + swipe),
 * sorotan cahaya mengikuti kursor, kemiringan 3D, tombol magnet, ledakan kilau saat klik,
 * hitung mundur. Semua menghormati prefers-reduced-motion.
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var halus = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- reveal saat scroll ----------
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  function reveal(root) {
    (root || document).querySelectorAll('[data-reveal]:not(.in)').forEach(function (el, i) {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', ((el.dataset.revealDelay || 0) * 1) + 'ms');
      if (!io || reduce) el.classList.add('in'); else io.observe(el);
    });
  }

  // ---------- hitung naik ----------
  function countUp(el, opt) {
    opt = opt || {};
    var raw = el.dataset.count || el.textContent, m = String(raw).match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!m) return;
    var awalan = m[1], akhiran = m[3], titik = /\./.test(m[2]) && !/,/.test(m[2]);
    var target = Number(m[2].replace(/[.,]/g, '')), dari = opt.dari != null ? opt.dari : 0;
    var fmt = function (n) { var s = String(Math.round(n)); return titik || target >= 1000 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : s; };
    if (reduce) { el.textContent = awalan + fmt(target) + akhiran; return; }
    var t0 = 0, dur = opt.dur || 1400;
    var jalan = function (t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = awalan + fmt(dari + (target - dari) * e) + akhiran;
      if (k < 1) requestAnimationFrame(jalan);
    };
    var mulai = function () { requestAnimationFrame(jalan); };
    if (!io) return mulai();
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); mulai(); } }, { threshold: 0.5 });
    o.observe(el);
  }

  // ---------- slideshow ----------
  function Slideshow(root, opt) {
    opt = opt || {};
    var slides = Array.prototype.slice.call(root.querySelectorAll('.sl-item'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('.sl-dot'));
    if (slides.length < 2) { muat(slides[0]); return { stop: function () {} }; }
    var i = 0, timer = 0, jeda = false, terlihat = true, interval = opt.interval || 4200;
    function muat(s) { if (!s) return; var im = s.querySelector('img[data-src]'); if (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); } }
    function ke(n, user) {
      slides[i].classList.remove('aktif'); if (dots[i]) { dots[i].classList.remove('aktif'); dots[i].setAttribute('aria-current', 'false'); }
      i = (n + slides.length) % slides.length;
      muat(slides[i]); muat(slides[(i + 1) % slides.length]);
      slides[i].classList.add('aktif'); if (dots[i]) { dots[i].classList.add('aktif'); dots[i].setAttribute('aria-current', 'true'); }
      if (user) jadwal();
    }
    function jadwal() { clearTimeout(timer); if (reduce) return; timer = setTimeout(function () { if (!jeda && terlihat && !document.hidden) ke(i + 1); jadwal(); }, interval); }
    muat(slides[0]); muat(slides[1]);
    slides[0].classList.add('aktif'); if (dots[0]) dots[0].classList.add('aktif');
    dots.forEach(function (d, n) { d.addEventListener('click', function (e) { e.stopPropagation(); ke(n, true); }); });
    var prev = root.querySelector('.sl-prev'), next = root.querySelector('.sl-next');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); ke(i - 1, true); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); ke(i + 1, true); });
    root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') jeda = true; });
    root.addEventListener('pointerleave', function () { jeda = false; });
    // swipe
    var sx = 0, sy = 0, geser = false;
    root.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; geser = true; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (!geser) return; geser = false;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { ke(i + (dx < 0 ? 1 : -1), true); root.dataset.swiped = '1'; setTimeout(function () { delete root.dataset.swiped; }, 350); }
    }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { terlihat = es[0].isIntersecting; }, { threshold: 0.2 }).observe(root);
    setTimeout(jadwal, opt.mulaiSetelah || 0);
    return { stop: function () { clearTimeout(timer); }, ke: ke };
  }

  // ---------- sorotan cahaya + kemiringan 3D ----------
  function spotlight(root) {
    if (!halus) return;
    (root || document).querySelectorAll('[data-spot]').forEach(function (el) {
      if (el._spot) return; el._spot = 1;
      var tilt = el.hasAttribute('data-tilt') && !reduce, raf = 0, ev = null;
      el.addEventListener('pointermove', function (e) {
        ev = e; if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0; var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
          el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
          if (tilt) el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 7).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 9).toFixed(2) + 'deg) translateY(-6px)';
        });
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  // ---------- tombol magnet ----------
  function magnet(root) {
    if (!halus || reduce) return;
    (root || document).querySelectorAll('[data-magnet]').forEach(function (el) {
      if (el._mg) return; el._mg = 1;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.setProperty('--tx', (x * 0.12).toFixed(1) + 'px'); el.style.setProperty('--ty', (y * 0.22).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
    });
  }

  // ---------- ledakan kilau ----------
  function kilau(x, y, n) {
    if (reduce) return;
    n = n || 14;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span'); s.className = 'kilau';
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = 40 + Math.random() * 50;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--kx', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--ky', (Math.sin(a) * d).toFixed(0) + 'px');
      s.style.background = ['#ff8db5', '#ffd36b', '#ffffff', '#E8407A'][i % 4];
      document.body.appendChild(s);
      setTimeout(function (el) { el.remove(); }.bind(null, s), 800);
    }
  }

  // ---------- hitung mundur ----------
  function countdown(akhir, onTick, onSelesai) {
    var t = 0;
    function jalan() {
      var sisa = Math.max(0, akhir - Date.now());
      onTick({ hari: Math.floor(sisa / 864e5), jam: Math.floor(sisa / 36e5) % 24, menit: Math.floor(sisa / 6e4) % 60, detik: Math.floor(sisa / 1e3) % 60, sisa: sisa });
      if (sisa <= 0) { clearInterval(t); if (onSelesai) onSelesai(); }
    }
    jalan(); t = setInterval(jalan, 1000);
    return function () { clearInterval(t); };
  }

  window.Fx = { reduce: reduce, halus: halus, reveal: reveal, countUp: countUp, Slideshow: Slideshow, spotlight: spotlight, magnet: magnet, kilau: kilau, countdown: countdown };
})();
