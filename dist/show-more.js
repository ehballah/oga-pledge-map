/*!
 * OGA candidate list "Show more" v1.0.0
 * Shows the first few candidate cards with a button to reveal more.
 * Every card stays on the page, so the pledge map's counts, the Finsweet
 * municipality search and the card scripts all keep working. While a search
 * is active, every match shows and the button hides.
 */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var attr = function (n, d) { return (SCRIPT && SCRIPT.getAttribute(n)) || d; };
  var STEP = parseInt(attr('data-step', '24'), 10) || 24; // cards per click; a multiple of 3 fills the 3-column grid
  var LIST = attr('data-list', '[fs-cmsfilter-element="list"]');
  var SEARCH = attr('data-search', '#muni-search-field');
  var HIDDEN = 'oga-sm-hidden';

  var CSS = [
    '.' + HIDDEN + '{display:none!important}',
    '.oga-sm{display:flex;flex-direction:column;align-items:center;gap:10px;margin:28px 0 8px;font-family:inherit}',
    '.oga-sm[hidden],.oga-sm [hidden]{display:none!important}',
    '.oga-sm-status{font-size:15px;color:#5B6675;margin:0}',
    '.oga-sm-row{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}',
    '.oga-sm button{font-family:inherit;font-size:16px;font-weight:600;line-height:1.2;border-radius:6px;padding:12px 22px;cursor:pointer}',
    '.oga-sm-more{background:#698C46;color:#fff;border:1px solid #698C46}',
    '.oga-sm-more:hover{background:#4B6A2E;border-color:#4B6A2E}',
    '.oga-sm-all{background:#fff;color:#3A4554;border:1px solid #DCE5D8}',
    '.oga-sm-all:hover{border-color:#698C46}',
    '.oga-sm button:focus-visible{outline:3px solid #698C46;outline-offset:2px}'
  ].join('\n');

  function init() {
    var list = document.querySelector(LIST);
    if (!list || list.getAttribute('data-oga-sm')) return;
    list.setAttribute('data-oga-sm', '1');
    if (!list.id) list.id = 'oga-candidate-list';

    var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

    var input = document.querySelector(SEARCH);
    var shown = STEP;

    var box = document.createElement('div');
    box.className = 'oga-sm';
    box.innerHTML =
      '<p class="oga-sm-status" aria-live="polite"></p>' +
      '<div class="oga-sm-row">' +
        '<button type="button" class="oga-sm-more" aria-controls="' + list.id + '"></button>' +
        '<button type="button" class="oga-sm-all" aria-controls="' + list.id + '">Show all</button>' +
      '</div>';
    // After the Collection List wrapper, so it sits under the cards and above the "no results" message
    var wrap = list.closest('.w-dyn-list') || list;
    wrap.parentNode.insertBefore(box, wrap.nextSibling);
    var status = box.querySelector('.oga-sm-status');
    var more = box.querySelector('.oga-sm-more');
    var all = box.querySelector('.oga-sm-all');

    function items() {
      return Array.prototype.filter.call(list.children, function (el) { return el.getAttribute('role') === 'listitem' || el.classList.contains('w-dyn-item'); });
    }
    function searching() { return !!(input && input.value.trim()); }

    var applying = false;
    function apply() {
      applying = true;
      var els = items();
      if (searching()) {
        // Search or map selection: let Finsweet decide what shows; never hide a match
        els.forEach(function (el) { el.classList.remove(HIDDEN); });
        box.hidden = true;
      } else {
        els.forEach(function (el, i) { el.classList.toggle(HIDDEN, i >= shown); });
        var total = els.length, visible = Math.min(shown, total), left = total - visible;
        box.hidden = total <= STEP && left === 0;
        status.textContent = 'Showing ' + visible + ' of ' + total + ' candidates';
        more.textContent = 'Show ' + Math.min(STEP, left) + ' more';
        more.hidden = all.hidden = left === 0;
      }
      applying = false;
    }

    function reveal(n) {
      var before = Math.min(shown, items().length);
      shown = n;
      apply();
      // Move keyboard focus to the first newly shown card, so the next Tab continues from there
      var first = items()[before];
      if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
    }
    more.addEventListener('click', function () { reveal(shown + STEP); });
    all.addEventListener('click', function () { reveal(Infinity); });

    // Re-apply when cards are added (later pages from CMS Load) or the search changes the list
    var timer;
    var later = function () { clearTimeout(timer); timer = setTimeout(apply, 60); };
    new MutationObserver(function () { if (!applying) later(); }).observe(list, { childList: true });
    if (input) input.addEventListener('input', later);

    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
