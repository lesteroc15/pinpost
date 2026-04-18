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

  // Go directly to the address step — business name "PinPost Test HVAC" was already entered
  // The form remembers state, so reload the create page
  console.log('> Opening GBP creation (should resume where we left off)...');
  await page.goto('https://business.google.com/create', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }

  // Check if we need to start over or if we're on the address page
  const bodyText = await page.locator('body').innerText();

  if (bodyText.includes('business address') || bodyText.includes('City is required')) {
    console.log('> On address page, filling fields...');
  } else if (bodyText.includes('Add your business')) {
    console.log('> Starting fresh...');
    await page.locator('text=Add your business to Google').click();
    await page.waitForTimeout(4000);

    // Fill name + category
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

    // Location question — click Yes
    const yes = page.locator('label:has-text("Yes")').first();
    if (await yes.isVisible({ timeout: 3000 }).catch(() => false)) await yes.click();
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(3000);
  }

  // Now we should be on the address page. Fill ALL fields using Tab navigation
  console.log('> Filling address fields via Tab navigation...');

  // Find all visible text inputs on the page
  const allInputs = await page.locator('input[type="text"], input:not([type])').all();
  const visibleInputs = [];
  for (const inp of allInputs) {
    if (await inp.isVisible().catch(() => false)) visibleInputs.push(inp);
  }
  console.log('> Visible inputs:', visibleInputs.length);

  // Also check for select elements (State dropdown)
  const selects = await page.locator('select').all();
  const visibleSelects = [];
  for (const sel of selects) {
    if (await sel.isVisible().catch(() => false)) visibleSelects.push(sel);
  }
  console.log('> Visible selects:', visibleSelects.length);

  // Fill by ID since we know them from earlier probing
  // Street = already filled from previous attempt
  // Try filling by label text proximity

  // Street address
  const street = page.locator('input').filter({ has: page.locator('xpath=ancestor::div[contains(@class,"mdc-text-field")]//label[contains(text(),"Street")]') }).first();
  // Simpler: just use all visible inputs in order
  // From the screenshot: input 0 = street, input 1 = city, input 2 = zip
  // And there's a select for state

  if (visibleInputs.length >= 3) {
    // Street might already have value
    const streetVal = await visibleInputs[0].inputValue();
    if (!streetVal) {
      await visibleInputs[0].fill('742 Evergreen Terrace');
      console.log('> Filled street');
    } else {
      console.log('> Street already filled:', streetVal);
    }

    // City
    await visibleInputs[1].fill('Springfield');
    console.log('> Filled city');

    // ZIP (last visible input, or index 2)
    const lastInput = visibleInputs[visibleInputs.length - 1];
    await lastInput.fill('62704');
    console.log('> Filled ZIP');
  }

  // State dropdown
  if (visibleSelects.length > 0) {
    // Country might be the first select, State the second
    for (const sel of visibleSelects) {
      const options = await sel.locator('option').allInnerTexts();
      if (options.some(o => o.includes('Illinois') || o.includes('Alabama'))) {
        await sel.selectOption({ label: 'Illinois' });
        console.log('> Selected state: Illinois');
        break;
      }
    }
  }

  await page.waitForTimeout(1000);
  let shot = path.join(__dirname, 'gbp_address_filled.png');
  await page.screenshot({ path: shot });
  console.log('> Address filled screenshot:', shot);

  // Click Next
  console.log('> Clicking Next...');
  await page.locator('button:has-text("Next")').click();
  await page.waitForTimeout(4000);

  // Continue through remaining steps
  for (let i = 0; i < 10; i++) {
    shot = path.join(__dirname, `gbp_v2_step${i}.png`);
    await page.screenshot({ path: shot });
    const text = await page.locator('body').innerText();
    console.log(`> Step ${i}:`, text.slice(0, 200));

    // Fill phone
    const phone = page.locator('input[type="tel"]').first();
    if (await phone.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phone.fill('5551234567');
      console.log('> Filled phone');
    }

    // Fill website
    const web = page.locator('input[type="url"], input[placeholder*="ebsite"]').first();
    if (await web.isVisible({ timeout: 1000 }).catch(() => false)) {
      await web.fill('https://pinpost-web-production.up.railway.app');
      console.log('> Filled website');
    }

    // Click Next/Skip/Finish/Continue
    let clicked = false;
    for (const t of ['Finish', 'Continue', 'Next', 'Skip', 'Done', 'Confirm']) {
      const btn = page.locator(`button:has-text("${t}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        console.log(`> Clicked "${t}"`);
        clicked = true;
        await page.waitForTimeout(3000);
        break;
      }
    }

    if (!clicked) {
      console.log('> No button found. Checking if done...');
      if (page.url().includes('dashboard') || page.url().includes('manage') || text.includes('Manage now')) {
        console.log('> ✓ GBP creation complete!');
        break;
      }
    }
  }

  shot = path.join(__dirname, 'gbp_final.png');
  await page.screenshot({ path: shot });
  console.log('> Final URL:', page.url());
  console.log('> Final screenshot:', shot);
  console.log('> Keeping browser open for 2 min...');
  await page.waitForTimeout(120000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
