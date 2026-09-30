/*!
 * OGA Pledge Map v1.0.0
 * Choropleth of Greenbelt pledge signees by Ontario municipality, linked to the
 * Finsweet municipality search on greenbeltalliance.ca/sign-the-candidate-pledge.
 * Boundaries: Statistics Canada 2021 (Open Government Licence – Canada)
 * Greenbelt boundary: Ontario GeoHub (Open Government Licence – Ontario)
 */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^\/]*$/, '') : '';
  var LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  var LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  var TOPOJSON_JS = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';

  // Greenbelt municipalities (≥1 km² inside the Greenbelt outer boundary). Kept here so the
  // stats can show before the map data loads. Rebuild with data-build/ if boundaries change.
  var GREENBELT = ["Adjala-Tosorontio","Ajax","Alnwick/Haldimand","Amaranth","Aurora","Bradford West Gwillimbury","Brampton","Brock","Burlington","Caledon","Cavan Monaghan","Chatsworth","Clarington","Clearview","Cramahe","East Garafraxa","East Gwillimbury","Erin","Georgian Bluffs","Georgina","Grey Highlands","Grimsby","Halton Hills","Hamilton","Hamilton Township","Innisfil","Kawartha Lakes","King","Lincoln","Markham","Meaford","Milton","Mississauga","Mono","Mulmur","New Tecumseth","Newmarket","Niagara Falls","Niagara-on-the-Lake","North Dumfries","Northern Bruce Peninsula","Oakville","Orangeville","Oshawa","Owen Sound","Pelham","Pickering","Port Hope","Puslinch","Richmond Hill","Scugog","South Bruce Peninsula","St. Catharines","The Blue Mountains","Thorold","Toronto","Trent Hills","Uxbridge","Vaughan","West Lincoln","Whitby","Whitchurch-Stouffville"];
  var ONTARIO_MUNIS = 414;

  var UPPER = {"3501":"United Counties of SD&G","3502":"United Counties of Prescott and Russell","3507":"United Counties of Leeds and Grenville","3509":"Lanark County","3510":"Frontenac County","3511":"Lennox and Addington County","3512":"Hastings County","3514":"Northumberland County","3515":"Peterborough County","3518":"Durham Region","3519":"York Region","3521":"Peel Region","3522":"Dufferin County","3523":"Wellington County","3524":"Halton Region","3526":"Niagara Region","3530":"Waterloo Region","3531":"Perth County","3532":"Oxford County","3534":"Elgin County","3537":"Essex County","3538":"Lambton County","3539":"Middlesex County","3540":"Huron County","3541":"Bruce County","3542":"Grey County","3543":"Simcoe County","3544":"District of Muskoka","3546":"Haliburton County","3547":"Renfrew County"};

  var C = { // OGA brand
    m0: '#DDE5D8', other: '#E9EEE6', m1: '#BFD4A6', m2: '#85A85E', m3: '#4B6A2E',
    stroke: '#FFFFFF', upper: '#3A4554', gb: '#A6550F', sel: '#1F2A36', hover: '#3A4554'
  };

  var CSS = [
    '.pm{display:flex;flex-direction:column;gap:18px;margin:8px 0 24px;font-family:inherit;color:#3A4554}',
    '.pm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}',
    '.pm-stat{background:#fff;border:1px solid #DCE5D8;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:2px;text-align:left}',
    '.pm-num{font-size:clamp(34px,5vw,48px);font-weight:800;line-height:1;color:#4B6A2E;font-variant-numeric:tabular-nums}',
    '.pm-num small{font-size:.45em;font-weight:600;color:#5B6675}',
    '.pm-lbl{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#5B6675;margin-top:6px}',
    '.pm-sub{font-size:14px;color:#7D8793}',
    '.pm-bar{height:6px;border-radius:3px;background:#DDE5D8;overflow:hidden;margin-top:8px}',
    '.pm-bar i{display:block;height:100%;background:#698C46;border-radius:3px}',
    '.pm-shell{position:relative;border-radius:10px;overflow:hidden;border:1px solid #DCE5D8;background:#DCE8EC}',
    '.pm-map{height:480px;background:#DCE8EC}',
    '.pm .leaflet-container{font-family:inherit;background:#DCE8EC}',
    '.pm-legend{position:absolute;left:12px;bottom:12px;z-index:500;background:#fff;border:1px solid #DCE5D8;border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.3;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 4px rgba(0,0,0,.08);text-align:left}',
    '.pm-legend b{font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5B6675}',
    '.pm-legend span{display:flex;align-items:center;gap:8px}',
    '.pm-sw{width:18px;height:12px;border-radius:2px;border:1px solid rgba(0,0,0,.08);flex:none}',
    '.pm-sw.pm-gbsw{background:transparent;border:2px dashed #A6550F}',
    '.pm-reset{position:absolute;right:12px;top:12px;z-index:500;background:#fff;color:#3A4554;border:1px solid #DCE5D8;border-radius:6px;padding:7px 12px;font-family:inherit;font-size:14px;font-weight:600;line-height:1.2;cursor:pointer}',
    '.pm-reset:hover{border-color:#698C46}.pm-reset:focus-visible{outline:3px solid #698C46;outline-offset:2px}',
    '.pm-hint{font-size:14px;color:#7D8793;text-align:center;margin:-8px 0 0}',
    '.pm-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5B6675;font-size:15px}',
    '.leaflet-tooltip.pm-tip{background:#fff;color:#3A4554;border:1px solid #DCE5D8;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.15);padding:8px 10px;font-size:14px;line-height:1.35;text-align:left}',
    '.leaflet-tooltip.pm-tip:before{display:none}',
    '.pm-tip b{font-size:15px}.pm-tip .pm-c{color:#4B6A2E;font-weight:600}.pm-tip .pm-z{color:#7D8793}.pm-tip .pm-tag{color:#A6550F;font-size:12px;font-weight:600}',
    '.pm .leaflet-control-attribution{font-size:11px;color:#7D8793}',
    '@media (max-width:640px){.pm-stats{grid-template-columns:1fr}.pm-stat{flex-direction:row;flex-wrap:wrap;align-items:baseline;column-gap:12px}.pm-lbl{margin-top:0}.pm-sub,.pm-bar{flex-basis:100%}.pm-map{height:380px}.pm-legend{font-size:12px;padding:8px 10px}}'
  ].join('\n');

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/,?\s*(on|ontario)(,?\s*canada)?$/, '')
      .replace(/^(the )?(city|town|township|municipality|village) of\s+/, '')
      .replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function loadScript(src) {
    return new Promise(function (ok, fail) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  }
  function loadCss(href) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }

  function init() {
    var root = document.getElementById('oga-pledge-map');
    if (!root || root.getAttribute('data-ready')) return;
    root.setAttribute('data-ready', '1');

    var opt = {
      data: root.getAttribute('data-src') || BASE + 'ontario.json',
      search: root.getAttribute('data-search') || '#muni-search-field',
      field: root.getAttribute('data-field') || '[data-field="municipality"]'
    };

    var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

    // ---- Counts, read from the candidate cards already on the page ----
    var counts = {}, displayName = {};
    var seen = new Set();
    document.querySelectorAll(opt.field).forEach(function (e) {
      if (seen.has(e)) return; seen.add(e);
      if (e.closest('#oga-pledge-map')) return;
      var raw = e.textContent.trim(), k = norm(raw);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1; displayName[k] = displayName[k] || raw;
    });
    var total = 0, muniCount = 0;
    Object.keys(counts).forEach(function (k) { total += counts[k]; muniCount++; });
    var gbSet = {}; GREENBELT.forEach(function (n) { gbSet[norm(n)] = 1; });
    var gbSigned = Object.keys(counts).filter(function (k) { return gbSet[k]; }).length;

    // ---- Markup ----
    root.classList.add('pm');
    root.innerHTML =
      '<div class="pm-stats" role="group" aria-label="Pledge totals">' +
        '<div class="pm-stat"><span class="pm-num">' + total + '</span><span class="pm-lbl">Candidates signed</span><span class="pm-sub">across ' + muniCount + ' municipalit' + (muniCount === 1 ? 'y' : 'ies') + '</span></div>' +
        '<div class="pm-stat"><span class="pm-num">' + muniCount + '</span><span class="pm-lbl">Municipalities represented</span><span class="pm-sub">of ' + ONTARIO_MUNIS + ' in Ontario</span></div>' +
        '<div class="pm-stat"><span class="pm-num">' + gbSigned + ' <small>of ' + GREENBELT.length + '</small></span><span class="pm-lbl">Greenbelt municipalities</span><span class="pm-sub">have at least one candidate signed</span>' +
          '<div class="pm-bar" aria-hidden="true"><i style="width:' + (100 * gbSigned / GREENBELT.length).toFixed(1) + '%"></i></div></div>' +
      '</div>' +
      '<div class="pm-shell">' +
        '<div class="pm-map" role="region" aria-label="Map of Ontario municipalities shaded by the number of candidates who signed the pledge. Use the municipality search below to find a municipality."></div>' +
        '<div class="pm-loading">Loading map…</div>' +
        '<button class="pm-reset" type="button">Show all</button>' +
        '<div class="pm-legend" aria-hidden="true"><b>Candidates signed</b>' +
          '<span><i class="pm-sw" style="background:' + C.m3 + '"></i>5 or more</span>' +
          '<span><i class="pm-sw" style="background:' + C.m2 + '"></i>2 to 4</span>' +
          '<span><i class="pm-sw" style="background:' + C.m1 + '"></i>1</span>' +
          '<span><i class="pm-sw" style="background:' + C.m0 + '"></i>None yet</span>' +
          '<span><i class="pm-sw pm-gbsw"></i>Greenbelt boundary</span>' +
        '</div>' +
      '</div>' +
      '<p class="pm-hint">Click a municipality to see its candidates, or search below.</p>';

    var mapEl = root.querySelector('.pm-map');
    var loadingEl = root.querySelector('.pm-loading');

    // ---- Load the map only when it's about to scroll into view ----
    var started = false;
    function start() {
      if (started) return; started = true;
      loadCss(LEAFLET_CSS);
      Promise.all([
        loadScript(LEAFLET_JS).then(function () { return loadScript(TOPOJSON_JS); }),
        fetch(opt.data).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      ]).then(function (res) { buildMap(res[1]); })
        .catch(function (e) {
          console.error('[pledge map] failed to load', e);
          root.querySelector('.pm-shell').hidden = true; root.querySelector('.pm-hint').hidden = true;
        });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) { if (ents.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '400px' });
      io.observe(mapEl);
    } else start();

    function buildMap(topo) {
      var L = window.L, topojson = window.topojson;
      var input = document.querySelector(opt.search);
      var munis = topojson.feature(topo, topo.objects.munis);
      var byName = {};
      munis.features.forEach(function (f) {
        var p = f.properties, k = norm(p.name);
        p.count = p.m ? (counts[k] || 0) : 0;
        if (p.m) byName[k] = f;
      });
      var missing = Object.keys(counts).filter(function (k) { return !byName[k]; });
      if (missing.length) console.warn('[pledge map] no boundary found for:', missing.map(function (k) { return displayName[k]; }));

      var fillFor = function (c) { return c >= 5 ? C.m3 : c >= 2 ? C.m2 : c >= 1 ? C.m1 : C.m0; };
      var styleFor = function (f) {
        var p = f.properties;
        return p.m ? { fillColor: fillFor(p.count), fillOpacity: 1, color: C.stroke, weight: .6 }
                   : { fillColor: C.other, fillOpacity: 1, color: C.stroke, weight: .4 };
      };

      var map = L.map(mapEl, { preferCanvas: true, zoomSnap: .25, scrollWheelZoom: false, minZoom: 4.5, maxZoom: 11 });
      map.attributionControl.setPrefix(false).addAttribution(
        'Boundaries: <a href="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm" target="_blank" rel="noopener">Statistics Canada</a> · ' +
        'Greenbelt: <a href="https://geohub.lio.gov.on.ca/datasets/2677fbd096e04e33bf75cf4d7e6ba976" target="_blank" rel="noopener">Ontario GeoHub</a>');
      map.on('click focus', function () { map.scrollWheelZoom.enable(); });
      mapEl.addEventListener('mouseleave', function () { map.scrollWheelZoom.disable(); });

      var selected = null;
      var muniLayer = L.geoJSON(munis, {
        style: styleFor,
        onEachFeature: function (f, l) {
          if (!f.properties.m) return;
          l.bindTooltip(function () { return tip(f.properties); }, { sticky: true, className: 'pm-tip', direction: 'top', offset: [0, -8] });
          l.on('mouseover', function () { if (l !== selected) l.setStyle({ weight: 2, color: C.hover }); });
          l.on('mouseout', function () { if (l !== selected) muniLayer.resetStyle(l); });
          l.on('click', function () {
            if (input) {
              input.value = f.properties.name;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            select(f, true);
          });
        }
      }).addTo(map);

      var upperLayer = L.geoJSON(topojson.mesh(topo, topo.objects.munis, function (a, b) { return a !== b && a.properties.cd !== b.properties.cd; }),
        { interactive: false, style: { color: C.upper, weight: 1, opacity: .45 } }).addTo(map);
      var gbLayer = L.geoJSON(topojson.feature(topo, topo.objects.greenbelt),
        { interactive: false, style: { color: C.gb, weight: 1.6, dashArray: '5 4', fill: false, opacity: .8 } }).addTo(map);

      var signed = munis.features.filter(function (f) { return f.properties.count > 0; });
      var home = signed.length
        ? L.geoJSON({ type: 'FeatureCollection', features: signed }).getBounds().pad(.25)
        : L.latLngBounds([42.8, -81.2], [45.2, -77.5]);
      map.fitBounds(home);
      map.setMaxBounds(L.geoJSON(munis).getBounds().pad(.1));
      loadingEl.remove();

      function tip(p) {
        var up = UPPER[p.cd] ? '<br><span class="pm-z">' + UPPER[p.cd] + '</span>' : '';
        var c = p.count ? '<span class="pm-c">' + p.count + ' candidate' + (p.count > 1 ? 's' : '') + ' signed</span>' : '<span class="pm-z">No candidates yet</span>';
        return '<b>' + esc(p.name) + '</b>' + up + '<br>' + c + (p.gb ? '<br><span class="pm-tag">In the Greenbelt</span>' : '');
      }
      function layerFor(f) { var hit = null; muniLayer.eachLayer(function (l) { if (l.feature === f) hit = l; }); return hit; }
      function select(f, fromMap) {
        var l = layerFor(f); if (!l) return;
        if (selected && selected !== l) muniLayer.resetStyle(selected);
        selected = l;
        l.setStyle({ weight: 3, color: C.sel }); l.bringToFront(); upperLayer.bringToFront(); gbLayer.bringToFront();
        if (!fromMap || !map.getBounds().contains(l.getBounds())) map.flyToBounds(l.getBounds(), { maxZoom: 10, padding: [40, 40], duration: .8 });
      }
      function clear(zoomOut) {
        if (selected) { muniLayer.resetStyle(selected); selected = null; }
        if (zoomOut) map.flyToBounds(home, { duration: .8 });
      }

      root.querySelector('.pm-reset').addEventListener('click', function () {
        if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
        clear(true);
      });

      if (input) {
        input.addEventListener('input', function () {
          var k = norm(input.value);
          if (!k) return clear(true);
          if (byName[k]) select(byName[k], false);
        });
        if (input.value && byName[norm(input.value)]) select(byName[norm(input.value)], false);
      } else {
        console.warn('[pledge map] search field not found:', opt.search);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
