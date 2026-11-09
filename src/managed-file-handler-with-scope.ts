/*

Managed File Handler with Scope

Implement `withFile`, which opens a file resource, executes a user-provided operation, and
guarantees that `close()` is invoked on the file handle whether the operation succeeds, fails, or
is interrupted.

*/

import fs from 'node:fs/promises'
import { Effect, Data } from 'effect'

// Bundles the path with the handle so cleanup code doesn't need the path again.
export interface FileInfo {
	readonly path: string
	readonly handle: fs.FileHandle
}

// Separate open/close errors make it obvious which phase failed.
export class FileOpenError extends Data.TaggedError('FileOpenError')<{
	readonly path: string
	readonly cause: unknown
}> {}

export class FileCloseError extends Data.TaggedError('FileCloseError')<{
	readonly path: string
	readonly cause: unknown
}> {}

export type FileError = FileOpenError | FileCloseError

export const openFile = (path: string): Effect.Effect<FileInfo, FileOpenError> =>
	// `tryPromise` converts a rejected promise into a typed failure via `catch`,
	// so the raw JS error never leaks into the error channel untagged.
	Effect.tryPromise({
		try: () => fs.open(path),
		catch: cause => new FileOpenError({ path, cause }),
	}).pipe(Effect.map(handle => ({ path, handle })))

export const closeFile = (fileInfo: FileInfo): Effect.Effect<void, FileCloseError> =>
	Effect.tryPromise({
		try: () => fileInfo.handle.close(),
		catch: cause => new FileCloseError({ path: fileInfo.path, cause }),
	})

export const withFile = <A, E, R>(
	path: string,
	use: (handle: FileInfo) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E | FileError, R> =>
	// `acquireUseRelease` is a bracket: acquire the handle, run `use`, then
	// release. The release step runs on success, failure *and* interruption,
	// so the file descriptor can never leak. The error channel unions the
	// user's error with ours.
	Effect.acquireUseRelease(openFile(path), use, closeFile)
