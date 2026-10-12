// Preserve the original flat URLs (e.g. /pro-success.html), not Eleventy's
// default "pretty" /pro-success/ directories. Applies to every template in src/.
module.exports = {
  eleventyComputed: {
    permalink: (data) => `${data.page.filePathStem}.html`,
  },
};
