import { env } from "~/env.server";

const API_BASE = "https://api.telegram.org";
// const TIMEOUT_MS = 5000;

export function isTelegramConfigured() {
	return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHANNEL_ID);
}

/** Escape dynamic text for Telegram's HTML parse_mode. */
export function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

/**
 * Sends one message to the configured channel. parse_mode is HTML on purpose:
 * classic Markdown 400s on unescaped `[`/`*`/`_` in scraped titles, and plain
 * text cannot hyperlink the title — HTML only needs the three chars above
 * escaped. Fails closed with { ok: false } — callers decide the status code.
 */
export async function sendTelegramMessage(
	text: string,
): Promise<{ ok: boolean; error?: string }> {
	if (!isTelegramConfigured()) return { ok: false, error: "not configured" };

	try {
		const res = await fetch(
			`${API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chat_id: env.TELEGRAM_CHANNEL_ID,
					text,
					parse_mode: "HTML",
					disable_web_page_preview: true,
				}),
				// signal: AbortSignal.timeout(TIMEOUT_MS),
			},
		);

		if (!res.ok) {
			console.error(
				`telegram: unexpected status ${res.status}`,
				await res.text(),
			);
			return { ok: false, error: `status ${res.status}` };
		}

		return { ok: true };
	} catch (error) {
		console.error("telegram: send failed", error);
		return { ok: false, error: "request failed" };
	}
}
