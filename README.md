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

## Signup Notifications And Storage

The signup form can now send data to one or more webhooks on submit.

### Environment Variables for Signups

Configure one or more of these environment variables:

- `SIGNUP_EMAIL_WEBHOOK_URL`: endpoint that sends you an email notification
- `SIGNUP_SHEET_WEBHOOK_URL`: endpoint that appends rows to Google Sheets
- `SIGNUP_TEXTFILE_WEBHOOK_URL`: endpoint that writes to a text file/log
- `SIGNUP_WEBHOOK_SECRET`: optional shared secret sent as `x-signup-secret`

If none of the webhook URLs are configured, form submissions will show an error.

### Setting up Cloudflare Pages Secrets

1. Go to your Cloudflare Pages project dashboard
2. Settings > Environment variables
3. Under **Production** environment, add:
   - Name: `SIGNUP_SHEET_WEBHOOK_URL` | Value: your Google Apps Script Web App URL
   - Name: `SIGNUP_WEBHOOK_SECRET` (optional) | Value: any random string

**Important:** Secrets must be added as **Production** environment variables in Cloudflare. They are accessed at runtime via `process.env`.

### Setting up Google Sheets + Email Integration

1. Open Google Sheets and create a new sheet for signups.
2. In that sheet, open **Extensions > Apps Script**.
3. Paste the contents of `docs/google-apps-script-signup.gs`.
4. Set `EMAIL_TO` to your email address.
5. Optional: set `SHARED_SECRET` to a random string (same as `SIGNUP_WEBHOOK_SECRET`).
6. Click **Deploy > New deployment > Type: Web app**.
7. Choose **Execute as: Me**, **Who has access: Anyone**.
8. Copy the Web app URL.
9. In Cloudflare Pages, set `SIGNUP_SHEET_WEBHOOK_URL` = your Web app URL.
10. Optionally, set `SIGNUP_WEBHOOK_SECRET` = same value as `SHARED_SECRET`.

### Local Development

For local testing, create a `.env` file (use `.env.example` as reference) with:
```
SIGNUP_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/userweb
SIGNUP_WEBHOOK_SECRET=your_secret_here
```

Then run `npm run dev` and the form will use these local secrets.

## Learn More

For more information about Astro, visit the [Astro documentation](https://docs.astro.build).

---
Enjoy the 3rd Open Frit-ZoervleisjTreffe!
