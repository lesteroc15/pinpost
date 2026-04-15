// Create a Facebook account using the lesteroc15 gmail
const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');

const FIRST = 'Lester';
const LAST = 'Ochoa';
const EMAIL = 'lesteroc15@gmail.com';
const PASSWORD = '6nDPLvUdjv2aVfN2!@9';
// birthday: 1992-06-15
const BIRTH_YEAR = '1992';
const BIRTH_MONTH = '6';  // June
const BIRTH_DAY = '15';
const GENDER = 'Male';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browser.pages()[0] || await browser.newPage();

  console.log('> Opening Facebook signup...');
  await page.goto('https://www.facebook.com/reg/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Click "Create new account" if on landing page
  const createBtn = page.locator('a:has-text("Create new account"), text="Create new account"').first();
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click();
    await page.waitForTimeout(2000);
  }

  console.log('> Filling in first name...');
  await page.locator('input[name="firstname"]').fill(FIRST);
  console.log('> Filling in last name...');
  await page.locator('input[name="lastname"]').fill(LAST);

  console.log('> Filling in email...');
  const emailInput = page.locator('input[name="reg_email__"]').first();
  await emailInput.fill(EMAIL);

  // There's often a confirm-email field that appears
  await page.waitForTimeout(1500);
  const emailConfirm = page.locator('input[name="reg_email_confirmation__"]').first();
  if (await emailConfirm.isVisible().catch(() => false)) {
    await emailConfirm.fill(EMAIL);
  }

  console.log('> Filling in password...');
  await page.locator('input[name="reg_passwd__"]').fill(PASSWORD);

  console.log('> Setting birthday...');
  await page.locator('select[name="birthday_month"]').selectOption(BIRTH_MONTH);
  await page.locator('select[name="birthday_day"]').selectOption(BIRTH_DAY);
  await page.locator('select[name="birthday_year"]').selectOption(BIRTH_YEAR);

  console.log('> Setting gender...');
  await page.locator(`input[type="radio"][value="2"]`).click(); // 2 = Male, 1 = Female

  await page.waitForTimeout(1000);
  console.log('> Clicking Sign Up...');
  const signUpBtn = page.locator('button[name="websubmit"], button:has-text("Sign Up"), button:has-text("Sign up")').first();
  await signUpBtn.click();

  await page.waitForTimeout(8000);

  const shot = path.join(__dirname, 'fb_after_signup.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('> URL after signup:', page.url());
  console.log('> Screenshot:', shot);

  console.log('\n> Keeping browser open for 5 min — a verification code email will arrive in Gmail.');
  console.log('> Next: check Gmail in another tab for the verification code.');
  await page.waitForTimeout(300000);
  await browser.close();
})().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
