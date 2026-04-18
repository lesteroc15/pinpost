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

  // Navigate to API quotas page
  console.log('> Opening API quotas page...');
  await page.goto(`https://console.cloud.google.com/apis/api/mybusinessaccountmanagement.googleapis.com/quotas?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await page.waitForTimeout(3000);

  let shot = path.join(__dirname, 'quota_page.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('> Screenshot:', shot);
  console.log('> URL:', page.url());

  const bodyText = await page.locator('body').innerText();
  console.log('> Page text (first 1000 chars):');
  console.log(bodyText.slice(0, 1000));

  console.log('> Browser open for 2 min...');
  await page.waitForTimeout(120000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
