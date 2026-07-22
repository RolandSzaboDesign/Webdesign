module.exports = {
	name: "Roland Szabó Design",
	url: "https://rolandszabo.design",
	year: new Date().getFullYear(),

	languages: [
		{
			code: "hu",
			label: "Magyar"
		},
		{
			code: "en",
			label: "English"
		}
	],

	hu: {
		name: "Roland Szabó Design",
		locale: "hu_HU",
		languageShort: "HU",
		switchLanguageLabel: "Váltás angol nyelvre",
		brandDescription: "Weboldalak szolgáltatóknak és kisvállalkozásoknak",
		skipLink: "Ugrás a fő tartalomhoz",
		menuOpen: "Menü megnyitása",
		menuClose: "Menü bezárása",
		navTitle: "Fő navigáció",
		contactAnchor: "kapcsolat",
		opensInNewTab: "Új lapon nyílik",
		socialImage: {
			src: "/assets/images/og-image.webp",
			alt: "Roland Szabó Design – személyre szabott weboldalak szolgáltatóknak és kisvállalkozásoknak"
		},

		nav: {
			websiteDesign: {
				label: "Weboldalkészítés",
				url: "/hu/weboldalkeszites/"
			},
			process: {
				label: "Így dolgozom",
				url: "/hu/igy-dolgozom/"
			},
			caseStudy: {
				label: "Esettanulmány",
				url: "/hu/esettanulmany/"
			},
			contact: {
				label: "Kapcsolat",
				url: "/hu/kapcsolat/"
			}
		},

		form: {
			successUrl: "/hu/koszonom/",
			honeypot: "Ezt a mezőt hagyd üresen:",
			name: "Név",
			phone: "Telefonszám",
			submitCallback: "Visszahívást kérek",
			privacy: "Az adatokat kizárólag a kapcsolatfelvételhez használom."
		},

		footerText: "Weboldalak szolgáltatóknak és kisvállalkozásoknak.",
		copyright: "Minden jog fenntartva."
	},

	en: {
		name: "Roland Szabó Design",
		locale: "en_GB",
		languageShort: "EN",
		switchLanguageLabel: "Switch to Hungarian",
		brandDescription: "Websites for service providers and small businesses",
		skipLink: "Skip to main content",
		menuOpen: "Open menu",
		menuClose: "Close menu",
		navTitle: "Main navigation",
		contactAnchor: "contact",
		opensInNewTab: "Opens in a new tab",
		socialImage: {
			src: "/assets/images/og-image.webp",
			alt: "Roland Szabó Design – custom websites for service providers and small businesses"
		},

		nav: {
			websiteDesign: {
				label: "Website design",
				url: "/en/website-design/"
			},
			process: {
				label: "How I work",
				url: "/en/how-i-work/"
			},
			caseStudy: {
				label: "Case study",
				url: "/en/case-study/"
			},
			contact: {
				label: "Contact",
				url: "/en/contact/"
			}
		},

		form: {
			successUrl: "/en/thank-you/",
			honeypot: "Leave this field empty:",
			name: "Name",
			phone: "Phone number",
			submitCallback: "Request a callback",
			privacy: "I only use your details to respond to your enquiry."
		},

		footerText: "Websites for service providers and small businesses.",
		copyright: "All rights reserved."
	}
};
