module.exports = function(eleventyConfig) {
	// Passthrough copy for specific files and assets
	eleventyConfig.addPassthroughCopy("src/_redirects");
	eleventyConfig.addPassthroughCopy("src/favicon.ico");
	eleventyConfig.addPassthroughCopy("src/assets");
	eleventyConfig.addPassthroughCopy("src/assets/js");

	// Watch for CSS and JS changes
	eleventyConfig.addWatchTarget("src/assets/css");
	eleventyConfig.addWatchTarget("src/assets/js");
	eleventyConfig.addWatchTarget("src/_data");
	eleventyConfig.addWatchTarget("src/_data/site.js");

	// Quiet mode for cleaner output
	eleventyConfig.setQuietMode(true);

	return {
		dir: {
			input: "src",
			output: "public",
			includes: "_includes"
		}
	};
};
