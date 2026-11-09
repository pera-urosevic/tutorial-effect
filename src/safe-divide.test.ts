import { expect, test, describe } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
import { safeDivide } from './safe-divide.ts'

describe('Safe Divide', () => {
	// Success path: `runSync` returns the success value directly.
	test('should divide when divisor is not zero', () => {
		const result = Effect.runSync(safeDivide(10, 2))
		expect(result).toEqual(5)
	})

	// Failure path: `runSyncExit` captures the failure as an `Exit` value
	// instead of throwing, so both channels stay inspectable.
	test('should return error when divide by zero', () => {
		// Dividing by zero must fail with this exact error, not return Infinity.
		const exit = Effect.runSyncExit(safeDivide(10, 0))
		// Inspect the cause rather than comparing the whole Exit: squashing
		// recovers the underlying error from the failure cause.
		if (Exit.isFailure(exit)) {
			expect(Cause.squash(exit.cause)).toEqual(new Error('Division by zero'))
		} else {
			expect.fail('The result should be an error')
		}
	})
})
