# 3rd Open Frit-ZoervleisjTreffe Website

Welcome to the official website for the **3rd Open Frit-ZoervleisjTreffe**, a community event celebrating local culture, food, and festivities.

## About the Event

The Frit-ZoervleisjTreffe is an open gathering where enthusiasts come together to enjoy traditional dishes, music, and social activities. This website provides information about the event, schedules, and highlights.

## Project Structure

This project is built using the Astro framework. The main folders include:

```text
/
├── public/           # Static assets like images and favicon
├── src/              # Source files for components, pages, and layouts
│   ├── assets/       # Images and other media
│   ├── components/   # Reusable UI components
│   ├── layouts/      # Page layouts
│   └── pages/        # Website pages
├── package.json      # Project dependencies and scripts
└── README.md         # Project documentation
```

## Getting Started

To run the website locally, use the following commands in your terminal:

```sh
npm install
npm run dev
```

This will start a local development server, usually accessible at `http://localhost:4321`.

## Build and Preview

To build the production version of the site:

```sh
npm run build
```

To preview the production build locally:

```sh
npm run preview
```

## Signup Submissions

The signup form now sends each submission to an n8n webhook. Local development uses the test webhook and production uses the live webhook.

Current signup data includes:

- Voornaam
- Achternaam
- Adres
- Postcode
- Woonplaats
- Telefoonnummer
- E-mail
- Aantal personen
- Inschrijfgeld, calculated at € 6,90 per person

The signup page also shows the event note for the 3e oape Joabiks Zoervleisjtreffe and the current rules text in Dutch and Limburgs.

### Environment Variables for Signups

Configure one or more of these environment variables:

- `SIGNUP_N8N_TEST_WEBHOOK_URL`: test webhook used during local development
- `SIGNUP_N8N_WEBHOOK_URL`: production webhook used in Cloudflare Pages
- `SIGNUP_WEBHOOK_SECRET`: optional shared secret sent as `x-signup-secret`

If the URLs are not configured, the app falls back to these defaults:

- `https://n8n.virtech.nl/webhook-test/signup` for local/test usage
- `https://n8n.virtech.nl/webhook/signup` for production usage

### Setting up Cloudflare Pages Secrets

1. Go to your Cloudflare Pages project dashboard
2. Settings > Environment variables
3. Under **Production** environment, add:
   - Name: `SIGNUP_N8N_WEBHOOK_URL` | Value: your n8n production webhook URL
   - Name: `SIGNUP_WEBHOOK_SECRET` (optional) | Value: any random string

**Important:** Secrets must be added as **Production** environment variables in Cloudflare. They are accessed at runtime via `process.env`.

### Setting up n8n

1. Create one n8n workflow for testing and one for production, both with a webhook trigger.
2. Use the path signup for both workflows.
3. Activate the production workflow so the live webhook is available.
4. In the workflow, map the fields from the incoming JSON payload to your target storage.
5. Optional: read the x-signup-secret header if you want an extra shared-secret check.

### Local Development

For local testing, create a `.env` file (use `.env.example` as reference) with:
```
SIGNUP_N8N_TEST_WEBHOOK_URL=https://n8n.virtech.nl/webhook-test/signup
SIGNUP_WEBHOOK_SECRET=your_secret_here
```

Then run `npm run dev` and the form will use these local secrets.

### Legacy Google Sheets Option

The file `docs/google-apps-script-signup.gs` is still available if you want to keep the older direct-to-Google-Sheets approach as a fallback or reference.

## Learn More

For more information about Astro, visit the [Astro documentation](https://docs.astro.build).

---
Enjoy the 3rd Open Frit-ZoervleisjTreffe!
