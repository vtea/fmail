export const DEFAULT_LOCALE = "en" as const;
export const SUPPORTED_LOCALES = ["en", "zh"] as const;
export const RETIRED_LOCALES = [
	"es",
	"fr",
	"de",
	"ja",
	"ko",
	"ru",
	"pt",
	"ar",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type RetiredLocale = (typeof RETIRED_LOCALES)[number];

const LOCALE_PREFIXES = [...SUPPORTED_LOCALES, ...RETIRED_LOCALES] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
	en: "English",
	zh: "中文",
};

export function normalizePathname(pathname: string): string {
	if (!pathname) {
		return "/";
	}
	if (pathname !== "/" && pathname.endsWith("/")) {
		return pathname.slice(0, -1);
	}
	return pathname;
}

export function stripDefaultLocalePrefix(pathname: string): string {
	return stripLocalePrefix(pathname);
}

export function getLocaleFromPathname(pathname: string): Locale {
	const normalized = normalizePathname(pathname);
	for (const locale of SUPPORTED_LOCALES) {
		if (locale === DEFAULT_LOCALE) {
			continue;
		}
		if (normalized === `/${locale}` || normalized.startsWith(`/${locale}/`)) {
			return locale;
		}
	}
	return DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
	const normalized = normalizePathname(pathname);
	for (const locale of LOCALE_PREFIXES) {
		if (normalized === `/${locale}` || normalized.startsWith(`/${locale}/`)) {
			const stripped = normalized.slice(locale.length + 1);
			return stripped.length > 0 ? stripped : "/";
		}
	}
	return normalized;
}

export function toLocalePath(pathname: string, locale: Locale): string {
	const basePath = stripLocalePrefix(pathname);
	if (locale === DEFAULT_LOCALE) {
		return basePath;
	}
	return basePath === "/" ? `/${locale}` : `/${locale}${basePath}`;
}

export function getLocaleDirection(_locale: Locale): "ltr" | "rtl" {
	return "ltr";
}

export function toIntlLocale(locale: Locale): string {
	switch (locale) {
		case "en":
			return "en-US";
		case "zh":
			return "zh-CN";
		default:
			return locale;
	}
}

export function resolveLocaleParam(lang: string | undefined): {
	locale: Locale;
	shouldRedirectToDefault: boolean;
	isInvalid: boolean;
} {
	if (!lang) {
		return {
			locale: DEFAULT_LOCALE,
			shouldRedirectToDefault: false,
			isInvalid: false,
		};
	}

	if (isRetiredLocale(lang) || lang === DEFAULT_LOCALE) {
		return {
			locale: DEFAULT_LOCALE,
			shouldRedirectToDefault: true,
			isInvalid: false,
		};
	}

	if (!isKnownLocale(lang)) {
		return {
			locale: DEFAULT_LOCALE,
			shouldRedirectToDefault: false,
			isInvalid: true,
		};
	}

	return {
		locale: lang,
		shouldRedirectToDefault: false,
		isInvalid: false,
	};
}

export function isKnownLocale(value: string | undefined): value is Locale {
	if (!value) {
		return false;
	}
	return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isRetiredLocale(value: string | undefined): value is RetiredLocale {
	if (!value) {
		return false;
	}
	return (RETIRED_LOCALES as readonly string[]).includes(value);
}
