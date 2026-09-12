import * as assert from 'assert';
import { DEFAULT_MAX_FILE_SIZE, MAX_ALLOWED_FILE_SIZE, MIN_ALLOWED_FILE_SIZE } from '../../config';
import {
    normalizeIngestOptions,
    normalizeMaxFileSize,
    normalizePatterns,
    serializeIngestOptions,
} from '../../utils/ingestOptions';

describe('ingestOptions', () => {
    describe('normalizePatterns', () => {
        it('trims, drops empties and de-duplicates', () => {
            assert.deepStrictEqual(
                normalizePatterns([' src/** ', 'src/**', '', '   ', '**/*.ts']),
                ['src/**', '**/*.ts'],
            );
        });

        it('ignores non-string entries and non-array input', () => {
            assert.deepStrictEqual(normalizePatterns([1, null, 'src/**']), ['src/**']);
            assert.deepStrictEqual(normalizePatterns(undefined), []);
            assert.deepStrictEqual(normalizePatterns('src/**'), []);
        });
    });

    describe('normalizeMaxFileSize', () => {
        it('falls back to the default for invalid values', () => {
            assert.strictEqual(normalizeMaxFileSize(undefined), DEFAULT_MAX_FILE_SIZE);
            assert.strictEqual(normalizeMaxFileSize('50000'), DEFAULT_MAX_FILE_SIZE);
            assert.strictEqual(normalizeMaxFileSize(0), DEFAULT_MAX_FILE_SIZE);
            assert.strictEqual(normalizeMaxFileSize(-1), DEFAULT_MAX_FILE_SIZE);
            assert.strictEqual(normalizeMaxFileSize(Number.NaN), DEFAULT_MAX_FILE_SIZE);
        });

        it('clamps into the allowed range and rounds down', () => {
            assert.strictEqual(normalizeMaxFileSize(10), MIN_ALLOWED_FILE_SIZE);
            assert.strictEqual(normalizeMaxFileSize(1e12), MAX_ALLOWED_FILE_SIZE);
            assert.strictEqual(normalizeMaxFileSize(2048.9), 2048);
        });
    });

    describe('serializeIngestOptions', () => {
        it('omits empty pattern lists and the default size limit', () => {
            const payload = JSON.parse(
                serializeIngestOptions(
                    normalizeIngestOptions({ excludePatterns: ['**/node_modules'] }),
                ) ?? '{}',
            );
            assert.deepStrictEqual(payload, { exclude_patterns: ['**/node_modules'] });
        });

        it('serializes nothing when everything is left at its default', () => {
            assert.strictEqual(
                serializeIngestOptions(normalizeIngestOptions(undefined)),
                undefined,
            );
        });

        it('passes both pattern lists through when present', () => {
            const payload = JSON.parse(
                serializeIngestOptions(
                    normalizeIngestOptions({
                        includePatterns: ['src/**'],
                        excludePatterns: ['**/*.min.js'],
                        maxFileSize: 50000,
                    }),
                ) ?? '{}',
            );
            assert.deepStrictEqual(payload, {
                max_file_size: 50000,
                include_patterns: ['src/**'],
                exclude_patterns: ['**/*.min.js'],
            });
        });
    });
});
