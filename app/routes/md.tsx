import Markdoc from "@markdoc/markdoc";
import { Link, redirect } from "react-router";
import {
	DEFAULT_LOCALE,
	type Locale,
	normalizePathname,
	resolveLocaleParam,
	stripDefaultLocalePrefix,
	stripLocalePrefix,
	toLocalePath,
} from "~/i18n/config";
import { BASE_URL, isMarkdownLocaleIndexable } from "~/seo.config";
import { mergeRouteMeta } from "~/utils/meta";
import type { Route } from "./+types/md";

const KNOWN_MD_PAGES = [
	"terms",
	"temporary-email-24-hours",
	"temporary-email-no-registration",
	"disposable-email-for-verification",
	"temporary-email-for-registration",
	"online-temporary-email",
	"domestic-temporary-email",
	"can-temporary-email-send",
	"smail-vs-smailpro",
] as const;

type MarkdownPageSlug = (typeof KNOWN_MD_PAGES)[number];

const INFO_MD_PAGES = ["terms"] as const;
const ARTICLE_MD_PAGES = [
	"temporary-email-24-hours",
	"temporary-email-no-registration",
	"disposable-email-for-verification",
	"temporary-email-for-registration",
	"online-temporary-email",
	"domestic-temporary-email",
	"can-temporary-email-send",
	"smail-vs-smailpro",
] as const;

type InfoMarkdownSlug = (typeof INFO_MD_PAGES)[number];
type ArticleMarkdownSlug = (typeof ARTICLE_MD_PAGES)[number];

const markdownSources = import.meta.glob("../md/**/*.md", {
	query: "?raw",
	import: "default",
}) as Record<string, () => Promise<string>>;

const mdMetaCopy: Record<
	MarkdownPageSlug,
	Record<Locale, { title: string; description: string }>
> = {
	terms: {
		en: {
			title: "Terms of Use | FMail",
			description:
				"Review the terms for using FMail, including acceptable use, disclaimers, and service limitations.",
		},
		zh: {
			title: "使用条款 | FMail",
			description: "了解 FMail 的使用规则、服务边界与免责声明。",
		},
	},
	"temporary-email-24-hours": {
		en: {
			title: "24 Hour Temporary Email (Temp Mail) | FMail",
			description:
				"Create a 24 hour email temp mail inbox for sign-ups and OTP verification codes without exposing your primary mailbox.",
		},
		zh: {
			title: "24小时临时邮箱（24小时邮箱）| FMail",
			description:
				"获取 24 小时临时邮箱（一次性邮箱），用于临时邮箱注册、验证码与短期收信，自动过期更省心。",
		},
	},
	"temporary-email-no-registration": {
		en: {
			title: "Temporary Email No Registration (No Signup Temp Mail) | FMail",
			description:
				"Use no registration temp mail with no password or personal details. Generate a temporary inbox instantly and receive email in seconds.",
		},
		zh: {
			title: "免注册临时邮箱（无需注册）| FMail",
			description:
				"免注册临时邮箱，无需账号和密码即可快速生成一次性邮箱，适合临时邮箱注册与验证码收信。",
		},
	},
	"disposable-email-for-verification": {
		en: {
			title: "Disposable Email for Verification & OTP | FMail",
			description:
				"Receive OTP and verification emails in a disposable email inbox while keeping your personal mailbox private and spam-free.",
		},
		zh: {
			title: "验证码一次性邮箱（OTP临时邮箱）| FMail",
			description:
				"使用验证码一次性邮箱接收 OTP 与确认邮件，适合临时邮箱注册场景，减少垃圾邮件并保护真实邮箱隐私。",
		},
	},
	"temporary-email-for-registration": {
		en: {
			title: "Temporary Email for Registration (Signup Temp Mail) | FMail",
			description:
				"Use temporary email for registration flows, trial sign-ups, and one-off onboarding without exposing your long-term mailbox.",
		},
		zh: {
			title: "临时邮箱注册专用（注册临时邮箱）| FMail",
			description:
				"用于临时邮箱注册、试用账号和低风险平台注册，快速收验证码并减少真实邮箱暴露。",
		},
	},
	"online-temporary-email": {
		en: {
			title: "Online Temporary Email Inbox (Instant Temp Mail) | FMail",
			description:
				"Get an online temporary email inbox instantly for verification links, OTP messages, and short-term email reception.",
		},
		zh: {
			title: "在线临时邮箱（即时收信）| FMail",
			description:
				"在线临时邮箱即时可用，适合验证码、确认链接和短期收信场景，支持快速刷新。",
		},
	},
	"domestic-temporary-email": {
		en: {
			title:
				"Domestic Temporary Email Guide (Regional Delivery Tips) | FMail",
			description:
				"Read domestic temporary email delivery tips, common verification issues, and retry steps when OTP messages are delayed.",
		},
		zh: {
			title: "国内临时邮箱收信指南 | FMail",
			description:
				"国内临时邮箱场景下的验证码接收建议：常见延迟原因、重发步骤和收信排查方法。",
		},
	},
	"can-temporary-email-send": {
		en: {
			title:
				"Can Temporary Email Send Messages? (Receive-Only Explained) | FMail",
			description:
				"Understand whether temporary email can send messages, why many temp inboxes are receive-only, and when to use a permanent mailbox instead.",
		},
		zh: {
			title: "临时邮箱可以发送邮件吗？| FMail",
			description:
				"解释临时邮箱发送能力与限制：为什么多数临时邮箱仅收信，以及何时应切换到长期邮箱。",
		},
	},
	"smail-vs-smailpro": {
		en: {
			title: "FMail vs smailpro / smail pro | Brand Clarification",
			description:
				"Official clarification: FMail is an independent temporary email service and is not affiliated with smailpro or similarly named products.",
		},
		zh: {
			title: "FMail 与 smailpro / smail pro 关系说明",
			description:
				"官方说明：FMail 是独立临时邮箱服务，与 smailpro 或同名近似产品无隶属关系。",
		},
	},
};

const HOME_BREADCRUMB_LABEL: Record<Locale, string> = {
	en: "Home",
	zh: "首页",
};

type InternalCtaCopy = {
	title: string;
	description: string;
	links: Array<{ label: string; path: string }>;
};

const INTERNAL_CTA_COPY: Record<Locale, InternalCtaCopy> = {
	en: {
		title: "Start your temporary inbox now",
		description:
			"Create a disposable address in one tap, then open the most common registration and OTP guides below.",
		links: [
			{ label: "Generate temporary email", path: "/" },
			{
				label: "Temporary email for registration",
				path: "/temporary-email-for-registration",
			},
			{
				label: "Disposable email for verification",
				path: "/disposable-email-for-verification",
			},
		],
	},
	zh: {
		title: "立即开始使用临时邮箱",
		description: "一键生成一次性邮箱，再查看常用的临时邮箱注册与验证码指南。",
		links: [
			{ label: "生成临时邮箱", path: "/" },
			{ label: "临时邮箱注册指南", path: "/temporary-email-for-registration" },
			{ label: "验证码一次性邮箱", path: "/disposable-email-for-verification" },
		],
	},
};

function isKnownMarkdownSlug(value: string): value is MarkdownPageSlug {
	return (KNOWN_MD_PAGES as readonly string[]).includes(value);
}

function isInfoMarkdownSlug(
	value: MarkdownPageSlug,
): value is InfoMarkdownSlug {
	return (INFO_MD_PAGES as readonly string[]).includes(value);
}

function isArticleMarkdownSlug(
	value: MarkdownPageSlug,
): value is ArticleMarkdownSlug {
	return (ARTICLE_MD_PAGES as readonly string[]).includes(value);
}

function getMarkdownSeoCopy(locale: Locale, slug: MarkdownPageSlug) {
	return mdMetaCopy[slug][locale] ?? mdMetaCopy[slug][DEFAULT_LOCALE];
}

function getMarkdownSlugFromPathname(
	pathname: string,
): MarkdownPageSlug | null {
	const normalized = normalizePathname(pathname);
	const basePath = stripLocalePrefix(normalized);
	const slug = basePath.replace(/^\//, "");
	if (!isKnownMarkdownSlug(slug)) {
		return null;
	}
	return slug;
}

function getHeadlineFromMetaTitle(title: string): string {
	const [headline] = title.split("|");
	return headline?.trim() || title;
}

function getArticleJsonLd(
	locale: Locale,
	slug: ArticleMarkdownSlug,
	pageUrl: string,
) {
	const pageMeta = getMarkdownSeoCopy(locale, slug);
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: getHeadlineFromMetaTitle(pageMeta.title),
		description: pageMeta.description,
		inLanguage: locale,
		mainEntityOfPage: pageUrl,
		datePublished: "2026-03-01",
		dateModified: "2026-03-01",
		author: {
			"@type": "Organization",
			name: "FMail",
		},
		publisher: {
			"@type": "Organization",
			name: "FMail",
			url: BASE_URL,
		},
	};
}

function getBreadcrumbJsonLd(
	locale: Locale,
	slug: ArticleMarkdownSlug,
	pageUrl: string,
) {
	const pageMeta = getMarkdownSeoCopy(locale, slug);
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{
				"@type": "ListItem",
				position: 1,
				name: HOME_BREADCRUMB_LABEL[locale] ?? HOME_BREADCRUMB_LABEL[DEFAULT_LOCALE],
				item: `${BASE_URL}${toLocalePath("/", locale)}`,
			},
			{
				"@type": "ListItem",
				position: 2,
				name: getHeadlineFromMetaTitle(pageMeta.title),
				item: pageUrl,
			},
		],
	};
}

function getInternalCtaCopy(locale: Locale): InternalCtaCopy {
	return INTERNAL_CTA_COPY[locale] ?? INTERNAL_CTA_COPY[DEFAULT_LOCALE];
}

export function meta({ params, location, matches }: Route.MetaArgs) {
	const { locale } = resolveLocaleParam(params.lang);
	const slug = getMarkdownSlugFromPathname(location.pathname);
	if (!slug) {
		return mergeRouteMeta(matches, []);
	}
	const pageMeta = getMarkdownSeoCopy(locale, slug);

	return mergeRouteMeta(matches, [
		{ title: pageMeta.title },
		{ name: "description", content: pageMeta.description },
		{
			name: "robots",
			content: isMarkdownLocaleIndexable(locale)
				? "index, follow"
				: "noindex, follow",
		},
	]);
}

export async function loader({ params, request }: Route.LoaderArgs) {
	const { locale, shouldRedirectToDefault, isInvalid } = resolveLocaleParam(
		params.lang,
	);
	if (isInvalid) {
		throw new Response("Not Found", { status: 404 });
	}

	const url = new URL(request.url);
	if (shouldRedirectToDefault) {
		const normalizedPath = stripDefaultLocalePrefix(url.pathname);
		throw redirect(`${normalizedPath}${url.search}`, 301);
	}

	const pathname =
		url.pathname.endsWith("/") && url.pathname.length > 1
			? url.pathname.slice(0, -1)
			: url.pathname;
	const segments = pathname.split("/").filter(Boolean);
	const slug = segments[segments.length - 1] ?? "";
	if (!slug || slug === locale || slug === DEFAULT_LOCALE) {
		throw new Response("Not Found", { status: 404 });
	}
	if (!isKnownMarkdownSlug(slug)) {
		throw new Response("Not Found", { status: 404 });
	}

	const preferredPath = `../md/${locale}/${slug}.md`;
	const fallbackPath = `../md/${DEFAULT_LOCALE}/${slug}.md`;
	const sourceLoader =
		markdownSources[preferredPath] ??
		(locale !== DEFAULT_LOCALE ? markdownSources[fallbackPath] : undefined);
	const source = sourceLoader ? await sourceLoader().catch(() => null) : null;

	if (!source) {
		throw new Response("Not Found", { status: 404 });
	}
	const ast = Markdoc.parse(source);
	const content = Markdoc.transform(ast);
	const html = Markdoc.renderers.html(content);

	return { html, locale, slug: slug as MarkdownPageSlug };
}

export default function MarkdownPage({ loaderData }: Route.ComponentProps) {
	const pageUrl = `${BASE_URL}${toLocalePath(`/${loaderData.slug}`, loaderData.locale)}`;
	const articleJsonLd = isArticleMarkdownSlug(loaderData.slug)
		? getArticleJsonLd(loaderData.locale, loaderData.slug, pageUrl)
		: null;
	const breadcrumbJsonLd = isArticleMarkdownSlug(loaderData.slug)
		? getBreadcrumbJsonLd(loaderData.locale, loaderData.slug, pageUrl)
		: null;
	const infoCta = isInfoMarkdownSlug(loaderData.slug)
		? getInternalCtaCopy(loaderData.locale)
		: null;

	return (
		<div className="flex flex-1 py-3 sm:py-4">
			{articleJsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
				/>
			)}
			{breadcrumbJsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
				/>
			)}
			<div className="markdown-shell w-full">
				<article
					className="prose prose-sm sm:prose-base max-w-none"
					dangerouslySetInnerHTML={{ __html: loaderData.html }}
				/>
				{infoCta && (
					<section
						className="theme-card mt-6 space-y-3 p-4 sm:p-5"
						aria-label="Related temporary email pages"
					>
						<h2 className="text-theme-primary font-display text-lg font-semibold">
							{infoCta.title}
						</h2>
						<p className="text-theme-secondary text-sm leading-relaxed">
							{infoCta.description}
						</p>
						<div className="grid gap-2 sm:grid-cols-3">
							{infoCta.links.map((link) => (
								<Link
									key={link.path}
									to={toLocalePath(link.path, loaderData.locale)}
									prefetch="viewport"
									className="theme-badge flex items-center justify-between px-3 py-2 text-xs font-medium"
								>
									<span>{link.label}</span>
									<span aria-hidden="true">{"->"}</span>
								</Link>
							))}
						</div>
					</section>
				)}
			</div>
		</div>
	);
}
