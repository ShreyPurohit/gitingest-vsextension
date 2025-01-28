import { exec, ChildProcess } from 'child_process';
import { platform } from 'os';
import { ERROR_MESSAGES } from '../config';

export function killProcess(process: ChildProcess): void {
    if (!process.pid) return;

    try {
        if (platform() === 'win32') {
            exec(`taskkill /pid ${process.pid} /T /F`);
        } else {
            process.kill('SIGTERM');
        }
    } catch (error) {
        console.error(ERROR_MESSAGES.PROCESS_KILL_FAILED, error);
    }
}

export function getPythonCommand(): string {
    return platform() === 'win32' ? 'python' : 'python3';
}