/**
 * Filters vscode-test / c8 coverage down to production sources under src/.
 *
 * The extension host loads dist/extension.js; after sourcemap remap that bundle
 * still pollutes the report, and relative exclude globs are unreliable on Windows.
 * Tests remapped under src/test/ are also dropped so the summary reflects app code.
 */
const { readFileSync, rmSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');
const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const root = join(__dirname, '..');
const coverageDir = join(root, 'coverage');
const finalPath = join(coverageDir, 'coverage-final.json');

if (!existsSync(finalPath)) {
    console.error(`Missing ${finalPath}. Run vscode-test --coverage first.`);
    process.exit(1);
}

const raw = JSON.parse(readFileSync(finalPath, 'utf8'));

function isProductionSrc(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const marker = '/src/';
    const idx = normalized.lastIndexOf(marker);
    if (idx === -1) {
        return false;
    }
    const underSrc = normalized.slice(idx + marker.length);
    return underSrc.length > 0 && !underSrc.startsWith('test/');
}

const filtered = Object.fromEntries(
    Object.entries(raw).filter(([filePath]) => isProductionSrc(filePath)),
);

if (Object.keys(filtered).length === 0) {
    console.error('No production src files found in coverage-final.json after filtering.');
    process.exit(1);
}

rmSync(coverageDir, { recursive: true, force: true });
mkdirSync(coverageDir, { recursive: true });

const map = libCoverage.createCoverageMap(filtered);
const context = libReport.createContext({
    dir: coverageDir,
    coverageMap: map,
});

for (const reporter of ['text-summary', 'html', 'json']) {
    reports.create(reporter, { skipEmpty: false, projectRoot: root }).execute(context);
}
