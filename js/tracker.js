/**
 * Tracker — menangkap parameter UTM + sumber kunjungan, lalu mencatat klik tombol beli.
 * Data anonim: ID pengunjung acak (bukan data pribadi), sumber, kampanye, jenis perangkat.
 */
(function () {
  'use strict';
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var info = {}, terakhir = {};

  function simpan(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function baca(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function pid() {
    var p = baca('gd_pid');
    if (!p) {
      var a = new Uint8Array(9); (window.crypto || window.msCrypto).getRandomValues(a);
      p = 'v' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      simpan('gd_pid', p);
    }
    return p;
  }
  function perangkat() {
    var ua = navigator.userAgent || '';
    if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
    if (/Mobi|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  function init() {
    var q = new URLSearchParams(location.search), baru = {};
    UTM.forEach(function (k) { var v = q.get(k); if (v) baru[k] = v.slice(0, 80); });
    if (!baru.utm_source) {
      if (q.get('fbclid')) baru.utm_source = 'facebook';
      else if (q.get('gclid') || q.get('gbraid') || q.get('wbraid')) baru.utm_source = 'google';
      else if (q.get('ttclid')) baru.utm_source = 'tiktok';
    }
    var ref = document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer.slice(0, 160) : '';
    if (Object.keys(baru).length) { baru.referrer = ref; baru.t = Date.now(); simpan('gd_utm', JSON.stringify(baru)); }
    else if (ref) {
      // kunjungan organik baru tanpa UTM: catat referrer bila UTM lama sudah kedaluwarsa (7 hari)
      var lama = null; try { lama = JSON.parse(baca('gd_utm') || 'null'); } catch (e) {}
      if (!lama || Date.now() - lama.t > 7 * 864e5) simpan('gd_utm', JSON.stringify({ referrer: ref, t: Date.now() }));
    }
    try { info = JSON.parse(baca('gd_utm') || '{}') || {}; } catch (e) { info = {}; }
    if (info.t && Date.now() - info.t > 30 * 864e5) info = {};
  }
  function data() {
    var o = { pid: pid(), perangkat: perangkat(), halaman: location.pathname.slice(0, 160), referrer: info.referrer || '' };
    UTM.forEach(function (k) { if (info[k]) o[k] = info[k]; });
    return o;
  }
  /** Catat klik (anti dobel 1,5 dtk per tombol). tujuan: FORM | PAYMENT | WA | WA_CHAT | WA_CS */
  function klik(tombol, tujuan) {
    var k = tombol + '|' + tujuan;
    if (terakhir[k] && Date.now() - terakhir[k] < 1500) return;
    terakhir[k] = Date.now();
    var d = data(); d.tombol = tombol; d.tujuan = tujuan;
    if (window.Api) window.Api.beacon('klik', d);
  }
  window.Tracker = { init: init, data: data, klik: klik, pid: pid };
})();
