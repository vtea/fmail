import { type Locale, SUPPORTED_LOCALES } from "~/i18n/config";

export const BASE_URL = "https://smail.pw";

export const MARKDOWN_BASE_PATHS = [
	"/about",
	"/faq",
	"/privacy",
	"/terms",
	"/temporary-email-24-hours",
	"/temporary-email-no-registration",
	"/disposable-email-for-verification",
	"/temporary-email-for-registration",
	"/online-temporary-email",
	"/domestic-temporary-email",
	"/can-temporary-email-send",
	"/smail-vs-smailpro",
] as const;

export const MARKDOWN_INDEXABLE_LOCALES = SUPPORTED_LOCALES;

export function isMarkdownBasePath(pathname: string): boolean {
	return (MARKDOWN_BASE_PATHS as readonly string[]).includes(pathname);
}

export function isMarkdownLocaleIndexable(locale: Locale): boolean {
	return (MARKDOWN_INDEXABLE_LOCALES as readonly Locale[]).includes(locale);
}
