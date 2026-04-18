const { chromium } = require('playwright');
const path = require('path');
const USER_DATA_DIR = path.join(process.env.HOME, '.pinpost-chrome-profile');

const BIZ_NAME = 'PinPost Test HVAC';
const BIZ_CATEGORY = 'HVAC contractor';
const STREET = '742 Evergreen Terrace';
const CITY = 'Springfield';
const STATE = 'Illinois';
const ZIP = '62704';
const PHONE = '555-123-4567';

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = browser.pages()[0] || await browser.newPage();

  // Helper: screenshot + log
  let stepNum = 0;
  async function snap(label) {
    stepNum++;
    const f = path.join(__dirname, `gbp_s${stepNum}.png`);
    await page.screenshot({ path: f });
    console.log(`> [${stepNum}] ${label} | URL: ${page.url()}`);
  }

  // Helper: click Next/Continue/Skip if visible
  async function clickNext() {
    for (const t of ['Next', 'Continue', 'Skip', 'Finish', 'Done']) {
      const b = page.locator(`button:has-text("${t}")`).first();
      if (await b.isVisible({ timeout: 2000 }).catch(() => false)) {
        await b.click();
        console.log(`> Clicked "${t}"`);
        await page.waitForTimeout(3000);
        return true;
      }
    }
    return false;
  }

  console.log('> Starting GBP creation...');
  await page.goto('https://business.google.com/create', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }

  // Click "Add your business to Google"
  await page.locator('text=Add your business to Google').click();
  await page.waitForTimeout(4000);

  // Step 1: Business name + category
  console.log('> Step 1: Name + Category');
  await page.locator('input[placeholder="Business name"]').fill(BIZ_NAME);
  await page.waitForTimeout(500);
  const catInput = page.locator('input[placeholder="Business category"]');
  await catInput.fill(BIZ_CATEGORY);
  await page.waitForTimeout(2000);
  const catOpt = page.locator('[role="option"]').first();
  if (await catOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await catOpt.click();
  } else {
    await catInput.press('ArrowDown');
    await page.waitForTimeout(300);
    await catInput.press('Enter');
  }
  await page.waitForTimeout(1000);
  await clickNext();
  await snap('After name+category');

  // Step 2: Do you want to add a location? → Yes
  console.log('> Step 2: Location question');
  const yesRadio = page.locator('label:has-text("Yes"), [role="radio"]:has-text("Yes")').first();
  if (await yesRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
    await yesRadio.click();
    await page.waitForTimeout(1000);
  }
  await clickNext();
  await snap('After location question');

  // Step 3: Enter address
  console.log('> Step 3: Address');
  const streetInput = page.locator('input[placeholder="Street address"], input:near(:text("Street address"))').first();
  if (await streetInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await streetInput.fill(STREET);
    await page.waitForTimeout(500);

    // Fill city
    const cityInput = page.locator('input[placeholder="City"]').first();
    if (await cityInput.isVisible().catch(() => false)) await cityInput.fill(CITY);

    // Select state from dropdown
    const stateSelect = page.locator('select:near(:text("State")), [role="listbox"]:near(:text("State"))').first();
    if (await stateSelect.isVisible().catch(() => false)) {
      await stateSelect.selectOption({ label: STATE });
    } else {
      // Try clicking the State dropdown and selecting
      const stateBtn = page.locator('[placeholder="State"], :text("State")').last();
      if (await stateBtn.isVisible().catch(() => false)) {
        await stateBtn.click();
        await page.waitForTimeout(500);
        const ilOption = page.locator(`[role="option"]:has-text("${STATE}"), li:has-text("${STATE}")`).first();
        if (await ilOption.isVisible({ timeout: 3000 }).catch(() => false)) await ilOption.click();
      }
    }

    // Fill ZIP
    const zipInput = page.locator('input[placeholder="ZIP code"]').first();
    if (await zipInput.isVisible().catch(() => false)) await zipInput.fill(ZIP);
  }
  await page.waitForTimeout(1000);
  await clickNext();
  await snap('After address');

  // Steps 4+: service area, contact info, verification, etc.
  // Loop through remaining steps
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();

    // Fill phone if present
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="Phone"]').first();
    if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phoneInput.fill(PHONE);
      console.log('> Filled phone');
    }

    // Fill website if present
    const webInput = page.locator('input[placeholder*="website"], input[placeholder*="Website"], input[placeholder*="URL"]').first();
    if (await webInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await webInput.fill('https://pinpost-web-production.up.railway.app');
      console.log('> Filled website');
    }

    if (!await clickNext()) {
      await snap('No next button found');
      // Check if done
      if (page.url().includes('dashboard') || page.url().includes('manage') || text.includes('Manage now')) {
        console.log('> GBP creation complete!');
        break;
      }
    } else {
      await snap(`Step ${4 + i}`);
    }
  }

  await snap('Final state');
  console.log('> Keeping browser open for 2 minutes...');
  await page.waitForTimeout(120000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
