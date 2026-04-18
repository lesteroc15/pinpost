const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');
const TEST_EMAIL = 'lesteroc15+test@gmail.com';
const PROJECT = 'mapcheckins';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();

  await page.goto(`https://console.cloud.google.com/auth/audience?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
  await page.waitForTimeout(2000);

  await page.locator('button:has-text("Add users")').click();
  await page.waitForTimeout(3000);

  await page.mouse.click(1150, 195);
  await page.waitForTimeout(500);
  await page.keyboard.type(TEST_EMAIL, { delay: 20 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  await page.locator('button:has-text("Save")').last().click({ force: true });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator('body').innerText();
  console.log(bodyText.includes(TEST_EMAIL) ? '✓ Test user added!' : '✗ Not found');
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
