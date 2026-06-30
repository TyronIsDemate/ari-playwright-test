import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'https://ari.beta.citizenhealth.com';
const paths = process.argv.slice(2);
const targets = paths.length ? paths : ['/'];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const path of targets) {
  const url = new URL(path, BASE).toString();
  console.log(`\n================ NAVIGATE ${url} ================`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('goto error:', e.message);
  }
  // Give the SPA time to render / redirect.
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('FINAL URL :', page.url());
  console.log('TITLE     :', await page.title());

  const info = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const inputs = [...document.querySelectorAll('input, textarea, select')].map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.id || null,
      placeholder: el.getAttribute('placeholder'),
      ariaLabel: el.getAttribute('aria-label'),
      autocomplete: el.getAttribute('autocomplete'),
      visible: vis(el),
    }));
    const buttons = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')].map((el) => ({
      text: (el.innerText || el.value || '').trim().slice(0, 40),
      type: el.getAttribute('type'),
      visible: vis(el),
    }));
    const links = [...document.querySelectorAll('a')]
      .map((el) => ({ text: (el.innerText || '').trim().slice(0, 40), href: el.getAttribute('href') }))
      .filter((l) => l.text || l.href);
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400);
    return { inputs, buttons, links, bodyText };
  });

  console.log('INPUTS    :', JSON.stringify(info.inputs, null, 2));
  console.log('BUTTONS   :', JSON.stringify(info.buttons, null, 2));
  console.log('LINKS     :', JSON.stringify(info.links.slice(0, 30), null, 2));
  console.log('BODY TEXT :', info.bodyText);
}

await browser.close();
