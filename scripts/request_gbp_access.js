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

  console.log('> Opening GBP API access request page...');
  await page.goto('https://developers.google.com/my-business/content/prereqs', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Look for the request access link/form
  let shot = path.join(__dirname, 'gbp_prereqs.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('> Screenshot:', shot);

  // Find the access request link
  const requestLink = page.locator('a:has-text("request access"), a:has-text("Request Access"), a[href*="forms.google"], a[href*="form"]').first();
  if (await requestLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    const href = await requestLink.getAttribute('href');
    console.log('> Found request link:', href);
    await requestLink.click();
    await page.waitForTimeout(5000);
  } else {
    console.log('> Looking for form link in page...');
    const links = await page.locator('a').all();
    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.innerText().catch(() => '');
      if (href && (href.includes('form') || text.toLowerCase().includes('request') || text.toLowerCase().includes('access'))) {
        console.log(`> Link: "${text}" -> ${href}`);
      }
    }
  }

  shot = path.join(__dirname, 'gbp_request_form.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('> Current URL:', page.url());
  console.log('> Form screenshot:', shot);

  const bodyText = await page.locator('body').innerText();
  console.log('> Body (first 1500 chars):');
  console.log(bodyText.slice(0, 1500));

  console.log('\n> Browser open for 3 min...');
  await page.waitForTimeout(180000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
