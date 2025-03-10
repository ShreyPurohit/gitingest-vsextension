import { ChildProcess } from 'child_process';
import { ERROR_MESSAGES } from '../config';
import { killProcess } from './process';

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
            killProcess(this.currentProcess);
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