import { ChildProcess, exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { COMMANDS, ERROR_MESSAGES, WEBVIEW_OPTIONS } from './config';
import { AnalysisResult, StatusMessage, WebviewMessage } from './types';
import { getPythonCommand } from './utils/process';
import { processManager } from './utils/processManager';
import {
	getErrorContent,
	getLoadingContent,
	getResultsContent,
	getSetupGuideContent
} from './webview/templates';

// Promisify exec for cleaner async/await usage
const execAsync = promisify(exec);

/**
 * Path to the Python script that performs the repository analysis
 */
let scriptPath = '';

/**
 * Activates the extension
 * @param context The extension context
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	// Set the path to the Python script
	scriptPath = context.asAbsolutePath(path.join('src', 'gitingest-script.py'));

	// Create status bar item
	const statusBarItem = createStatusBarItem();

	// Register commands
	const commands = registerCommands();

	// Add all disposables to context subscriptions
	context.subscriptions.push(...commands, statusBarItem);

	// Show setup guide on first activation
	await showSetupGuideIfNeeded(context);
}

/**
 * Creates and configures the status bar item
 * @returns The configured status bar item
 */
function createStatusBarItem(): vscode.StatusBarItem {
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		101 // Priority
	);
	statusBarItem.name = "GitIngest";
	statusBarItem.text = "$(file-zip) GitIngest";
	statusBarItem.tooltip = "Analyze Repository with GitIngest";
	statusBarItem.command = COMMANDS.analyze;
	statusBarItem.show();

	return statusBarItem;
}

/**
 * Registers all extension commands
 * @returns Array of disposable command registrations
 */
function registerCommands(): vscode.Disposable[] {
	return [
		vscode.commands.registerCommand(COMMANDS.setup, handleSetup),
		vscode.commands.registerCommand(COMMANDS.analyze, handleAnalyze)
	];
}

/**
 * Shows the setup guide if the extension is being run for the first time
 * @param context The extension context
 */
async function showSetupGuideIfNeeded(context: vscode.ExtensionContext): Promise<void> {
	const hasShownSetup = context.globalState.get('gitingestSetup', false);
	if (!hasShownSetup) {
		await handleSetup();
		await context.globalState.update('gitingestSetup', true);
	}
}

/**
 * Handles the setup command
 * Shows the setup guide in a webview panel
 */
async function handleSetup(): Promise<void> {
	const panel = vscode.window.createWebviewPanel(
		'gitingestSetup',
		'GitIngest Setup Guide',
		vscode.ViewColumn.One,
		WEBVIEW_OPTIONS
	);

	panel.webview.html = getSetupGuideContent();

	// Add message handler for the setup panel
	panel.webview.onDidReceiveMessage(
		(message: WebviewMessage) => {
			if (message.command === 'analyze') {
				handleAnalyze();
			} else {
				handleWebviewMessage(message, panel);
			}
		},
		undefined,
		[]
	);
}

/**
 * Handles the analyze command
 * Verifies dependencies and runs the analysis
 * @param panel Optional existing webview panel to use
 */
async function handleAnalyze(panel?: vscode.WebviewPanel): Promise<void> {
	// Create a new panel if one wasn't provided
	if (!panel) {
		panel = vscode.window.createWebviewPanel(
			'gitingestResults',
			'GitIngest Analysis',
			vscode.ViewColumn.One,
			WEBVIEW_OPTIONS
		);
	}

	// Clean up resources when the panel is closed
	panel.onDidDispose(() => {
		processManager.killCurrentProcess().catch(logError);
	});

	// Set up message handling
	panel.webview.onDidReceiveMessage(
		(message: WebviewMessage) => handleWebviewMessage(message, panel!),
		undefined,
		[]
	);

	try {
		// Verify dependencies and run analysis
		await verifyDependencies(panel);
		await runAnalysis(panel);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
		panel.webview.html = getErrorContent('Analysis Failed', [errorMessage]);
	}
}

/**
 * Handles messages from the webview
 * @param message The message from the webview
 * @param panel The webview panel
 */
async function handleWebviewMessage(
	message: WebviewMessage,
	panel: vscode.WebviewPanel,
): Promise<void> {
	try {
		switch (message.command) {
			case 'analyze':
				await handleAnalyzeCommand(panel);
				break;
			case 'cancel':
				await handleCancelCommand(panel);
				break;
			case 'copy':
				await handleCopyCommand(message.text);
				break;
			case 'showSetup':
				await handleSetup();
				break;
			case 'saveToFile':
				await handleSaveToFile();
				break;
			case 'retry':
				await handleAnalyzeCommand(panel);
				break;
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
		vscode.window.showErrorMessage(`Command failed: ${errorMessage}`);
	}
}

/**
 * Handles the analyze command from the webview
 * @param panel The webview panel
 */
async function handleAnalyzeCommand(panel: vscode.WebviewPanel): Promise<void> {
	await processManager.killCurrentProcess();
	await handleAnalyze(panel);
}

/**
 * Handles the cancel command from the webview
 * @param panel The webview panel
 */
async function handleCancelCommand(panel: vscode.WebviewPanel): Promise<void> {
	await processManager.killCurrentProcess();
	panel.dispose();
	vscode.window.showInformationMessage('Analysis cancelled');
}

/**
 * Handles the copy command from the webview
 * @param text The text to copy
 */
async function handleCopyCommand(text?: string): Promise<void> {
	if (text) {
		await vscode.env.clipboard.writeText(text);
		vscode.window.showInformationMessage('Analysis output copied to clipboard!');
	}
}

/**
 * Handles saving the analysis results to a file
 */
async function handleSaveToFile(): Promise<void> {
	const workspaceFolder = getWorkspaceFolder();
	if (!workspaceFolder) {
		vscode.window.showErrorMessage(ERROR_MESSAGES.NO_WORKSPACE);
		return;
	}

	try {
		const result = await getOutput(workspaceFolder.uri.fsPath);
		if (result.type === "success" && result.data) {
			await saveResultsToFile(workspaceFolder, result.data);
		}
	} catch (error) {
		vscode.window.showErrorMessage('Failed to save analysis to file');
	}
}

/**
 * Gets the current workspace folder
 * @returns The workspace folder or undefined if none is open
 */
function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
	return vscode.workspace.workspaceFolders?.[0];
}

/**
 * Saves the analysis results to a file
 * @param workspaceFolder The workspace folder
 * @param data The analysis data
 */
async function saveResultsToFile(
	workspaceFolder: vscode.WorkspaceFolder,
	data: { summary: string; tree: string; content: string }
): Promise<void> {
	const filePath = path.join(workspaceFolder.uri.fsPath, 'digest.txt');
	const content = formatAnalysisContent(data);

	await vscode.workspace.fs.writeFile(
		vscode.Uri.file(filePath),
		Buffer.from(content, 'utf8')
	);

	vscode.window.showInformationMessage(`Analysis saved to ${filePath}`);
}

/**
 * Formats the analysis content for saving to a file
 * @param data The analysis data
 * @returns The formatted content
 */
function formatAnalysisContent(data: { summary: string; tree: string; content: string }): string {
	return [
		'# Repository Analysis\n',
		'## Summary\n',
		data.summary,
		'\n## Directory Structure\n',
		data.tree,
		'\n## Files Content\n',
		data.content
	].join('\n');
}

/**
 * Verifies that all required dependencies are installed
 * @param panel The webview panel to update with status
 */
async function verifyDependencies(panel: vscode.WebviewPanel): Promise<void> {
	const statusMessages: StatusMessage[] = [];

	// Check Python installation
	try {
		const pythonVersion = await execAsync(`${getPythonCommand()} --version`);
		statusMessages.push({
			text: `Python installation verified (${pythonVersion.stdout.trim()}) ✓`,
			type: 'success'
		});
		panel.webview.html = getLoadingContent(statusMessages);
	} catch {
		throw new Error(ERROR_MESSAGES.PYTHON_NOT_INSTALLED);
	}

	// Check GitIngest installation
	try {
		await execAsync(`${getPythonCommand()} -m pip show gitingest`);
		statusMessages.push({
			text: 'GitIngest package verified ✓',
			type: 'success'
		});
		panel.webview.html = getLoadingContent(statusMessages);
	} catch {
		throw new Error(ERROR_MESSAGES.GITINGEST_NOT_INSTALLED);
	}
}

/**
 * Runs the analysis on the current repository
 * @param panel The webview panel to update with results
 */
async function runAnalysis(panel: vscode.WebviewPanel): Promise<void> {
	const workspaceFolder = getWorkspaceFolder();
	if (!workspaceFolder) {
		throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
	}

	// Show loading status
	panel.webview.html = getLoadingContent([
		{ text: 'Python installation verified ✓', type: 'success' },
		{ text: 'GitIngest package verified ✓', type: 'success' },
		{ text: 'Analyzing repository...', type: 'info' }
	]);

	// Run the analysis
	const result = await getOutput(workspaceFolder.uri.fsPath);

	if (result.type === "error") {
		throw new Error(result.message);
	}

	if (result.data) {
		panel.webview.html = getResultsContent(result.data);
	} else {
		throw new Error("Analysis result data is undefined");
	}
}

/**
 * Gets the output from the Python script
 * @param repoPath The path to the repository
 * @returns The analysis result
 */
async function getOutput(repoPath: string): Promise<AnalysisResult> {
	try {
		const process = exec(`${getPythonCommand()} "${scriptPath}" "${repoPath}"`);
		processManager.setProcess(process);

		return await collectProcessOutput(process);
	} catch (error) {
		logError('exec error:', error);
		return {
			type: "error",
			message: "Execution failed"
		};
	}
}

/**
 * Collects the output from a child process
 * @param process The child process
 * @returns A promise that resolves to the analysis result
 */
function collectProcessOutput(process: ChildProcess): Promise<AnalysisResult> {
	return new Promise((resolve, reject) => {
		let stdout = '';
		let stderr = '';

		process.stdout?.on('data', (data) => {
			stdout += data;
		});

		process.stderr?.on('data', (data) => {
			stderr += data;
		});

		process.on('close', (code) => {
			processManager.clear();
			if (code === 0 && stdout) {
				try {
					const result = JSON.parse(stdout);
					resolve({
						type: "success",
						data: result
					});
				} catch (error) {
					reject(new Error("Failed to parse analysis output"));
				}
			} else {
				reject(new Error(stderr || "Analysis failed"));
			}
		});

		process.on('error', (error) => {
			processManager.clear();
			reject(error);
		});
	});
}

/**
 * Logs an error to the console
 * @param message The error message
 * @param error The error object
 */
function logError(message: string, error?: unknown): void {
	console.error(message, error);
}