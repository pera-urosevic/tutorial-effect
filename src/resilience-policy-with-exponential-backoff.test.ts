import { expect, test, describe } from 'vitest'
import { Effect, Exit, Cause } from 'effect'
import {
	executeWithRetry,
	FatalError,
	TransientError,
	type TaskFunction,
} from './resilience-policy-with-exponential-backoff.ts'

// Succeeds on the first attempt: no retries needed.
export const taskStable: TaskFunction = (i: number) => Effect.succeed(i)

// Fails with `TransientError` while `i < 3`, then succeeds: retries until the
// third attempt (the retry policy is allowed to recover this).
export const taskFlaky: TaskFunction = (i: number) =>
	i < 3
		? Effect.fail(new TransientError({ message: 'Transient Error', attempt: i }))
		: Effect.succeed(i)

// Always transient: exhausts the retry budget (initial attempt + 4 retries).
export const taskFailing: TaskFunction = (i: number) =>
	Effect.fail(new TransientError({ message: 'Transient Error', attempt: i }))

// Fatal on the first attempt: must fail immediately without retrying.
export const taskBroken: TaskFunction = (i: number) =>
	Effect.fail(new FatalError({ message: 'Fatal Error', attempt: i }))

// The task reports success with the attempt number that finally succeeded, so
// the expected value doubles as the expected number of attempts.
const expectSuccess = async (task: TaskFunction, expectedAttempts: number) => {
	const result = await Effect.runPromiseExit(executeWithRetry(task))
	Exit.match(result, {
		onSuccess: value => expect(value).toBe(expectedAttempts),
		onFailure: cause => expect.fail(`Failed with cause: ${cause}`),
	})
}

// On failure, `Cause.squash` recovers the tagged error so its `attempt` field
// can be asserted: this proves exactly how many tries were made.
const expectFailure = async (task: TaskFunction, expectedAttempts: number) => {
	const result = await Effect.runPromiseExit(executeWithRetry(task))
	Exit.match(result, {
		onSuccess: value => expect.fail(`Should have failed, attempt ${value}`),
		onFailure: cause => {
			const error = Cause.squash(cause)
			if (error instanceof TransientError || error instanceof FatalError) {
				expect(error.attempt).toBe(expectedAttempts)
			} else {
				expect.fail(`Unexpected cause: ${cause}`)
			}
		},
	})
}

describe('Resilience Policy with Exponential Backoff', () => {
	// Stable task: one attempt.
	test('should succeed stable task', () => expectSuccess(taskStable, 1))
	// Flaky task: fails twice, succeeds on attempt 3.
	test('should succeed flaky task', () => expectSuccess(taskFlaky, 3))
	// Transient task: 1 initial attempt + 4 retries = attempt 5 is the last.
	test('should fail failing task', () => expectFailure(taskFailing, 5))
	// Fatal task: no retry, so the first attempt is already the last.
	test('should fail broken task', () => expectFailure(taskBroken, 1))
})
