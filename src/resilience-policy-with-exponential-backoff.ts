/*

Resilience Policy with Exponential Backoff

Write a function `executeWithRetry` that executes an untrusted effect. Retry up to 4 times with
exponential backoff starting at 100ms (doubling each time) with jitter, but **only** retry if the
error is a `TransientError`. If a `FatalError` occurs, fail immediately without retrying.

*/

import { Effect, Data, Schedule, Ref } from 'effect'

// Transient failures are worth retrying; fatal ones are not. The `attempt`
// field lets tests (and logs) observe how many tries actually happened.
export class TransientError extends Data.TaggedError('TransientError')<{
	readonly message: string
	readonly attempt: number
}> {}

export class FatalError extends Data.TaggedError('FatalError')<{
	readonly message: string
	readonly attempt: number
}> {}

export type TaskResult = Effect.Effect<number, TransientError | FatalError>

export interface TaskFunction {
	(i: number): TaskResult
}

export const executeWithRetry = (task: TaskFunction) =>
	Effect.gen(function* () {
		// The counter lives inside the effect (not at module scope), so two
		// concurrent runs of `executeWithRetry` never share state.
		const attempt = yield* Ref.make(1)
		// `getAndUpdate` hands the current attempt to `task` and increments it,
		// so each retry receives a fresh attempt number.
		return yield* Ref.getAndUpdate(attempt, n => n + 1).pipe(
			Effect.flatMap(task),
			Effect.retry({
				// `times: 4` retries *on top of* the initial run => 5 attempts max.
				times: 4,
				// Delays of 100ms, 200ms, 400ms, 800ms ... with jitter added so
				// many clients don't retry in lockstep (thundering herd).
				schedule: Schedule.jittered(Schedule.exponential(100)),
				// The policy itself decides: only `TransientError` is retried, so a
				// `FatalError` short-circuits after the very first attempt.
				while: (error): boolean => error instanceof TransientError,
			}),
		)
	})
