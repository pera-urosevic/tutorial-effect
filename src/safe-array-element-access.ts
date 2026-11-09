/*

Safe Array Element Access

Write a function `getElementAt` that safely accesses an element from an array by index. If the
index is negative or out of bounds, fail with an explicit tagged error `IndexOutOfBounds`.

*/

import { Effect, Data } from 'effect'

// A tagged error makes the failure a first-class value: callers can match on
// `_tag` (e.g. with `Effect.catchTag`) and stay type-safe and exhaustive.
export class IndexOutOfBounds extends Data.TaggedError('IndexOutOfBounds')<{
	readonly index: number
	readonly length: number
}> {}

export const getElementAt = <A>(
	array: ReadonlyArray<A>,
	index: number,
): Effect.Effect<A, IndexOutOfBounds> =>
	// `index in array` is stricter than `array[index] !== undefined`: it rejects
	// negative, fractional and NaN indices, out-of-bounds access and holes in
	// sparse arrays, while still allowing an element whose value is `undefined`.
	index in array
		? // The non-null assertion is safe: `in` just proved the key exists.
			Effect.succeed(array[index]!)
		: // The failure carries enough context (index + length) to debug callers.
			Effect.fail(new IndexOutOfBounds({ index, length: array.length }))
