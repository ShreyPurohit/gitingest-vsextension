import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';

export class ErrorHandler {
    public static handleError(error: unknown): string {
        if (error instanceof Error) {
            if (error.message.includes('ENOENT')) {
                return ERROR_MESSAGES.PYTHON_NOT_INSTALLED;
            }
            return error.message;
        }
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    public static async showError(message: string): Promise<void> {
        const action = await vscode.window.showErrorMessage(
            message,
            'Show Setup Guide',
            'Dismiss'
        );

        if (action === 'Show Setup Guide') {
            await vscode.commands.executeCommand('vscode-gitingest.setup');
        }
    }
}