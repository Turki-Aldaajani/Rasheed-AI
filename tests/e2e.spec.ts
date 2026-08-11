import { test, expect } from '@playwright/test';

test.describe('Rasheed Core Flow (Issue #25)', () => {
  test('Happy path: Upload bill, analyze, and see results', async ({ page }) => {
    // 1. Landing Page
    await page.goto('/');

    // 2. Upload Screen
    await page.getByRole('button', { name: 'حلّل فاتورتك', exact: true }).click();
    await expect(page.getByText('ارفع فاتورة الكهرباء أو المياه')).toBeVisible();

    // Create a dummy png file buffer for the test
    const dummyFile = {
      name: 'dummy_bill.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY3jP4PgfAAWpA6FIf30wAAAAAElFTkSuQmCC', 'base64')
    };
    await page.locator('input[type="file"]').setInputFiles(dummyFile);

    // Wait for file selected state
    await expect(page.getByText('dummy_bill.png')).toBeVisible();
    await expect(page.getByText('جاهز للتحليل')).toBeVisible();

    // Click analyze
    await page.getByRole('button', { name: 'حلّل الفاتورة', exact: true }).click();

    // 3. Analyzing Screen
    await expect(page.getByText('جاري تحليل فاتورتك...')).toBeVisible();

    // 4. Dashboard (Wait for analysis to finish - max 10s based on mock)
    await expect(page.getByText('فاتورتك الحالية')).toBeVisible({ timeout: 15000 });
    
    // Verify some dashboard elements
    await expect(page.getByText('مع خطة رشيد')).toBeVisible();

    // Navigate to "خطة رشيد" section
    await page.getByRole('button', { name: 'خطة رشيد', exact: true }).first().click();
    await expect(page.getByText('إجمالي التوفير المحتمل')).toBeVisible();
  });

  test('Invalid/failure path: Upload unsupported file type', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: 'حلّل فاتورتك', exact: true }).click();

    const dummyFile = {
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not an image or pdf')
    };
    await page.locator('input[type="file"]').setInputFiles(dummyFile);

    // Verify error message
    await expect(page.getByText('الرجاء اختيار ملف بصيغة PDF أو JPG أو PNG.')).toBeVisible();

    // Verify the analyze button is disabled
    const analyzeBtn = page.getByRole('button', { name: 'حلّل الفاتورة', exact: true });
    await expect(analyzeBtn).toBeDisabled();
  });
});
