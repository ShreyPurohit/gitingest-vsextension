import { exec } from 'child_process';
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

const execAsync = promisify(exec);

let scriptPath = '';

export function activate(context: vscode.ExtensionContext) {
	scriptPath = context.asAbsolutePath(path.join('src', 'gitingest-script.py'));

	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right, 101
	);
	statusBarItem.name = "GitIngest";
	statusBarItem.text = "$(git-merge) GitIngest";
	statusBarItem.tooltip = "Analyze Repository with GitIngest";
	statusBarItem.command = COMMANDS.analyze;
	statusBarItem.show();

	// Register commands
	const commands = [
		vscode.commands.registerCommand(COMMANDS.setup, handleSetup),
		vscode.commands.registerCommand(COMMANDS.analyze, handleAnalyze)
	];

	// Add status bar item to subscriptions for proper disposal
	context.subscriptions.push(...commands, statusBarItem);
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

async function handleAnalyze(panel?: vscode.WebviewPanel): Promise<void> {
	if (!panel) {
		panel = vscode.window.createWebviewPanel(
			'gitingestResults',
			'GitIngest Analysis',
			vscode.ViewColumn.One,
			WEBVIEW_OPTIONS
		);
	}

	// Clean up when the panel is closed
	panel.onDidDispose(() => {
		processManager.killCurrentProcess().catch(console.error);
	});

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
		(message: WebviewMessage) => handleWebviewMessage(message, panel!),
		undefined,
		[]
	);

	try {
		await verifyDependencies(panel);
		await runAnalysis(panel);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
		panel.webview.html = getErrorContent('Analysis Failed', [errorMessage]);
	}
}

async function handleWebviewMessage(
	message: WebviewMessage,
	panel: vscode.WebviewPanel,
): Promise<void> {
	switch (message.command) {
		case 'cancel':
			try {
				await processManager.killCurrentProcess();
				panel.dispose();
				vscode.window.showInformationMessage('Analysis cancelled');
			} catch (error) {
				vscode.window.showErrorMessage('Failed to cancel analysis');
			}
			break;

		case 'copy':
			if (message.text) {
				await vscode.env.clipboard.writeText(message.text);
				vscode.window.showInformationMessage('Analysis output copied to clipboard!');
			}
			break;

		case 'showSetup':
			await handleSetup();
			break;

		case 'saveToFile':
			await handleSaveToFile();
			break;

		case 'retry':
			try {
				await processManager.killCurrentProcess();
				await handleAnalyze(panel);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
				panel.webview.html = getErrorContent('Retry Failed', [errorMessage]);
			}
			break;
	}
}

async function handleSaveToFile(): Promise<void> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage(ERROR_MESSAGES.NO_WORKSPACE);
		return;
	}

	try {
		const result = await getOutput(workspaceFolder.uri.fsPath);
		if (result.type === "success" && result.data) {
			const filePath = path.join(workspaceFolder.uri.fsPath, 'digest.txt');
			const content = [
				'# Repository Analysis\n',
				'## Summary\n',
				result.data.summary,
				'\n## Directory Structure\n',
				result.data.tree,
				'\n## Files Content\n',
				result.data.content
			].join('\n');

			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(filePath),
				Buffer.from(content, 'utf8')
			);
			vscode.window.showInformationMessage(`Analysis saved to ${filePath}`);
		}
	} catch (error) {
		vscode.window.showErrorMessage('Failed to save analysis to file');
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
}

async function getOutput(repoPath: string): Promise<AnalysisResult> {
	try {
		const process = exec(`${getPythonCommand()} "${scriptPath}" "${repoPath}"`);
		processManager.setProcess(process);

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
	} catch (error) {
		console.error(`exec error: ${error}`);
		return {
			type: "error",
			message: "Execution failed"
		};
	}
}

async function runAnalysis(
	panel: vscode.WebviewPanel,
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