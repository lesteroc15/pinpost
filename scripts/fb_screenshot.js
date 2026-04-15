// Open Facebook, take screenshot to see current state
const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browser.pages()[0] || await browser.newPage();
  console.log('> Opening facebook.com...');
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  const shotPath = path.join(__dirname, 'fb_state.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('> URL:', page.url());
  console.log('> Screenshot saved to:', shotPath);
  // Check for some obvious elements
  const emailInput = await page.locator('input[name="email"]').count();
  const passInput = await page.locator('input[name="pass"]').count();
  const createPage = await page.locator('text=/create page/i').count();
  console.log('> email input present:', emailInput, '| password input:', passInput, '| "Create Page" text found:', createPage);
  console.log('\n> Keeping browser open. Press Ctrl+C when done.');
  await new Promise(() => {});
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
