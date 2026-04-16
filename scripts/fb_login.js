const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');

const EMAIL = 'lesteroc15@gmail.com';
const PASSWORD = '6nDPLvUdjv2aVfN2!@9';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  console.log('> Filling login form...');
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="pass"]').fill(PASSWORD);
  await page.waitForTimeout(500);

  // Press Enter to submit instead of clicking button
  await page.locator('input[name="pass"]').press('Enter');

  console.log('> Waiting for response...');
  await page.waitForTimeout(10000);

  const shot = path.join(__dirname, 'fb_login_result.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('> URL:', page.url());
  console.log('> Title:', await page.title());

  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('> Body snippet:');
  console.log(bodyText.slice(0, 1200));

  const searchBar = await page.locator('[aria-label="Search Facebook"]').count();
  console.log('\n> search bar:', searchBar);
  console.log('> Screenshot:', shot);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
