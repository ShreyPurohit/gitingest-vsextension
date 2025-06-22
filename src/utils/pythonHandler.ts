import { exec } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { ERROR_MESSAGES } from '../config';
import { OsUtils } from './osUtils';

const execAsync = promisify(exec);

export class PythonHandler {
    private static instance: PythonHandler;
    private pythonCommand: string = '';
    private venvPath: string = '';
    private venvPython: string = '';
    private userSitePackages: boolean = false;

    private constructor() { }

    public static getInstance(): PythonHandler {
        if (!PythonHandler.instance) {
            PythonHandler.instance = new PythonHandler();
        }
        return PythonHandler.instance;
    }

    private async findPythonCommand(): Promise<string> {
        const commands = OsUtils.getPythonCommands();

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

    private async checkVenvModule(pythonCmd: string): Promise<boolean> {
        try {
            await execAsync(`${pythonCmd} -c "import venv"`);
            return true;
        } catch {
            // Try installing venv using pip in user site-packages
            try {
                await execAsync(`${pythonCmd} -m pip install --user virtualenv`);
                return true;
            } catch {
                throw new Error(ERROR_MESSAGES.VENV_NOT_INSTALLED);
            }
        }
    }

    private async installGitIngestUserSite(): Promise<void> {
        try {
            if (!this.pythonCommand) {
                this.pythonCommand = await this.findPythonCommand();
            }

            // Install gitingest in user's site-packages
            await execAsync(`${this.pythonCommand} -m pip install --user gitingest`);
            this.userSitePackages = true;
        } catch (error) {
            throw new Error(ERROR_MESSAGES.GITINGEST_NOT_INSTALLED);
        }
    }

    private async tryCreateVenvInPath(targetPath: string): Promise<boolean> {
        try {
            if (!this.pythonCommand) {
                this.pythonCommand = await this.findPythonCommand();
            }

            await this.checkVenvModule(this.pythonCommand);
            
            // Create new virtual environment
            await execAsync(`${this.pythonCommand} -m venv "${targetPath}"`);
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('permission denied')) {
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
                    console.log('Failed to create venv in project directory, trying home directory...');
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
                const pipCommand = OsUtils.getVenvPipPath(this.venvPath);

                try {
                    await execAsync(`"${this.venvPython}" -m pip install --upgrade pip`);
                    await execAsync(`"${pipCommand}" install gitingest`);
                } catch (error) {
                    throw new Error(ERROR_MESSAGES.GITINGEST_NOT_INSTALLED);
                }
            }
        }
    }

    public async verifyPythonInstallation(): Promise<boolean> {
        try {
            this.pythonCommand = await this.findPythonCommand();
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
            const command = this.userSitePackages
                ? `${this.pythonCommand} "${scriptPath}" ${args.map(arg => `"${arg}"`).join(' ')}`
                : `"${this.venvPython}" "${scriptPath}" ${args.map(arg => `"${arg}"`).join(' ')}`;

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