// Create a Facebook Page for PinPost testing
const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');
const PAGE_NAME = 'PinPost Test';
const CATEGORY = 'Local Service';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browser.pages()[0] || await browser.newPage();

  console.log('> Navigating to Facebook Page creation...');
  await page.goto('https://www.facebook.com/pages/create/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for login if needed
  console.log('> If you see the Facebook login page, please sign in. (Up to 5 min)');
  try {
    await Promise.race([
      page.waitForSelector('input[placeholder*="Page name"], input[aria-label*="Page name"], input[name*="name"]', { timeout: 300000 }),
      page.waitForSelector('text=/login|log in/i', { timeout: 300000 })
    ]);
  } catch (e) {
    console.log('> Timeout waiting for page; continuing...');
  }

  // If on login page, wait for user to complete
  if (page.url().includes('/login') || await page.locator('input[name="email"]').count() > 0 && !page.url().includes('/pages/create')) {
    console.log('> Login required — please sign in in the browser window.');
    await page.waitForURL(/facebook\.com\/pages\/create/, { timeout: 300000 });
  }

  // Give Facebook time to render the form
  await page.waitForTimeout(3000);

  console.log('> Filling in Page name...');
  const nameInput = page.locator('input[placeholder*="Page name"], input[aria-label*="Page name"]').first();
  await nameInput.waitFor({ timeout: 30000 });
  await nameInput.fill(PAGE_NAME);

  await page.waitForTimeout(1000);

  console.log('> Setting category...');
  const catInput = page.locator('input[placeholder*="Category"], input[aria-label*="Category"]').first();
  await catInput.click();
  await catInput.fill(CATEGORY);
  await page.waitForTimeout(1500);
  // Click first dropdown option
  const firstOption = page.locator('ul[role="listbox"] li, div[role="option"]').first();
  if (await firstOption.isVisible().catch(() => false)) {
    await firstOption.click();
  }

  await page.waitForTimeout(1500);

  console.log('> Clicking "Create Page"...');
  const createBtn = page.locator('div[role="button"]:has-text("Create Page"), button:has-text("Create Page")').first();
  await createBtn.click();

  console.log('> Waiting for page to be created...');
  await page.waitForTimeout(6000);

  // Skip through any "complete your page" dialogs
  for (let i = 0; i < 5; i++) {
    const skipBtn = page.locator('div[role="button"]:has-text("Skip"), button:has-text("Skip"), div[role="button"]:has-text("Not now"), button:has-text("Not now")').first();
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }

  console.log('\n✓ Page should now be created!');
  console.log(`> Current URL: ${page.url()}`);
  console.log('> Keeping browser open for 20 seconds so you can verify...');
  await page.waitForTimeout(20000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
