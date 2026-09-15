# Change Log

All notable changes to this project will be documented in this file.

---

## [0.7.1] - Staging Cleanup & Re-Ingest Guarding

Changed

- **Delete After Ingest** only removes the Add to Ingest staging folder when that staging folder was the one just analyzed. Analyzing any other folder leaves staging untouched.
- **Re-Ingest** is disabled (with a hover reason) when staging was deleted after ingest; **GitIngest: Re-Ingest Last Folder** shows the same message instead of re-running a missing path.
- Setting and README wording for `gitingest.deleteAfterIngest` updated to match the narrower cleanup behavior.
- Dev tooling dependencies refreshed; TypeScript stays on 5.9.x so ESLint / typescript-eslint remain compatible (TypeScript 7 is not supported by that stack yet).

---

## [0.7.0] - Filters, Results Panel & Path Preservation

Added

- **Preserve staging paths** when using Add to Ingest ([#13](https://github.com/ShreyPurohit/gitingest-vsextension/issues/13)): workspace-relative locations are mirrored under the ingest folder (e.g. `src/utils/helpers/example.ts` → `<ingest>/src/utils/helpers/example.ts`). Setting `gitingest.preserveStructureOnAdd` (default `true`) restores the previous flat-by-name layout when disabled.
- **Folder merge on stage:** adding a folder that already exists in the ingest folder fills that folder instead of creating `<folder> (1)`. Existing files are never overwritten; collisions get a ` (1)`, ` (2)`, … suffix.
- **Ingest filters** aligned with gitingest.com: settings `gitingest.includePatterns` and `gitingest.maxFileSize`, plus the existing `gitingest.fileExclusions`, forwarded to the engine. A filter row on the results panel (Exclude/Include selector, pattern field, size slider) supports **Re-Ingest** and **Reset to Settings**. **GitIngest: Re-Ingest Last Folder** reuses the last filters applied from the panel (not a fresh read of settings).
- **Clickable directory tree:** click an entry to toggle it in the active Exclude/Include list (folders as `<folder>/**`). Struck through when excluded, highlighted when included; a second click undoes. An entry is never kept in both lists. Nothing re-runs until **Re-Ingest**.
- **Open in Editor:** open the digest as an unsaved markdown tab without writing `digest.txt`.

Changed

- The Python wrapper accepts a JSON options object as `argv[2]` (`include_patterns`, `exclude_patterns`, `max_file_size`). A bare JSON array is still accepted as exclude patterns. Fields left at their defaults are omitted from the payload; when there is nothing custom to send, `argv[2]` is omitted entirely. In typical use the default file-exclusion list means an options argument is still sent.
- Copy, save and open read the digest from extension panel state instead of shipping a second copy through the webview DOM.

---

## [0.6.1] - Encoding Fix

Fixed

- Fixed unreadable files and incorrect characters when ingesting files on Windows and other operating systems.
- Improved UTF-8 handling for analysis output.

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

- Initial stable release of GitIngest as a VS Code extension.
