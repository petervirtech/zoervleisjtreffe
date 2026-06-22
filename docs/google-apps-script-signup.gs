// Deploy as Web App (Execute as: Me, Access: Anyone with link)
// Then use the deployment URL as SIGNUP_SHEET_WEBHOOK_URL.

const SHEET_NAME = 'Signups';
const EMAIL_TO = 'you@example.com';
const SHARED_SECRET = ''; // Optional: set same value as SIGNUP_WEBHOOK_SECRET

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

    MailApp.sendEmail(EMAIL_TO, subject, body);

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
    sheet.appendRow(['timestamp', 'firstName', 'lastName', 'address', 'postalCode', 'city', 'phone', 'phoneTelLink', 'email', 'personCount', 'registrationFee', 'lang', 'source']);
  }

  return sheet;
}

function jsonResponse_(data) {
  // Apps Script web apps don't reliably support custom HTTP status codes.
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
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
