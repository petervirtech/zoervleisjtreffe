// Deploy as Web App (Execute as: Me, Access: Anyone with link)
// Then use the deployment URL as SIGNUP_SHEET_WEBHOOK_URL.

const SHEET_NAME = 'Signups';
const EMAIL_TO = 'you@example.com';
const SHARED_SECRET = ''; // Optional: set same value as SIGNUP_WEBHOOK_SECRET
const SHEET_HEADERS = [
  'timestamp',
  'firstName',
  'lastName',
  'address',
  'postalCode',
  'city',
  'phone',
  'phoneTelLink',
  'email',
  'personCount',
  'registrationFee',
  'lang',
  'source',
];

function getConfiguredRecipient_() {
  const scriptPropertiesRecipient = PropertiesService.getScriptProperties().getProperty('EMAIL_TO');
  const configuredRecipient = String(scriptPropertiesRecipient || EMAIL_TO || '').trim();

  if (configuredRecipient && configuredRecipient !== 'you@example.com') {
    return configuredRecipient;
  }

  const effectiveUser = String(Session.getEffectiveUser().getEmail() || '').trim();

  return effectiveUser || configuredRecipient;
}

function doPost(e) {
  try {
    const secret = getHeaderValue_(e, 'x-signup-secret');

    if (SHARED_SECRET && secret !== SHARED_SECRET) {
      return jsonResponse_({ ok: false, error: 'unauthorized' }, 401);
    }

    const payload = JSON.parse(e.postData.contents || '{}');
    const firstName = (payload.firstName || '').trim();
    const lastName = (payload.lastName || '').trim();
    const address = (payload.address || '').trim();
    const postalCode = (payload.postalCode || '').trim();
    const city = (payload.city || '').trim();
    const email = (payload.email || '').trim();
    const phone = (payload.phone || '').trim();
    const personCount = Number(payload.personCount || 0);
    var registrationFee = Number(payload.registrationFee || 0);
    // Normalize to two decimals
    registrationFee = Math.round(registrationFee * 100) / 100;
    const lang = (payload.lang || 'lim').trim();
    const timestamp = payload.timestamp || new Date().toISOString();
    const phoneTelLink = phone ? `tel:${phone.replace(/\s+/g, '')}` : '';

    if (!firstName || !lastName || !address || !postalCode || !city || !email || !phone || !personCount) {
      return jsonResponse_({ ok: false, error: 'missing-fields' }, 400);
    }

    const sheet = getOrCreateSheet_(SHEET_NAME);
    ensureHeaders_(sheet);

    sheet.appendRow([
      timestamp,
      firstName,
      lastName,
      address,
      postalCode,
      city,
      phone,
      phoneTelLink,
      email,
      personCount,
      registrationFee,
      lang,
      'website',
    ]);

    const row = sheet.getLastRow();
    sheet.getRange(row, 7).setNumberFormat('@');

    const subject = 'Nieuwe inschrijving Zoervleisjtreffe';
    const body = [
      'Er is een nieuwe inschrijving binnengekomen:',
      '',
      'Voornaam: ' + firstName,
      'Achternaam: ' + lastName,
      'Adres: ' + address,
      'Postcode: ' + postalCode,
      'Woonplaats: ' + city,
      'Email: ' + email,
      'Telefoonnummer: ' + phone,
      'Bel-link: ' + phoneTelLink,
      'Aantal personen: ' + personCount,
      'Inschrijfgeld: ' + (registrationFee.toFixed ? registrationFee.toFixed(2).replace('.', ',') : registrationFee),
      'Taal: ' + lang,
      'Tijdstip: ' + timestamp,
    ].join('\n');

    sendNotificationEmail_(subject, body);
    sendApplicantConfirmationEmail_(
      email,
      firstName,
      lastName,
      address,
      postalCode,
      city,
      phone,
      personCount,
      registrationFee,
      lang,
      timestamp
    );

    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function getOrCreateSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}

function ensureHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0].map((value) => String(value || '').trim());
  const hasHeaders = currentHeaders.some((value) => value);
  const headersMatch = SHEET_HEADERS.every((header, index) => currentHeaders[index] === header);

  if (!hasHeaders || !headersMatch) {
    const hasDataRows = sheet.getLastRow() > 0;

    if (hasDataRows && hasHeaders) {
      sheet.insertRowBefore(1);
    }

    headerRange.setValues([SHEET_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function jsonResponse_(data) {
  // Apps Script web apps don't reliably support custom HTTP status codes.
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationEmail_(subject, body) {
  const recipient = getConfiguredRecipient_();

  if (!recipient) {
    console.log('Signup email skipped: EMAIL_TO is not configured');
    return;
  }

  try {
    MailApp.sendEmail(recipient, subject, body);
  } catch (err) {
    console.log('Signup email failed: ' + err);
  }
}

function sendApplicantConfirmationEmail_(recipient, firstName, lastName, address, postalCode, city, phone, personCount, registrationFee, lang, timestamp) {
  const emailRecipient = String(recipient || '').trim();

  if (!emailRecipient) {
    console.log('Applicant confirmation skipped: no recipient email');
    return;
  }

  const subject = 'Bevestiging van je inschrijving Zoervleisjtreffe';
  const body = [
    'Bedankt voor je aanmelding voor het Zoervleisjtreffe.',
    '',
    'Je gegevens:',
    'Voornaam: ' + firstName,
    'Achternaam: ' + lastName,
    'Adres: ' + address,
    'Postcode: ' + postalCode,
    'Woonplaats: ' + city,
    'Telefoonnummer: ' + phone,
    'Aantal personen: ' + personCount,
    'Inschrijfgeld: ' + (registrationFee.toFixed ? registrationFee.toFixed(2).replace('.', ',') : registrationFee),
    'Taal: ' + lang,
    'Tijdstip van aanmelding: ' + timestamp,
    '',
    'De aanmeldingen worden behandeld op volgorde van binnenkomst.',
    'Je ontvangt later een aparte bevestiging of je daadwerkelijk kunt meedoen.',
    'Na die bevestiging ontvang je in de laatste weken van augustus een Tikkie.',
  ].join('\n');

  try {
    MailApp.sendEmail(emailRecipient, subject, body);
  } catch (err) {
    console.log('Applicant confirmation failed: ' + err);
  }
}

function getHeaderValue_(e, headerName) {
  // Apps Script does not expose raw headers directly for web apps consistently.
  // If secret is needed, pass it in query or body as fallback.
  const lowered = headerName.toLowerCase();
  const fromParam = e?.parameter?.[lowered] || e?.parameter?.[headerName];
  if (fromParam) return fromParam;

  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    return payload[headerName] || payload[lowered] || payload.xSignupSecret || '';
  } catch (_err) {
    return '';
  }
}
