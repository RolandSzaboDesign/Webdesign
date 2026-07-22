import fs from "node:fs";
import path from "node:path";

const rootDirectory = process.cwd();
const sourceDirectory = path.join(rootDirectory, "src");
const pagesDirectory = path.join(sourceDirectory, "hu");
const includesDirectory = path.join(sourceDirectory, "_includes");

const nonTemplateKeys = new Set([
	"layout",
	"permalink",
	"tags",
	"pagination",
	"eleventyExcludeFromCollections",
	"translation",
	"sitemap",
]);

function collectHtmlFiles(directory) {
	const files = [];

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectHtmlFiles(fullPath));
		} else if (entry.name.endsWith(".html")) {
			files.push(fullPath);
		}
	}

	return files;
}

function readFile(filePath) {
	return fs.readFileSync(filePath, "utf8");
}

function getFrontMatter(content) {
	const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
	return match ? match[1] : "";
}

function getTopLevelKeys(frontMatter) {
	const keys = new Set();

	for (const line of frontMatter.split(/\r?\n/)) {
		const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(?:\s|$)/);

		if (match) {
			keys.add(match[1]);
		}
	}

	return [...keys];
}

function getLayoutPath(content) {
	const frontMatter = getFrontMatter(content);
	const match = frontMatter.match(/^layout:\s*["']?([^"'\r\n]+)["']?\s*$/m);

	if (!match) return null;

	return path.join(includesDirectory, match[1].trim());
}

function getIncludedPaths(content) {
	const paths = [];
	const pattern = /{%\s*include\s+["']([^"']+)["'][^%]*%}/g;

	for (const match of content.matchAll(pattern)) {
		paths.push(path.join(includesDirectory, match[1]));
	}

	return paths;
}

function collectTemplateDependencies(filePath, visited = new Set()) {
	if (!filePath || visited.has(filePath) || !fs.existsSync(filePath)) {
		return [];
	}

	visited.add(filePath);

	const content = readFile(filePath);
	const dependencies = [filePath];

	const parentLayout = getLayoutPath(content);

	if (parentLayout) {
		dependencies.push(...collectTemplateDependencies(parentLayout, visited));
	}

	for (const includePath of getIncludedPaths(content)) {
		dependencies.push(...collectTemplateDependencies(includePath, visited));
	}

	return dependencies;
}

function getLiquidExpressions(content) {
	const expressions = [];

	for (const match of content.matchAll(/{{[\s\S]*?}}|{%[\s\S]*?%}/g)) {
		expressions.push(match[0]);
	}

	return expressions.join("\n");
}

function isKeyUsed(key, templateContent) {
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(`\\b${escapedKey}\\b`);

	return pattern.test(templateContent);
}

const pageFiles = collectHtmlFiles(pagesDirectory);
let possibleUnusedCount = 0;

for (const pageFile of pageFiles) {
	const pageContent = readFile(pageFile);
	const frontMatter = getFrontMatter(pageContent);

	if (!frontMatter) continue;

	const keys = getTopLevelKeys(frontMatter).filter(
		(key) => !nonTemplateKeys.has(key),
	);

	const dependencies = collectTemplateDependencies(pageFile);
	const templateContent = dependencies
		.map((filePath) => getLiquidExpressions(readFile(filePath)))
		.join("\n");

	const unusedKeys = keys.filter(
		(key) => !isKeyUsed(key, templateContent),
	);

	if (unusedKeys.length === 0) continue;

	possibleUnusedCount += unusedKeys.length;

	console.log(`\n${path.relative(rootDirectory, pageFile)}`);

	for (const key of unusedKeys) {
		console.log(`  Lehetségesen nem használt: ${key}`);
	}
}

if (possibleUnusedCount === 0) {
	console.log("Nem találtam biztosan használaton kívüli front matter kulcsot.");
} else {
	console.log(
		`\nÖsszesen ${possibleUnusedCount} lehetségesen nem használt kulcsot találtam.`,
	);
}
