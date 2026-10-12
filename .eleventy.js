module.exports = function (eleventyConfig) {
  // Static assets are copied through byte-for-byte (no transformation).
  const passthrough = [
    "src/styles.css",
    "src/christmas.css",
    "src/script.js",
    "src/activate-pro.js",
    "src/browser-links.js",
    "src/images",
    "src/CNAME",
    "src/robots.txt",
    "src/sitemap.xml",
    "src/site.webmanifest",
    "src/.htaccess",
  ];
  for (const p of passthrough) eleventyConfig.addPassthroughCopy(p);

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["html", "njk"],
  };
};
