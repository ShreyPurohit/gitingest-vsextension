import { spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { ERROR_MESSAGES } from '../config';
import { OsUtils } from './osUtils';

type RunResult = { stdout: string; stderr: string; code: number };

async function runCommand(cmd: string, args: string[], cwd?: string): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { cwd, shell: false });
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
                const error = new Error(
                    stderr || stdout || `Command failed: ${cmd} ${args.join(' ')}`,
                );
                (error as any).code = code;
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
            return await (Promise as any).any(attempts);
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
        } catch (error: any) {
            const msg = (error?.message || '').toLowerCase();
            if (msg.includes('permission denied')) {
                throw new Error(ERROR_MESSAGES.PERMISSION_ERROR);
            }
            throw error;
        }
    }

    private async createVirtualEnv(projectPath: string): Promise<void> {
        try {
            // First try installing in user site-packages
            await this.installGitIngestUserSite();
            return;
        } catch (error) {
            // If user site-packages installation fails, try venv approach
            console.log('User site-packages installation failed, trying venv...');

            // First try in project directory
            const projectVenvPath = path.join(projectPath, '.venv');

            // Then try in user's home directory if project directory fails
            const homeVenvPath = path.join(os.homedir(), '.gitingest-venv');

            let venvCreated = false;
            let finalVenvPath = '';

            try {
                await this.tryCreateVenvInPath(projectVenvPath);
                venvCreated = true;
                finalVenvPath = projectVenvPath;
            } catch (error) {
                if (error instanceof Error && error.message === ERROR_MESSAGES.PERMISSION_ERROR) {
                    console.log(
                        'Failed to create venv in project directory, trying home directory...',
                    );
                    try {
                        await this.tryCreateVenvInPath(homeVenvPath);
                        venvCreated = true;
                        finalVenvPath = homeVenvPath;
                    } catch (homeError) {
                        throw new Error(ERROR_MESSAGES.VENV_CREATION_FAILED);
                    }
                } else {
                    throw error;
                }
            }

            if (venvCreated) {
                this.venvPath = finalVenvPath;
                this.venvPython = OsUtils.getVenvPythonPath(this.venvPath);

                try {
                    await runCommand(this.venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
                    await runCommand(this.venvPython, ['-m', 'pip', 'install', 'gitingest']);
                } catch (error) {
                    throw new Error(ERROR_MESSAGES.GITINGEST_NOT_INSTALLED);
                }
            }
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

    public async executeScript(scriptPath: string, args: string[]): Promise<string> {
        try {
            let cmd: string;
            let baseArgs: string[] = [];
            if (this.userSitePackages) {
                if (!this.pythonCmd) {
                    const found = await this.findPythonCommand();
                    this.pythonCmd = found.cmd;
                    this.pythonArgs = found.args;
                }
                cmd = this.pythonCmd;
                baseArgs = [...this.pythonArgs];
            } else {
                cmd = this.venvPython;
            }
            const res = await runCommand(cmd, [...baseArgs, scriptPath, ...args]);
            return res.stdout;
        } catch (error) {
            console.error('Script execution failed:', error);
            throw error;
        }
    }

    public setPythonCommand(command: string): void {
        // Backwards-compat: allow setting a direct command string
        this.pythonCmd = command;
        this.pythonArgs = [];
    }
}
