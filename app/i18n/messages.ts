import type { Locale } from "./config";

export interface Dictionary {
	home: {
		title: string;
		description: string;
		keywords: string;
		heroTag: string;
		heroTitle: string;
		heroDescription: string;
		loadingAddresses: string;
		currentAddress: string;
		copy: string;
		copied: string;
		deleteAddress: string;
		deleting: string;
		generateNew: string;
		generating: string;
		noAddressTitle: string;
		noAddressDescription: string;
		generateAddress: string;
		usernamePlaceholder: string;
		domainLabel: string;
		getEmail: string;
		generateHint: string;
		domainsUnconfigured: string;
		invalidUsername: string;
		stats: {
			lifetimeValue: string;
			refreshValue: string;
			registrationValue: string;
			lifetime: string;
			refresh: string;
			registration: string;
		};
		inboxTag: string;
		inboxTitle: string;
		tapToOpen: string;
		loadingEmails: string;
		emptyInboxTitle: string;
		emptyInboxDescription: string;
		selectEmailHint: string;
		refreshInbox: string;
		refreshingInbox: string;
		lastRefresh: string;
		safetyHint: string;
		restoreDivider: string;
		restoreAddress: string;
		restoring: string;
		restorePlaceholder: string;
		restoreInvalid: string;
		restoreHint: string;
		issueFailed: string;
		modal: {
			title: string;
			from: string;
			time: string;
			loading: string;
			empty: string;
		};
	};
	layout: {
		siteSubtitle: string;
		nav: {
			home: string;
			terms: string;
		};
		copyright: string;
	};
}

const en: Dictionary = {
	home: {
		title: "FMail Temporary Email (24h) - Free Temp Mail for OTP & Sign-Ups",
		description:
			"Generate free temporary email (temp mail) instantly on FMail. Use a 24-hour disposable inbox for OTP verification, quick sign-ups, and spam control.",
		keywords:
			"smail, smail temp mail, temporary email, temp mail, disposable email, temporary email generator, 24 hour temporary email, no registration email, otp email, FMail",
		heroTag: "Disposable mailbox",
		heroTitle: "FREE Temporary Email",
		heroDescription:
			"Free, Fast, Private, and Secure temporary email address.",
		loadingAddresses: "Loading addresses...",
		currentAddress: "Current disposable address",
		copy: "Copy",
		copied: "Copied",
		deleteAddress: "Delete address",
		deleting: "Deleting...",
		generateNew: "Generate new",
		generating: "Generating...",
		noAddressTitle: "No disposable email yet",
		noAddressDescription:
			"Generate a temporary address to use for sign-ups and one-off verifications.",
		generateAddress: "Get Email",
		usernamePlaceholder: "Username (blank = random)",
		domainLabel: "Domain",
		getEmail: "Get Email",
		generateHint: "Leave the username empty to get a random name-xxxxxx@your-domain address.",
		domainsUnconfigured:
			"No receiving domains configured. Set Worker secrets MAIL_DOMAIN and MAIL_DOMAINS. A Custom Domain only serves the website.",
		invalidUsername: "Invalid username. Use 1-32 letters, numbers, dots, hyphens, or underscores.",
		stats: {
			lifetimeValue: "24h",
			refreshValue: "Instant",
			registrationValue: "Zero",
			lifetime: "Email retention",
			refresh: "Inbox refresh",
			registration: "Registration",
		},
		inboxTag: "Inbox",
		inboxTitle: "Latest emails",
		tapToOpen: "Tap to open",
		loadingEmails: "Loading emails...",
		emptyInboxTitle: "No emails yet",
		emptyInboxDescription: "Emails will appear here automatically.",
		selectEmailHint: "Select a message to read",
		refreshInbox: "Refresh",
		refreshingInbox: "Refreshing...",
		lastRefresh: "Last refresh",
		safetyHint:
			"Do not use this address for banking, work, or critical account codes. Messages are automatically removed after 24 hours.",
		restoreDivider: "Use an existing address",
		restoreAddress: "Restore mailbox",
		restoring: "Restoring...",
		restorePlaceholder: "name-xxxxxx@domain",
		restoreInvalid: "Invalid address",
		restoreHint:
			"Enter the original address to reopen this inbox. Messages are still removed after about 24 hours.",
		issueFailed: "Could not generate a new address. Please try again.",
		modal: {
			title: "Message preview",
			from: "From",
			time: "Time",
			loading: "Loading...",
			empty: "No content",
		},
	},
	layout: {
		siteSubtitle: "temporary inbox",
		nav: {
			home: "Home",
			terms: "Terms",
		},
		copyright: "Clean inbox, clean identity.",
	},
};

const zh: Dictionary = {
	home: {
		title: "临时邮箱生成器（24小时）- 免费一次性邮箱免注册收验证码 | FMail",
		description:
			"免费临时邮箱生成器，一键创建 24 小时一次性邮箱。适合临时邮箱注册、验证码接收与在线临时收信，减少垃圾邮件。",
		keywords:
			"临时邮箱, 一次性邮箱, 临时邮箱生成器, 免费临时邮箱, 24小时临时邮箱, 24小时邮箱, 验证码邮箱, 免注册临时邮箱, 在线临时邮箱, 国内临时邮箱, 临时邮箱注册, 邮箱生成器",
		heroTag: "一次性邮箱",
		heroTitle: "免费临时邮箱",
		heroDescription: "免费、快速、私密且安全的临时邮箱地址。",
		loadingAddresses: "正在加载邮箱地址...",
		currentAddress: "当前临时邮箱",
		copy: "复制",
		copied: "已复制",
		deleteAddress: "删除地址",
		deleting: "删除中...",
		generateNew: "生成新地址",
		generating: "生成中...",
		noAddressTitle: "还没有临时邮箱",
		noAddressDescription: "生成一个临时邮箱，用于注册和一次性验证。",
		generateAddress: "获取邮箱",
		usernamePlaceholder: "用户名，留空则随机",
		domainLabel: "域名",
		getEmail: "获取邮箱",
		generateHint: "不填用户名会随机生成 name-xxxxxx@所选域名。",
		domainsUnconfigured:
			"未配置收信域名。请在 Worker 的 MAIL_DOMAIN / MAIL_DOMAINS 里填写；网站 Custom Domain 不会出现在下拉中。",
		invalidUsername: "用户名无效。请使用 1–32 位字母、数字、点、连字符或下划线。",
		stats: {
			lifetimeValue: "24小时",
			refreshValue: "即时",
			registrationValue: "零门槛",
			lifetime: "邮件保留",
			refresh: "收件箱刷新",
			registration: "无需注册",
		},
		inboxTag: "收件箱",
		inboxTitle: "最新邮件",
		tapToOpen: "点击查看",
		loadingEmails: "正在加载邮件...",
		emptyInboxTitle: "暂无邮件",
		emptyInboxDescription: "邮件将自动在此显示。",
		selectEmailHint: "选择一封邮件查看内容",
		refreshInbox: "刷新",
		refreshingInbox: "刷新中...",
		lastRefresh: "最近刷新",
		safetyHint:
			"请勿用于银行、工作或重要账号验证码。邮件会在 24 小时后自动删除。",
		restoreDivider: "使用已有地址",
		restoreAddress: "恢复邮箱",
		restoring: "恢复中...",
		restorePlaceholder: "name-xxxxxx@domain",
		restoreInvalid: "地址格式不正确",
		restoreHint:
			"换设备后输入原地址，可再次打开此收件箱。邮件仍约 24 小时后删除。",
		issueFailed: "无法生成新地址，请重试。",
		modal: {
			title: "邮件预览",
			from: "发件人",
			time: "时间",
			loading: "加载中...",
			empty: "暂无内容",
		},
	},
	layout: {
		siteSubtitle: "临时收件箱",
		nav: {
			home: "首页",
			terms: "条款",
		},
		copyright: "让邮箱更干净，让身份更安全。",
	},
};

const messages: Record<Locale, Dictionary> = {
	en,
	zh,
};

export function getDictionary(locale: Locale): Dictionary {
	return messages[locale];
}
