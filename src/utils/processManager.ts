import { ChildProcess, exec } from 'child_process';
import { platform } from 'os';
import { ERROR_MESSAGES } from '../config';

class ProcessManager {
    private currentProcess: ChildProcess | null = null;

    setProcess(process: ChildProcess) {
        this.currentProcess = process;
    }

    getProcess(): ChildProcess | null {
        return this.currentProcess;
    }

    async killCurrentProcess(): Promise<void> {
        if (!this.currentProcess?.pid) {
            return;
        }

        try {
            if (platform() === 'win32') {
                exec(`taskkill /pid ${this.currentProcess.pid} /T /F`);
            } else {
                this.currentProcess.kill('SIGTERM');
            }
            this.currentProcess = null;
        } catch (error) {
            console.error(ERROR_MESSAGES.PROCESS_KILL_FAILED, error);
            throw new Error(ERROR_MESSAGES.PROCESS_KILL_FAILED);
        }
    }

    clear() {
        this.currentProcess = null;
    }
}

export const processManager = new ProcessManager();