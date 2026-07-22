import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const site = require(path.join(rootDir, "src", "_data", "site.js"));
const siteUrl = String(site.url || "").replace(/\/$/, "");

const errors = [];
const warnings = [];

function addError(file, message) {
	errors.push(`${file}: ${message}`);
}

function addWarning(file, message) {
	warnings.push(`${file}: ${message}`);
}

function walk(directory) {
	if (!fs.existsSync(directory)) return [];

	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = path.join(directory, entry.name);
		return entry.isDirectory() ? walk(fullPath) : [fullPath];
	});
}

function normalizeSlashes(value) {
	return value.split(path.sep).join("/");
}

function relativeFile(filePath) {
	return normalizeSlashes(path.relative(rootDir, filePath));
}

function htmlFileToUrl(filePath) {
	const relative = normalizeSlashes(path.relative(publicDir, filePath));

	if (relative === "index.html") return "/";
	if (relative.endsWith("/index.html")) {
		return `/${relative.slice(0, -"index.html".length)}`;
	}

	return `/${relative}`;
}

function stripQueryAndHash(value) {
	return value.split("#", 1)[0].split("?", 1)[0];
}

function splitUrl(value) {
	const hashIndex = value.indexOf("#");

	return {
		path: stripQueryAndHash(value),
		fragment: hashIndex >= 0 ? value.slice(hashIndex + 1) : "",
	};
}

function localPathFromUrl(value) {
	if (!value) return null;

	if (value.startsWith(siteUrl)) {
		const remainder = value.slice(siteUrl.length);
		return remainder || "/";
	}

	if (value.startsWith("/")) return value;

	return null;
}

function resolvePublicTarget(urlPath) {
	const cleanPath = decodeURIComponent(stripQueryAndHash(urlPath));
	const relative = cleanPath.replace(/^\/+/, "");
	const direct = path.join(publicDir, relative);

	if (cleanPath.endsWith("/")) {
		return path.join(direct, "index.html");
	}

	if (path.extname(cleanPath)) return direct;

	if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
		return direct;
	}

	return path.join(direct, "index.html");
}

function parseAttributes(source) {
	const attributes = new Map();
	const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
	let match;

	while ((match = pattern.exec(source))) {
		attributes.set(
			match[1].toLowerCase(),
			match[2] ?? match[3] ?? match[4] ?? "",
		);
	}

	return attributes;
}

function getMetaContent(html, attribute, value) {
	const metaPattern = /<meta\b([^>]*)>/gi;
	let match;

	while ((match = metaPattern.exec(html))) {
		const attributes = parseAttributes(match[1]);

		if (attributes.get(attribute) === value) {
			return attributes.get("content") || "";
		}
	}

	return "";
}

function getCanonical(html) {
	const linkPattern = /<link\b([^>]*)>/gi;
	let match;

	while ((match = linkPattern.exec(html))) {
		const attributes = parseAttributes(match[1]);

		if (attributes.get("rel") === "canonical") {
			return attributes.get("href") || "";
		}
	}

	return "";
}

if (!fs.existsSync(publicDir)) {
	console.error("A public könyvtár nem található. Előbb futtasd: npm run build");
	process.exit(1);
}

const allPublicFiles = walk(publicDir);
const htmlFiles = allPublicFiles.filter((file) => file.endsWith(".html"));
const htmlByPath = new Map();
const htmlByUrl = new Map();

for (const file of htmlFiles) {
	const html = fs.readFileSync(file, "utf8");

	htmlByPath.set(path.resolve(file), html);
	htmlByUrl.set(htmlFileToUrl(file), { file, html });
}

if (htmlFiles.length === 0) {
	addError("public", "nem található generált HTML-fájl");
}

for (const file of htmlFiles) {
	const fileLabel = relativeFile(file);
	const pageUrl = htmlFileToUrl(file);
	const html = htmlByPath.get(path.resolve(file));

	const langMatch = html.match(
		/<html\b[^>]*\blang=["']([^"']+)["']/i,
	);

	if (!langMatch?.[1]) {
		addError(fileLabel, "hiányzik a html[lang]");
	}

	const titleMatch = html.match(
		/<title>([\s\S]*?)<\/title>/i,
	);

	if (!titleMatch?.[1]?.trim()) {
		addError(fileLabel, "hiányzik vagy üres a <title>");
	}

	if (!getMetaContent(html, "name", "description").trim()) {
		addError(fileLabel, "hiányzik vagy üres a meta description");
	}

	const canonical = getCanonical(html);

	if (!canonical) {
		addError(fileLabel, "hiányzik a canonical URL");
	} else if (canonical !== `${siteUrl}${pageUrl}`) {
		addError(
			fileLabel,
			`hibás canonical: ${canonical} (elvárt: ${siteUrl}${pageUrl})`,
		);
	}

	for (const [attribute, value] of [
		["property", "og:title"],
		["property", "og:description"],
		["property", "og:image"],
		["property", "og:image:alt"],
		["name", "twitter:card"],
		["name", "twitter:title"],
		["name", "twitter:description"],
		["name", "twitter:image"],
		["name", "twitter:image:alt"],
	]) {
		if (!getMetaContent(html, attribute, value).trim()) {
			addError(fileLabel, `hiányzik vagy üres: ${value}`);
		}
	}

	const h1Count = (html.match(/<h1\b/gi) || []).length;

	if (h1Count !== 1) {
		addError(
			fileLabel,
			`pontosan 1 darab h1 szükséges, jelenleg: ${h1Count}`,
		);
	}

	const mainCount = (
		html.match(/<main\b[^>]*\bid=["']main-content["']/gi) || []
	).length;

	if (mainCount !== 1) {
		addError(
			fileLabel,
			`pontosan 1 darab main#main-content szükséges, jelenleg: ${mainCount}`,
		);
	}

	const ids = [
		...html.matchAll(/\bid=["']([^"']+)["']/gi),
	].map((match) => match[1]);

	const duplicateIds = [
		...new Set(
			ids.filter((id, index) => ids.indexOf(id) !== index),
		),
	];

	for (const id of duplicateIds) {
		addError(fileLabel, `duplikált id: #${id}`);
	}

	const idSet = new Set(ids);

	for (
		const match of html.matchAll(
			/\b(?:aria-controls|for)=["']([^"']+)["']/gi,
		)
	) {
		if (!idSet.has(match[1])) {
			addError(
				fileLabel,
				`nem létező id-re hivatkozik: ${match[0]}`,
			);
		}
	}

	for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
		const attributes = parseAttributes(match[1]);

		for (const required of [
			"src",
			"alt",
			"width",
			"height",
			"loading",
		]) {
			if (
				!attributes.has(required)
				|| (required !== "alt" && !attributes.get(required))
			) {
				addError(
					fileLabel,
					`img elemről hiányzik: ${required}`,
				);
			}
		}
	}

	for (
		const match of html.matchAll(
			/<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
		)
	) {
		const attributes = parseAttributes(match[1]);
		const href = attributes.get("href") || "";

		if (attributes.get("target") === "_blank") {
			const relTokens = new Set(
				(attributes.get("rel") || "").split(/\s+/),
			);

			if (!relTokens.has("noopener")) {
				addError(
					fileLabel,
					`target="_blank" linkről hiányzik a rel="noopener": ${href}`,
				);
			}

			if (!match[2].includes("visually-hidden")) {
				addWarning(
					fileLabel,
					`az új lapon nyíló link nem tartalmaz rejtett tájékoztatást: ${href}`,
				);
			}
		}

		if (
			!href
			|| /^(?:mailto:|tel:|javascript:)/i.test(href)
		) {
			continue;
		}

		if (href.startsWith("#")) {
			const fragment = href.slice(1);

			if (fragment && !idSet.has(fragment)) {
				addError(
					fileLabel,
					`nem létező oldalon belüli célpont: ${href}`,
				);
			}

			continue;
		}

		const localValue = localPathFromUrl(href);

		if (!localValue) continue;

		const {
			path: targetUrl,
			fragment,
		} = splitUrl(localValue);

		const targetFile = resolvePublicTarget(targetUrl || "/");

		if (!fs.existsSync(targetFile)) {
			addError(fileLabel, `hibás belső link: ${href}`);
			continue;
		}

		if (fragment && targetFile.endsWith(".html")) {
			const targetHtml =
				htmlByPath.get(path.resolve(targetFile))
				|| fs.readFileSync(targetFile, "utf8");

			const escapedFragment = fragment.replace(
				/[.*+?^${}()|[\]\\]/g,
				"\\$&",
			);

			const fragmentPattern = new RegExp(
				`\\bid=["']${escapedFragment}["']`,
				"i",
			);

			if (!fragmentPattern.test(targetHtml)) {
				addError(
					fileLabel,
					`nem létező fragmentcél: ${href}`,
				);
			}
		}
	}

	for (
		const match of html.matchAll(
			/<(?:img|script|link|source)\b([^>]*)>/gi,
		)
	) {
		const attributes = parseAttributes(match[1]);
		const reference =
			attributes.get("src")
			|| attributes.get("href")
			|| "";

		const localValue = localPathFromUrl(reference);

		if (!localValue) continue;

		const targetFile = resolvePublicTarget(localValue);

		if (!fs.existsSync(targetFile)) {
			addError(
				fileLabel,
				`hiányzó helyi erőforrás: ${reference}`,
			);
		}
	}

	for (const metaName of ["og:image", "twitter:image"]) {
		const attribute = metaName.startsWith("og:")
			? "property"
			: "name";

		const reference = getMetaContent(
			html,
			attribute,
			metaName,
		);

		const localValue = localPathFromUrl(reference);

		if (!localValue) continue;

		const targetFile = resolvePublicTarget(localValue);

		if (!fs.existsSync(targetFile)) {
			addError(
				fileLabel,
				`hiányzó ${metaName} fájl: ${reference}`,
			);
		}
	}

	for (
		const match of html.matchAll(
			/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
		)
	) {
		try {
			JSON.parse(match[1]);
		} catch (error) {
			addError(
				fileLabel,
				`érvénytelen JSON-LD: ${error.message}`,
			);
		}
	}

	for (
		const match of html.matchAll(
			/<form\b([^>]*)>([\s\S]*?)<\/form>/gi,
		)
	) {
		const attributes = parseAttributes(match[1]);

		if (!attributes.has("data-netlify")) continue;

		const formName = attributes.get("name") || "";
		const action = attributes.get("action") || "";
		const formHtml = match[2];

		if (!formName) {
			addError(
				fileLabel,
				"Netlify űrlapról hiányzik a name",
			);
		}

		if (!action) {
			addError(
				fileLabel,
				`Netlify űrlapról hiányzik az action (${formName || "névtelen"})`,
			);
		}

		const hiddenFormName =
			formHtml.match(
				/<input\b[^>]*name=["']form-name["'][^>]*value=["']([^"']+)["'][^>]*>/i,
			)?.[1]
			?? formHtml.match(
				/<input\b[^>]*value=["']([^"']+)["'][^>]*name=["']form-name["'][^>]*>/i,
			)?.[1]
			?? "";

		if (hiddenFormName !== formName) {
			addError(
				fileLabel,
				`a rejtett form-name nem egyezik a form nevével: ${formName}`,
			);
		}

		for (const hiddenName of ["source", "page-url"]) {
			const pattern = new RegExp(
				`<input\\b[^>]*name=["']${hiddenName}["']`,
				"i",
			);

			if (!pattern.test(formHtml)) {
				addError(
					fileLabel,
					`a Netlify űrlapról hiányzik a rejtett ${hiddenName} mező`,
				);
			}
		}

		if (action) {
			const localAction = localPathFromUrl(action);

			if (
				localAction
				&& !fs.existsSync(resolvePublicTarget(localAction))
			) {
				addError(
					fileLabel,
					`az űrlap action célja nem létezik: ${action}`,
				);
			}
		}
	}
}

const sitemapPath = path.join(publicDir, "sitemap.xml");
const sitemapUrls = new Set();

if (!fs.existsSync(sitemapPath)) {
	addError("public/sitemap.xml", "hiányzik");
} else {
	const sitemap = fs.readFileSync(sitemapPath, "utf8");

	for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
		const absoluteUrl = match[1].trim();

		sitemapUrls.add(absoluteUrl);

		const localValue = localPathFromUrl(absoluteUrl);

		if (!localValue) {
			addError(
				"public/sitemap.xml",
				`idegen domain szerepel benne: ${absoluteUrl}`,
			);

			continue;
		}

		if (!fs.existsSync(resolvePublicTarget(localValue))) {
			addError(
				"public/sitemap.xml",
				`nem létező URL szerepel benne: ${absoluteUrl}`,
			);
		}
	}
}

for (const [pageUrl, { file, html }] of htmlByUrl) {
	const robots = getMetaContent(
		html,
		"name",
		"robots",
	).toLowerCase();

	if (
		robots.includes("noindex")
		&& sitemapUrls.has(`${siteUrl}${pageUrl}`)
	) {
		addError(
			relativeFile(file),
			"noindex oldal szerepel a sitemapben",
		);
	}
}

const robotsPath = path.join(publicDir, "robots.txt");

if (!fs.existsSync(robotsPath)) {
	addError("public/robots.txt", "hiányzik");
} else {
	const robots = fs.readFileSync(robotsPath, "utf8");

	if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) {
		addError(
			"public/robots.txt",
			"hiányzik vagy hibás a Sitemap sor",
		);
	}
}

const manifestPath = path.join(
	publicDir,
	"assets",
	"favicons",
	"site.webmanifest",
);

if (!fs.existsSync(manifestPath)) {
	addError(
		"public/assets/favicons/site.webmanifest",
		"hiányzik",
	);
} else {
	try {
		const manifest = JSON.parse(
			fs.readFileSync(manifestPath, "utf8"),
		);

		for (const icon of manifest.icons || []) {
			const iconPath = path.resolve(
				path.dirname(manifestPath),
				icon.src,
			);

			if (!fs.existsSync(iconPath)) {
				addError(
					relativeFile(manifestPath),
					`hiányzó manifestikon: ${icon.src}`,
				);
			}
		}
	} catch (error) {
		addError(
			relativeFile(manifestPath),
			`érvénytelen JSON: ${error.message}`,
		);
	}
}

const redirectsPath = path.join(publicDir, "_redirects");

if (!fs.existsSync(redirectsPath)) {
	addError("public/_redirects", "hiányzik");
} else {
	const redirects = fs.readFileSync(redirectsPath, "utf8");

	for (
		const [index, rawLine] of redirects
			.split(/\r?\n/)
			.entries()
	) {
		const line = rawLine.trim();

		if (!line || line.startsWith("#")) continue;

		const [source, target] = line.split(/\s+/);

		if (!source || !target) {
			addError(
				"public/_redirects",
				`hibás sor (${index + 1}): ${rawLine}`,
			);

			continue;
		}

		if (source === target) {
			addError(
				"public/_redirects",
				`önmagára mutató redirect (${index + 1}): ${source}`,
			);
		}

		if (target.includes(":")) continue;

		const localTarget = localPathFromUrl(target);

		if (
			localTarget
			&& !fs.existsSync(resolvePublicTarget(localTarget))
		) {
			addError(
				"public/_redirects",
				`nem létező belső cél (${index + 1}): ${target}`,
			);
		}
	}
}

if (warnings.length) {
	console.log("\nFIGYELMEZTETÉSEK\n");

	for (const warning of warnings) {
		console.log(`- ${warning}`);
	}
}

if (errors.length) {
	console.error("\nHIBÁK\n");

	for (const error of errors) {
		console.error(`- ${error}`);
	}

	console.error(
		`\nÖsszesen ${errors.length} hiba és ${warnings.length} figyelmeztetés.`,
	);

	process.exit(1);
}

console.log(
	`Build audit rendben: ${htmlFiles.length} HTML-fájl, ${sitemapUrls.size} sitemap URL, ${warnings.length} figyelmeztetés.`,
);
