from gitingest import ingest
import sys
import json

# Define ignore patterns
IGNORE_PATTERNS = {
    # Python
    "*.pyc", "*.pyo", "*.pyd", "__pycache__", ".pytest_cache", ".coverage", ".tox", ".nox",
    ".mypy_cache", ".ruff_cache", ".hypothesis", "poetry.lock", "Pipfile.lock",
    # JavaScript/Node
    "node_modules", "bower_components", "package-lock.json", "yarn.lock", ".npm", ".yarn",
    ".pnpm-store", "bun.lock", "bun.lockb",
    # Java
    "*.class", "*.jar", "*.war", "*.ear", "*.nar", ".gradle/", "build/", ".settings/",
    ".classpath", "gradle-app.setting", "*.gradle", ".project",
    # C/C++
    "*.o", "*.obj", "*.dll", "*.dylib", "*.exe", "*.lib", "*.out", "*.a", "*.pdb",
    # Swift/Xcode
    ".build/", "*.xcodeproj/", "*.xcworkspace/", "*.pbxuser", "*.mode1v3", "*.mode2v3",
    "*.perspectivev3", "*.xcuserstate", "xcuserdata/", ".swiftpm/",
    # Ruby
    "*.gem", ".bundle/", "vendor/bundle", "Gemfile.lock", ".ruby-version", ".ruby-gemset", ".rvmrc",
    # Rust
    "Cargo.lock", "**/*.rs.bk", "target/",
    # Go
    "pkg/", "bin/",
    # .NET/C#
    "obj/", "*.suo", "*.user", "*.userosscache", "*.sln.docstates", "packages/", "*.nupkg",
    # Version control
    ".git", ".svn", ".hg", ".gitignore", ".gitattributes", ".gitmodules",
    # Images and media
    "*.svg", "*.png", "*.jpg", "*.jpeg", "*.gif", "*.ico", "*.pdf", "*.mov", "*.mp4",
    "*.mp3", "*.wav", "*webp"
    # Virtual environments
    "venv", ".venv", "env", ".env", "virtualenv",
    # IDEs and editors
    ".idea", ".vscode", ".vs", "*.swo", "*.swn", ".settings", "*.sublime-*",
    # Temporary and cache files
    "*.log", "*.bak", "*.swp", "*.tmp", "*.temp", ".cache", ".sass-cache", ".eslintcache",
    ".DS_Store", "Thumbs.db", "desktop.ini",
    # Build directories and artifacts
    "build", "dist", "target", "out", "*.egg-info", "*.egg", "*.whl", "*.so",
    # Documentation
    "site-packages", ".docusaurus", ".next", ".nuxt",
    # Other common patterns
    "*.min.js", "*.min.css", "*.map", ".terraform", "*.tfstate*", "vendor/"
}

repo = sys.argv[1]
summary, tree, content = ingest(repo, exclude_patterns=IGNORE_PATTERNS)

output = {
    'summary': summary,
    'tree': tree,
    'content': content
}

print(json.dumps(output))
