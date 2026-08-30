import { useEffect, useState } from "react";
import {
	data,
	redirect,
	useFetcher,
	useRevalidator,
} from "react-router";
import {
	issueCustomAddress,
	issueNewAddress,
	rememberIssuedAddress,
} from "~/.server/issued-addresses";
import { commitSession, getSession } from "~/.server/session";
import {
	DEFAULT_LOCALE,
	type Locale,
	resolveLocaleParam,
	stripDefaultLocalePrefix,
	toIntlLocale,
	toLocalePath,
} from "~/i18n/config";
import { getDictionary } from "~/i18n/messages";
import { BASE_URL } from "~/seo.config";
import type { Email, EmailDetail } from "~/types/email";
import {
	getMailDomainConfig,
	isAllowedMailboxAddress,
	isMailDomain,
	isValidCustomLocalPart,
	normalizeEmailAddress,
} from "~/utils/mail";
import { MAIL_RETENTION_MS } from "~/utils/mail-retention";
import { mergeRouteMeta } from "~/utils/meta";
import type { Route } from "./+types/home";

function getLocaleFromParams(lang: string | undefined): Locale {
	const { locale } = resolveLocaleParam(lang);
	return locale;
}

function formatRefreshTime(timestamp: number, locale: Locale): string {
	return new Date(timestamp).toLocaleTimeString(toIntlLocale(locale), {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	});
}

function getHomeJsonLd(locale: Locale) {
	const localizedHomeUrl = `${BASE_URL}${toLocalePath("/", locale)}`;
	const descriptionByLocale: Record<Locale, string> = {
		en: "FMail provides free temporary email (temp mail) inboxes for sign-up and OTP verification with 24-hour auto cleanup.",
		zh: "FMail 提供免费临时邮箱（一次性邮箱）服务，适合临时邮箱注册和验证码接收，邮件 24 小时后自动清理。",
	};
	const description = descriptionByLocale[locale];

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				name: "FMail",
				url: localizedHomeUrl,
				inLanguage: locale,
				description,
				potentialAction: {
					"@type": "UseAction",
					target: localizedHomeUrl,
				},
			},
			{
				"@type": "WebApplication",
				name: "FMail Temporary Email",
				url: localizedHomeUrl,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Web",
				inLanguage: locale,
				description,
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
			},
		],
	};
}

export function meta({ params, matches }: Route.MetaArgs) {
	const locale = getLocaleFromParams(params.lang);
	const copy = getDictionary(locale).home;

	return mergeRouteMeta(matches, [
		{
			title: copy.title,
		},
		{
			name: "description",
			content: copy.description,
		},
		{
			name: "keywords",
			content: copy.keywords,
		},
		{
			name: "robots",
			content: "index, follow",
		},
	]);
}

function isAddressExpired(
	addressIssuedAt: number | undefined,
	now = Date.now(),
): boolean {
	if (!addressIssuedAt) {
		return false;
	}
	return now - addressIssuedAt >= MAIL_RETENTION_MS;
}

function EmailModal({
	email,
	onClose,
	copy,
}: {
	email: Email;
	onClose: () => void;
	copy: ReturnType<typeof getDictionary>["home"]["modal"];
}) {
	const [detail, setDetail] = useState<EmailDetail | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		fetch(`/api/email/${email.id}`, {
			credentials: "include",
		})
			.then(async (res) => {
				if (!res.ok) {
					throw new Error("email-detail-unavailable");
				}
				return (await res.json()) as EmailDetail;
			})
			.then((emailDetail) => {
				setDetail(emailDetail);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [email.id]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div
			className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="email-preview-title"
				className="glass-panel modal-sheet flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-theme-soft flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
					<div className="space-y-1">
						<div className="section-note font-semibold">{copy.title}</div>
						<div
							id="email-preview-title"
							className="section-title max-w-xl truncate pr-2"
						>
							{email.subject}
						</div>
					</div>
					<button
						type="button"
						aria-label="Close email preview"
						onClick={onClose}
						className="border-theme-strong text-theme-secondary bg-theme-soft inline-flex h-8 w-8 items-center justify-center rounded-full border hover:brightness-95"
					>
						<svg
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							className="h-4 w-4"
							aria-hidden="true"
						>
							<path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
						</svg>
					</button>
				</div>

				<div className="border-theme-soft text-theme-secondary grid gap-2.5 border-b px-4 py-3 text-sm leading-relaxed sm:grid-cols-2 sm:px-5">
					<div className="border-theme-soft bg-theme-subtle min-w-0 rounded-lg border px-3 py-2.5">
						<span className="section-note block font-semibold">
							{copy.from}
						</span>
						<p className="mt-1 break-all">
							{email.from_name} &lt;{email.from_address}&gt;
						</p>
					</div>
					<div className="border-theme-soft bg-theme-subtle rounded-lg border px-3 py-2.5">
						<span className="section-note block font-semibold">
							{copy.time}
						</span>
						<p className="mt-1">{new Date(email.time).toLocaleString()}</p>
					</div>
				</div>

				<div className="p-4 sm:p-5">
					{loading ? (
						<div className="section-note flex h-[min(62vh,700px)] items-center justify-center rounded-xl border border-dashed border-theme-soft">
							{copy.loading}
						</div>
					) : detail?.body ? (
						<iframe
							srcDoc={detail.body}
							title="Email content"
							className="border-theme-soft h-[min(62vh,700px)] w-full overflow-hidden rounded-xl border bg-white"
							sandbox=""
							referrerPolicy="no-referrer"
						/>
					) : (
						<div className="section-note flex h-[min(62vh,700px)] items-center justify-center rounded-xl border border-dashed border-theme-soft">
							{copy.empty}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function formatTime(
	timestamp: number,
	locale: Locale,
	referenceNow: number,
): string {
	const intlLocale = toIntlLocale(locale);
	const relative = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
	const diffSeconds = Math.round((timestamp - referenceNow) / 1000);

	if (Math.abs(diffSeconds) < 60) {
		return relative.format(diffSeconds, "second");
	}

	const diffMinutes = Math.round(diffSeconds / 60);
	if (Math.abs(diffMinutes) < 60) {
		return relative.format(diffMinutes, "minute");
	}

	const diffHours = Math.round(diffMinutes / 60);
	if (Math.abs(diffHours) < 24) {
		return relative.format(diffHours, "hour");
	}

	const diffDays = Math.round(diffHours / 24);
	if (Math.abs(diffDays) < 7) {
		return relative.format(diffDays, "day");
	}

	return new Date(timestamp).toLocaleDateString(intlLocale, {
		timeZone: "UTC",
	});
}

async function getEmails(d1: D1Database, toAddress: string) {
	const normalized = normalizeEmailAddress(toAddress);
	const { results } = await d1
		.prepare(
			"SELECT * FROM emails WHERE lower(trim(to_address)) = ? ORDER BY time DESC LIMIT 100",
		)
		.bind(normalized)
		.all();
	return results as Email[];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
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

	const cookieHeader = request.headers.get("Cookie");
	const session = await getSession(cookieHeader);
	let addresses = (session.get("addresses") || []) as string[];
	const addressIssuedAt = session.get("addressIssuedAt");
	const now = Date.now();
	let shouldCommitSession = false;

	if (addresses.length > 0 && isAddressExpired(addressIssuedAt, now)) {
		addresses = [];
		session.set("addresses", addresses);
		session.unset("addressIssuedAt");
		shouldCommitSession = true;
	} else if (addresses.length > 0 && !addressIssuedAt) {
		session.set("addressIssuedAt", now);
		shouldCommitSession = true;
	}

	const emails =
		addresses.length > 0
			? await getEmails(context.cloudflare.env.D1, addresses[0]!)
			: [];
	const { defaultDomain, domains: mailDomains } = getMailDomainConfig(
		context.cloudflare.env,
	);
	const pageData = {
		addresses,
		emails,
		locale,
		renderedAt: now,
		defaultDomain,
		mailDomains,
	};

	if (shouldCommitSession) {
		const headers = new Headers();
		headers.set("Set-Cookie", await commitSession(session));
		return data(pageData, { headers });
	}

	return pageData;
}

type HomeActionData = {
	addresses: string[];
	error?: "invalid_address" | "issue_failed" | "invalid_username";
};

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent");
	const cookieHeader = request.headers.get("Cookie");
	const session = await getSession(cookieHeader);
	let addresses: string[] = (session.get("addresses") || []) as string[];
	const d1 = context.cloudflare.env.D1;
	const { defaultDomain, domains: mailDomains } = getMailDomainConfig(
		context.cloudflare.env,
	);

	if (intent === "restore") {
		const address = normalizeEmailAddress(String(formData.get("address") ?? ""));
		if (!isAllowedMailboxAddress(address, mailDomains)) {
			return data({
				addresses,
				error: "invalid_address" as const,
			});
		}
		await rememberIssuedAddress(d1, address);
		addresses = [address];
		session.set("addresses", addresses);
		session.set("addressIssuedAt", Date.now());
		const headers = new Headers();
		headers.set("Set-Cookie", await commitSession(session));
		return data({ addresses }, { headers });
	}

	if (intent === "generate") {
		const username = String(formData.get("username") ?? "").trim();
		const domain = String(formData.get("domain") ?? defaultDomain);
		if (!defaultDomain || !isMailDomain(domain, mailDomains)) {
			return data({
				addresses,
				error: "issue_failed" as const,
			});
		}

		let issued: string | null = null;
		if (username) {
			if (!isValidCustomLocalPart(username)) {
				return data({
					addresses,
					error: "invalid_username" as const,
				});
			}
			issued = await issueCustomAddress(d1, username, domain, mailDomains);
		} else {
			issued = await issueNewAddress(d1, domain);
		}

		if (!issued) {
			return data({
				addresses,
				error: "issue_failed" as const,
			});
		}
		addresses = [issued];
		session.set("addressIssuedAt", Date.now());
	} else if (intent === "delete") {
		addresses = [];
		session.unset("addressIssuedAt");
	} else {
		return data({ addresses });
	}

	session.set("addresses", addresses);
	const headers = new Headers();
	headers.set("Set-Cookie", await commitSession(session));
	return data({ addresses }, { headers });
}

function RestoreAddressForm({
	copy,
	fetcher,
	actionError,
	disabled,
	defaultDomain,
	showHeading = true,
}: {
	copy: ReturnType<typeof getDictionary>["home"];
	fetcher: ReturnType<typeof useFetcher<HomeActionData>>;
	actionError?: HomeActionData["error"];
	disabled: boolean;
	defaultDomain: string;
	showHeading?: boolean;
}) {
	const isRestoring =
		fetcher.state !== "idle" && fetcher.formData?.get("intent") === "restore";
	const restoreError =
		fetcher.data?.error === "invalid_address" ||
		actionError === "invalid_address"
			? copy.restoreInvalid
			: null;

	return (
		<div className="space-y-2">
			{showHeading ? (
				<p className="section-note font-semibold">{copy.restoreDivider}</p>
			) : null}
			<fetcher.Form method="post" className="space-y-2">
				<input type="hidden" name="intent" value="restore" />
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<label className="sr-only" htmlFor="restore-address">
						{copy.restoreAddress}
					</label>
					<input
						id="restore-address"
						type="text"
						name="address"
						inputMode="email"
						autoComplete="off"
						spellCheck={false}
						placeholder={
							defaultDomain
								? `name-xxxxxx@${defaultDomain}`
								: copy.restorePlaceholder
						}
						disabled={disabled}
						aria-invalid={restoreError ? true : undefined}
						aria-describedby={restoreError ? "restore-address-error" : undefined}
						className="field-control w-full sm:flex-1"
					/>
					<button
						type="submit"
						className="neo-button-secondary w-full justify-center sm:w-auto"
						disabled={disabled}
					>
						{isRestoring ? copy.restoring : copy.restoreAddress}
					</button>
				</div>
				{restoreError ? (
					<p
						id="restore-address-error"
						role="alert"
						className="section-note text-red-500"
					>
						{restoreError}
					</p>
				) : (
					<p className="section-note">
						{defaultDomain ? copy.restoreHint : copy.domainsUnconfigured}
					</p>
				)}
			</fetcher.Form>
		</div>
	);
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
	const fetcher = useFetcher<HomeActionData>();
	const revalidator = useRevalidator();
	const [copied, setCopied] = useState(false);
	const [mailboxMode, setMailboxMode] = useState<"generate" | "restore">(
		"generate",
	);
	const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
	const [lastInboxRefreshAt, setLastInboxRefreshAt] = useState(() =>
		loaderData.renderedAt,
	);
	const locale = loaderData.locale || DEFAULT_LOCALE;
	const copy = getDictionary(locale).home;
	const mailDomains = loaderData.mailDomains;
	const defaultDomain = loaderData.defaultDomain;
	const homeJsonLd = getHomeJsonLd(locale);
	const addresses = loaderData.addresses;
	const emails = loaderData.emails;
	const isSubmitting = fetcher.state === "submitting";
	const submittingIntent = fetcher.formData?.get("intent");
	const isRefreshingInbox = revalidator.state !== "idle";
	const actionError = ((): HomeActionData["error"] => {
		if (!actionData || !("error" in actionData)) {
			return undefined;
		}
		const value = actionData.error;
		if (
			value === "invalid_address" ||
			value === "issue_failed" ||
			value === "invalid_username"
		) {
			return value;
		}
		return undefined;
	})();
	const issueFailed =
		fetcher.data?.error === "issue_failed" || actionError === "issue_failed";
	const invalidUsername =
		fetcher.data?.error === "invalid_username" ||
		actionError === "invalid_username";
	const formError = invalidUsername
		? copy.invalidUsername
		: issueFailed
			? copy.issueFailed
			: null;
	const restoreFormKey = addresses[0] ?? "empty";
	const isGenerating =
		submittingIntent === "generate" && isSubmitting;

	useEffect(() => {
		setLastInboxRefreshAt(loaderData.renderedAt);
	}, [loaderData.renderedAt]);

	useEffect(() => {
		if (
			fetcher.data?.error === "invalid_address" ||
			actionError === "invalid_address"
		) {
			setMailboxMode("restore");
		}
	}, [actionError, fetcher.data?.error]);

	return (
		<div className="flex flex-1 py-3 sm:py-4">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
			/>
			<div className="grid w-full gap-4">
				<section className="glass-panel relative overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
					<div
						className="absolute -left-20 -top-24 h-44 w-44 rounded-full opacity-80 blur-[88px]"
						style={{ background: "var(--accent-a)" }}
					/>
					<div
						className="absolute -right-14 top-20 h-36 w-36 rounded-full opacity-75 blur-[82px]"
						style={{ background: "var(--accent-b)" }}
					/>
					<div className="relative space-y-3">
						<header className="flex flex-wrap items-center gap-2">
							<h1 className="sr-only">{copy.heroTitle}</h1>
							<p className="soft-tag">{copy.heroTag}</p>
							<span className="section-note">
								<span className="text-theme-primary font-display font-semibold">
									{copy.stats.lifetimeValue}
								</span>{" "}
								{copy.stats.lifetime}
							</span>
						</header>

						<div className="theme-badge section-note flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
							<span>
								<span className="text-theme-primary font-display font-semibold">
									{copy.stats.refreshValue}
								</span>{" "}
								{copy.stats.refresh}
							</span>
							<span>
								<span className="text-theme-primary font-display font-semibold">
									{copy.stats.registrationValue}
								</span>{" "}
								{copy.stats.registration}
							</span>
						</div>

						<div className="flex flex-row items-center gap-2">
							<button
								type="button"
								className={
									mailboxMode === "generate"
										? "neo-button flex-1 justify-center"
										: "neo-button-secondary flex-1 justify-center"
								}
								onClick={() => setMailboxMode("generate")}
							>
								{copy.getEmail}
							</button>
							<button
								type="button"
								className={
									mailboxMode === "restore"
										? "neo-button flex-1 justify-center"
										: "neo-button-secondary flex-1 justify-center"
								}
								onClick={() => setMailboxMode("restore")}
							>
								{copy.restoreAddress}
							</button>
						</div>

						{mailboxMode === "generate" ? (
							<>
								<fetcher.Form method="post" className="flex flex-col gap-2">
									<input type="hidden" name="intent" value="generate" />
									<div className="flex flex-row items-center gap-2">
										<label className="sr-only" htmlFor="mailbox-username">
											{copy.usernamePlaceholder}
										</label>
										<input
											id="mailbox-username"
											type="text"
											name="username"
											autoComplete="off"
											spellCheck={false}
											placeholder={copy.usernamePlaceholder}
											disabled={isSubmitting}
											aria-invalid={invalidUsername ? true : undefined}
											className="field-control min-w-0 flex-1"
										/>
										<label className="sr-only" htmlFor="mailbox-domain">
											{copy.domainLabel}
										</label>
										<select
											id="mailbox-domain"
											name="domain"
											defaultValue={defaultDomain}
											disabled={isSubmitting || mailDomains.length === 0}
											className="field-control w-auto shrink-0"
										>
											{mailDomains.map((domain) => (
												<option key={domain} value={domain}>
													{domain}
												</option>
											))}
										</select>
									</div>
									<button
										type="submit"
										className="neo-button w-full justify-center"
										disabled={isSubmitting || mailDomains.length === 0}
									>
										{isGenerating ? copy.generating : copy.getEmail}
									</button>
								</fetcher.Form>
								{formError ? (
									<p role="alert" className="section-note text-red-500">
										{formError}
									</p>
								) : mailDomains.length === 0 ? (
									<p role="status" className="section-note">
										{copy.domainsUnconfigured}
									</p>
								) : (
									<p className="section-note">{copy.generateHint}</p>
								)}
							</>
						) : (
							<RestoreAddressForm
								key={restoreFormKey}
								copy={copy}
								fetcher={fetcher}
								actionError={actionError}
								disabled={isSubmitting || mailDomains.length === 0}
								defaultDomain={defaultDomain}
								showHeading={false}
							/>
						)}
					</div>
				</section>

				<section className="glass-panel px-4 py-4 sm:px-5 sm:py-4">
					<div className="grid gap-4">
						<div>
							<div className="mb-3 flex items-center gap-1.5">
								<p className="section-title">{copy.currentAddress}</p>
								<span className="relative inline-flex">
									<button
										type="button"
										className="border-theme-soft text-theme-faint hover:text-theme-primary peer inline-flex size-5 items-center justify-center rounded-full border text-xs font-bold outline-none"
										aria-label={copy.safetyHint}
										aria-describedby="safety-hint-tooltip"
									>
										!
									</button>
									<span
										id="safety-hint-tooltip"
										role="tooltip"
										className="border-theme-soft bg-theme-subtle section-note pointer-events-none invisible absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border px-3 py-2 text-left shadow-sm peer-hover:visible peer-focus:visible peer-focus-visible:visible"
									>
										{copy.safetyHint}
									</span>
								</span>
							</div>
							<div className="space-y-4">
								{addresses.length > 0 ? (
									<>
										<div className="theme-card space-y-3 p-3">
											<div className="border-theme-soft bg-theme-subtle rounded-xl border px-3 py-2.5">
												<div className="text-theme-primary min-w-0 text-sm font-semibold break-all">
													{addresses[0]}
												</div>
											</div>
											<div className="flex flex-row items-center gap-2">
												<button
													type="button"
													className="neo-button-secondary flex-1 justify-center"
													onClick={async () => {
														if (
															typeof navigator !== "undefined" &&
															navigator.clipboard
														) {
															try {
																await navigator.clipboard.writeText(
																	addresses[0] ?? "",
																);
																setCopied(true);
																setTimeout(() => setCopied(false), 1500);
															} catch {
																// ignore clipboard errors
															}
														}
													}}
												>
													{copied ? copy.copied : copy.copy}
												</button>
												<button
													type="button"
													name="intent"
													value="delete"
													className="neo-button-secondary flex-1 justify-center"
													onClick={() => {
														fetcher.submit(
															{ intent: "delete" },
															{ method: "post" },
														);
													}}
													disabled={isSubmitting}
												>
													{submittingIntent === "delete" && isSubmitting
														? copy.deleting
														: copy.deleteAddress}
												</button>
											</div>
										</div>
									</>
								) : (
									<div className="theme-card p-3">
										<div className="text-theme-primary text-sm font-semibold">
											{copy.noAddressTitle}
										</div>
										<p className="section-note mt-1">{copy.noAddressDescription}</p>
									</div>
								)}
							</div>
						</div>

						<div className="border-theme-soft border-t border-dashed pt-3">
							<div className="mb-3 flex items-center justify-between gap-3">
								<div>
									<p className="section-title">{copy.inboxTitle}</p>
									<p className="section-note mt-1">
										{copy.lastRefresh}:{" "}
										{formatRefreshTime(lastInboxRefreshAt, locale)}
									</p>
								</div>
								<button
									type="button"
									className="neo-button-secondary"
									onClick={() => {
										revalidator.revalidate();
									}}
									disabled={isRefreshingInbox}
								>
									{isRefreshingInbox
										? copy.refreshingInbox
										: copy.refreshInbox}
								</button>
							</div>

							<div className="flex min-h-[360px] flex-col gap-2.5 overflow-y-auto py-1 pr-0.5">
								{emails.length === 0 ? (
									<div className="border-theme-strong bg-theme-subtle mt-6 rounded-2xl border border-dashed px-4 py-10 text-center">
										<p className="section-title">{copy.emptyInboxTitle}</p>
										<p className="section-note mt-1">
											{copy.emptyInboxDescription}
										</p>
									</div>
								) : (
									emails.map((email) => (
										<button
											key={email.id}
											type="button"
											className="email-item"
											onClick={() => setSelectedEmail(email)}
										>
											<div className="min-w-0">
												<div className="flex items-start justify-between gap-3">
													<div className="text-theme-primary font-display truncate text-sm font-semibold">
														{email.subject}
													</div>
													<div className="section-note whitespace-nowrap">
														{formatTime(
															email.time,
															locale,
															loaderData.renderedAt,
														)}
													</div>
												</div>
												<div className="text-theme-muted mt-1 truncate text-xs">
													{email.from_name}
													<span className="text-theme-faint">
														{" "}
														&lt;{email.from_address}&gt;
													</span>
												</div>
											</div>
										</button>
									))
								)}
							</div>
						</div>
					</div>
				</section>
			</div>

			{selectedEmail && (
				<EmailModal
					email={selectedEmail}
					onClose={() => setSelectedEmail(null)}
					copy={copy.modal}
				/>
			)}
		</div>
	);
}
