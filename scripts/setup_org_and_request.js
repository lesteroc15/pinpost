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

  // Step 1: Check if we already have an organization
  console.log('> Checking for existing Google Cloud organization...');
  await page.goto('https://console.cloud.google.com/cloud-resource-manager', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await page.waitForTimeout(2000);

  let shot = path.join(__dirname, 'org_check.png');
  await page.screenshot({ path: shot });
  console.log('> Screenshot:', shot);

  const bodyText = await page.locator('body').innerText();
  console.log('> Page text (first 800 chars):');
  console.log(bodyText.slice(0, 800));

  // Step 2: Navigate to GBP API access request
  console.log('\n> Opening GBP API prerequisites page...');
  await page.goto('https://developers.google.com/my-business/content/prereqs#request-access', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  // Scroll to "Request access to the APIs" section
  await page.evaluate(() => {
    const el = document.getElementById('request-access');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
  await page.waitForTimeout(2000);

  shot = path.join(__dirname, 'request_section.png');
  await page.screenshot({ path: shot });
  console.log('> Request section screenshot:', shot);

  // Get the text of the request section
  const requestText = await page.evaluate(() => {
    const el = document.getElementById('request-access');
    if (el) return el.parentElement.innerText;
    return '';
  });
  console.log('> Request access section text:');
  console.log(requestText);

  // Look for the actual form link
  const formLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.href || '';
      const text = a.innerText || '';
      if (href.includes('form') || href.includes('survey') || text.toLowerCase().includes('sign up') || text.toLowerCase().includes('apply') || text.toLowerCase().includes('request')) {
        links.push({ text: text.trim(), href });
      }
    });
    return links;
  });
  console.log('\n> Form/request links found:');
  formLinks.forEach(l => console.log(`  "${l.text}" -> ${l.href}`));

  // If we find a form link, navigate to it
  const formLink = formLinks.find(l => l.href.includes('form') || l.href.includes('survey') || l.href.includes('sign-up'));
  if (formLink) {
    console.log('\n> Opening form:', formLink.href);
    await page.goto(formLink.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    shot = path.join(__dirname, 'access_form.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log('> Form screenshot:', shot);
    console.log('> Form URL:', page.url());
  }

  console.log('\n> Browser open for 3 min for review...');
  await page.waitForTimeout(180000);
  await browser.close();
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
