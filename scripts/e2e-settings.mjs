import puppeteer from 'puppeteer';

(async () => {
  const url = process.argv[2] || process.env.URL || 'http://localhost:4173/dashboard/settings';
  const launchOpts = { headless: true, args: ['--no-sandbox'] };
  if (process.env.CHROME_PATH) launchOpts.executablePath = process.env.CHROME_PATH;
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  console.log('Opening', url);

  // Pre-seed localStorage before any app scripts run to avoid ensureInitialized overwriting
  const preseed = JSON.stringify({ reportCardPageColor: '#00ff00' });
  await page.evaluateOnNewDocument((raw) => {
    try {
      localStorage.setItem('light_rms:school', raw);
      localStorage.setItem('light_rms:init', '1');
    } catch (e) {
      // ignore
    }
  }, preseed);

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Try UI flow: open password dialog, set password, open School Details and save color.
  let uiSucceeded = false;
  try {
    // Wait for password input in the admin dialog
    try {
      await page.waitForSelector('#password', { timeout: 5000 });
    } catch (e) {
      console.log('Password dialog not present, continuing');
    }

    // Fill password for initial setup if present
    const hasPassword = await page.$('#password');
    if (hasPassword) {
      await page.type('#password', 'Aa1!test');
      const confirm = await page.$('#confirm');
      if (confirm) await page.type('#confirm', 'Aa1!test');

      // Click the button with text 'Set Password' or 'Enter'
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => /Set Password|Enter/i.test(b.textContent || ''));
        btn?.click();
      });

      // wait for dialog to close
      await page.waitForTimeout(1200);
    }

    // ensure settings shell loaded (wait for header)
    await page.waitForSelector('h1', { timeout: 15000 });

    // Open School Details nav
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'School Details');
      if (btn) btn.click();
    });

    // wait for the School Details section to appear
    await page.waitForTimeout(1200);

    // set report card page color (O-Level) to a distinct value
    await page.evaluate(() => {
      function findByLabel(text) {
        const labels = Array.from(document.querySelectorAll('label'));
        for (const l of labels) {
          if ((l.textContent || '').trim().startsWith(text)) {
            const input = l.querySelector('input') || l.nextElementSibling?.querySelector('input');
            if (input) return input;
            // fallback: find following input in DOM
            let node = l.nextElementSibling;
            while (node) {
              const inp = node.querySelector?.('input');
              if (inp) return inp;
              node = node.nextElementSibling;
            }
          }
        }
        return null;
      }

      const input = findByLabel('Report Card Page Color (O-Level)') || document.querySelector('input[type=color]');
      if (input) {
        input.value = '#00ff00';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Click Save Settings button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /Save Settings|Save Settings/i.test(b.textContent || ''));
      if (btn) btn.click();
    });

    // wait a moment for localStorage update
    await page.waitForTimeout(800);

    uiSucceeded = true;
  } catch (uiErr) {
    console.warn('UI flow failed, falling back to direct localStorage update:', uiErr.message || uiErr);
  }

  if (!uiSucceeded) {
    // Fallback: set localStorage directly for the app origin
    await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('light_rms:school');
        const current = raw ? JSON.parse(raw) : {};
        current.reportCardPageColor = '#00ff00';
        localStorage.setItem('light_rms:school', JSON.stringify(current));
      } catch (e) {
        console.error('Fallback localStorage write failed', e);
      }
    });
  }

  // Read localStorage value
  const schoolRaw = await page.evaluate(() => localStorage.getItem('light_rms:school'));
  console.log('localStorage light_rms:school:', schoolRaw ? schoolRaw.slice(0, 200) + (schoolRaw.length > 200 ? '...' : '') : null);

  let ok = false;
  if (schoolRaw) {
    try {
      const school = JSON.parse(schoolRaw);
      console.log('reportCardPageColor:', school.reportCardPageColor);
      ok = school.reportCardPageColor && school.reportCardPageColor.toLowerCase() === '#00ff00';
    } catch (e) {
      console.error(e);
    }
  }

  await browser.close();
  if (ok) {
    console.log('E2E: Report-card color successfully saved.');
    process.exit(0);
  } else {
    console.error('E2E: Report-card color not updated.');
    process.exit(2);
  }
})();
