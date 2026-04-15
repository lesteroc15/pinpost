const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');

const FIRST = 'Lester';
const LAST = 'Ochoa';
const EMAIL = 'lesteroc15@gmail.com';
const PASSWORD = '6nDPLvUdjv2aVfN2!@9';
const BIRTH_YEAR = '1992';
const BIRTH_MONTH = '6';
const BIRTH_DAY = '15';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();

  console.log('> Opening Facebook signup...');
  await page.goto('https://www.facebook.com/reg/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  const inputs = page.locator('input[type="text"]');
  await inputs.nth(0).waitFor();

  console.log('> Filling first name...');
  await inputs.nth(0).click();
  await inputs.nth(0).fill(FIRST);

  console.log('> Filling last name...');
  await inputs.nth(1).click();
  await inputs.nth(1).fill(LAST);

  console.log('> Setting birthday dropdowns...');
  const combos = page.locator('[role="combobox"], select, div[aria-haspopup="listbox"]');
  const count = await combos.count();
  console.log('  combos found:', count);

  // Use native HTML select if present; else custom dropdowns
  const selects = page.locator('select');
  const selectCount = await selects.count();
  if (selectCount >= 3) {
    await selects.nth(0).selectOption({ value: BIRTH_MONTH }).catch(() => selects.nth(0).selectOption({ label: 'Jun' }));
    await selects.nth(1).selectOption({ value: BIRTH_DAY });
    await selects.nth(2).selectOption({ value: BIRTH_YEAR });
  }

  console.log('> Setting gender...');
  // Look for a custom dropdown that has "Select your gender"
  const genderBtn = page.locator('text=/select your gender/i').first();
  if (await genderBtn.isVisible().catch(() => false)) {
    await genderBtn.click();
    await page.waitForTimeout(800);
    const maleOption = page.locator('[role="option"]:has-text("Male"), li:has-text("Male")').first();
    await maleOption.click();
  }

  console.log('> Filling email...');
  // Third text input should be email/phone
  await inputs.nth(2).click();
  await inputs.nth(2).fill(EMAIL);

  console.log('> Filling password...');
  await page.locator('input[type="password"]').first().fill(PASSWORD);

  await page.waitForTimeout(1200);
  console.log('> Clicking Submit...');
  await page.locator('div[role="button"]:has-text("Submit"), button:has-text("Submit"), [aria-label="Submit"]').first().click();

  await page.waitForTimeout(10000);

  const shot = path.join(__dirname, 'fb_after_signup.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('> URL after signup:', page.url());
  console.log('> Screenshot:', shot);

  console.log('\n> Keeping browser open for 4 min. If phone verification required, we may need to stop.');
  await page.waitForTimeout(240000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
