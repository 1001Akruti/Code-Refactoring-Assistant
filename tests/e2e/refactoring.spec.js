const { test, expect } = require('@playwright/test');

test('code refactoring workflow', async ({ page }) => {
  // Mock the backend response so the test does not call NVIDIA
  await page.route('**/refactor', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cleaner_code: 'Use clearer structure and remove unnecessary code.',
        design_patterns: 'Consider separating responsibilities.',
        optimization: 'Reduce unnecessary repeated operations.',
        naming_improvements: 'Use descriptive variable names.'
      })
    });
  });

  // Open the application
  await page.goto('/');

  // Check that the application is visible
  await expect(
    page.getByRole('heading', { name: 'Code Refactoring Assistant' })
  ).toBeVisible();

  // Enter sample code
  await page.locator('#codeInput').fill(
    'function test(){var x=1;return x;}'
  );

  // Click Analyze
  await page.getByRole('button', { name: 'Analyze' }).click();

  // Check the results
  await expect(page.locator('#cleanerCode')).toContainText(
    'Use clearer structure'
  );

  await expect(page.locator('#designPatterns')).toContainText(
    'separating responsibilities'
  );

  await expect(page.locator('#optimization')).toContainText(
    'repeated operations'
  );

  await expect(page.locator('#namingImprovements')).toContainText(
    'descriptive variable names'
  );
});
