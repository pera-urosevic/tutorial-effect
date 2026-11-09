/*

Parallel Batch Fetcher with Partial Fallback

Write a function `fetchBatch` that takes an array of numeric IDs and fetches items using
`fetchItem(id: number): Effect.Effect<string, NotFound | NetworkError>`. If any lookup fails with
`NotFound`, substitute the result with `"UNKNOWN"`. If any lookup fails with `NetworkError`, fail
the entire batch effect.

*/

import { Effect, Data } from 'effect'

// Two distinct failure kinds, so the batch can treat them differently:
// `NotFound` is recoverable per item, `NetworkError` is not.
export class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}
export class NetworkError extends Data.TaggedError('NetworkError')<{ readonly reason: string }> {}

// Fake service: ids 7 and 11 are the "sad paths" used by the tests.
export const fetchItem = (id: number) =>
	Effect.gen(function* () {
		if (id === 7) {
			return yield* Effect.fail(new NotFound({ id }))
		}
		if (id === 11) {
			return yield* Effect.fail(new NetworkError({ reason: 'Network Error' }))
		}
		return `Item #${id}`
	})

export const fetchBatch = (
	ids: ReadonlyArray<number>,
	fetcher: (id: number) => Effect.Effect<string, NotFound | NetworkError>,
) => {
	// `Effect.forEach` runs every lookup concurrently and collects the results
	// in input order, regardless of which one finishes first.
	return Effect.forEach(
		ids,
		id =>
			fetcher(id).pipe(
				// Only `NotFound` is downgraded to a successful "UNKNOWN";
				// `NetworkError` stays in the error channel and aborts the batch.
				Effect.catchTags({
					NotFound: () => Effect.succeed('UNKNOWN'),
				}),
			),
		// No cap on in-flight requests: all ids are fetched at the same time.
		{ concurrency: 'unbounded' },
	)
}
