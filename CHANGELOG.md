# Change Log

All notable changes to this project will be documented in this file.

---

## [0.6.0] - Security & Stability Fixes

Security Fix

- Fixed security vulnerability in the results panel
- Improved folder cleanup to prevent accidental deletion

Fixed

- Fixed ingesting files without extension
- Fixed webview state when panel is hidden
- Improved file handling on Windows

---

## [0.5.0] - .gitingestignore & Re-Ingest

Added

- **.gitingestignore** support: same format as `.gitignore`; the gitingest engine respects both `.gitignore` and `.gitingestignore` when building the digest. Exclude files from ingestion without adding them to `.gitignore`.
- **Settings support** for exclusions: setting `gitingest.fileExclusions` (glob patterns, defaults: `**/node_modules`, `**/.git`) to exclude more paths from ingestion; applied in addition to ignore files.
- **Re-Ingest:** Re-run ingest on the same folder without reselecting. Use the **Re-Ingest** button in the results panel after viewing a digest, or run **GitIngest: Re-Ingest Last Folder** from the Command Palette. Useful after making changes when you don't want to go through the selection process again.

Changed

- **Handler:** Cancel / closing the panel now properly stops the running ingest process; script runs with the repo root as working directory; shared command/args logic and clearer error handling in the Python handler.
- **Services:** Analysis service validates the repo path and reads workspace file-exclusion settings before running; webview and result types tightened up; removed unused config and helpers.

Fixed

- Resolved 3 high-severity npm audit issues in dev dependencies (serialize-javascript) via override; tests unchanged.
- VSIX no longer ships test-only config (`tsconfig.*.json` excluded) for a smaller package.

---

## [0.4.1] - Add to Ingest

Fixed

- Broken User Interations

## [0.4.0] - Add to Ingest

Added

- Explorer context menu adds "GitIngest: Add to Ingest" to stage selected files or folders into the staging folder.
- Added setting 'gitingest.ingestFolderName' so you can choose the staging folder name (defaults to 'gitingest-ingest').
- "Add to Ingest" only copies the selected top-level item into 'gitingest-ingest', appending numeric suffixes when names already exist.
- Added Setting 'gitingest.deleteAfterIngest' so you can choose to remove staging folder after once ingested

Removed

- Status Bar Button
- Setup Page

---

## [0.3.0] - Cross-OS save and safer Python

Added

- Save to File now writes to the workspace root on all OS. If 'digest.txt' exists, it saves as 'digest (n).txt' automatically.
- Safer Python invocation using argument-array spawn (no shell string building). Works reliably on Windows, macOS, and Linux.
- Python detection improved on Windows: supports 'py -3', 'python', and 'python3'.
- Virtual environment setup is more robust: tries built-in 'venv', falls back to 'virtualenv' if needed; installs 'gitingest' in user site or venv accordingly.

Changed

- Removed Save As dialog to ensure a predictable root-level output file for automation.

---

## [0.2.0] - Promoted experimental features to stable 🎉

- Built-in CLI execution (no global install needed)
- Support for private and non-Git folders
- Improved performance and lightweight analysis

## [0.1.0] – Experimental Preview

> ⚠️ This version includes **experimental support**. Enable it in extension settings if you’d like to try it early.

### Added

- 🧪 **Built-in GitIngest execution** – You no longer need to install the `gitingest` CLI globally.
- 🧪 Introduced a **toggle in settings** to opt into experimental features.
- 🧪 Marked this version as a **preview** so users can opt in safely.
- 🧪 Behind-the-scenes setup for **supporting private and non-Git codebases** in the future.

---

## [0.0.4] – Stable

### Added

- ✅ Right-click context menu support in the VS Code Explorer.
- ✅ Improved CLI error handling and usage flow.

---

## [0.0.1] – Initial Release

### Added

- ✅ Analyze current folder using GitIngest CLI.
- ✅ Supports GitHub public repositories via CLI (requires global install).
