import { generateEmailAddress, normalizeEmailAddress } from "~/utils/mail";

const ISSUE_ATTEMPTS = 8;

function isUniqueConstraintError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /UNIQUE constraint failed/i.test(message);
}

export async function issueNewAddress(
	d1: D1Database,
): Promise<string | null> {
	for (let attempt = 0; attempt < ISSUE_ATTEMPTS; attempt += 1) {
		const address = generateEmailAddress();
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
