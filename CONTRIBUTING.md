# Contributing to GitIngest Extension

Thank you for your interest in contributing to GitIngest Extension. This document will help you get started.

## How to Contribute

- **Report bugs** – Open an [issue](https://github.com/ShreyPurohit/gitingest-vsextension/issues) with steps to reproduce and your environment (OS, VS Code version, Python version).
- **Suggest features** – Use [GitHub Discussions](https://github.com/ShreyPurohit/gitingest-vsextension/discussions) or open an issue with the "enhancement" label.
- **Submit code** – Follow the development setup below, then open a pull request.

## Development Setup

1. **Clone the repository**

    ```bash
    git clone https://github.com/ShreyPurohit/gitingest-vsextension.git
    cd gitingest-vsextension
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Build the extension**

    ```bash
    npm run compile
    ```

    This runs type-check, lint, and esbuild. Output is in `dist/extension.js`.

4. **Run the extension**
    - Open the repo folder in VS Code.
    - Press `F5` or use **Run > Start Debugging** to launch the Extension Development Host with the extension loaded.

5. **Run tests**

    ```bash
    npm run test
    ```

    Runs the test suite in the VS Code test environment. Ensure the extension is built first (`npm run compile` or `node esbuild.js`) so `dist/extension.js` is up to date.

6. **Coverage (optional)**

    ```bash
    npm run coverage
    ```

    Writes an HTML report under `coverage/` for production sources in `src/` only.

7. **Package a VSIX (optional)**
    ```bash
    npm run vsix
    ```
    Typechecks, lints, builds for production, and produces `gitingest-<version>.vsix`.

## Continuous integration

Every push and every pull request runs the **CI** workflow:

| Job          | What it checks                                       |
| ------------ | ---------------------------------------------------- |
| Lint & build | Prettier, ESLint, TypeScript, production esbuild     |
| Test         | Extension tests on Ubuntu and Windows                |
| Coverage     | Source coverage report (uploaded as an artifact)     |
| Package VSIX | Builds a `.vsix` artifact after quality + tests pass |

Tagged releases (`v*`) and manual **Release** workflow runs only:

1. Build a `.vsix`
2. Upload it as a workflow artifact
3. Optionally attach it to a **GitHub Release**

That step does **not** need marketplace tokens. Publishing to stores is separate because each store has its own account and PAT:

| Target                    | Secret name | Where to get it                                                    |
| ------------------------- | ----------- | ------------------------------------------------------------------ |
| Visual Studio Marketplace | `VSCE_PAT`  | Azure DevOps PAT with **Marketplace (Acquire)**                    |
| Open VSX                  | `OVSX_PAT`  | [open-vsx.org → tokens](https://open-vsx.org/user-settings/tokens) |

Add both under **Settings → Secrets and variables → Actions**, then either:

- Run the **Publish** workflow from the Actions tab (choose Marketplace, Open VSX, or both), or
- Publish locally from the VSIX:

```bash
npm run vsix
npx vsce publish --packagePath gitingest-<version>.vsix --pat <VSCE_PAT>
npx ovsx publish gitingest-<version>.vsix --pat <OVSX_PAT>
```

## Code Style

- **TypeScript** – Use the project’s `tsconfig.json` and avoid `any` where possible.
- **Linting** – Run `npm run lint` (ESLint). Fix any reported issues before submitting.
- **Formatting** – Run `npm run format` (Prettier) to keep style consistent.

## Pull Request Process

1. Fork the repo and create a branch from `main` (e.g. `fix/issue-123` or `feat/reingest-docs`).
2. Make your changes, add or update tests if applicable.
3. Run `npm run compile` and `npm run test` and fix any failures.
4. Run `npm run format` and commit the result.
5. Open a PR against `main` with a clear description and, if relevant, a link to the issue.
6. Address review feedback. Once approved, maintainers will merge.

By contributing, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers this project.

## Questions

- **Bugs or features:** [GitHub Issues](https://github.com/ShreyPurohit/gitingest-vsextension/issues)
- **General contact:** You can reach out via the email in the [bugs](https://github.com/ShreyPurohit/gitingest-vsextension/blob/main/package.json) field in `package.json`.

Thanks for helping make GitIngest Extension better.
