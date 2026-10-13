/*!
 * OGA Pledge Map v1.5.0
 * Choropleth of Greenbelt pledge signees by Ontario municipality, linked to the
 * Finsweet municipality search on greenbeltalliance.ca/sign-the-candidate-pledge.
 * Boundaries: Statistics Canada 2021 (Open Government Licence – Canada)
 * Lakes: Statistics Canada 2016 lakes and rivers (Open Government Licence – Canada)
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
    m0: '#DDE5D8', other: '#E9EEE6',
    stroke: '#FFFFFF', upper: '#3A4554', gb: '#B8860B', gbHalo: '#FFFFFF', water: '#C6DCE7', sel: '#1F2A36', hover: '#3A4554'
  };

  // Shading steps: each step roughly doubles the one before, so new signees in
  // small municipalities still show up while the busiest stand apart.
  // min = lowest count in the step; edit here to change the breaks.
  var STEPS = [
    { min: 32, fill: '#1E3F07', label: '32 or more' },
    { min: 16, fill: '#365C1F', label: '16 to 31' },
    { min: 8,  fill: '#4E7B32', label: '8 to 15' },
    { min: 4,  fill: '#6E994A', label: '4 to 7' },
    { min: 2,  fill: '#92B76F', label: '2 or 3' },
    { min: 1,  fill: '#BBD49A', label: '1' }
  ];

  // Former municipalities and communities that candidates sometimes enter instead of
  // the current municipality. Keys are lower case; spaces and hyphens are equivalent.
  var ALIASES = {
    // Toronto (amalgamated 1998)
    'scarborough': 'toronto', 'north york': 'toronto', 'etobicoke': 'toronto',
    'york': 'toronto', 'east york': 'toronto', 'old toronto': 'toronto',
    // Hamilton (amalgamated 2001)
    'stoney creek': 'hamilton', 'ancaster': 'hamilton', 'dundas': 'hamilton',
    'flamborough': 'hamilton', 'glanbrook': 'hamilton', 'binbrook': 'hamilton', 'waterdown': 'hamilton',
    // Kawartha Lakes
    'bobcaygeon': 'kawartha lakes', 'lindsay': 'kawartha lakes', 'fenelon falls': 'kawartha lakes',
    'omemee': 'kawartha lakes', 'coboconk': 'kawartha lakes',
    // Other common communities
    'bolton': 'caledon', 'keswick': 'georgina', 'sutton': 'georgina',
    'bowmanville': 'clarington', 'courtice': 'clarington', 'newcastle': 'clarington',
    'woodbridge': 'vaughan', 'maple': 'vaughan', 'concord': 'vaughan', 'kleinburg': 'vaughan',
    'unionville': 'markham', 'alcona': 'innisfil',
    'stouffville': 'whitchurch stouffville', 'port perry': 'scugog',
    'kanata': 'ottawa', 'nepean': 'ottawa', 'orleans': 'ottawa',
    'hillsburgh': 'erin', 'ballinafad': 'erin'
  };

  // Names shown in the map tooltip where the census name alone is ambiguous
  // (e.g. the Town of Erin vs. the village of Erin inside it). Keys are norm()ed.
  var DISPLAY = { 'erin': 'Town of Erin' };

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
    '.pm-shell{position:relative;border-radius:10px;overflow:hidden;border:1px solid #DCE5D8;background:#C6DCE7}',
    '.pm-map{height:480px;background:#C6DCE7}',
    '.pm .leaflet-container{font-family:inherit;background:#C6DCE7}',
    '.pm-legend{position:absolute;left:12px;bottom:12px;z-index:500;background:#fff;border:1px solid #DCE5D8;border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.3;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 4px rgba(0,0,0,.08);text-align:left}',
    '.pm-legend b{font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5B6675}',
    '.pm-legend span{display:flex;align-items:center;gap:8px}',
    '.pm-sw{width:18px;height:12px;border-radius:2px;border:1px solid rgba(0,0,0,.08);flex:none}',
    '.pm-sw.pm-gbsw{background:#DDE5D8;border:0;position:relative}',
    '.pm-sw.pm-gbsw:after{content:"";position:absolute;left:0;right:0;top:5px;height:2px;background:#B8860B;box-shadow:0 0 0 1px rgba(255,255,255,.7)}',
    '.pm-sw.pm-water{background:#C6DCE7}',
    '.pm-reset{position:absolute;right:12px;top:12px;z-index:500;background:#fff;color:#3A4554;border:1px solid #DCE5D8;border-radius:6px;padding:7px 12px;font-family:inherit;font-size:14px;font-weight:600;line-height:1.2;cursor:pointer}',
    '.pm-reset:hover{border-color:#698C46}.pm-reset:focus-visible{outline:3px solid #698C46;outline-offset:2px}',
    '.pm-hint{font-size:14px;color:#7D8793;text-align:center;margin:-8px 0 0}',
    '.pm-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5B6675;font-size:15px}',
    '.leaflet-tooltip.pm-tip{background:#fff;color:#3A4554;border:1px solid #DCE5D8;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.15);padding:8px 10px;font-size:14px;line-height:1.35;text-align:left}',
    '.leaflet-tooltip.pm-tip:before{display:none}',
    '.pm-tip b{font-size:15px}.pm-tip .pm-c{color:#4B6A2E;font-weight:600}.pm-tip .pm-z{color:#7D8793}.pm-tip .pm-tag{color:#8A6508;font-size:12px;font-weight:600}',
    '.pm-out{display:none!important}',
    '.pm .leaflet-control-attribution{font-size:11px;color:#7D8793}',
    '.pm .leaflet-bar,.pm .leaflet-touch .leaflet-bar{border:1px solid #DCE5D8;border-radius:6px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden;padding:0;margin:12px 0 0 12px}',
    '.pm .leaflet-bar a,.pm .leaflet-touch .leaflet-bar a{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:34px;height:34px;margin:0;padding:0;border:0;border-radius:0;background:#fff;color:#3A4554;font-family:inherit;font-size:20px;font-weight:600;line-height:1;text-decoration:none}',
    '.pm .leaflet-bar a + a{border-top:1px solid #DCE5D8}',
    '.pm .leaflet-bar a:hover{background:#F5FAF5;color:#4B6A2E}',
    '.pm .leaflet-bar a:focus-visible{outline:3px solid #698C46;outline-offset:-3px}',
    '.pm .leaflet-bar a.leaflet-disabled{color:#B7C1B5;background:#fff;cursor:default}',
    '@media (max-width:640px){.pm-stats{grid-template-columns:1fr}.pm-stat{flex-direction:row;flex-wrap:wrap;align-items:baseline;column-gap:12px}.pm-lbl{margin-top:0}.pm-sub,.pm-bar{flex-basis:100%}.pm-map{height:380px}.pm-legend{font-size:12px;padding:8px 10px}}'
  ].join('\n');

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/(,\s*|\s+)(on|ont|ontario)(,?\s*canada)?$/, '') // ", ON" suffix only, not names ending in "on"
      .replace(/^(the )?(city|town|township|municipality|village) of\s+/, '')
      .replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim(); // hyphens and spaces count as the same
  }
  function canon(s) { var k = norm(s); return ALIASES[k] || k; }
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

    var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

    // The candidate list is paginated past Webflow's 100-items-per-list limit and Finsweet
    // CMS Load adds the later pages after load. The site's ogaCards helper resolves
    // allLoaded once every card is on the page; wait for it so the counts are complete.
    // Without the helper (e.g. a test page), count straight away.
    var waitFor = window.ogaCards && window.ogaCards.allLoaded;
    if (waitFor && typeof waitFor.then === 'function') waitFor.then(render, render);
    else render();
  }

  function render() {
    var root = document.getElementById('oga-pledge-map');
    if (!root || root.getAttribute('data-rendered')) return;
    root.setAttribute('data-rendered', '1');

    var opt = {
      data: root.getAttribute('data-src') || BASE + 'ontario.json',
      search: root.getAttribute('data-search') || '#muni-search-field',
      field: root.getAttribute('data-field') || '[data-field="municipality"]'
    };

    // ---- Counts, read from the candidate cards on the page ----
    var counts = {}, displayName = {}, cards = [];
    var seen = new Set();
    document.querySelectorAll(opt.field).forEach(function (e) {
      if (seen.has(e)) return; seen.add(e);
      if (e.closest('#oga-pledge-map')) return;
      var raw = e.textContent.trim(), k = canon(raw);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1; displayName[k] = displayName[k] || raw;
      cards.push({ el: e.closest('.w-dyn-item') || e.parentNode, k: k });
    });
    var total = 0, muniCount = 0;
    Object.keys(counts).forEach(function (k) { total += counts[k]; muniCount++; });
    var gbSet = {}; GREENBELT.forEach(function (n) { gbSet[norm(n)] = 1; });
    var gbSigned = Object.keys(counts).filter(function (k) { return gbSet[k]; }).length;

    // ---- Exact municipality match ----
    // Finsweet's search matches any card whose municipality *contains* the typed text,
    // so "Erin" also brings up Pickering and "Milton" brings up Hamilton. Once the search
    // text is a whole municipality name (typed, or set by clicking the map), hide the
    // cards for other municipalities too. Partial typing ("Mil") is left to Finsweet.
    var known = {}; Object.keys(counts).forEach(function (k) { known[k] = 1; });
    GREENBELT.forEach(function (n) { known[norm(n)] = 1; });
    var searchEl = document.querySelector(opt.search);
    var fsEmpty = document.querySelector('[fs-cmsfilter-element="empty"]');
    var ownEmpty = null;
    if (fsEmpty) {
      ownEmpty = fsEmpty.cloneNode(true);
      ownEmpty.removeAttribute('fs-cmsfilter-element');
      ownEmpty.removeAttribute('id');
      ownEmpty.style.display = 'none';
      fsEmpty.parentNode.insertBefore(ownEmpty, fsEmpty.nextSibling);
    }
    var exactTimers = [];
    function applyExact() {
      var k = searchEl ? canon(searchEl.value) : '';
      var on = !!(k && known[k]);
      var left = 0;
      cards.forEach(function (c) {
        var out = on && c.k !== k;
        c.el.classList.toggle('pm-out', out);
        if (!out && c.el.isConnected) left++;
      });
      if (ownEmpty) {
        var fsShown = fsEmpty.isConnected && getComputedStyle(fsEmpty).display !== 'none';
        ownEmpty.style.display = on && left === 0 && !fsShown ? 'block' : 'none';
      }
    }
    function scheduleExact() {
      exactTimers.forEach(clearTimeout);
      // Finsweet re-renders the list a moment after each keystroke; check again once it has
      exactTimers = [0, 150, 400, 900].map(function (ms) { return setTimeout(applyExact, ms); });
    }
    if (searchEl) searchEl.addEventListener('input', scheduleExact);
    function addKnown(names) { names.forEach(function (n) { known[norm(n)] = 1; }); applyExact(); }

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
          STEPS.map(function (s) { return '<span><i class="pm-sw" style="background:' + s.fill + '"></i>' + s.label + '</span>'; }).join('') +
          '<span><i class="pm-sw" style="background:' + C.m0 + '"></i>None yet</span>' +
          '<span><i class="pm-sw pm-gbsw"></i>Greenbelt</span>' +
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
      addKnown(Object.keys(byName));
      var missing = Object.keys(counts).filter(function (k) { return !byName[k]; });
      if (missing.length) console.warn('[pledge map] no boundary found for:', missing.map(function (k) { return displayName[k]; }));

      var fillFor = function (c) { for (var i = 0; i < STEPS.length; i++) if (c >= STEPS[i].min) return STEPS[i].fill; return C.m0; };
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

      // Outlines for hover/selection are drawn in their own pane above all fills and borders,
      // so neighbouring shapes can never paint over part of the line.
      map.createPane('pmHighlight');
      map.getPane('pmHighlight').style.zIndex = 450;
      map.getPane('pmHighlight').style.pointerEvents = 'none';
      var hlRenderer = L.svg({ pane: 'pmHighlight' });
      var hoverOutline = null, selOutline = null;
      function outline(f, color) {
        var opts = function (c, w) { return { pane: 'pmHighlight', renderer: hlRenderer, interactive: false,
          style: { color: c, weight: w, opacity: 1, fill: false, lineJoin: 'round', lineCap: 'round' } }; };
        return L.layerGroup([L.geoJSON(f, opts('#FFFFFF', 5.5)), L.geoJSON(f, opts(color, 3))]).addTo(map);
      }

      var selected = null;
      var muniLayer = L.geoJSON(munis, {
        style: styleFor,
        onEachFeature: function (f, l) {
          if (!f.properties.m) return;
          l.bindTooltip(function () { return tip(f.properties); }, { sticky: true, className: 'pm-tip', direction: 'top', offset: [0, -8], opacity: 1 });
          l.on('mouseover', function () {
            if (hoverOutline) hoverOutline.remove();
            hoverOutline = l === selected ? null : outline(f, C.hover);
          });
          l.on('mouseout', function () { if (hoverOutline) { hoverOutline.remove(); hoverOutline = null; } });
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
      var gbShape = topojson.feature(topo, topo.objects.greenbelt);
      L.geoJSON(gbShape, { interactive: false, style: { color: C.gbHalo, weight: 4, opacity: .7, fill: false, lineJoin: 'round' } }).addTo(map);
      L.geoJSON(gbShape, { interactive: false, style: { color: C.gb, weight: 1.75, opacity: 1, fill: false, lineJoin: 'round' } }).addTo(map);

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
        return '<b>' + esc(DISPLAY[norm(p.name)] || p.name) + '</b>' + up + '<br>' + c + (p.gb ? '<br><span class="pm-tag">In the Greenbelt</span>' : '');
      }
      function layerFor(f) { var hit = null; muniLayer.eachLayer(function (l) { if (l.feature === f) hit = l; }); return hit; }
      function select(f, fromMap) {
        var l = layerFor(f); if (!l) return;
        selected = l;
        if (selOutline) selOutline.remove();
        if (hoverOutline) { hoverOutline.remove(); hoverOutline = null; }
        selOutline = outline(f, C.sel);
        if (!fromMap || !map.getBounds().contains(l.getBounds())) map.flyToBounds(l.getBounds(), { maxZoom: 10, padding: [40, 40], duration: .8 });
      }
      function clear(zoomOut) {
        selected = null;
        if (selOutline) { selOutline.remove(); selOutline = null; }
        if (zoomOut) map.flyToBounds(home, { duration: .8 });
      }

      root.querySelector('.pm-reset').addEventListener('click', function () {
        if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
        clear(true);
      });

      if (input) {
        input.addEventListener('input', function () {
          var k = canon(input.value);
          if (!k) return clear(true);
          if (byName[k]) select(byName[k], false);
        });
        if (input.value && byName[canon(input.value)]) select(byName[canon(input.value)], false);
      } else {
        console.warn('[pledge map] search field not found:', opt.search);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
