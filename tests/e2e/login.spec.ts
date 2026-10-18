import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/me', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' },
      }),
    }),
  );
});

test('shows the participant login on desktop and mobile', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome, player.' })).toBeVisible();
  await expect(page.getByLabel('Event code')).toHaveCount(0);
  await expect(page.getByLabel('Member ID')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});
