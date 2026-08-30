import {
	buildMailboxAddress,
	generateEmailAddress,
	normalizeEmailAddress,
} from "~/utils/mail";

const ISSUE_ATTEMPTS = 8;

function isUniqueConstraintError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /UNIQUE constraint failed/i.test(message);
}

export async function issueNewAddress(
	d1: D1Database,
	domain: string,
): Promise<string | null> {
	for (let attempt = 0; attempt < ISSUE_ATTEMPTS; attempt += 1) {
		const address = generateEmailAddress(domain);
		try {
			const result = await d1
				.prepare(
					"INSERT INTO issued_addresses (address, issued_at) VALUES (?, ?)",
				)
				.bind(address, Date.now())
				.run();
			if (result.meta.changes === 1) {
				return address;
			}
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				continue;
			}
			throw error;
		}
	}
	return null;
}

export async function issueCustomAddress(
	d1: D1Database,
	localPart: string,
	domain: string,
	allowed: readonly string[],
): Promise<string | null> {
	const address = buildMailboxAddress(localPart, domain, allowed);
	if (!address) {
		return null;
	}
	try {
		const result = await d1
			.prepare(
				"INSERT INTO issued_addresses (address, issued_at) VALUES (?, ?)",
			)
			.bind(address, Date.now())
			.run();
		if (result.meta.changes === 1) {
			return address;
		}
		return null;
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return null;
		}
		throw error;
	}
}

export async function rememberIssuedAddress(
	d1: D1Database,
	address: string,
): Promise<void> {
	const normalized = normalizeEmailAddress(address);
	await d1
		.prepare(
			"INSERT OR IGNORE INTO issued_addresses (address, issued_at) VALUES (?, ?)",
		)
		.bind(normalized, Date.now())
		.run();
}
