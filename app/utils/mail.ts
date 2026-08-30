import randomName from "@scaleway/random-name";
import { customAlphabet } from "nanoid";

export const MAIL_DOMAIN = "smail.pw";
const MAX_ADDRESS_LENGTH = 128;
const nanoSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);
const GENERATED_LOCAL_PART = /^[a-z]+(?:-[a-z]+)+-[a-z0-9]{6}$/;

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

export function isGeneratedEmailAddress(address: string): boolean {
	const normalized = normalizeEmailAddress(address);
	if (!normalized.endsWith(`@${MAIL_DOMAIN}`)) {
		return false;
	}
	const localPart = normalized.slice(0, -(MAIL_DOMAIN.length + 1));
	return GENERATED_LOCAL_PART.test(localPart);
}

export function isSameMailboxAddress(left: string, right: string): boolean {
	const normalizedLeft = normalizeEmailAddress(left);
	const normalizedRight = normalizeEmailAddress(right);
	return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

export function generateEmailAddress() {
	return normalizeEmailAddress(
		`${randomName()}-${nanoSuffix()}@${MAIL_DOMAIN}`,
	);
}
