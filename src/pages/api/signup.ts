import type { APIRoute } from 'astro';

const ALLOWED_LANGS = new Set(['lim', 'nl']);

function sanitize(value: FormDataEntryValue | null) {
	return typeof value === 'string' ? value.trim() : '';
}

function getSafeLang(value: string) {
	return ALLOWED_LANGS.has(value) ? value : 'lim';
}

function getEnvValue(locals: Record<string, any> | undefined, key: string) {
	const runtimeEnv = locals?.runtime?.env as Record<string, string | undefined> | undefined;
	const metaEnv = import.meta.env as Record<string, string | undefined>;
	const processEnv = process.env as Record<string, string | undefined>;

	return runtimeEnv?.[key] ?? metaEnv[key] ?? processEnv[key];
}

function getDebugEnvSource(locals: Record<string, any> | undefined) {
	const runtimeEnv = locals?.runtime?.env as Record<string, string | undefined> | undefined;
	const metaEnv = import.meta.env as Record<string, string | undefined>;
	const processEnv = process.env as Record<string, string | undefined>;

	return {
		runtime: Boolean(runtimeEnv),
		meta: Boolean(metaEnv),
		process: Boolean(processEnv),
	};
}

async function postWebhook(url: string | undefined, webhookSecret: string | undefined, payload: unknown) {
	if (!url) {
		return;
	}

	const headers: HeadersInit = {
		'Content-Type': 'application/json',
	};

	if (webhookSecret) {
		headers['x-signup-secret'] = webhookSecret;
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

function buildWebhookPayload(basePayload: Record<string, unknown>, webhookSecret: string | undefined) {
	if (!webhookSecret) {
		return basePayload;
	}

	return {
		...basePayload,
		'x-signup-secret': webhookSecret,
		xSignupSecret: webhookSecret,
	};
}

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const emailWebhookUrl = getEnvValue(locals as Record<string, any>, 'SIGNUP_EMAIL_WEBHOOK_URL');
		const sheetWebhookUrl = getEnvValue(locals as Record<string, any>, 'SIGNUP_SHEET_WEBHOOK_URL');
		const textfileWebhookUrl = getEnvValue(locals as Record<string, any>, 'SIGNUP_TEXTFILE_WEBHOOK_URL');
		const webhookSecret = getEnvValue(locals as Record<string, any>, 'SIGNUP_WEBHOOK_SECRET');

		const debugSource = getDebugEnvSource(locals as Record<string, any>);
		console.info('Signup env debug', {
			envSource: debugSource,
			hasEmailWebhookUrl: Boolean(emailWebhookUrl),
			hasSheetWebhookUrl: Boolean(sheetWebhookUrl),
			hasTextfileWebhookUrl: Boolean(textfileWebhookUrl),
			hasWebhookSecret: Boolean(webhookSecret),
		});

		const formData = await request.formData();
		const lang = getSafeLang(sanitize(formData.get('lang')));
		const website = sanitize(formData.get('website'));

		// Honeypot anti-spam: pretend success when bot fills this field.
		if (website) {
			return Response.redirect(new URL(`/${lang}/inschrijven?status=ok`, request.url), 303);
		}

		const firstName = sanitize(formData.get('firstName'));
		const lastName = sanitize(formData.get('lastName'));
		const address = sanitize(formData.get('address'));
		const postalCode = sanitize(formData.get('postalCode'));
		const city = sanitize(formData.get('city'));
		const email = sanitize(formData.get('email'));
		const phone = sanitize(formData.get('phone'));
		const personCountRaw = sanitize(formData.get('personCount'));
		const personCount = Number.parseInt(personCountRaw, 10);
		const pricePerPerson = 6.9;
		const registrationFee = Number.isFinite(personCount) && personCount > 0 ? Math.round(personCount * pricePerPerson * 100) / 100 : NaN;

		if (!firstName || !lastName || !address || !postalCode || !city || !email || !phone || !Number.isFinite(personCount) || personCount < 1) {
			return Response.redirect(new URL(`/${lang}/inschrijven?status=error`, request.url), 303);
		}

		const payload = buildWebhookPayload({
			firstName,
			lastName,
			address,
			postalCode,
			city,
			email,
			phone,
			personCount,
			registrationFee,
			lang,
			timestamp: new Date().toISOString(),
			source: 'signup-page',
		}, webhookSecret);

		if (!emailWebhookUrl && !sheetWebhookUrl && !textfileWebhookUrl) {
			console.error('Signup error: No signup webhooks configured', {
				envSource: debugSource,
				hint: 'Set SIGNUP_SHEET_WEBHOOK_URL in .env (local) or Cloudflare Pages environment variables.',
			});
			throw new Error('No signup webhooks configured');
		}

		await Promise.all([
			postWebhook(emailWebhookUrl, webhookSecret, payload),
			postWebhook(sheetWebhookUrl, webhookSecret, payload),
			postWebhook(textfileWebhookUrl, webhookSecret, payload),
		]);

		return Response.redirect(new URL(`/${lang}/inschrijven?status=ok`, request.url), 303);
	} catch (error) {
		console.error('Signup submission failed', error);
		return Response.redirect(new URL('/lim/inschrijven?status=error', request.url), 303);
	}
};
