import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { ERROR_MESSAGES } from '../config';
import { processManager } from './processManager';
import { OsUtils } from './osUtils';

type RunResult = { stdout: string; stderr: string; code: number };

interface RunError extends Error {
    code?: number;
}

function runCommand(
    cmd: string,
    args: string[],
    cwd?: string,
    onSpawn?: (child: ChildProcess) => void,
): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { cwd, shell: false });
        onSpawn?.(child);
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, code: code ?? 0 });
            } else {
                const error: RunError = new Error(
                    stderr || stdout || `Command failed: ${cmd} ${args.join(' ')}`,
                );
                error.code = code ?? undefined;
                reject(error);
            }
        });
    });
}

export class PythonHandler {
    private static instance: PythonHandler;
    private pythonCmd: string = '';
    private pythonArgs: string[] = [];
    private venvPath: string = '';
    private venvPython: string = '';
    private userSitePackages: boolean = false;

    private constructor() {}

    public static getInstance(): PythonHandler {
        if (!PythonHandler.instance) {
            PythonHandler.instance = new PythonHandler();
        }
        return PythonHandler.instance;
    }

    private async findPythonCommand(): Promise<{ cmd: string; args: string[] }> {
        const candidates = OsUtils.getPythonCommands();
        const attempts = candidates.map(async ({ cmd, args }) => {
            const res = await runCommand(cmd, [...args, '--version']);
            const combined = (res.stdout + ' ' + res.stderr).toLowerCase();
            if (!combined.includes('python')) {
                throw new Error('Not Python');
            }
            if (!combined.includes('3.')) {
                throw new Error('Not Python 3');
            }
            return { cmd, args };
        });
        try {
            return await Promise.any(attempts);
        } catch {
            throw new Error(ERROR_MESSAGES.PYTHON_NOT_INSTALLED);
        }
    }

    private async checkVenvModule(pythonCmd: string, pythonArgs: string[]): Promise<boolean> {
        try {
            await runCommand(pythonCmd, [...pythonArgs, '-c', 'import venv']);
            return true;
        } catch {
            return false;
        }
    }

    private async ensureVirtualenvInstalled(
        pythonCmd: string,
        pythonArgs: string[],
    ): Promise<void> {
        await runCommand(pythonCmd, [
            ...pythonArgs,
            '-m',
            'pip',
            'install',
            '--user',
            'virtualenv',
        ]);
    }

    private async installGitIngestUserSite(): Promise<void> {
        try {
            if (!this.pythonCmd) {
                const found = await this.findPythonCommand();
                this.pythonCmd = found.cmd;
                this.pythonArgs = found.args;
            }

            // Install gitingest in user's site-packages
            await runCommand(this.pythonCmd, [
                ...this.pythonArgs,
                '-m',
                'pip',
                'install',
                '--user',
                'gitingest',
            ]);
            this.userSitePackages = true;
        } catch (error) {
            throw new Error(ERROR_MESSAGES.GITINGEST_NOT_INSTALLED);
        }
    }

    private async tryCreateVenvInPath(targetPath: string): Promise<boolean> {
        try {
            if (!this.pythonCmd) {
                const found = await this.findPythonCommand();
                this.pythonCmd = found.cmd;
                this.pythonArgs = found.args;
            }

            const hasVenv = await this.checkVenvModule(this.pythonCmd, this.pythonArgs);
            if (hasVenv) {
                await runCommand(this.pythonCmd, [...this.pythonArgs, '-m', 'venv', targetPath]);
                return true;
            }

            // Fallback to virtualenv if built-in venv is unavailable
            try {
                await this.ensureVirtualenvInstalled(this.pythonCmd, this.pythonArgs);
            } catch {
                throw new Error(ERROR_MESSAGES.VENV_NOT_INSTALLED);
            }
            await runCommand(this.pythonCmd, [...this.pythonArgs, '-m', 'virtualenv', targetPath]);
            return true;
        } catch (error: unknown) {
            const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
            if (msg.includes('permission denied')) {
                throw new Error(ERROR_MESSAGES.PERMISSION_ERROR);
            }
            throw error;
        }
    }

    private async createVenvAndReturnPath(projectPath: string): Promise<string> {
        const projectVenvPath = path.join(projectPath, '.venv');
        const homeVenvPath = path.join(os.homedir(), '.gitingest-venv');
        try {
            await this.tryCreateVenvInPath(projectVenvPath);
            return projectVenvPath;
        } catch (error) {
            if (error instanceof Error && error.message === ERROR_MESSAGES.PERMISSION_ERROR) {
                console.log('Failed to create venv in project directory, trying home directory...');
                try {
                    await this.tryCreateVenvInPath(homeVenvPath);
                    return homeVenvPath;
                } catch {
                    throw new Error(ERROR_MESSAGES.VENV_CREATION_FAILED);
                }
            }
            throw error;
        }
    }

    private async createVirtualEnv(projectPath: string): Promise<void> {
        try {
            await this.installGitIngestUserSite();
            return;
        } catch {
            console.log('User site-packages installation failed, trying venv...');
        }
        const venvPath = await this.createVenvAndReturnPath(projectPath);
        this.venvPath = venvPath;
        this.venvPython = OsUtils.getVenvPythonPath(this.venvPath);
        try {
            await runCommand(this.venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
            await runCommand(this.venvPython, ['-m', 'pip', 'install', 'gitingest']);
        } catch {
            throw new Error(ERROR_MESSAGES.GITINGEST_NOT_INSTALLED);
        }
    }

    public async verifyPythonInstallation(): Promise<boolean> {
        try {
            const found = await this.findPythonCommand();
            this.pythonCmd = found.cmd;
            this.pythonArgs = found.args;
            return true;
        } catch (error) {
            console.error('Python verification failed:', error);
            throw error;
        }
    }

    public async verifyGitIngest(projectPath: string): Promise<boolean> {
        try {
            await this.createVirtualEnv(projectPath);
            return true;
        } catch (error) {
            console.error('GitIngest verification failed:', error);
            throw error;
        }
    }

    private async getScriptCommandAndArgs(): Promise<{ cmd: string; baseArgs: string[] }> {
        if (this.userSitePackages) {
            if (!this.pythonCmd) {
                const found = await this.findPythonCommand();
                this.pythonCmd = found.cmd;
                this.pythonArgs = found.args;
            }
            return { cmd: this.pythonCmd, baseArgs: [...this.pythonArgs] };
        }
        return { cmd: this.venvPython, baseArgs: [] };
    }

    public async executeScript(scriptPath: string, args: string[]): Promise<string> {
        try {
            const { cmd, baseArgs } = await this.getScriptCommandAndArgs();
            const res = await runCommand(cmd, [...baseArgs, scriptPath, ...args]);
            return res.stdout;
        } catch (error) {
            console.error('Script execution failed:', error);
            throw error;
        }
    }

    /**
     * Runs the script and registers the child process with processManager so it can be killed on Cancel.
     * Clears the process when the promise settles (success or failure).
     * Sets cwd to args[0] (repo path) when valid, so the engine runs with project root as cwd on all OS.
     */
    public async executeScriptWithProcess(scriptPath: string, args: string[]): Promise<string> {
        const { cmd, baseArgs } = await this.getScriptCommandAndArgs();
        const fullArgs = [...baseArgs, scriptPath, ...args];
        const repoPath = args[0];
        const cwd =
            typeof repoPath === 'string' && repoPath.trim().length > 0
                ? repoPath.trim()
                : undefined;
        try {
            const res = await runCommand(cmd, fullArgs, cwd, (child) =>
                processManager.setProcess(child),
            );
            return res.stdout;
        } finally {
            processManager.clear();
        }
    }

    public setPythonCommand(command: string): void {
        // Backwards-compat: allow setting a direct command string
        this.pythonCmd = command;
        this.pythonArgs = [];
    }
}
