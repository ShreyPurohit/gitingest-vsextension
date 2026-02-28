"""GitIngest wrapper script. Receives repo path (argv[1]) in host OS form; argv[2] optional JSON array of extra exclude patterns."""
from __future__ import annotations

import json
import sys

from gitingest import ingest

# Always exclude these; some gitingest versions walk dirs and open .gitignore before
# applying exclusions, which can raise FileNotFoundError inside node_modules/.git.
# Pattern names are OS-agnostic (node_modules, .git exist on Windows, macOS, Linux).
SAFE_EXCLUDE = {"**/node_modules", "**/.git", "node_modules", ".git"}

if len(sys.argv) < 2 or not (sys.argv[1] or "").strip():
    print("Error: repository path (argv[1]) is required.", file=sys.stderr)
    sys.exit(1)

repo = (sys.argv[1] or "").strip()
exclude_patterns = set(SAFE_EXCLUDE)
if len(sys.argv) > 2 and (sys.argv[2] or "").strip():
    try:
        patterns = json.loads(sys.argv[2])
        if isinstance(patterns, list):
            for p in patterns:
                if isinstance(p, str) and p.strip():
                    exclude_patterns.add(p.strip())
    except (json.JSONDecodeError, TypeError):
        pass

try:
    summary, tree, content = ingest(repo, exclude_patterns=exclude_patterns)
except FileNotFoundError as e:
    err_str = str(e)
    if "node_modules" in err_str or ".git" in err_str or ".gitignore" in err_str:
        raise FileNotFoundError(
            "GitIngest hit a missing .gitignore inside node_modules or .git. "
            "Try analyzing only a subfolder (e.g. right-click 'src' -> GitIngest: Analyze This Folder), "
            "or upgrade the gitingest package: pip install -U gitingest"
        ) from e
    raise

output = {"summary": summary, "tree": tree, "content": content}
print(json.dumps(output))
