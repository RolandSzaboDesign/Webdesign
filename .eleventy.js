module.exports = function(eleventyConfig) {
	eleventyConfig.addPassthroughCopy("src/_redirects");
	eleventyConfig.addPassthroughCopy({
		"src/assets/favicons/favicon.ico": "favicon.ico"
	});
	eleventyConfig.addPassthroughCopy("src/assets");

	eleventyConfig.addWatchTarget("src/assets/css");
	eleventyConfig.addWatchTarget("src/assets/js");
	eleventyConfig.addWatchTarget("src/_data");

	eleventyConfig.setQuietMode(true);

	return {
		dir: {
			input: "src",
			output: "public",
			includes: "_includes",
			data: "_data"
		},
		templateFormats: ["html", "njk", "md"]
	};
};
