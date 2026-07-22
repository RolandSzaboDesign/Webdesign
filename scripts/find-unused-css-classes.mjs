import fs from "node:fs";
import path from "node:path";

const rootDirectory = process.cwd();
const sourceDirectory = path.join(rootDirectory, "src");
const cssFile = path.join(sourceDirectory, "assets", "css", "style.css");

const searchableExtensions = new Set([
	".html",
	".njk",
	".liquid",
	".js",
	".mjs",
	".json",
	".md",
]);

function collectFiles(directory) {
	const files = [];

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectFiles(fullPath));
			continue;
		}

		if (searchableExtensions.has(path.extname(entry.name))) {
			files.push(fullPath);
		}
	}

	return files;
}

if (!fs.existsSync(cssFile)) {
	console.error(`Nem található a CSS-fájl: ${cssFile}`);
	process.exit(1);
}

const css = fs.readFileSync(cssFile, "utf8");
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const sourceFiles = collectFiles(sourceDirectory).filter((file) => file !== cssFile);
const sourceContent = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

const classPattern = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
const classes = new Set();

for (const match of cssWithoutComments.matchAll(classPattern)) {
	classes.add(match[1]);
}

const unusedClasses = [...classes]
	.filter((className) => !sourceContent.includes(className))
	.sort((a, b) => a.localeCompare(b));

if (unusedClasses.length === 0) {
	console.log("Nem találtam biztosan használaton kívüli CSS-osztályt.");
	process.exit(0);
}

console.log(`Lehetséges holt CSS-osztályok: ${unusedClasses.length}\n`);

for (const className of unusedClasses) {
	console.log(`.${className}`);
}
