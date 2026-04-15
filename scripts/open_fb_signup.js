// Open Facebook signup in the Playwright profile. User fills it out.
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
  await page.goto('https://www.facebook.com/reg/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('> Facebook signup page is open.');
  console.log('> Please fill out the form with:');
  console.log('    First name: Lester');
  console.log('    Last name:  Ochoa');
  console.log('    Birthday:   Jun 15, 1992');
  console.log('    Gender:     Male');
  console.log('    Email:      lesteroc15@gmail.com');
  console.log('    Password:   6nDPLvUdjv2aVfN2!@9');
  console.log('> Complete signup + any phone/email verification.');
  console.log('> Browser will stay open for 30 minutes.');
  await page.waitForTimeout(1800000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
