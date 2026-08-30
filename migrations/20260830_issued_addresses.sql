CREATE TABLE IF NOT EXISTS issued_addresses (
	address TEXT PRIMARY KEY,
	issued_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO issued_addresses (address, issued_at)
SELECT lower(trim(to_address)), MIN(time)
FROM emails
WHERE to_address IS NOT NULL AND trim(to_address) != ''
GROUP BY lower(trim(to_address));
