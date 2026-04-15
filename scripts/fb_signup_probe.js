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
  await page.goto('https://www.facebook.com/reg/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  const shot = path.join(__dirname, 'fb_signup.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('URL:', page.url());

  // Dump all input fields
  const inputs = await page.locator('input').all();
  console.log('Input fields found:', inputs.length);
  for (const inp of inputs) {
    const name = await inp.getAttribute('name');
    const type = await inp.getAttribute('type');
    const placeholder = await inp.getAttribute('placeholder');
    const aria = await inp.getAttribute('aria-label');
    console.log(`  name="${name}" type="${type}" placeholder="${placeholder}" aria="${aria}"`);
  }
  console.log('Screenshot:', shot);
  await browser.close();
})();
