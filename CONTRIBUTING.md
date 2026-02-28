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
