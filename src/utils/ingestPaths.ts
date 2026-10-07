import * as path from 'path';
import { IngestDestination } from '../types';

export function normalizePath(fsPath: string): string {
    return path.normalize(fsPath);
}

/** True when `candidatePath` is `basePath` itself or lives underneath it. */
export function isSameOrChild(basePath: string, candidatePath: string): boolean {
    const relative = path.relative(basePath, candidatePath);
    return (
        relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
    );
}

/**
 * Map a workspace resource onto its destination inside the ingest folder.
 *
 * With `preserveStructure` the resource keeps its workspace-relative path, so
 * `src/utils/helpers/example.ts` becomes `<ingest>/src/utils/helpers/example.ts`
 * instead of losing its location as a flat `<ingest>/example.ts`.
 */
export function resolveIngestDestination(
    workspaceRoot: string,
    resourcePath: string,
    preserveStructure: boolean,
): IngestDestination {
    const root = normalizePath(workspaceRoot);
    const resource = normalizePath(resourcePath);

    if (!isSameOrChild(root, resource)) {
        throw new Error('Selected item must be inside the workspace root.');
    }

    const relative = path.relative(root, resource);
    const segments = relative.split(path.sep).filter((segment) => segment !== '');
    if (segments.length === 0) {
        throw new Error('Selected item must be inside the workspace root.');
    }

    const relativePath = segments.join('/');
    return {
        segments: preserveStructure ? segments : [segments[segments.length - 1]],
        relativePath,
    };
}
