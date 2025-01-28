import * as vscode from 'vscode';
import { exec, ChildProcess, ExecException } from 'child_process';
import { promisify } from 'util';
import { WebviewMessage, ExecResult, StatusMessage } from './types';
import { COMMANDS, ERROR_MESSAGES, WEBVIEW_OPTIONS } from './config';
import { killProcess, getPythonCommand } from './utils/process';
import {
	getLoadingContent,
	getErrorContent,
	getResultsContent,
	getSetupGuideContent
} from './webview/templates';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
	let currentProcess: ChildProcess | null = null;

	// Register commands
	const commands = [
		vscode.commands.registerCommand(COMMANDS.setup, handleSetup),
		vscode.commands.registerCommand(COMMANDS.analyze, () => handleAnalyze(currentProcess))
	];

	context.subscriptions.push(...commands);
}

async function handleSetup(): Promise<void> {
	const panel = vscode.window.createWebviewPanel(
		'gitingestSetup',
		'GitIngest Setup Guide',
		vscode.ViewColumn.One,
		WEBVIEW_OPTIONS
	);

	panel.webview.html = getSetupGuideContent();
}

async function handleAnalyze(currentProcessRef: ChildProcess | null): Promise<void> {
	const panel = vscode.window.createWebviewPanel(
		'gitingestResults',
		'GitIngest Analysis',
		vscode.ViewColumn.One,
		WEBVIEW_OPTIONS
	);

	// Clean up when the panel is closed
	panel.onDidDispose(() => {
		if (currentProcessRef?.pid) {
			killProcess(currentProcessRef);
			currentProcessRef = null;
		}
	});

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
		(message: WebviewMessage) => handleWebviewMessage(message, panel, currentProcessRef),
		undefined,
		[]
	);

	try {
		await verifyDependencies(panel);
		await runAnalysis(panel, currentProcessRef);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
		panel.webview.html = getErrorContent('Analysis Failed', [errorMessage]);
	}
}

function handleWebviewMessage(
	message: WebviewMessage,
	panel: vscode.WebviewPanel,
	currentProcess: ChildProcess | null
): void {
	switch (message.command) {
		case 'cancel':
			if (currentProcess?.pid) {
				killProcess(currentProcess);
				panel.dispose();
			}
			break;
		case 'copy':
			if (message.text) {
				vscode.env.clipboard.writeText(message.text);
				vscode.window.showInformationMessage('Analysis output copied to clipboard!');
			}
			break;
	}
}

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

	return;
}

async function runAnalysis(
	panel: vscode.WebviewPanel,
	currentProcessRef: ChildProcess | null
): Promise<void> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
	}

	panel.webview.html = getLoadingContent([
		{ text: 'Python installation verified ✓', type: 'success' },
		{ text: 'GitIngest package verified ✓', type: 'success' },
		{ text: 'Analyzing repository...', type: 'info' }
	]);

	return new Promise((resolve, reject) => {
		currentProcessRef = exec(
			`gitingest "${workspaceFolder.uri.fsPath}"`,
			{ windowsHide: true },
			(error: ExecException | null, stdout: string, stderr: string) => {
				currentProcessRef = null;
				if (error) {
					reject(error);
					return;
				}
				panel.webview.html = getResultsContent(stdout);
				resolve();
			}
		);
	});
}

export function deactivate(): void { }