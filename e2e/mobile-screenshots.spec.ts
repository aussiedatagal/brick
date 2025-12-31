import { test, expect } from '@playwright/test';

test.describe('Mobile Screenshots', () => {
  test('take mobile screenshots of main page', async ({ page }) => {
    // Set mobile viewport (iPhone 12/13 size)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for header to be visible
    await expect(page.getByRole('heading', { name: /brick/i })).toBeVisible({ timeout: 15000 });
    
    // Wait a bit for content to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of main page (full page)
    await page.screenshot({ 
      path: 'test-results/mobile-main-page.png',
      fullPage: true 
    });
    
    // Take screenshot of header area
    const header = page.getByRole('heading', { name: /brick/i });
    await header.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'test-results/mobile-header.png',
      fullPage: false 
    });
    
    // Try to take screenshot of puzzle parts if they exist
    const parts = page.locator('img[alt^="Lego part"]');
    const partCount = await parts.count();
    if (partCount > 0) {
      await parts.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'test-results/mobile-puzzle-parts.png',
        fullPage: false 
      });
    }
    
    // Take screenshot of input area
    const input = page.getByPlaceholder('Guess the Lego set name...');
    if (await input.isVisible().catch(() => false)) {
      await input.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'test-results/mobile-input.png',
        fullPage: false 
      });
    }
  });

  test('take mobile screenshot with autocomplete suggestions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    
    await expect(page.getByRole('heading', { name: /brick/i })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const input = page.getByPlaceholder('Guess the Lego set name...');
    await input.fill('Millennium');
    await page.waitForTimeout(800);
    
    // Take screenshot with suggestions dropdown if visible
    const suggestions = page.locator('[id="suggestions-list"]');
    if (await suggestions.isVisible().catch(() => false)) {
      await page.screenshot({ 
        path: 'test-results/mobile-autocomplete.png',
        fullPage: false 
      });
    }
  });
});
