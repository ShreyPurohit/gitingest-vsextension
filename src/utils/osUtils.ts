import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class OsUtils {
    static isWindows(): boolean {
        return process.platform === 'win32';
    }

    static isMac(): boolean {
        return process.platform === 'darwin';
    }

    static isLinux(): boolean {
        return process.platform === 'linux';
    }

    static getPythonCommands(): { cmd: string; args: string[] }[] {
        if (this.isWindows()) {
            return [
                { cmd: 'py', args: ['-3'] },
                { cmd: 'python', args: [] },
                { cmd: 'python3', args: [] },
            ];
        }
        return [
            { cmd: 'python3', args: [] },
            { cmd: 'python', args: [] },
        ];
    }

    static getVenvPythonPath(venvPath: string): string {
        const binFolder = this.isWindows() ? 'Scripts' : 'bin';
        const pythonExe = this.isWindows() ? 'python.exe' : 'python';
        return path.join(venvPath, binFolder, pythonExe);
    }

    /**
     * Force-kill a process TREE on Windows via taskkill /T, reaping grandchildren
     * the plain ChildProcess.kill() leaves behind. POSIX callers should prefer
     * child.kill('SIGKILL') directly (no shell spawn needed).
     */
    static async killProcessTree(pid: number): Promise<void> {
        if (this.isWindows()) {
            await execAsync(`taskkill /pid ${pid} /T /F`);
        } else {
            // Defensive: POSIX fallback if ever called without a ChildProcess handle.
            await execAsync(`kill -9 ${pid}`);
        }
    }

    /**
     * Normalize a path to forward slashes for glob/display use (NOT for splitting
     * on path.sep). For filesystem-structure work that splits on the native
     * separator, use `normalizePath` from `ingestPaths.ts` instead.
     */
    static toPosixPath(filePath: string): string {
        return path.normalize(filePath).replace(/\\/g, '/');
    }

    /**
     * True when a POSIX-form path is absolute (`/…` on POSIX, `C:/…` on Windows).
     * Prefer this over comparing to `uri.fsPath` — that equality is slash-fragile
     * across OSes after `toPosixPath`.
     */
    static isAbsolutePosixPath(posixPath: string): boolean {
        return posixPath.startsWith('/') || /^[a-zA-Z]:\//.test(posixPath);
    }

    static getPathSeparator(): string {
        return this.isWindows() ? '\\' : '/';
    }
}
