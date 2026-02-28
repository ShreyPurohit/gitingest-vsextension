import * as assert from 'assert';
import * as path from 'path';
import { OsUtils } from '../../utils/osUtils';

describe('OsUtils', () => {
    it('isWindows returns true only on win32', () => {
        const expected = process.platform === 'win32';
        assert.strictEqual(OsUtils.isWindows(), expected);
    });

    it('isMac returns true only on darwin', () => {
        const expected = process.platform === 'darwin';
        assert.strictEqual(OsUtils.isMac(), expected);
    });

    it('isLinux returns true only on linux', () => {
        const expected = process.platform === 'linux';
        assert.strictEqual(OsUtils.isLinux(), expected);
    });

    it('exactly one of isWindows, isMac, isLinux is true', () => {
        const count = [OsUtils.isWindows(), OsUtils.isMac(), OsUtils.isLinux()].filter(
            Boolean,
        ).length;
        assert.strictEqual(count, 1);
    });

    it('getPythonCommands returns expected structure on Windows', () => {
        const commands = OsUtils.getPythonCommands();
        assert.ok(Array.isArray(commands));
        assert.ok(commands.length >= 2);
        if (OsUtils.isWindows()) {
            assert.strictEqual(commands[0].cmd, 'py');
            assert.deepStrictEqual(commands[0].args, ['-3']);
            assert.strictEqual(commands[1].cmd, 'python');
            assert.strictEqual(commands[2].cmd, 'python3');
        } else {
            assert.strictEqual(commands[0].cmd, 'python3');
            assert.strictEqual(commands[1].cmd, 'python');
        }
        commands.forEach((c) => {
            assert.ok(typeof c.cmd === 'string' && c.cmd.length > 0);
            assert.ok(Array.isArray(c.args));
        });
    });

    it('getVenvPythonPath contains venv path and correct executable name', () => {
        const venvPath = path.join('my', 'venv');
        const result = OsUtils.getVenvPythonPath(venvPath);
        assert.ok(result.includes(venvPath));
        if (OsUtils.isWindows()) {
            assert.ok(result.includes('Scripts'));
            assert.ok(result.endsWith('python.exe'));
        } else {
            assert.ok(result.includes('bin'));
            assert.ok(result.endsWith('python'));
        }
    });

    it('normalizePath converts backslashes to forward slashes', () => {
        const input = 'a\\b\\c';
        const result = OsUtils.normalizePath(input);
        assert.strictEqual(result, 'a/b/c');
    });

    it('normalizePath normalizes path', () => {
        const result = OsUtils.normalizePath('a/b/../c');
        assert.strictEqual(result, 'a/c');
    });

    it('getPathSeparator returns backslash on Windows, slash elsewhere', () => {
        const sep = OsUtils.getPathSeparator();
        if (OsUtils.isWindows()) {
            assert.strictEqual(sep, '\\');
        } else {
            assert.strictEqual(sep, '/');
        }
    });
});
