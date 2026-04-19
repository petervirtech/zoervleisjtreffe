import type { APIRoute } from 'astro';

const EMAIL_WEBHOOK_URL = import.meta.env.SIGNUP_EMAIL_WEBHOOK_URL;
const SHEET_WEBHOOK_URL = import.meta.env.SIGNUP_SHEET_WEBHOOK_URL;
const TEXTFILE_WEBHOOK_URL = import.meta.env.SIGNUP_TEXTFILE_WEBHOOK_URL;
const WEBHOOK_SECRET = import.meta.env.SIGNUP_WEBHOOK_SECRET;

const ALLOWED_LANGS = new Set(['lim', 'nl']);

function sanitize(value: FormDataEntryValue | null) {
	return typeof value === 'string' ? value.trim() : '';
}

function getSafeLang(value: string) {
	return ALLOWED_LANGS.has(value) ? value : 'lim';
}

async function postWebhook(url: string | undefined, payload: unknown) {
	if (!url) {
		return;
	}

	const headers: HeadersInit = {
		'Content-Type': 'application/json',
	};

	if (WEBHOOK_SECRET) {
		headers['x-signup-secret'] = WEBHOOK_SECRET;
	}

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Webhook failed (${response.status})`);
	}
}

function buildWebhookPayload(basePayload: Record<string, unknown>) {
	if (!WEBHOOK_SECRET) {
		return basePayload;
	}

	return {
		...basePayload,
		'x-signup-secret': WEBHOOK_SECRET,
		xSignupSecret: WEBHOOK_SECRET,
	};
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const formData = await request.formData();
		const lang = getSafeLang(sanitize(formData.get('lang')));
		const website = sanitize(formData.get('website'));

		// Honeypot anti-spam: pretend success when bot fills this field.
		if (website) {
			return Response.redirect(new URL(`/${lang}/inschrijven?status=ok`, request.url), 303);
		}

		const name = sanitize(formData.get('name'));
		const email = sanitize(formData.get('email'));
		const phone = sanitize(formData.get('phone'));

		if (!name || !email || !phone) {
			return Response.redirect(new URL(`/${lang}/inschrijven?status=error`, request.url), 303);
		}

		const payload = buildWebhookPayload({
			name,
			email,
			phone,
			lang,
			timestamp: new Date().toISOString(),
			source: 'signup-page',
		});

		if (!EMAIL_WEBHOOK_URL && !SHEET_WEBHOOK_URL && !TEXTFILE_WEBHOOK_URL) {
			throw new Error('No signup webhooks configured');
		}

		await Promise.all([
			postWebhook(EMAIL_WEBHOOK_URL, payload),
			postWebhook(SHEET_WEBHOOK_URL, payload),
			postWebhook(TEXTFILE_WEBHOOK_URL, payload),
		]);

		return Response.redirect(new URL(`/${lang}/inschrijven?status=ok`, request.url), 303);
	} catch (error) {
		console.error('Signup submission failed', error);
		return Response.redirect(new URL('/lim/inschrijven?status=error', request.url), 303);
	}
};
