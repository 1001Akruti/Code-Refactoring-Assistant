const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true
  },

  webServer: {
    command: 'python -m http.server 3000 --directory frontend',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI
  }
});
