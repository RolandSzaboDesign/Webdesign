(() => {
	const header = document.querySelector("[data-site-header]");
	const toggle = document.querySelector("[data-menu-toggle]");
	const menu = document.querySelector("[data-menu]");
	const label = document.querySelector("[data-menu-label]");

	if (!header || !toggle || !menu || !label) return;

	const desktopMedia = window.matchMedia("(min-width: 900px)");
	const openText = toggle.dataset.menuOpen || label.textContent.trim();
	const closeText = toggle.dataset.menuClose || "Close menu";

	const isMenuOpen = () => toggle.getAttribute("aria-expanded") === "true";

	const setMenuState = (isOpen) => {
		toggle.setAttribute("aria-expanded", String(isOpen));
		toggle.setAttribute("aria-label", isOpen ? closeText : openText);
		menu.dataset.open = String(isOpen);
		label.textContent = isOpen ? closeText : openText;
		document.body.classList.toggle("menu-open", isOpen && !desktopMedia.matches);
	};

	toggle.addEventListener("click", () => {
		setMenuState(!isMenuOpen());
	});

	menu.addEventListener("click", (event) => {
		if (event.target.closest("a")) {
			setMenuState(false);
		}
	});

	document.addEventListener("pointerdown", (event) => {
		if (isMenuOpen() && !header.contains(event.target)) {
			setMenuState(false);
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && isMenuOpen()) {
			setMenuState(false);
			toggle.focus();
		}
	});

	desktopMedia.addEventListener("change", (event) => {
		if (event.matches) {
			setMenuState(false);
		}
	});

	setMenuState(false);
})();
