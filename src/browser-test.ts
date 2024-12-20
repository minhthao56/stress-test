// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    browser: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      maxDuration: '10m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Increase timeout for slower operations
    page.setDefaultTimeout(30000);

    // Navigate to the URL with explicit wait
    await page.goto('https://backoffice-mfe.staging.manabie.io/login-tenant', {
      waitUntil: 'networkidle',
    });

    // Wait for locale switcher to be visible before clicking
    await page.waitForSelector('button[data-testid="LocaleSwitcher"]', { state: 'visible' });
    await page.locator('button[data-testid="LocaleSwitcher"]').click();
    
    // Wait for English locale button
    await page.waitForSelector('button[data-testid="LocaleButton-en"]', { state: 'visible' });
    await page.locator('button[data-testid="LocaleButton-en"]').click();

    // Fill tenant name with explicit wait
    await page.waitForSelector('input[name="tenantName"]', { state: 'visible' });
    await page.type('input[name="tenantName"]', 'manabie');
    await page.press('input[name="tenantName"]', 'Enter');

    // Wait for username input
    await page.waitForSelector('input[name="username"]', { state: 'visible' });
    await page.type('input[name="username"]', 'phuc.chau+manabieschooladmin@manabie.com');

    // Wait for password input
    await page.waitForSelector('input[name="password"]', { state: 'visible' });
    await page.type('input[name="password"]', 'Manabie@2021');

    // Click submit with wait
    await page.waitForSelector('button[type="submit"]', { state: 'visible' });
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);
    // Take screenshot
    //<h6 class="ManaUser-MuiTypography-root ManaUser-MuiTypography-h6 css-ocsmll" data-testid="TypographyPageTitle__root">Student Management</h6>
    await page.locator('h6[data-testid="TypographyPageTitle__root"]').isVisible();
    await page.screenshot({ path: `screenshots/screenshot-${new Date().getTime()}.png` });

  } catch (error) {
    console.error('Detailed error occurred:', error);
    
    // Take error screenshot
    await page.screenshot({ path: 'screenshots/error-screenshot.png' });

    // Throw the error to mark the test as failed
    throw error;

  } finally {
    try {
      await page.close({ runBeforeUnload: true });
      await context.close();
    } catch (closeError) {
      console.error('Error during page/context close:', closeError);
    }
  }
}