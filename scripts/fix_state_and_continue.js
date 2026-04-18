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

  console.log('> Opening GBP creation...');
  await page.goto('https://business.google.com/create', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }

  // Check current state
  const text = await page.locator('body').innerText();

  if (text.includes('Add your business')) {
    // Need to start fresh - name + category + location question
    console.log('> Starting fresh...');
    await page.locator('text=Add your business to Google').click();
    await page.waitForTimeout(4000);
    await page.locator('input[placeholder="Business name"]').fill('PinPost Test HVAC');
    await page.waitForTimeout(500);
    const catInput = page.locator('input[placeholder="Business category"]');
    await catInput.fill('HVAC contractor');
    await page.waitForTimeout(2000);
    const catOpt = page.locator('[role="option"]').first();
    if (await catOpt.isVisible({ timeout: 3000 }).catch(() => false)) await catOpt.click();
    else { await catInput.press('ArrowDown'); await catInput.press('Enter'); }
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(3000);
    // Yes to location
    const yes = page.locator('label:has-text("Yes")').first();
    if (await yes.isVisible({ timeout: 3000 }).catch(() => false)) await yes.click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(3000);
  }

  // Should be on address page now
  console.log('> Filling address...');

  // Fill street, city, zip
  const inputs = await page.locator('input[type="text"], input:not([type])').all();
  const visible = [];
  for (const inp of inputs) { if (await inp.isVisible().catch(() => false)) visible.push(inp); }

  if (visible.length >= 3) {
    const streetVal = await visible[0].inputValue();
    if (!streetVal) await visible[0].fill('742 Evergreen Terrace');

    const cityVal = await visible[1].inputValue();
    if (!cityVal) await visible[1].fill('Springfield');

    const zipVal = await visible[visible.length - 1].inputValue();
    if (!zipVal) await visible[visible.length - 1].fill('62704');
  }

  // State dropdown - click the element that says "State"
  console.log('> Clicking State dropdown...');
  // The State dropdown has a down arrow. It's a custom <mat-select> or similar.
  // Find it by text "State" and click
  const stateDropdown = page.locator('div:has-text("State"):not(:has-text("Street")):not(:has-text("United States"))').last();
  await stateDropdown.click();
  await page.waitForTimeout(1500);

  // Screenshot to see dropdown options
  let shot = path.join(__dirname, 'state_dropdown.png');
  await page.screenshot({ path: shot });
  console.log('> State dropdown screenshot:', shot);

  // Try selecting Illinois
  const illinois = page.locator('[role="option"]:has-text("Illinois"), li:has-text("Illinois"), div:has-text("Illinois")').first();
  if (await illinois.isVisible({ timeout: 3000 }).catch(() => false)) {
    await illinois.click();
    console.log('> Selected Illinois');
  } else {
    // Try typing to filter
    await page.keyboard.type('Illinois');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    console.log('> Typed Illinois + Enter');
  }

  await page.waitForTimeout(1000);
  shot = path.join(__dirname, 'address_complete.png');
  await page.screenshot({ path: shot });
  console.log('> Address complete screenshot:', shot);

  // Click Next
  console.log('> Clicking Next...');
  await page.locator('button:has-text("Next")').click();
  await page.waitForTimeout(4000);

  // Continue through remaining steps
  for (let i = 0; i < 12; i++) {
    const stepText = await page.locator('body').innerText();

    // Fill phone if present
    const phone = page.locator('input[type="tel"]').first();
    if (await phone.isVisible({ timeout: 1000 }).catch(() => false)) {
      const pv = await phone.inputValue();
      if (!pv) { await phone.fill('5551234567'); console.log('> Filled phone'); }
    }

    // Check if we reached the end
    const url = page.url();
    if (url.includes('dashboard') || url.includes('manage') || url.includes('verified') || stepText.includes('Manage now') || stepText.includes('manage your')) {
      console.log('> ✓ GBP creation appears complete!');
      break;
    }

    // Click through
    let clicked = false;
    for (const t of ['Finish', 'Continue', 'Next', 'Skip', 'Done', 'Confirm', 'Later']) {
      const btn = page.locator(`button:has-text("${t}")`).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
        console.log(`> Clicked "${t}"`);
        clicked = true;
        await page.waitForTimeout(3000);
        break;
      }
    }
    if (!clicked) {
      console.log('> No button found at step', i);
      shot = path.join(__dirname, `stuck_step${i}.png`);
      await page.screenshot({ path: shot });
      console.log('> Screenshot:', shot);
      break;
    }
  }

  shot = path.join(__dirname, 'gbp_final.png');
  await page.screenshot({ path: shot });
  console.log('> Final URL:', page.url());
  console.log('> Keeping browser open for 2 min...');
  await page.waitForTimeout(120000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
