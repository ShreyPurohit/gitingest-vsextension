# GitIngest VS Code Extension 🔍

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/your-publisher.gitingest-vscode)](https://marketplace.visualstudio.com/items?itemName=your-publisher.gitingest-vscode)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/your-publisher.gitingest-vscode)](https://marketplace.visualstudio.com/items?itemName=your-publisher.gitingest-vscode)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/your-publisher.gitingest-vscode)](https://marketplace.visualstudio.com/items?itemName=your-publisher.gitingest-vscode)

Seamlessly integrate GitIngest into your VS Code workflow with a modern, intuitive interface. Analyze your Git repositories directly within your editor and get comprehensive insights about your codebase.

![GitIngest VS Code Extension Demo](https://your-demo-gif-url.gif)

## ✨ Features

### 🎯 Modern UI Integration

* **Beautiful Webview Interface**: Sleek, modern design that fits perfectly within VS Code
* **Interactive Results View**: Three-panel layout showing summary, directory structure, and file contents
* **Copy Functionality**: Easy one-click copying for all analysis sections
* **Progress Indicators**: Real-time status updates during analysis
* **Responsive Design**: Adapts perfectly to different window sizes

### 🛠️ Smart Analysis

* **Comprehensive Repository Scanning**: Analyzes your entire codebase
* **Intelligent File Filtering**: Automatically excludes common files and directories like:
  + Build artifacts and dependencies
  + Version control files
  + Cache and temporary files
  + Binary and media files
  + IDE-specific files

### 🔄 Seamless Integration

* **Status Bar Integration**: Quick access through the GitIngest status bar item
* **Command Palette Support**: Easy to find and execute through VS Code's command palette
* **Cross-Platform Compatibility**: Works on Windows, macOS, and Linux

## 🚀 Getting Started

### Prerequisites

* Python 3.x
* VS Code 1.60.0 or higher
* Git repository

### Installation

1. Install the extension from VS Code Marketplace
2. Install Python dependencies:
   

```bash
   pip install gitingest
   # or
   pip3 install gitingest
   ```

### Usage

1. Open a Git repository in VS Code
2. Access GitIngest through:
   - Status bar icon
   - Command Palette (Ctrl/Cmd + Shift + P):

     - "GitIngest: Analyze Repository"
     - "GitIngest: Show Setup Guide"

## 📊 Analysis Output

The analysis results are presented in three main sections:

### 1. Summary

* High-level overview of your repository
* Key metrics and insights
* Easily copyable format

### 2. Directory Structure

* Complete tree view of your repository
* Clear visualization of project organization
* Filtered to show relevant files only

### 3. Files Content

* Detailed content analysis
* Smart content organization
* Searchable and copyable format

## ⚙️ Configuration

The extension automatically handles:
* Python environment detection
* GitIngest package verification
* Appropriate command execution per platform
* Intelligent process management

## 🛡️ Security

* No data leaves your machine
* All analysis is performed locally
* No external API calls
* No telemetry collection

## 🔧 Troubleshooting

Common solutions for:

1. **Python Not Found**
   - Ensure Python is installed and in PATH
   - Use the setup guide through Command Palette

2. **GitIngest Not Installed**
   - Run `pip install gitingest`

   - Check pip installation

3. **Analysis Fails**
   - Verify repository access
   - Check Python environment
   - Ensure sufficient permissions

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

* [GitIngest](https://github.com/your-username/gitingest) - The core analysis engine
* VS Code Extension API
* All our contributors and users

---

<p align="center">Made with ❤️ for the developer community</p>
