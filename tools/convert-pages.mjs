// One-shot: replace the duplicated <nav class="navbar"> and <footer class="footer">
// blocks in each full-site page with Nunjucks includes, and prepend the front
// matter that selects the correct nav/footer variant for that page.
import { readFileSync, writeFileSync } from "node:fs";

const CFG = {
  "index.html":                 { navVariant: "home",    quickBase: "",           showActivatePro: true },
  "pro-success.html":           { navVariant: "subpage", quickBase: "index.html", showActivatePro: false },
  "privacy-policy.html":        { navVariant: "subpage", quickBase: "index.html", showActivatePro: true },
  "terms-and-conditions.html":  { navVariant: "subpage", quickBase: "index.html", showActivatePro: true },
  "404.html":                   { navVariant: "subpage", quickBase: "index.html", showActivatePro: false },
};

const NAV_INCLUDE = `  {% include "partials/navbar.njk" %}`;
const FOOTER_INCLUDE = `  {% include "partials/footer.njk" %}`;

for (const [page, cfg] of Object.entries(CFG)) {
  const path = `src/${page}`;
  let html = readFileSync(path, "utf8");

  const beforeNav = html;
  html = html.replace(/[ \t]*<nav class="navbar">[\s\S]*?<\/nav>/, NAV_INCLUDE);
  if (html === beforeNav) throw new Error(`navbar block not found in ${page}`);

  const beforeFooter = html;
  html = html.replace(/[ \t]*<footer class="footer">[\s\S]*?<\/footer>/, FOOTER_INCLUDE);
  if (html === beforeFooter) throw new Error(`footer block not found in ${page}`);

  const frontMatter =
    `---\n` +
    `navVariant: ${cfg.navVariant}\n` +
    `quickBase: "${cfg.quickBase}"\n` +
    `showActivatePro: ${cfg.showActivatePro}\n` +
    `---\n`;

  writeFileSync(path, frontMatter + html);
  console.log(`converted ${page}`);
}
