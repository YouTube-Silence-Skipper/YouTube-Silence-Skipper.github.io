/**
 * Seasonal promotion window + hero countdown card (special themes only).
 *
 * A themed build sells Pro at the sale price. The promotion runs until the end of the
 * theme's day + extendDays, in US Pacific time (DST-aware), and is judged against the
 * visitor's clock at page load -- no redeploy is needed to end it. Before the day the
 * card counts down to the day; from the day on it counts down to the end of the sale;
 * after that the card is hidden and the Pro card falls back to the standard price and
 * price id. (A visitor who tampers with their clock or this script is ignored on purpose.)
 *
 * Config comes from window.YSS_PROMO (theme-body.njk, from theme.js `promo`).
 * The pure date helpers are exported for tests (tools/promo.test.mjs).
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
   * Promotion state at `now` (ms).
   * @param {{ day: string, extendDays?: number, leadDays?: number }} cfg
   *   day: "MM-DD" or "black-friday"; extendDays: whole days after the day the sale
   *   still runs (it ends at the end of day + extendDays); leadDays: how long before
   *   the day a deployed theme counts as "in season" (so a theme left up past its
   *   season doesn't start counting down to next year's day).
   * @returns {{ phase: 'before'|'live'|'off', dayStart: number, end: number }}
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
      : dayStart - now <= lead * DAY_MS ? 'before'
      : 'off';
    return { phase: phase, dayStart: dayStart, end: end };
  }

  function splitDuration(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  var api = { ptMidnight: ptMidnight, dayOf: dayOf, promoState: promoState, splitDuration: splitDuration };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.YSSPromo = api;

  // ---- Page behavior --------------------------------------------------------------
  var cfg = root.YSS_PROMO;
  if (!cfg) return;

  // Local previews can pin the clock: ?promoNow=2026-12-27T10:00:00-08:00
  function clockOffset() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return 0;
    var pinned = new URLSearchParams(location.search).get('promoNow');
    var t = pinned ? Date.parse(pinned) : NaN;
    return isNaN(t) ? 0 : t - Date.now();
  }
  var offset = clockOffset();
  function now() { return Date.now() + offset; }

  // Back to the standard price: checkout price id, the Pro card's price and sale badge.
  function endSale() {
    root.YSS_PRICE_ID = cfg.standardPriceId;
    document.querySelectorAll('[data-promo-price]').forEach(function (el) {
      el.innerHTML = cfg.standardPrice + '<span>/month</span>';
    });
    document.querySelectorAll('[data-promo-badge]').forEach(function (el) { el.hidden = true; });
    var card = document.getElementById('promo-card');
    if (card) card.hidden = true;
    var hero = document.querySelector('.hero.has-promo');
    if (hero) hero.classList.remove('has-promo');
  }

  function start() {
    var state = promoState(cfg, now());
    if (state.phase === 'off') { endSale(); return; }

    var card = document.getElementById('promo-card');
    if (!card) return; // pages without the hero card still sell at the sale price
    var label = card.querySelector('[data-promo-label]');
    var units = { d: card.querySelector('[data-unit="d"]'), h: card.querySelector('[data-unit="h"]'),
                  m: card.querySelector('[data-unit="m"]'), s: card.querySelector('[data-unit="s"]') };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    function tick() {
      var t = now();
      var st = promoState(cfg, t);
      if (st.phase === 'off') { clearInterval(timer); endSale(); return; }
      var target = st.phase === 'before' ? st.dayStart : st.end;
      label.textContent = st.phase === 'before' ? cfg.beforeLabel : cfg.liveLabel;
      card.setAttribute('data-phase', st.phase);
      var left = splitDuration(target - t);
      units.d.textContent = left.d;
      units.h.textContent = pad(left.h);
      units.m.textContent = pad(left.m);
      units.s.textContent = pad(left.s);
    }
    var timer = setInterval(tick, 1000);
    tick();
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : this);
