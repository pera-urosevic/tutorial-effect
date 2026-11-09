import { test, expect, describe } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
import {
	fetchBatch,
	fetchItem,
	NetworkError,
	NotFound,
} from './parallel-batch-fetcher-with-partial-fallback.ts'

// Runs the batch effect and keeps the full `Exit` so both channels are visible.
const run = (ids: ReadonlyArray<number>) => Effect.runPromiseExit(fetchBatch(ids, fetchItem))

// Asserts the batch succeeded and that results kept the input order.
const expectSuccess = (
	result: Exit.Exit<ReadonlyArray<string>, NotFound | NetworkError>,
	expectedResult: ReadonlyArray<string>,
) => {
	if (Exit.isSuccess(result)) {
		expect(result.value).toEqual(expectedResult)
	} else {
		expect.fail(`expected success, got: ${String(result.cause)}`)
	}
}

// Any failure in the batch (e.g. `NetworkError`) must surface here.
const expectFailure = (result: Exit.Exit<ReadonlyArray<string>, NotFound | NetworkError>) =>
	Exit.match(result, {
		onSuccess: value => expect.fail(`expected failure, got: ${JSON.stringify(value)}`),
		onFailure: cause => {
			// `Cause.squash` unwraps the tagged error so its type and fields can be
			// asserted instead of accepting any failure whatsoever.
			const error = Cause.squash(cause)
			expect(error).toBeInstanceOf(NetworkError)
			if (error instanceof NetworkError) {
				expect(error.reason).toBe('Network Error')
			}
		},
	})

describe('Parallel Batch Fetcher with Partial Fallback', () => {
	// No failures: every item is fetched and returned in input order.
	test('should succeed fetching without errors', async () =>
		expectSuccess(await run([1, 2, 3]), ['Item #1', 'Item #2', 'Item #3']))

	// Id 7 fails with `NotFound`, which is replaced by "UNKNOWN" in place.
	test('should succeed fetching with unknown items', async () =>
		expectSuccess(await run([6, 7, 8]), ['Item #6', 'UNKNOWN', 'Item #8']))

	// Empty input yields an empty result (no lookups, no failures).
	test('should succeed with empty', async () => expectSuccess(await run([]), []))

	// Id 11 fails with `NetworkError`, which is *not* recoverable and must fail
	// the whole batch even though the other items could have succeeded.
	test('should fail fetching with `NetworkError`', async () =>
		expectFailure(await run([10, 11, 12])))
})
