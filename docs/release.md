# GitIngest Extension – Release Steps

This document outlines the step-by-step process for preparing, building, and publishing a new release of the GitIngest extension.

---

## 🔄 1. Version Bump

Update the version number based on the changes you're releasing:

* `patch` — for bug fixes
* `minor` — for new features
* `major` — for breaking changes

Run:

```bash
npm version patch|minor|major
```

This automatically updates `package.json` and creates a Git tag.

---

## ✅ 2. Build & Test

Ensure code compiles and passes lint checks:

```bash
npm run compile
npm run lint
```

You can also test locally inside VS Code by hitting F5 (Run Extension).

---

## 📅 3. Package & Publish

### VS Code Marketplace

```bash
vsce publish
```

Make sure you’re logged into your VSCE publisher account.

### Open VSX Registry

```bash
npx ovsx publish -p \$OVSX\_PAT
```

Ensure your `OVSX_PAT` token is valid.

---

## ✨ 4. Git Push

Push commits and tags:

```bash
git push --follow-tags
```

---

## 📋 5. Update Changelog & GitHub Release

1. Edit `CHANGELOG.md` and summarize what's new.
2. Create a [GitHub release](https://github.com/gitingest/gitingest-vsextension/releases) with the same tag.
3. Paste the changelog section into the release notes.

---

## ⚡ 6. Audit Dependencies

Run before publishing:

```bash
npm audit
```

Fix any vulnerabilities if they are high or critical.

---

## 🚀 Summary

* [ ] Bump version
* [ ] Compile + lint
* [ ] Package + publish to VS Code Marketplace
* [ ] Publish to Open VSX
* [ ] Push Git tags
* [ ] Update changelog & GitHub release
* [ ] Audit packages

---
