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

    static getVenvPipPath(venvPath: string): string {
        const binFolder = this.isWindows() ? 'Scripts' : 'bin';
        const pipExe = this.isWindows() ? 'pip.exe' : 'pip';
        return path.join(venvPath, binFolder, pipExe);
    }

    static async killProcess(pid: number): Promise<void> {
        if (this.isWindows()) {
            await execAsync(`taskkill /pid ${pid} /T /F`);
        } else {
            // For both Linux and macOS
            await execAsync(`kill -9 ${pid}`);
        }
    }

    static normalizePath(filePath: string): string {
        return path.normalize(filePath).replace(/\\/g, '/');
    }

    static getPathSeparator(): string {
        return this.isWindows() ? '\\' : '/';
    }
}
