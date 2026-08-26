import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { StringDecoder } from 'string_decoder';
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
        const child = spawn(cmd, args, {
            cwd,
            shell: false,
            env: {
                ...process.env,
                PYTHONUTF8: '1',
                PYTHONIOENCODING: 'utf-8',
            },
        });
        onSpawn?.(child);
        let stdout = '';
        let stderr = '';
        const stdoutDecoder = new StringDecoder('utf8');
        const stderrDecoder = new StringDecoder('utf8');

        child.stdout.on('data', (data) => {
            stdout += stdoutDecoder.write(data);
        });
        child.stderr.on('data', (data) => {
            stderr += stderrDecoder.write(data);
        });
        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
            stdout += stdoutDecoder.end();
            stderr += stderrDecoder.end();
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

/**
 * Fixed path for the gitingest virtual environment.
 * Located in the user's home directory so it is shared across all projects
 * and never pollutes any workspace. Works on all OS via os.homedir().
 */
const GITINGEST_VENV_PATH = path.join(os.homedir(), '.gitingest-venv');

export class PythonHandler {
    private static instance: PythonHandler;
    private pythonCmd: string = '';
    private pythonArgs: string[] = [];
    private venvPython: string = '';
    private userSitePackages: boolean = false;
    private gitIngestVerified: boolean = false;

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

    private async isGitIngestInstalled(cmd: string, args: string[]): Promise<boolean> {
        try {
            await runCommand(cmd, [...args, '-c', 'import gitingest']);
            return true;
        } catch {
            return false;
        }
    }

    private async createVenvAtPath(targetPath: string): Promise<void> {
        // Try built-in venv module first
        try {
            await runCommand(this.pythonCmd, [...this.pythonArgs, '-c', 'import venv']);
            await runCommand(this.pythonCmd, [...this.pythonArgs, '-m', 'venv', targetPath]);
            return;
        } catch {
            // venv module unavailable; try virtualenv
        }

        // Install and use virtualenv as fallback
        await runCommand(this.pythonCmd, [
            ...this.pythonArgs,
            '-m',
            'pip',
            'install',
            '--user',
            'virtualenv',
        ]);
        await runCommand(this.pythonCmd, [...this.pythonArgs, '-m', 'virtualenv', targetPath]);
    }

    /**
     * Ensures gitingest is available. Strategy (in order):
     * 1. Check if gitingest is already importable from system/user Python
     * 2. Check if ~/.gitingest-venv already has gitingest
     * 3. Try pip install --user (works on some systems)
     * 4. Create ~/.gitingest-venv and install gitingest there
     */
    private async ensureGitIngest(): Promise<void> {
        // 1. Already available in system/user Python?
        if (await this.isGitIngestInstalled(this.pythonCmd, this.pythonArgs)) {
            this.userSitePackages = true;
            return;
        }

        // 2. Already available in the shared venv?
        const venvPython = OsUtils.getVenvPythonPath(GITINGEST_VENV_PATH);
        if (await this.isGitIngestInstalled(venvPython, [])) {
            this.venvPython = venvPython;
            return;
        }

        // 3. Try user site-packages installation (may fail on externally-managed Python)
        try {
            await runCommand(this.pythonCmd, [
                ...this.pythonArgs,
                '-m',
                'pip',
                'install',
                '--user',
                'gitingest',
            ]);
            this.userSitePackages = true;
            return;
        } catch {
            // Expected on PEP 668 externally-managed Python; fall through
        }

        // 4. Create shared venv in home directory and install gitingest
        try {
            await this.createVenvAtPath(GITINGEST_VENV_PATH);
            this.venvPython = OsUtils.getVenvPythonPath(GITINGEST_VENV_PATH);
            await runCommand(this.venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
            await runCommand(this.venvPython, ['-m', 'pip', 'install', 'gitingest']);
        } catch {
            throw new Error(
                'Failed to install GitIngest. Please ensure you have internet connectivity and Python 3 with venv support, then try again.',
            );
        }
    }

    public async verifyPythonInstallation(): Promise<boolean> {
        const found = await this.findPythonCommand();
        this.pythonCmd = found.cmd;
        this.pythonArgs = found.args;
        return true;
    }

    public async verifyGitIngest(): Promise<boolean> {
        if (this.gitIngestVerified) {
            return true;
        }
        await this.ensureGitIngest();
        this.gitIngestVerified = true;
        return true;
    }

    private getScriptCommandAndArgs(): { cmd: string; baseArgs: string[] } {
        if (this.userSitePackages) {
            return { cmd: this.pythonCmd, baseArgs: [...this.pythonArgs] };
        }
        return { cmd: this.venvPython, baseArgs: [] };
    }

    /**
     * Runs the script and registers the child process with processManager so it can be killed on Cancel.
     * Clears the process when the promise settles (success or failure).
     * Sets cwd to args[0] (repo path) when valid, so the engine runs with project root as cwd on all OS.
     * If the configured Python binary is missing (e.g. venv deleted), automatically re-verifies and retries once.
     */
    public async executeScriptWithProcess(scriptPath: string, args: string[]): Promise<string> {
        const repoPath = args[0];
        const cwd =
            typeof repoPath === 'string' && repoPath.trim().length > 0
                ? repoPath.trim()
                : undefined;

        try {
            const { cmd, baseArgs } = this.getScriptCommandAndArgs();
            const fullArgs = [...baseArgs, scriptPath, ...args];
            const res = await runCommand(cmd, fullArgs, cwd, (child) =>
                processManager.setProcess(child),
            );
            return res.stdout;
        } catch (error) {
            // If the Python binary was removed (venv deleted), reset and re-setup
            const msg = error instanceof Error ? error.message : '';
            if (msg.includes('ENOENT') || msg.includes('missing')) {
                this.resetState();
                await this.ensureGitIngest();
                this.gitIngestVerified = true;

                const { cmd, baseArgs } = this.getScriptCommandAndArgs();
                const fullArgs = [...baseArgs, scriptPath, ...args];
                const res = await runCommand(cmd, fullArgs, cwd, (child) =>
                    processManager.setProcess(child),
                );
                return res.stdout;
            }
            throw error;
        } finally {
            processManager.clear();
        }
    }

    private resetState(): void {
        this.venvPython = '';
        this.userSitePackages = false;
        this.gitIngestVerified = false;
    }
}
