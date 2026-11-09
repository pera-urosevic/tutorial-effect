import { describe, expect, test } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
import { FileOpenError, withFile, type FileInfo } from './managed-file-handler-with-scope.ts'

describe('Managed File Handler with Scope', () => {
	// Successful operation: the user's operation reads the file while the handle is open.
	test('should succeed reading', async () => {
		const path = 'test/example.txt'
		const expectedContent = 'OK\n'
		const exit = await Effect.runPromiseExit(
			withFile(path, handle => Effect.tryPromise(() => handle.handle.readFile('utf8'))),
		)
		expect(Exit.isSuccess(exit)).toBe(true)
		expect(Exit.isSuccess(exit) && exit.value).to.equal(expectedContent)
	})

	// Proves the release step ran: a closed `FileHandle` reports `fd === -1`,
	// so the effect returns the (now closed) handle without leaking the fd.
	test('should close file', async () => {
		const path = 'test/example.txt'
		const exit = await Effect.runPromiseExit(withFile(path, handle => Effect.succeed(handle)))
		expect(Exit.isSuccess(exit)).toBe(true)
		if (Exit.isSuccess(exit)) {
			expect(exit.value.handle.fd).toBe(-1)
		} else {
			expect.fail('Unexpected fail')
		}
	})

	// A missing file fails during *acquire*, so `use` never runs and the error
	// is our tagged `FileOpenError`, not a raw filesystem error.
	test('should fail opening non existing file', async () => {
		const path = 'test/imaginary.txt'
		const exit = await Effect.runPromiseExit(
			withFile(path, handle => Effect.tryPromise(() => handle.handle.readFile('utf8'))),
		)
		expect(Exit.isFailure(exit)).toBe(true)
		if (Exit.isFailure(exit)) {
			const error = Cause.squash(exit.cause)
			expect(error).toBeInstanceOf(FileOpenError)
		}
	})

	// A failure *inside* `use` must still trigger release: the file info is
	// captured in the error's details, and its handle is closed (`fd === -1`)
	// by the time the failure reaches the caller.
	test('should handle failure inside "use"', async () => {
		interface ErrorDetails {
			fileInfo: FileInfo
		}

		class UseError extends Error {
			public details: ErrorDetails

			constructor(message: string, details: ErrorDetails) {
				super(message)
				this.name = 'UseError'
				this.details = details
			}
		}

		const path = 'test/example.txt'
		const exit = await Effect.runPromiseExit(
			withFile(path, fileInfo =>
				Effect.tryPromise(() => {
					throw new UseError('Intentional Error', { fileInfo })
				}),
			),
		)
		expect(Exit.isFailure(exit)).toBe(true)
		if (Exit.isFailure(exit)) {
			const error = Cause.squash(exit.cause)
			if (error instanceof Error && error.cause instanceof UseError) {
				expect(error.cause.details.fileInfo.handle.fd).toBe(-1)
			} else {
				expect.fail(`Unexpected cause: ${exit.cause}`)
			}
		}
	})
})
