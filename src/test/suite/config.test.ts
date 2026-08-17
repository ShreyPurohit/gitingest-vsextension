import * as assert from 'assert';
import { COMMANDS, ERROR_MESSAGES, THEME, WEBVIEW_OPTIONS } from '../../config';

describe('config', () => {
    it('COMMANDS has expected command IDs', () => {
        assert.strictEqual(COMMANDS.analyze, 'vscode-gitingest.analyze');
        assert.strictEqual(COMMANDS.analyzeFolder, 'vscode-gitingest.analyzeFolder');
        assert.strictEqual(COMMANDS.addToIngest, 'vscode-gitingest.addToIngest');
        assert.strictEqual(COMMANDS.reIngest, 'vscode-gitingest.reIngest');
    });

    it('ERROR_MESSAGES key entries are non-empty strings', () => {
        assert.ok(ERROR_MESSAGES.NO_WORKSPACE.length > 0);
        assert.ok(ERROR_MESSAGES.PYTHON_NOT_INSTALLED.length > 0);
        assert.ok(ERROR_MESSAGES.UNKNOWN_ERROR.length > 0);
        assert.ok(ERROR_MESSAGES.PROCESS_KILL_FAILED.length > 0);
    });

    it('THEME has expected keys and string values', () => {
        assert.strictEqual(typeof THEME.primary, 'string');
        assert.strictEqual(typeof THEME.primaryHover, 'string');
        assert.strictEqual(typeof THEME.danger, 'string');
        assert.strictEqual(typeof THEME.dangerHover, 'string');
        assert.strictEqual(typeof THEME.background, 'string');
        assert.strictEqual(typeof THEME.border, 'string');
        assert.strictEqual(typeof THEME.text, 'string');
    });

    it('WEBVIEW_OPTIONS.enableScripts is true', () => {
        assert.strictEqual(WEBVIEW_OPTIONS.enableScripts, true);
    });

    it('WEBVIEW_OPTIONS.retainContextWhenHidden is true', () => {
        assert.strictEqual(WEBVIEW_OPTIONS.retainContextWhenHidden, true);
    });
});
