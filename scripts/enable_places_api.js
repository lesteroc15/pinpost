const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');
const PROJECT = 'mapcheckins';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();

  // Enable Places API
  console.log('> Enabling Places API...');
  await page.goto(`https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await page.waitForTimeout(2000);

  const enableBtn = page.locator('button:has-text("Enable"), button:has-text("ENABLE")').first();
  if (await enableBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enableBtn.click();
    console.log('> Clicked Enable for Places API');
    await page.waitForTimeout(5000);
  } else {
    console.log('> Places API might already be enabled');
  }

  // Enable Maps JavaScript API
  console.log('> Enabling Maps JavaScript API...');
  await page.goto(`https://console.cloud.google.com/apis/library/maps-backend.googleapis.com?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await page.waitForTimeout(2000);

  const enableBtn2 = page.locator('button:has-text("Enable"), button:has-text("ENABLE")').first();
  if (await enableBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enableBtn2.click();
    console.log('> Clicked Enable for Maps JavaScript API');
    await page.waitForTimeout(5000);
  } else {
    console.log('> Maps JavaScript API might already be enabled');
  }

  // Now create an API key for browser use
  console.log('> Creating API key...');
  await page.goto(`https://console.cloud.google.com/apis/credentials?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await page.waitForTimeout(2000);

  // Click "Create Credentials" -> "API key"
  const createBtn = page.locator('button:has-text("Create credentials"), button:has-text("CREATE CREDENTIALS")').first();
  await createBtn.click();
  await page.waitForTimeout(2000);

  const apiKeyOption = page.locator('text=API key, a:has-text("API key"), [role="menuitem"]:has-text("API key")').first();
  if (await apiKeyOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await apiKeyOption.click();
    console.log('> Clicked API key option');
    await page.waitForTimeout(5000);
  }

  // A dialog should show with the new API key
  let shot = path.join(__dirname, 'api_key_created.png');
  await page.screenshot({ path: shot });
  console.log('> Screenshot:', shot);

  // Try to extract the key from the dialog
  const bodyText = await page.locator('body').innerText();
  const keyMatch = bodyText.match(/AIza[A-Za-z0-9_-]{35}/);
  if (keyMatch) {
    console.log('> API KEY:', keyMatch[0]);
  } else {
    console.log('> Could not extract API key automatically. Check screenshot.');
  }

  // Close dialog
  const closeBtn = page.locator('button:has-text("Close"), button:has-text("CLOSE")').first();
  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) await closeBtn.click();

  await page.waitForTimeout(2000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
