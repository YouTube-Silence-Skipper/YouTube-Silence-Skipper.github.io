/**
 * Seasonal dates, theme selection and the hero promotion card.
 *
 * Every seasonal theme has a day (Halloween Oct 31, Black Friday, Christmas Dec 25). A theme
 * is in season from leadDays before its day until the end of day + extendDays, in US Pacific
 * time (DST-aware), judged on the visitor's clock -- so the auto build switches themes, and a
 * sale ends, without a redeploy. When two seasons overlap, the one whose day comes first wins.
 * (A visitor who tampers with their clock or this script is ignored on purpose.)
 *
 * Loaded in <head> before theme-runtime.js, which picks the theme and calls startCard().
 * The pure helpers are exported for tests (tools/promo.test.mjs).
 */
(function (root) {
  'use strict';

  var TZ = 'America/Los_Angeles';
  var DAY_MS = 24 * 60 * 60 * 1000;

  // Wall-clock parts of an instant in Pacific time.
  function ptParts(ms) {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric'
    }).formatToParts(new Date(ms));
    var out = {};
    parts.forEach(function (p) { if (p.type !== 'literal') out[p.type] = Number(p.value); });
    return out;
  }

  // The instant of 00:00 Pacific time on y-m-d (month 1-12; day may overflow, e.g. 25 + 4).
  function ptMidnight(y, m, d) {
    var guess = Date.UTC(y, m - 1, d, 8); // 00:00 PST
    for (var i = 0; i < 2; i++) {
      var p = ptParts(guess);
      var wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      guess -= wall - Date.UTC(y, m - 1, d); // shift by the error (handles PDT)
    }
    return guess;
  }

  // The theme's day in year y as { m, d }.
  function dayOf(rule, y) {
    if (rule === 'black-friday') {
      // Day after US Thanksgiving (the 4th Thursday of November)
      var firstDow = new Date(Date.UTC(y, 10, 1)).getUTCDay();
      var firstThursday = 1 + ((4 - firstDow + 7) % 7);
      return { m: 11, d: firstThursday + 21 + 1 };
    }
    var md = String(rule).split('-'); // "MM-DD"
    return { m: Number(md[0]), d: Number(md[1]) };
  }

  /**
   * Season state at `now` (ms).
   * @param {{ day: string, extendDays?: number, leadDays?: number }} cfg
   *   day: "MM-DD" or "black-friday"; leadDays: how many days before the day the season
   *   starts; extendDays: whole days after the day it still runs (it ends at the end of
   *   day + extendDays).
   * @returns {{ phase: 'before'|'live'|'off', dayStart: number, end: number }}
   *   before = in season, counting down to the day; live = from the day to the end.
   */
  function promoState(cfg, now) {
    var extend = cfg.extendDays == null ? 3 : cfg.extendDays;
    var lead = cfg.leadDays == null ? 60 : cfg.leadDays;
    var y = ptParts(now).year;
    var day = dayOf(cfg.day, y);
    var dayStart = ptMidnight(y, day.m, day.d);
    var end = ptMidnight(y, day.m, day.d + extend + 1); // end of day + extend
    var phase = now >= end ? 'off'
      : now >= dayStart ? 'live'
      : now >= ptMidnight(y, day.m, day.d - lead) ? 'before'
      : 'off';
    return { phase: phase, dayStart: dayStart, end: end };
  }

  /**
   * Sale window of a build pinned to one theme: from the deploy (`from`) to the end of the
   * first day + extendDays after it -- so a pinned theme's sale starts as soon as it is
   * deployed and never restarts for the next year's day.
   * @returns {{ phase: 'before'|'live'|'off', dayStart: number, end: number }}
   */
  function pinnedState(cfg, from, now) {
    var extend = cfg.extendDays == null ? 3 : cfg.extendDays;
    var y = ptParts(from).year;
    var windowFor = function (year) {
      var day = dayOf(cfg.day, year);
      return { dayStart: ptMidnight(year, day.m, day.d), end: ptMidnight(year, day.m, day.d + extend + 1) };
    };
    var w = windowFor(y);
    if (from >= w.end) w = windowFor(y + 1);
    w.phase = now < from || now >= w.end ? 'off' : now >= w.dayStart ? 'live' : 'before';
    return w;
  }

  /**
   * The seasonal theme in season at `now`, or null. Overlapping seasons: the one whose day
   * comes first wins (e.g. Halloween over Black Friday until Halloween's season ends).
   * @param {Object<string, { promo: object }>} seasons - theme name → config with `promo`
   */
  function pickSeason(seasons, now) {
    var best = null, bestDay = Infinity;
    Object.keys(seasons).forEach(function (name) {
      var st = promoState(seasons[name].promo, now);
      if (st.phase !== 'off' && st.dayStart < bestDay) { best = name; bestDay = st.dayStart; }
    });
    return best;
  }

  function splitDuration(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  var api = { ptMidnight: ptMidnight, dayOf: dayOf, promoState: promoState, pinnedState: pinnedState, pickSeason: pickSeason, splitDuration: splitDuration };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---- Browser ----------------------------------------------------------------------

  // Local previews can pin the clock: ?promoNow=2026-12-27T10:00:00-08:00
  var offset = 0;
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    var pinned = Date.parse(new URLSearchParams(location.search).get('promoNow') || '');
    if (!isNaN(pinned)) offset = pinned - Date.now();
  }
  api.now = function () { return Date.now() + offset; };

  // Back to the standard price: checkout price id, the Pro card's price, the sale badges and
  // the promotion card. (The theme's decorations stay until the next page load.)
  api.endSale = function (std) {
    root.YSS_PRICE_ID = std.priceId;
    document.querySelectorAll('[data-theme-price]').forEach(function (el) {
      el.innerHTML = std.price + '<span>/month</span>';
    });
    document.querySelectorAll('[data-theme-badge], [data-theme-nav-badge]').forEach(function (el) { el.hidden = true; });
    var card = document.getElementById('promo-card');
    if (card) card.hidden = true;
    var hero = document.querySelector('.hero.has-promo');
    if (hero) hero.classList.remove('has-promo');
  };

  /**
   * Run the hero promotion card (index page) for theme `name` while its season lasts.
   * @param {string} name - theme name (styling class promo-<name>)
   * @param {object} promo - the theme's promo config (day, labels, prices, ...)
   * @param {{ priceId: string, price: string }} std - standard price to fall back to
   * @param {function(number): {phase, dayStart, end}} [stateAt] - sale state at a time
   *   (default: the theme's season, promoState)
   */
  api.startCard = function (name, promo, std, stateAt) {
    stateAt = stateAt || function (t) { return promoState(promo, t); };
    var card = document.getElementById('promo-card');
    if (!card) return;
    var hero = document.querySelector('.hero');
    var fill = function (sel, text) { var el = card.querySelector(sel); if (el) el.textContent = text; };
    fill('[data-promo-name]', promo.emoji + ' ' + promo.name);
    fill('[data-promo-original]', promo.originalPrice);
    fill('[data-promo-sale]', promo.salePrice);
    card.classList.add('promo-' + name);
    if (hero) hero.classList.add('has-promo');

    var label = card.querySelector('[data-promo-label]');
    var units = { d: card.querySelector('[data-unit="d"]'), h: card.querySelector('[data-unit="h"]'),
                  m: card.querySelector('[data-unit="m"]'), s: card.querySelector('[data-unit="s"]') };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var timer;

    function tick() {
      var t = api.now();
      var st = stateAt(t);
      if (st.phase === 'off') { clearInterval(timer); api.endSale(std); return; }
      var target = st.phase === 'before' ? st.dayStart : st.end;
      label.textContent = st.phase === 'before' ? promo.beforeLabel : promo.liveLabel;
      card.setAttribute('data-phase', st.phase);
      var left = splitDuration(target - t);
      units.d.textContent = left.d;
      units.h.textContent = pad(left.h);
      units.m.textContent = pad(left.m);
      units.s.textContent = pad(left.s);
    }
    timer = setInterval(tick, 1000);
    tick();
    if (stateAt(api.now()).phase === 'off') return;
    card.hidden = false;

    // On small screens the card is a bar fixed to the bottom (promo.css); slide it away once
    // the pricing section is on screen or scrolled past -- it has done its job by then.
    var pricing = document.getElementById('pricing');
    if (pricing) {
      var onScroll = function () {
        card.classList.toggle('promo-at-pricing', pricing.getBoundingClientRect().top < window.innerHeight * 0.85);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }
  };

  root.YSSPromo = api;
})(typeof window !== 'undefined' ? window : this);
