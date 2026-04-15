// Automate adding the Railway redirect URI to the Google Cloud OAuth client
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const REDIRECT_URI = 'https://pinpost-web-production.up.railway.app/api/auth/google/callback';
const PROJECT = 'mapcheckins';
// Persistent profile — keeps logins between script runs
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');

(async () => {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browser.pages()[0] || await browser.newPage();

  console.log('> Opening Google Cloud Console credentials page...');
  await page.goto(`https://console.cloud.google.com/apis/credentials?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait up to 5 min for user to sign in if needed
  console.log('> Waiting for credentials page to load (sign in if prompted)...');
  await page.waitForSelector('text=OAuth 2.0 Client IDs', { timeout: 300000 });

  console.log('> Clicking on MapCheckins Web Client...');
  await page.click('text=MapCheckins Web Client');

  console.log('> Waiting for client detail page...');
  await page.waitForSelector('text=Authorized redirect URIs', { timeout: 30000 });

  // Check if redirect URI is already present
  const existingText = await page.content();
  if (existingText.includes(REDIRECT_URI)) {
    console.log('✓ Redirect URI already present. No changes needed.');
    await browser.close();
    return;
  }

  console.log('> Clicking + Add URI under Authorized redirect URIs...');
  // Find the "ADD URI" button within the redirect URIs section
  const addUriBtn = page.locator('button:has-text("ADD URI")').last();
  await addUriBtn.click();

  // Wait for the new input row and type the URI
  await page.waitForTimeout(500);
  const lastInput = page.locator('input[placeholder*="https"]').last();
  await lastInput.fill(REDIRECT_URI);

  console.log('> Clicking Save...');
  await page.click('button:has-text("Save")');

  // Wait for save to complete
  await page.waitForTimeout(3000);

  console.log('✓ Done!');
  await browser.close();
})().catch(async (err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
