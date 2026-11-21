/**
 * Applies the seasonal theme in the browser (all builds except THEME=plain).
 *
 * Runs synchronously in <head>, after promo.js, with window.YSS_SEASON from
 * src/_data/theme.js: { force, standard, themes }.
 *   - Picks the theme: `force` (a build pinned to one theme) or, on the automatic build,
 *     whichever season is on at the visitor's clock (YSSPromo.pickSeason). None → the plain
 *     site; nothing else happens.
 *   - In <head>: writes the theme's font + stylesheets (parser-inserted, so the first paint
 *     is already themed) and sets the checkout price id (sale price only while the sale is
 *     on: the theme's season on the automatic build; from the deploy to the end of the
 *     theme's next day + extendDays on a pinned build).
 *   - Logos: each themed <img data-theme-logo> calls YSSTheme.logo(img) right after itself,
 *     so the seasonal logo replaces the default one before it is painted.
 *   - After DOMContentLoaded: the Pro pricing card (class, badge, icon, sale price), the
 *     sale badge next to the header logo, the hero promotion card (index), and the
 *     falling/floating decoration layers.
 */
(function (root) {
  'use strict';

  var cfg = root.YSS_SEASON;
  var P = root.YSSPromo;
  var noop = { name: null, logo: function () {} };
  if (!cfg || !P) { root.YSSTheme = noop; return; }

  var now = P.now();
  var name = cfg.force || P.pickSeason(cfg.themes, now);
  if (!name || !cfg.themes[name]) { root.YSSTheme = noop; return; }

  var t = cfg.themes[name];
  var std = cfg.standard;
  // Sale state over time: the season (automatic build) or the deploy-based window (pinned).
  var stateAt = cfg.force
    ? function (when) { return P.pinnedState(t.promo, cfg.builtAt, when); }
    : function (when) { return P.promoState(t.promo, when); };
  var saleOn = stateAt(now).phase !== 'off';

  document.documentElement.setAttribute('data-theme', name);
  if (t.fontUrl) document.write('<link rel="stylesheet" href="' + t.fontUrl + '">');
  if (t.css) document.write('<link rel="stylesheet" href="' + t.css + '">');
  if (saleOn) document.write('<link rel="stylesheet" href="promo.css">');
  root.YSS_PRICE_ID = saleOn ? t.priceId : std.priceId;

  root.YSSTheme = {
    name: name,
    // Swap a default logo for the theme's (keeps a "./" prefix some pages use).
    logo: function (img) {
      if (!img || !t.logo) return;
      img.src = (/^\.\//.test(img.getAttribute('src') || '') ? './' : '') + t.logo;
    },
  };

  // ---- After the DOM is parsed ----------------------------------------------------------

  function decoratePricing() {
    var card = document.querySelector('[data-theme-card]');
    if (!card) return;
    if (t.cardClass) card.classList.add(t.cardClass);
    var icon = card.querySelector('[data-theme-plan-icon]');
    if (icon && t.planIcon) icon.innerHTML = '<i class="' + t.planIcon + '"></i> ';
    if (!saleOn) return;
    var badge = card.querySelector('[data-theme-badge]');
    if (badge && t.badge) {
      badge.className = t.badgeClass || '';
      badge.textContent = t.badge;
      badge.hidden = false;
    }
    var price = card.querySelector('[data-theme-price]');
    if (price && t.sale) {
      price.innerHTML = '<span class="original-price">' + t.sale.originalPrice + '</span> ' + t.sale.price + '<span>/month</span>';
    }
  }

  // Falling / flying particles (snow, bats), in front of the page but click-through.
  function fallLayer(f) {
    var layer = document.createElement('div');
    layer.className = f.container;
    layer.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < f.count; i++) {
      var el = document.createElement('div');
      el.className = f.item;
      if (f.src) el.innerHTML = '<img src="' + f.src + '" alt="">';
      else el.textContent = f.glyph;
      var duration = Math.random() * (f.durationRange || 3) + (f.durationMin || 2);
      if (f.fromEdges) {
        // Start on the left or bottom edge (uniformly along both); the CSS path carries it
        // diagonally across, so together the paths cover the whole screen. Negative delay:
        // already mid-flight on page load.
        var edge = Math.random() * 2;
        if (edge < 1) { el.style.left = '-10vw'; el.style.top = (edge * 110) + 'vh'; }
        else { el.style.left = ((edge - 1) * 110 - 10) + 'vw'; el.style.top = '110vh'; }
        el.style.animationDelay = (-Math.random() * duration) + 's';
      } else {
        el.style.left = (Math.random() * (f.spread || 100)) + 'vw';
        el.style.animationDelay = (Math.random() * (f.delayMax || 2)) + 's';
      }
      el.style.animationDuration = duration + 's';
      var lo = f.opacityMin || 0, hi = f.opacityMax == null ? 1 : f.opacityMax;
      el.style.opacity = lo + Math.random() * (hi - lo);
      el.style.fontSize = (Math.random() * 1.5 + 0.5) + 'em';
      layer.appendChild(el);
    }
    document.body.appendChild(layer);
  }

  // Images drifting behind the page content (Halloween's jack-o'-lanterns).
  function floatLayer(f) {
    var layer = document.createElement('div');
    layer.className = f.container;
    layer.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < f.count; i++) {
      var el = document.createElement('img');
      var duration = Math.random() * 10 + 16;
      el.className = f.item;
      el.src = f.src;
      el.alt = '';
      // Same diagonal as the bats: launch from the left/bottom edges, one per equal slice
      // of that edge so the few images still cover the screen.
      var edge = (i + Math.random()) * 2 / f.count;
      if (edge < 1) { el.style.left = '-10vw'; el.style.top = (edge * 110) + 'vh'; }
      else { el.style.left = ((edge - 1) * 110 - 10) + 'vw'; el.style.top = '110vh'; }
      el.style.width = (Math.random() * 28 + 32) + 'px';
      el.style.animationDuration = duration + 's';
      el.style.animationDelay = (-Math.random() * duration) + 's';
      layer.appendChild(el);
    }
    document.body.appendChild(layer);
  }

  // Sale badge next to the header logo: "🎃 Halloween Sale · $1" (promo.endSale hides it).
  function navBadge() {
    var badge = document.querySelector('[data-theme-nav-badge]');
    if (!badge || !saleOn || !t.promo.navBadge) return;
    badge.textContent = t.promo.emoji + ' ' + t.promo.navBadge + ' · ' + t.promo.salePrice;
    badge.classList.add('promo-' + name);
    badge.hidden = false;
  }

  function applyPage() {
    decoratePricing();
    navBadge();
    if (saleOn) P.startCard(name, t.promo, std, stateAt);
    if (t.fall) fallLayer(t.fall);
    if (t.float) floatLayer(t.float);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPage);
  else applyPage();
})(window);
