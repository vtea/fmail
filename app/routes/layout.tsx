import { useEffect, useRef, useState } from "react";
import {
	Link,
	NavLink,
	Outlet,
	redirect,
	useLocation,
	useNavigate,
} from "react-router";
import {
	LOCALE_LABELS,
	type Locale,
	resolveLocaleParam,
	stripDefaultLocalePrefix,
	toLocalePath,
} from "~/i18n/config";
import { getDictionary } from "~/i18n/messages";
import type { Route } from "./+types/layout";

export async function loader({ params, request }: Route.LoaderArgs) {
	const { locale, shouldRedirectToDefault, isInvalid } = resolveLocaleParam(
		params.lang,
	);
	if (isInvalid) {
		throw new Response("Not Found", { status: 404 });
	}
	if (shouldRedirectToDefault) {
		const url = new URL(request.url);
		const normalizedPath = stripDefaultLocalePrefix(url.pathname);
		throw redirect(`${normalizedPath}${url.search}`, 301);
	}
	return {
		locale,
		renderedYear: new Date().getUTCFullYear(),
	};
}

export default function Layout({ loaderData }: Route.ComponentProps) {
	const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const languageMenuRef = useRef<HTMLDivElement | null>(null);
	const mobileMenuRef = useRef<HTMLDivElement | null>(null);
	const location = useLocation();
	const navigate = useNavigate();
	const locale = loaderData.locale;
	const copy = getDictionary(locale).layout;
	const localeEntries = Object.entries(LOCALE_LABELS) as [Locale, string][];
	const currentLocaleLabel = LOCALE_LABELS[locale];
	const mobileLanguageLabel = locale === "zh" ? "语言" : "Language";

	const localizeLink = (path: string) => toLocalePath(path, locale);

	useEffect(() => {
		setIsLanguageMenuOpen(false);
		setIsMobileMenuOpen(false);
	}, [location.pathname, location.search, location.hash]);

	useEffect(() => {
		if (!isLanguageMenuOpen && !isMobileMenuOpen) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}
			if (isLanguageMenuOpen && !languageMenuRef.current?.contains(target)) {
				setIsLanguageMenuOpen(false);
			}
			if (isMobileMenuOpen && !mobileMenuRef.current?.contains(target)) {
				setIsMobileMenuOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsLanguageMenuOpen(false);
				setIsMobileMenuOpen(false);
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleEscape);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isLanguageMenuOpen, isMobileMenuOpen]);

	const switchLocale = (nextLocale: Locale) => {
		if (nextLocale === locale) {
			setIsLanguageMenuOpen(false);
			setIsMobileMenuOpen(false);
			return;
		}
		const targetPath = `${toLocalePath(location.pathname, nextLocale)}${location.search}${location.hash}`;
		navigate(targetPath);
		setIsLanguageMenuOpen(false);
		setIsMobileMenuOpen(false);
	};

	const closeMobileMenu = () => {
		setIsMobileMenuOpen(false);
	};

	return (
		<div className="min-h-dvh px-4 py-4 sm:px-6 sm:py-5">
			<div className="site-frame flex min-h-[calc(100dvh-2rem)] flex-col gap-4">
				<header className="glass-panel sticky top-2 z-40 px-4 py-3 sm:px-6">
					<div className="flex items-center gap-2 sm:gap-3">
						<Link
							to={localizeLink("/")}
							prefetch="viewport"
							className="group inline-flex items-center gap-2.5"
						>
							<span className="brand-badge relative inline-flex size-[36px]">
								<img
									src="/favicon.ico"
									alt="FMail logo"
									className="size-[20px]"
								/>
								<span className="absolute -inset-px -z-10 rounded-xl bg-blue-500/25 blur-sm transition group-hover:bg-cyan-400/35" />
							</span>
							<div className="space-y-0.5">
								<span className="font-display block text-base font-bold tracking-tight text-theme-primary">
									FMail
								</span>
								<span className="block text-[10px] uppercase tracking-[0.2em] text-theme-faint">
									{copy.siteSubtitle}
								</span>
							</div>
						</Link>
						<div className="flex-1" />
						<nav className="hidden items-center gap-2 text-xs font-semibold sm:flex">
							<NavLink
								to={localizeLink("/")}
								end
								prefetch="viewport"
								className={({ isActive }) =>
									isActive ? "nav-pill-active" : "nav-pill"
								}
							>
								{copy.nav.home}
							</NavLink>
							<NavLink
								to={localizeLink("/terms")}
								prefetch="viewport"
								className={({ isActive }) =>
									isActive ? "nav-pill-active" : "nav-pill"
								}
							>
								{copy.nav.terms}
							</NavLink>
						</nav>
						<div className="mobile-menu sm:hidden" ref={mobileMenuRef}>
							<button
								type="button"
								className="mobile-menu-trigger"
								aria-haspopup="menu"
								aria-label="Toggle navigation menu"
								aria-expanded={isMobileMenuOpen}
								aria-controls="mobile-nav-panel"
								onClick={() => {
									setIsLanguageMenuOpen(false);
									setIsMobileMenuOpen((open) => !open);
								}}
							>
								<svg
									viewBox="0 0 20 20"
									fill="none"
									aria-hidden="true"
									className="mobile-menu-icon"
								>
									{isMobileMenuOpen ? (
										<path
											d="M5 5L15 15M15 5L5 15"
											stroke="currentColor"
											strokeWidth="1.8"
											strokeLinecap="round"
										/>
									) : (
										<path
											d="M3.5 5.75H16.5M3.5 10H16.5M3.5 14.25H16.5"
											stroke="currentColor"
											strokeWidth="1.8"
											strokeLinecap="round"
										/>
									)}
								</svg>
							</button>
							<div
								id="mobile-nav-panel"
								className="mobile-menu-panel"
								role="menu"
								aria-label="Site navigation"
								aria-hidden={!isMobileMenuOpen}
								data-open={isMobileMenuOpen ? "true" : "false"}
							>
								<NavLink
									to={localizeLink("/")}
									end
									prefetch="viewport"
									onClick={closeMobileMenu}
									className={({ isActive }) =>
										isActive ? "mobile-menu-link-active" : "mobile-menu-link"
									}
								>
									{copy.nav.home}
								</NavLink>
								<NavLink
									to={localizeLink("/terms")}
									prefetch="viewport"
									onClick={closeMobileMenu}
									className={({ isActive }) =>
										isActive ? "mobile-menu-link-active" : "mobile-menu-link"
									}
								>
									{copy.nav.terms}
								</NavLink>
								<div className="mobile-menu-section">
									<p className="mobile-menu-section-label">
										{mobileLanguageLabel}
									</p>
									<div className="mobile-menu-locale-grid">
										{localeEntries.map(([localeCode, label]) => (
											<button
												key={`mobile-${localeCode}`}
												type="button"
												className="mobile-locale-chip"
												title={label}
												aria-label={label}
												data-active={localeCode === locale}
												onClick={() => switchLocale(localeCode)}
											>
												{localeCode}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>
						<div
							className="language-menu hidden sm:block"
							ref={languageMenuRef}
						>
							<button
								type="button"
								className="language-menu-trigger"
								aria-haspopup="menu"
								aria-expanded={isLanguageMenuOpen}
								onClick={() => {
									setIsMobileMenuOpen(false);
									setIsLanguageMenuOpen((open) => !open);
								}}
							>
								<span className="language-menu-icon" aria-hidden="true">
									🌐
								</span>
								<span className="language-menu-label">
									{currentLocaleLabel}
								</span>
								<span
									className="language-menu-caret"
									aria-hidden="true"
									data-open={isLanguageMenuOpen}
								>
									▾
								</span>
							</button>
							<div
								className="language-menu-panel"
								role="menu"
								aria-label="Select language"
								aria-hidden={!isLanguageMenuOpen}
								data-open={isLanguageMenuOpen ? "true" : "false"}
							>
								{localeEntries.map(([localeCode, label]) => (
									<button
										key={localeCode}
										type="button"
										role="menuitemradio"
										aria-checked={localeCode === locale}
										className="language-menu-option"
										data-active={localeCode === locale}
										onClick={() => switchLocale(localeCode)}
									>
										<span className="language-menu-check" aria-hidden="true">
											{localeCode === locale ? "✓" : ""}
										</span>
										<span className="language-menu-option-label">{label}</span>
										<span className="language-menu-option-code">
											{localeCode}
										</span>
									</button>
								))}
							</div>
						</div>
					</div>
				</header>

				<main className="flex flex-1 flex-col">
					<Outlet />
				</main>

				<footer className="glass-panel mt-auto px-4 py-5 sm:px-6 sm:py-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-[11px] text-theme-faint">
							© {loaderData.renderedYear} FMail · {copy.copyright}
						</div>
						<NavLink
							to={localizeLink("/terms")}
							prefetch="viewport"
							className="footer-link text-xs font-medium"
						>
							{copy.nav.terms}
						</NavLink>
					</div>
				</footer>
			</div>
		</div>
	);
}
