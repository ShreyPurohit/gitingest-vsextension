/** One rendered line of the gitingest directory tree. */
export interface TreeRow {
    /** The original line, so the rendered tree still looks like the raw output. */
    text: string;
    /**
     * Path relative to the ingested root, or undefined when the line is not an
     * actionable entry (headers, blank lines, the root itself).
     */
    path?: string;
    isDirectory: boolean;
}

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

/** Glob pattern that matches a tree entry: directories match everything beneath them. */
export function toGlobPattern(path: string, isDirectory: boolean): string {
    const trimmed = path.replace(/^\/+|\/+$/g, '');
    if (trimmed === '') {
        return '';
    }
    return isDirectory ? `${trimmed}/**` : trimmed;
}
