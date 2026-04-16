const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const shot = path.join(__dirname, 'fb_status.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  // Check for common states
  const emailInput = await page.locator('input[name="email"]').count();
  const searchBar = await page.locator('[aria-label="Search Facebook"]').count();
  const checkpoint = await page.locator('text=/appeal|locked|checkpoint|review|disabled/i').count();
  console.log('login form present:', emailInput > 0);
  console.log('logged-in search bar present:', searchBar > 0);
  console.log('appeal/lock text present:', checkpoint > 0);
  console.log('Screenshot:', shot);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
