import { test, expect } from '@playwright/test';

// Note: the real upload -> Gemini extraction flow now lives behind the
// authenticated /app route (added in PR #42/#43). Without seeded test
// credentials in CI, that path always redirects to /login before reaching
// UploadScreen, so it isn't covered here. This suite exercises the public,
// auth-free demo flow instead — still the same core journey (analyze ->
// dashboard -> plan) that Issue #25 cares about, just entered via the demo
// shortcut rather than a real file upload.

test.describe('Rasheed Core Flow (Issue #25) — public demo path', () => {
  test('Landing -> demo analysis -> dashboard -> plan', async ({ page }) => {
    await page.goto('/');

    // 1. Landing page: trigger the demo flow (no auth required).
    await page.getByRole('button', { name: 'جرّب نموذجًا تجريبيًا', exact: true }).click();

    // 2. Analyzing screen — demo mode skips the real Gemini call but still
    // runs the step animation before completing.
    await expect(page.getByText('جاري تحليل فاتورتك...')).toBeVisible();

    // 3. Dashboard overview.
    await expect(page.getByText('فاتورتك الحالية')).toBeVisible({ timeout: 15000 });

    // 4. Navigate to "خطة رشيد" (Plan) via the sidebar and verify it renders.
    await page.getByRole('button', { name: 'خطة رشيد', exact: true }).first().click();
    await expect(page.getByText('إجمالي التوفير المحتمل')).toBeVisible();
  });

  test('Restart returns to the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'جرّب نموذجًا تجريبيًا', exact: true }).click();
    await expect(page.getByText('فاتورتك الحالية')).toBeVisible({ timeout: 15000 });

    await page.getByLabel('البدء من جديد').click();
    await expect(page.getByRole('button', { name: 'حلّل فاتورتك', exact: true })).toBeVisible();
  });
});
