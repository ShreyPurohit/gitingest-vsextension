import { TreeRow } from '../types';

const ENTRY_PATTERN = /^([\s│|]*)(?:├──|└──|\|--|`--)\s(.*)$/;
const INDENT_WIDTH = 4;

/**
 * Parse the ASCII tree produced by gitingest into rows carrying the path each
 * line refers to, so the results panel can turn entries into include/exclude
 * filters. Lines that are not tree entries are returned untouched.
 *
 * The assumed format is the one gitingest 0.3.x emits: a `Directory structure:`
 * header, the ingested root on the next line, then one entry per line prefixed
 * by four characters of indent per level (`    ` or `│   `) and a `├── ` or
 * `└── ` connector, with directories written with a trailing slash. If a future
 * version changes that, no row comes back with a path and the caller is
 * expected to fall back to rendering the tree as plain text.
 */
export function parseTreeRows(tree: string): TreeRow[] {
    const stack: string[] = [];

    return tree.split('\n').map((line) => {
        const match = ENTRY_PATTERN.exec(line);
        if (!match) {
            return { text: line, isDirectory: false };
        }

        const depth = Math.floor(match[1].length / INDENT_WIDTH);
        const rawName = match[2].trim();
        const isDirectory = rawName.endsWith('/');
        const name = isDirectory ? rawName.slice(0, -1) : rawName;

        stack.length = depth;
        stack[depth] = name;

        // Depth 0 is the ingested root itself; paths are relative to it.
        const path = depth === 0 ? undefined : stack.slice(1, depth + 1).join('/');

        return { text: line, path: path || undefined, isDirectory };
    });
}

/**
 * Glob pattern that matches a tree entry: directories match everything beneath them.
 *
 * gitingest SPLITS every include/exclude pattern on commas and whitespace
 * (`re.compile(r"[,\s]+")` in its pattern_utils) before matching — it treats
 * `foo bar.js` as the two separate patterns `foo` and `bar.js`, neither of which
 * matches the real path, so a selected file whose name contains a space or comma
 * is silently dropped from the digest. (Verified against the packaged engine's
 * own `_parse_patterns`.) No in-pattern escaping survives that split, but a `*`
 * is not a separator and still matches the original character, so we replace each
 * run of separator characters with a single `*`. This is a no-op for ordinary
 * paths and only marginally widens a separated one, which is fine for scoping an
 * include to the selected changes.
 */
export function toGlobPattern(path: string, isDirectory: boolean): string {
    const trimmed = path.replace(/^\/+|\/+$/g, '').replace(/[,\s]+/g, '*');
    if (trimmed === '') {
        return '';
    }
    return isDirectory ? `${trimmed}/**` : trimmed;
}
