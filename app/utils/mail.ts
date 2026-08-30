import randomName from "@scaleway/random-name";
import { customAlphabet } from "nanoid";

const MAX_ADDRESS_LENGTH = 128;
const nanoSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);
const GENERATED_LOCAL_PART = /^[a-z]+(?:-[a-z]+)+-[a-z0-9]{6}$/;
const CUSTOM_LOCAL_PART = /^[a-z0-9](?:[a-z0-9._-]{0,30}[a-z0-9])?$/;
const DOMAIN_NAME =
	/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export type MailDomainEnv = {
	MAIL_DOMAIN?: string;
	MAIL_DOMAINS?: string;
};

export type MailDomainConfig = {
	defaultDomain: string;
	domains: string[];
};

export function parseMailDomains(raw: string | undefined): string[] {
	if (!raw) {
		return [];
	}
	const seen = new Set<string>();
	const domains: string[] = [];
	for (const part of raw.split(/[,\s]+/)) {
		const domain = part.trim().toLowerCase();
		if (!domain || seen.has(domain) || !DOMAIN_NAME.test(domain)) {
			continue;
		}
		seen.add(domain);
		domains.push(domain);
	}
	return domains;
}

export function getMailDomainConfig(env: MailDomainEnv): MailDomainConfig {
	const domains = parseMailDomains(env.MAIL_DOMAINS);
	const preferred = (env.MAIL_DOMAIN ?? "").trim().toLowerCase();
	if (preferred && DOMAIN_NAME.test(preferred) && !domains.includes(preferred)) {
		domains.unshift(preferred);
	}
	const defaultDomain = domains.includes(preferred)
		? preferred
		: (domains[0] ?? "");
	return { defaultDomain, domains };
}

export function normalizeEmailAddress(raw: string): string {
	let value = raw.trim().replace(/^mailto:/i, "").trim();
	const wrapped = value.match(/^[^<]*<([^>]+)>\s*$/);
	if (wrapped?.[1]) {
		value = wrapped[1].trim();
	} else if (value.startsWith("<") && value.endsWith(">")) {
		value = value.slice(1, -1).trim();
	}
	value = value.toLowerCase();
	if (value.length > MAX_ADDRESS_LENGTH) {
		return value.slice(0, MAX_ADDRESS_LENGTH);
	}
	return value;
}

export function isMailDomain(
	value: string,
	allowed: readonly string[],
): boolean {
	return allowed.includes(value.trim().toLowerCase());
}

export function isValidCustomLocalPart(value: string): boolean {
	const local = value.trim().toLowerCase();
	if (local.length < 1 || local.length > 32) {
		return false;
	}
	if (local.includes("..")) {
		return false;
	}
	return CUSTOM_LOCAL_PART.test(local);
}

export function isAllowedMailboxAddress(
	address: string,
	allowed: readonly string[],
): boolean {
	const normalized = normalizeEmailAddress(address);
	const at = normalized.lastIndexOf("@");
	if (at <= 0) {
		return false;
	}
	const localPart = normalized.slice(0, at);
	const domain = normalized.slice(at + 1);
	if (!isMailDomain(domain, allowed)) {
		return false;
	}
	return GENERATED_LOCAL_PART.test(localPart) || isValidCustomLocalPart(localPart);
}

export function isSameMailboxAddress(left: string, right: string): boolean {
	const normalizedLeft = normalizeEmailAddress(left);
	const normalizedRight = normalizeEmailAddress(right);
	return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

export function buildMailboxAddress(
	localPart: string,
	domain: string,
	allowed: readonly string[],
): string | null {
	const local = localPart.trim().toLowerCase();
	if (!isValidCustomLocalPart(local) || !isMailDomain(domain, allowed)) {
		return null;
	}
	return normalizeEmailAddress(`${local}@${domain}`);
}

export function generateEmailAddress(domain: string) {
	return normalizeEmailAddress(
		`${randomName()}-${nanoSuffix()}@${domain}`,
	);
}
