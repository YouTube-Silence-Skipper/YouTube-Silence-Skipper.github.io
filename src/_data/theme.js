// Seasonal theme selected at BUILD TIME via the THEME env var.
//   default (normal site):   npm run build
//   christmas (festive):     THEME=christmas    npm run build
//   black-friday (sale):     THEME=black-friday npm run build
//   halloween (spooky):      THEME=halloween    npm run build
//
// All content, features, layout and copy are SHARED across themes (single
// source → no drift). Only the per-theme overlay values below differ, and the
// "default" theme adds nothing, so the default build stays byte-for-byte
// identical to the normal live site. Edit seasonal pricing here if an offer
// changes — keep these values out of public commit messages.

// Paddle price id used by the checkout (read by script.js via window.YSS_PRICE_ID).
const PRICE_ID = {
  default: "pri_01k2q4bxj662c46peqbp3f2aap",
  christmas: "pri_01kch9pkfgcgmaxy18kv63k86t",
  // Black Friday sale. Reuses the $1 sale price id until a dedicated one is set.
  "black-friday": "pri_01kch9pkfgcgmaxy18kv63k86t",
  // Halloween is a visual-only theme (no discount) → standard price.
  halloween: "pri_01k2q4bxj662c46peqbp3f2aap",
};

// Per-theme overlay. Every field is optional; a missing field means "same as the
// base site". Falling-particle effect is a shared mechanism (theme-body.njk)
// parameterized by { container, item, glyph, count }.
const THEMES = {
  default: {
    logo: "images/logo.png",
  },
  christmas: {
    logo: "images/logo-christmas.png",
    css: "christmas.css",
    fontUrl: "https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap",
    cardClass: "christmas-special",
    planIcon: "fas fa-gift",
    badge: "🎄 Christmas Sale! 🎄",
    badgeClass: "christmas-badge",
    sale: { originalPrice: "$1.99", price: "$1" },
    fall: { container: "snow", item: "flake", glyph: "❄️", count: 50 },
  },
  "black-friday": {
    logo: "images/logo.png",
    css: "black-friday.css",
    cardClass: "blackfriday-special",
    badge: "🔥 BLACK FRIDAY 🔥",
    badgeClass: "blackfriday-badge",
    sale: { originalPrice: "$1.99", price: "$1" },
  },
  halloween: {
    logo: "images/logo-halloween.png",
    css: "halloween.css",
    fontUrl: "https://fonts.googleapis.com/css2?family=Creepster&display=swap",
    cardClass: "halloween-special",
    badge: "🎃 Happy Halloween 🎃",
    badgeClass: "halloween-badge",
    fall: { container: "bats", item: "bat", glyph: "🦇", count: 12, spread: 60 },
  },
};

const name = THEMES[process.env.THEME] ? process.env.THEME : "default";

module.exports = Object.assign(
  { name, isDefault: name === "default", priceId: PRICE_ID[name] },
  THEMES[name]
);
