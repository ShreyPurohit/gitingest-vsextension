import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    tests: [
        {
            files: 'out/test/**/*.test.js',
            mocha: {
                ui: 'bdd',
                timeout: 10000,
            },
            // Reduce D-Bus/GPU noise and improve stability in headless CI (e.g. GitHub Actions)
            launchArgs: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
            srcDir: 'src',
        },
    ],
    coverage: {
        // JSON only here: the CLI cannot exclude the esbuild bundle after remap.
        // scripts/report-src-coverage.mjs filters to production src and prints the summary.
        reporter: ['json'],
        output: './coverage',
    },
});
