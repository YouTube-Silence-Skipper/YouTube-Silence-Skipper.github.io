// Seasonal theme selected at BUILD TIME via the THEME env var.
//   default (normal site):   npm run build
//   christmas (festive):     THEME=christmas npm run build
//
// Only theme-specific values live here; all content/features/layout are shared
// across themes (single source → no drift). Edit the christmas pricing below if
// the seasonal offer changes.
const name = process.env.THEME === "christmas" ? "christmas" : "default";
const isChristmas = name === "christmas";

// Paddle price id used by the checkout (read by script.js via window.YSS_PRICE_ID).
const PRICE_ID = {
  default: "pri_01k2q4bxj662c46peqbp3f2aap",
  christmas: "pri_01kch9pkfgcgmaxy18kv63k86t",
};

module.exports = {
  name,
  isChristmas,
  priceId: PRICE_ID[name],
  logo: isChristmas ? "images/logo-christmas.png" : "images/logo.png",
};
