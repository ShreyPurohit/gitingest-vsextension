import * as assert from 'assert';
import { DEFAULT_MAX_FILE_SIZE, MAX_ALLOWED_FILE_SIZE } from '../../config';
import {
    FILE_SIZE_STEPS_KB,
    formatFileSize,
    nearestStepIndex,
    stepBytes,
} from '../../utils/fileSizeSteps';

describe('fileSizeSteps', () => {
    it('covers the range the settings allow', () => {
        assert.strictEqual(stepBytes(0), 1024);
        assert.strictEqual(stepBytes(FILE_SIZE_STEPS_KB.length - 1), MAX_ALLOWED_FILE_SIZE);
    });

    it('clamps positions outside the slider', () => {
        assert.strictEqual(stepBytes(-5), 1024);
        assert.strictEqual(stepBytes(999), MAX_ALLOWED_FILE_SIZE);
    });

    it('snaps a configured size to the closest stop', () => {
        assert.strictEqual(
            stepBytes(nearestStepIndex(DEFAULT_MAX_FILE_SIZE)),
            DEFAULT_MAX_FILE_SIZE,
        );
        assert.strictEqual(stepBytes(nearestStepIndex(50 * 1024)), 50 * 1024);
        assert.strictEqual(stepBytes(nearestStepIndex(60 * 1024)), 50 * 1024);
        assert.strictEqual(stepBytes(nearestStepIndex(0)), 1024);
    });

    it('labels sizes the way the slider reads them', () => {
        assert.strictEqual(formatFileSize(50 * 1024), '50 kB');
        assert.strictEqual(formatFileSize(DEFAULT_MAX_FILE_SIZE), '10 MB');
        assert.strictEqual(formatFileSize(1536 * 1024), '1.5 MB');
    });
});
