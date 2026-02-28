import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out/test/**/*.test.js',
    mocha: {
        ui: 'bdd',
        timeout: 10000,
    },
    // Reduce D-Bus/GPU noise and improve stability in headless CI (e.g. GitHub Actions)
    launchArgs: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
});
