"""GitIngest wrapper script.

argv[1]: repository path in host OS form.
argv[2]: optional JSON options object, e.g.
    {"include_patterns": [...], "exclude_patterns": [...], "max_file_size": 10485760}
A bare JSON array is still accepted and read as exclude patterns (legacy form).
"""
from __future__ import annotations

import json
import sys
from typing import Any

from gitingest import ingest

# Always exclude these; some gitingest versions walk dirs and open .gitignore before
# applying exclusions, which can raise FileNotFoundError inside node_modules/.git.
# Pattern names are OS-agnostic (node_modules, .git exist on Windows, macOS, Linux).
SAFE_EXCLUDE = {"**/node_modules", "**/.git", "node_modules", ".git"}


def patterns_from_value(value: Any) -> set[str]:
    if not isinstance(value, list):
        return set()
    return {p.strip() for p in value if isinstance(p, str) and p.strip()}


def parse_options(raw: str) -> tuple[set[str], set[str], int | None]:
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return set(), set(), None

    if isinstance(parsed, list):
        return set(), patterns_from_value(parsed), None

    if not isinstance(parsed, dict):
        return set(), set(), None

    max_file_size = parsed.get("max_file_size")
    if not isinstance(max_file_size, int) or isinstance(max_file_size, bool) or max_file_size <= 0:
        max_file_size = None

    return (
        patterns_from_value(parsed.get("include_patterns")),
        patterns_from_value(parsed.get("exclude_patterns")),
        max_file_size,
    )


if len(sys.argv) < 2 or not (sys.argv[1] or "").strip():
    print("Error: repository path (argv[1]) is required.", file=sys.stderr)
    sys.exit(1)

repo = (sys.argv[1] or "").strip()
include_patterns: set[str] = set()
exclude_patterns = set(SAFE_EXCLUDE)
max_file_size = None

if len(sys.argv) > 2 and (sys.argv[2] or "").strip():
    include_patterns, extra_excludes, max_file_size = parse_options(sys.argv[2])
    exclude_patterns |= extra_excludes

kwargs = {"exclude_patterns": exclude_patterns}
if include_patterns:
    kwargs["include_patterns"] = include_patterns
if max_file_size is not None:
    kwargs["max_file_size"] = max_file_size

try:
    summary, tree, content = ingest(repo, **kwargs)
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
sys.stdout.write("__GITINGEST_JSON_START__\n")
sys.stdout.write(json.dumps(output))
sys.stdout.write("\n__GITINGEST_JSON_END__\n")
sys.stdout.flush()
