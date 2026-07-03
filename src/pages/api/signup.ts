import type { APIRoute } from 'astro';

const DEFAULT_N8N_TEST_WEBHOOK_URL = 'https://n8n.virtech.nl/webhook-test/signup';
const DEFAULT_N8N_WEBHOOK_URL = 'https://n8n.virtech.nl/webhook/signup';
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

function isLocalRequest(requestUrl: string) {
	const hostname = new URL(requestUrl).hostname;

	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local');
}

function getSignupWebhookUrl(requestUrl: string, locals: Record<string, any> | undefined) {
	const runtimeEnv = locals?.runtime?.env as Record<string, string | undefined> | undefined;
	const metaEnv = import.meta.env as Record<string, string | undefined>;
	const processEnv = process.env as Record<string, string | undefined>;
	const useTestWebhook = isLocalRequest(requestUrl);

	if (useTestWebhook) {
		return runtimeEnv?.SIGNUP_N8N_TEST_WEBHOOK_URL ?? metaEnv.SIGNUP_N8N_TEST_WEBHOOK_URL ?? processEnv.SIGNUP_N8N_TEST_WEBHOOK_URL ?? DEFAULT_N8N_TEST_WEBHOOK_URL;
	}

	return runtimeEnv?.SIGNUP_N8N_WEBHOOK_URL ?? metaEnv.SIGNUP_N8N_WEBHOOK_URL ?? processEnv.SIGNUP_N8N_WEBHOOK_URL ?? DEFAULT_N8N_WEBHOOK_URL;
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

async function postWebhook(url: string, webhookSecret: string | undefined, payload: unknown) {
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
		const responseText = await response.text().catch(() => '');
		throw new Error(`Webhook failed (${response.status})${responseText ? `: ${responseText}` : ''}`);
	}
}

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const webhookUrl = getSignupWebhookUrl(request.url, locals as Record<string, any>);
		const webhookSecret = getEnvValue(locals as Record<string, any>, 'SIGNUP_WEBHOOK_SECRET');

		const debugSource = getDebugEnvSource(locals as Record<string, any>);
		console.info('Signup webhook debug', {
			envSource: debugSource,
			webhookUrl,
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

		const payload = {
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
		};

		await postWebhook(webhookUrl, webhookSecret, payload);

		return Response.redirect(new URL(`/${lang}/inschrijven?status=ok`, request.url), 303);
	} catch (error) {
		console.error('Signup submission failed', error);
		return Response.redirect(new URL('/lim/inschrijven?status=error', request.url), 303);
	}
};
