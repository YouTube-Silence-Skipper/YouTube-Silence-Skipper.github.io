// Seasonal themes. The build mode comes from the THEME env var:
//   default (push to main):  npm run build                     → automatic seasonal theme
//   plain:                   THEME=plain npm run build         → never seasonal
//   fixed:                   THEME=christmas|black-friday|halloween npm run build
//
// automatic: the page picks the theme on the visitor's clock (US Pacific time): each season
//   runs from LEAD days before its day to the end of the day + PROMO_EXTEND_DAYS; when two
//   overlap, the one whose day comes first wins. Outside every season the page is the plain
//   site. (src/promo.js has the date logic, src/theme-runtime.js applies the theme.)
// fixed: that theme's look all the time; its sale (promo card + sale price) still only runs
//   inside its season.
// plain: no seasonal scripts at all -- the normal site.
//
// All content, features, layout and copy are SHARED across themes (single source → no
// drift); only the per-theme overlay values below differ. Edit seasonal pricing here if an
// offer changes — keep these values out of public commit messages.

// Paddle price id used by the checkout (read by script.js via window.YSS_PRICE_ID).
const PRICE_ID = {
  default: "pri_01k2q4bxj662c46peqbp3f2aap",
  christmas: "pri_01kch9pkfgcgmaxy18kv63k86t",
  // Black Friday sale. Reuses the $1 sale price id until a dedicated one is set.
  "black-friday": "pri_01kch9pkfgcgmaxy18kv63k86t",
  // Halloween runs the same sale as the other seasonal themes.
  halloween: "pri_01kch9pkfgcgmaxy18kv63k86t",
};
const STANDARD = { logo: "images/logo.png", priceId: PRICE_ID.default, price: "$1.99" };

// Per-theme overlay, applied in the browser by src/theme-runtime.js. Every field is
// optional; a missing field means "same as the base site". `promo.leadDays` is how many
// days before the theme's day its season (look + sale) starts.
// fall: a falling/flying particle layer { container, item, glyph | src (image), count,
//   durationMin/durationRange/delayMax (s), opacityMin/opacityMax, spread (vw), fromEdges
//   (launch from the left/bottom edges) }. float: images drifting behind the content
//   { container, item, src, count }.
const THEMES = {
  christmas: {
    logo: "images/logo-christmas.png",
    css: "christmas.css",
    fontUrl: "https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap",
    cardClass: "christmas-special",
    planIcon: "fas fa-gift",
    badge: "🎄 Christmas Sale! 🎄",
    badgeClass: "christmas-badge",
    sale: { originalPrice: "$1.99", price: "$1" },
    // Dec 1 – Dec 28: starts the day after Black Friday's season ends.
    promo: { day: "12-25", leadDays: 24, name: "Christmas Sale", emoji: "🎄", beforeLabel: "Christmas is in", liveLabel: "Holiday sale ends in" },
    fall: { container: "snow", item: "flake", glyph: "❄️", count: 50 },
  },
  "black-friday": {
    css: "black-friday.css",
    cardClass: "blackfriday-special",
    badge: "🔥 BLACK FRIDAY 🔥",
    badgeClass: "blackfriday-badge",
    sale: { originalPrice: "$1.99", price: "$1" },
    // Black Friday week through Cyber Monday (2026: Nov 20 – Nov 30).
    promo: { day: "black-friday", leadDays: 7, name: "Black Friday Sale", emoji: "🔥", beforeLabel: "Black Friday is in", liveLabel: "Sale ends in" },
  },
  halloween: {
    logo: "images/logo-halloween.png",
    css: "halloween.css",
    fontUrl: "https://fonts.googleapis.com/css2?family=Creepster&display=swap",
    cardClass: "halloween-special",
    badge: "🎃 Halloween Sale! 🎃",
    badgeClass: "halloween-badge",
    sale: { originalPrice: "$1.99", price: "$1" },
    // The last two weeks before Halloween (Oct 17 – Nov 3).
    promo: { day: "10-31", leadDays: 14, name: "Halloween Sale", emoji: "🎃", beforeLabel: "Halloween is in", liveLabel: "Spooky sale ends in" },
    // Bats launch from anywhere along the left/bottom edges and cross the whole
    // screen diagonally in 10–16s, kept faint (35–60% opacity).
    fall: {
      container: "bats", item: "bat", src: "images/bat.svg", count: 7, fromEdges: true,
      durationMin: 10, durationRange: 6, opacityMin: 0.35, opacityMax: 0.6,
    },
    // Cute jack-o'-lanterns drifting the same way as the bats, behind the page content.
    float: { container: "pumpkins", item: "pumpkin", src: "images/jack-o-lantern.svg", count: 4 },
  },
};

// The sale/season runs until the end of the day + this many days.
const PROMO_EXTEND_DAYS = 3;
for (const [name, t] of Object.entries(THEMES)) {
  t.priceId = PRICE_ID[name];
  Object.assign(t.promo, {
    extendDays: PROMO_EXTEND_DAYS,
    salePrice: t.sale.price,
    originalPrice: t.sale.originalPrice,
  });
}

const requested = process.env.THEME || "default";
const mode = requested === "plain" ? "plain" : THEMES[requested] ? "fixed" : "auto";

module.exports = {
  mode,
  isPlain: mode === "plain",
  // Built into every page's <img> logos; theme-runtime.js swaps them in season.
  logo: STANDARD.logo,
  // window.YSS_SEASON for theme-runtime.js (not emitted for plain builds).
  client: { force: mode === "fixed" ? requested : null, standard: STANDARD, themes: THEMES },
};
