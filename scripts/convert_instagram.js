// Convert Instagram account to Business type
// Note: Instagram's web interface for switching to professional account is limited.
// This script opens the relevant page; user may need to interact.
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

  console.log('> Navigating to Instagram settings (account type)...');
  await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for user to sign in if needed
  console.log('> Waiting for Instagram to load (sign in if prompted)...');
  await page.waitForURL(/instagram\.com\/(accounts\/edit|accounts\/login)/, { timeout: 300000 });

  // If we hit the login page, wait for user
  if (page.url().includes('/login')) {
    console.log('> Please sign in to Instagram with lesteroc15@gmail.com...');
    await page.waitForURL(/instagram\.com\/accounts\/edit/, { timeout: 300000 });
  }

  console.log('> On account settings page.');
  console.log('> Instagram web does not reliably expose "Switch to Professional" — checking...');

  await page.waitForTimeout(3000);

  // Try finding the switch to professional link
  const switchLink = await page.locator('text=/switch to professional account|switch account type/i').first();
  if (await switchLink.isVisible().catch(() => false)) {
    console.log('> Found "Switch to Professional" link — clicking...');
    await switchLink.click();
    await page.waitForTimeout(2000);

    // Click through the onboarding
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), div[role="button"]:has-text("Next")').first();
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();

    await page.waitForTimeout(2000);

    // Select Business category
    const businessOpt = page.locator('text=/^Business$/i').first();
    if (await businessOpt.isVisible().catch(() => false)) {
      await businessOpt.click();
      console.log('> Selected Business');
    }

    console.log('> Instagram flow started — you may need to click through the final confirmations.');
  } else {
    console.log('> Could not find Switch-to-Professional option via web.');
    console.log('> This setting is often mobile-app-only. Open the Instagram app on your phone:');
    console.log('  Settings → Account type and tools → Switch to Professional account → Business');
  }

  console.log('\n> Browser staying open. Close it when done.');
  // Keep alive
  await new Promise(() => {});
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
