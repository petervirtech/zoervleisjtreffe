import lim from '../locales/lim.json';
import nl from '../locales/nl.json';

export type Lang = 'lim' | 'nl';

type LocaleData = typeof lim;

const locales: Record<Lang, LocaleData> = {
	lim,
	nl,
};

export function resolveLang(lang: string | undefined): Lang {
	return lang === 'lim' ? 'lim' : 'nl';
}

export function getLocaleData(lang: string | undefined) {
	const activeLang = resolveLang(lang);
	const locale = locales[activeLang];

	const menu = [
		{ href: `/${activeLang}`, label: locale.nav.home },
		{ href: `/${activeLang}/geschiedenis`, label: locale.nav.history },
		{ href: `/${activeLang}/hoe-het-werkt`, label: locale.nav.howItWorks },
		{ href: `/${activeLang}/faq`, label: locale.nav.faq },
		//{ href: `/${activeLang}/inschrijven`, label: locale.nav.signup },
	];

	const languages = [
		{ code: 'lim', label: locales.lim.ui.languages.lim, href: '/lim' },
		{ code: 'nl', label: locales.nl.ui.languages.nl, href: '/nl' },
	];

	return {
		activeLang,
		locale,
		menu,
		languages,
	};
}