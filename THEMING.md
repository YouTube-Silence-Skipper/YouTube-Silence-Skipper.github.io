# Seasonal theming

The site is a single Eleventy source that can be built in more than one **theme**.
Content, features, layout, and copy are shared across every theme — a theme only
overlays a few visual bits (and, for seasonal promos, the checkout price id). This
means there is **no separate branch to keep in sync**: `main` is the only source.

## Build

```bash
npm run build                 # default theme (the normal site)
THEME=christmas npm run build  # festive build
```

The default build is byte/UI-identical to the normal site — themes never change
the base output, they only add to it.

## Deploy a theme

Deployment is a GitHub Actions workflow (`.github/workflows/deploy.yml`):

- **Normal:** every push to `main` builds and deploys the **default** theme.
- **Seasonal:** GitHub → **Actions → "Deploy to GitHub Pages" → Run workflow**,
  pick `theme = christmas`. To switch back, run it again with `theme = default`
  (or just push to `main`).

Locally you can preview a theme with `THEME=christmas npm run build && npx http-server _site`.

## How it works

| Piece | File |
| --- | --- |
| Theme selection (reads `THEME` env) + per-theme checkout price id | `src/_data/theme.js` |
| Festive styles (snowfall, sale pricing card skin) | `src/christmas.css` |
| Conditional `<head>` assets (seasonal font + CSS) | `src/_includes/partials/theme-head.njk` |
| Conditional `<body>` assets (snow + price-id global + snow script) | `src/_includes/partials/theme-body.njk` |
| Conditional pricing-card markup (badge / sale price) | `src/index.html` (`{% if theme.isChristmas %}`) |
| Checkout reads the active price id | `src/script.js` (`window.YSS_PRICE_ID` with a default fallback) |

Every page includes `theme-head.njk` before `</head>` and `theme-body.njk` before
`</body>`; in the default theme both render nothing.

The seasonal checkout price id lives only in `src/_data/theme.js` — update it there
if a seasonal offer changes; no other file needs editing.

## Add a new season (e.g. `halloween`)

1. In `src/_data/theme.js`, accept the new `THEME` value and add its price id.
2. Add `src/halloween.css` with the seasonal styles.
3. Extend the `{% if %}` blocks in `theme-head.njk` / `theme-body.njk` (and any
   markup like the pricing card) to cover the new theme.
4. Add the new value to the `theme` input options in `.github/workflows/deploy.yml`.
