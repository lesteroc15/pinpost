const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');
const TEST_EMAIL = 'lesteroc15@gmail.com';
const PROJECT = 'mapcheckins';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();

  console.log('> Opening OAuth consent screen...');
  await page.goto(`https://console.cloud.google.com/auth/audience?project=${PROJECT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Dismiss any popups
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2000);

  console.log('> Clicking Add users...');
  await page.locator('button:has-text("Add users")').click();
  await page.waitForTimeout(3000);

  // The dialog is a side panel on the right side of the page
  // From the screenshots, the input field is approximately at (1150, 195) in the 1400x900 viewport
  // and the Save button is at approximately (1150, 245)
  console.log('> Clicking on the input field...');
  await page.mouse.click(1150, 195);
  await page.waitForTimeout(500);

  console.log('> Typing email...');
  await page.keyboard.type(TEST_EMAIL, { delay: 20 });
  await page.waitForTimeout(500);

  // Press Enter or Tab to confirm the email chip
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  const shot1 = path.join(__dirname, 'after_type.png');
  await page.screenshot({ path: shot1 });
  console.log('> After typing:', shot1);

  // Click Save button
  console.log('> Clicking Save...');
  await page.mouse.click(1150, 245);
  await page.waitForTimeout(3000);

  // If that didn't work, try finding Save button by text
  const saveBtn = page.locator('button:has-text("Save")');
  const count = await saveBtn.count();
  console.log('> Save buttons found:', count);
  if (count > 0) {
    // Click the last one (dialog's Save, not page's)
    await saveBtn.last().click({ force: true });
    await page.waitForTimeout(3000);
  }

  const shot2 = path.join(__dirname, 'after_save.png');
  await page.screenshot({ path: shot2 });
  console.log('> After save:', shot2);

  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes(TEST_EMAIL)) {
    console.log('> ✓ Test user added successfully!');
  } else {
    console.log('> Email not visible yet. Checking...');
    // Maybe we need to scroll or the page refreshed
    await page.reload();
    await page.waitForTimeout(4000);
    const text2 = await page.locator('body').innerText();
    console.log('> After reload, contains email:', text2.includes(TEST_EMAIL));
  }

  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
