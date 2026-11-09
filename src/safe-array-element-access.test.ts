import { expect, test, describe } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
import { getElementAt, IndexOutOfBounds } from './safe-array-element-access.ts'

// Runs the effect synchronously but keeps the whole `Exit`, so both channels
// (success value and typed failure) can be inspected.
export const run = <A>(array: ReadonlyArray<A>, index: number) =>
	Effect.runSyncExit(getElementAt(array, index))

// Both the channel and the returned element matter: asserting the value catches
// an implementation that succeeds with the wrong element (or `undefined`).
const expectSuccess = <A>(array: ReadonlyArray<A>, index: number, expected: A) =>
	Exit.match(run(array, index), {
		onSuccess: value => expect(value).toEqual(expected),
		onFailure: cause => expect.fail(`expected success, got: ${String(cause)}`),
	})

// The failure must be an `IndexOutOfBounds` carrying the offending index and
// array length, not merely *some* failure.
const expectFailure = <A>(array: ReadonlyArray<A>, index: number) =>
	Exit.match(run(array, index), {
		onSuccess: value => expect.fail(`expected failure, got: ${JSON.stringify(value)}`),
		onFailure: cause => {
			const error = Cause.squash(cause)
			expect(error).toBeInstanceOf(IndexOutOfBounds)
			if (error instanceof IndexOutOfBounds) {
				expect(error.index).toBe(index)
				expect(error.length).toBe(array.length)
			}
		},
	})

describe('Safe Array Element Access', () => {
	// Ordinary in-bounds access.
	test('should return regular element', () => expectSuccess([1, 2, 3], 1, 2))
	// A stored `undefined` is a valid element, not a missing one.
	test('should return undefined element', () => expectSuccess([undefined, 2], 0, undefined))
	// Out-of-bounds and negative indices are typed failures.
	test('should fail index too high', () => expectFailure([1, 2, 3], 5))
	test('should fail negative index', () => expectFailure([1, 2, 3], -1))
	// `1.5` and `NaN` are not valid array keys.
	test('should fail floating point index', () => expectFailure([1, 2, 3], 1.5))
	test('should fail NaN index', () => expectFailure([1, 2, 3], NaN))
	test('should fail empty array', () => expectFailure([], 0))
	// `[1, , 3]` has a hole at index 1: `in` reports that key as missing.
	test('should fail sparse array missing element', () => expectFailure([1, , 3], 1))
})
