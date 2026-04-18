const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');
const REDIRECT_URI = 'https://pinpost-web-production.up.railway.app/api/admin/gbp/callback';
const PROJECT = 'mapcheckins';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();

  console.log('> Opening credentials page...');
  await page.goto(`https://console.cloud.google.com/apis/credentials?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }

  await page.waitForSelector('text=OAuth 2.0 Client IDs', { timeout: 30000 });
  console.log('> Clicking on MapCheckins Web Client...');
  await page.click('text=MapCheckins Web Client');
  await page.waitForSelector('text=Authorized redirect URIs', { timeout: 30000 });

  const content = await page.content();
  if (content.includes(REDIRECT_URI)) {
    console.log('> ✓ Redirect URI already present.');
    await browser.close();
    return;
  }

  console.log('> Adding new redirect URI...');
  const addBtn = page.locator('button:has-text("ADD URI")').last();
  await addBtn.click();
  await page.waitForTimeout(500);
  const lastInput = page.locator('input[placeholder*="https"]').last();
  await lastInput.fill(REDIRECT_URI);

  console.log('> Saving...');
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(3000);
  console.log('> ✓ Done!');
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
