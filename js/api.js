/**
 * Api — lapisan komunikasi ke backend GAS (fetch JSON, tanpa iframe).
 * - POST memakai Content-Type text/plain (menghindari CORS preflight yang ditolak GAS)
 * - beacon() untuk pencatatan klik: tetap terkirim walau halaman langsung berpindah
 * - lokal: cache localStorage aman (try/catch) untuk tampilan instan (stale-while-revalidate)
 */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var URL_GAS = String(CFG.GAS_URL || '').trim();
  var DEMO = !URL_GAS || /GANTI|XXXX/i.test(URL_GAS) || !/^https?:\/\//.test(URL_GAS);

  function timeoutSignal(ms) {
    if (typeof AbortController === 'undefined') return {};
    var c = new AbortController(); setTimeout(function () { c.abort(); }, ms);
    return { signal: c.signal };
  }
  function parse(res) {
    return res.text().then(function (t) {
      try { return JSON.parse(t); } catch (e) { throw new Error('Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Anyone".'); }
    });
  }
  function pesanJaringan(e) {
    if (e && e.name === 'AbortError') return 'Server terlalu lama merespons. Coba lagi.';
    if (!navigator.onLine) return 'Anda sedang offline. Periksa koneksi internet.';
    return (e && e.message) || 'Gagal terhubung ke server.';
  }

  function get(action, params, opt) {
    opt = opt || {};
    if (DEMO) return window.DemoApi ? window.DemoApi.handle(action, params || {}, '') : Promise.reject(new Error('Mode demo'));
    var q = '?action=' + encodeURIComponent(action);
    Object.keys(params || {}).forEach(function (k) { q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
    return fetch(URL_GAS + q, Object.assign({ method: 'GET', redirect: 'follow' }, timeoutSignal(opt.timeout || 15000)))
      .then(parse).catch(function (e) { throw new Error(pesanJaringan(e)); });
  }
  function post(action, data, opt) {
    opt = opt || {};
    if (DEMO) return window.DemoApi ? window.DemoApi.handle(action, data || {}, opt.token || '') : Promise.reject(new Error('Mode demo'));
    var body = JSON.stringify({ action: action, data: data || {}, token: opt.token || '' });
    return fetch(URL_GAS, Object.assign({
      method: 'POST', redirect: 'follow', keepalive: !!opt.keepalive && body.length < 60000,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body
    }, timeoutSignal(opt.timeout || 30000))).then(parse).catch(function (e) { throw new Error(pesanJaringan(e)); });
  }
  /** Kirim tanpa menunggu (klik, drain). Bertahan saat pindah halaman. */
  function beacon(action, data) {
    if (DEMO) { if (window.DemoApi) window.DemoApi.handle(action, data || {}, ''); return true; }
    var body = JSON.stringify({ action: action, data: data || {} });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(URL_GAS, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return true;
    } catch (e) {}
    try { fetch(URL_GAS, { method: 'POST', keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }); } catch (e) {}
    return true;
  }
  /** Panaskan server (cold start) tanpa menunggu hasil. */
  function warm(scope) {
    if (DEMO) return;
    var k = 'gd_warm_' + scope;
    try { if (Date.now() - Number(sessionStorage.getItem(k) || 0) < 240000) return; sessionStorage.setItem(k, String(Date.now())); } catch (e) {}
    try { fetch(URL_GAS + '?w=' + scope, { mode: 'no-cors' }); } catch (e) {}
  }

  var lokal = {
    get: function (k, maxMs) {
      try {
        var raw = localStorage.getItem('gd_' + k); if (!raw) return null;
        var o = JSON.parse(raw);
        if (maxMs && Date.now() - o.t > maxMs) return null;
        return o.v;
      } catch (e) { return null; }
    },
    umur: function (k) { try { return Date.now() - JSON.parse(localStorage.getItem('gd_' + k)).t; } catch (e) { return Infinity; } },
    set: function (k, v) { try { localStorage.setItem('gd_' + k, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('gd_' + k); } catch (e) {} }
  };

  window.Api = { demo: DEMO, url: URL_GAS, get: get, post: post, beacon: beacon, warm: warm, lokal: lokal };
})();
