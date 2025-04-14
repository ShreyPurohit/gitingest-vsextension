import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ERROR_MESSAGES } from '../config';

const execAsync = promisify(exec);

export class PythonHandler {
    private static instance: PythonHandler;
    private pythonCommand: string = '';
    private venvPath: string = '';
    private venvPython: string = '';

    private constructor() { }

    public static getInstance(): PythonHandler {
        if (!PythonHandler.instance) {
            PythonHandler.instance = new PythonHandler();
        }
        return PythonHandler.instance;
    }

    private async findPythonCommand(): Promise<string> {
        const commands = process.platform === 'win32'
            ? ['python', 'python3']
            : ['python3', 'python'];

        try {
            const checkCommand = async (cmd: string): Promise<string> => {
                const { stdout } = await execAsync(`${cmd} --version`);
                if (!stdout.toLowerCase().includes('python 3')) {
                    throw new Error('Not Python 3');
                }
                return cmd;
            };

            const commandPromises = commands.map(cmd => checkCommand(cmd));
            return await Promise.any(commandPromises);
        } catch {
            throw new Error(ERROR_MESSAGES.PYTHON_NOT_INSTALLED);
        }
    }

    private async createVirtualEnv(projectPath: string): Promise<void> {
        this.venvPath = path.join(projectPath, '.venv');
        this.venvPython = path.join(
            this.venvPath,
            process.platform === 'win32' ? 'Scripts' : 'bin',
            process.platform === 'win32' ? 'python.exe' : 'python'
        );

        // Check if venv already exists and is valid
        if (fs.existsSync(this.venvPath) && fs.existsSync(this.venvPython)) {
            try {
                // Verify Python and install gitingest if needed
                await execAsync(`"${this.venvPython}" --version`);
                const pipCommand = path.join(
                    this.venvPath,
                    process.platform === 'win32' ? 'Scripts' : 'bin',
                    process.platform === 'win32' ? 'pip.exe' : 'pip'
                );

                try {
                    // Check if gitingest is already installed
                    await execAsync(`"${pipCommand}" show gitingest`);
                    return; // Environment is valid and gitingest is installed
                } catch {
                    // Install gitingest if not present
                    await execAsync(`"${pipCommand}" install gitingest`);
                    return;
                }
            } catch {
                // Environment exists but is broken, delete it
                await fs.promises.rm(this.venvPath, { recursive: true, force: true });
            }
        }

        try {
            if (!this.pythonCommand) {
                this.pythonCommand = await this.findPythonCommand();
            }

            // Create new virtual environment
            await execAsync(`${this.pythonCommand} -m venv "${this.venvPath}"`);

            // Upgrade pip and install gitingest
            const pipCommand = path.join(
                this.venvPath,
                process.platform === 'win32' ? 'Scripts' : 'bin',
                process.platform === 'win32' ? 'pip.exe' : 'pip'
            );

            await execAsync(`"${this.venvPython}" -m pip install --upgrade pip`);
            await execAsync(`"${pipCommand}" install gitingest`);
        } catch (error) {
            throw new Error(ERROR_MESSAGES.VENV_CREATION_FAILED);
        }
    }

    public async verifyPythonInstallation(): Promise<boolean> {
        try {
            this.pythonCommand = await this.findPythonCommand();
            return true;
        } catch (error) {
            console.error('Python verification failed:', error);
            throw new Error(ERROR_MESSAGES.PYTHON_NOT_INSTALLED);
        }
    }

    public async verifyGitIngest(projectPath: string): Promise<boolean> {
        try {
            await this.createVirtualEnv(projectPath);
            return true;
        } catch (error) {
            console.error('GitIngest verification failed:', error);
            throw new Error(ERROR_MESSAGES.GITINGEST_NOT_INSTALLED);
        }
    }

    public async executeScript(scriptPath: string, args: string[]): Promise<string> {
        try {
            const command = `"${this.venvPython}" "${scriptPath}" ${args.map(arg => `"${arg}"`).join(' ')}`;
            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
                throw new Error(stderr);
            }

            return stdout;
        } catch (error) {
            console.error('Script execution failed:', error);
            throw error;
        }
    }

    public setPythonCommand(command: string): void {
        this.pythonCommand = command;
    }
}