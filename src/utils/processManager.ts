import { ChildProcess } from 'child_process';
import { ERROR_MESSAGES } from '../config';
import { OsUtils } from './osUtils';

class ProcessManager {
    private currentProcess: ChildProcess | null = null;

    setProcess(process: ChildProcess) {
        this.currentProcess = process;
    }

    getProcess(): ChildProcess | null {
        return this.currentProcess;
    }

    async killCurrentProcess(): Promise<void> {
        const child = this.currentProcess;
        if (!child?.pid) {
            return;
        }

        try {
            if (OsUtils.isWindows()) {
                // Windows: child.kill() does not reap the whole process tree
                // (the spawned python may have grandchildren), so use taskkill /T.
                await OsUtils.killProcessTree(child.pid);
            } else {
                // POSIX: a direct signal reaps the child without spawning a shell.
                child.kill('SIGKILL');
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
