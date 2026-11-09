import { describe, expect, test } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
import { greetUser, UserNotFound } from './user-greeting-with-profile-fallback.ts'

describe('User Greeting with Profile Fallback', () => {
	// User 1 has a profile, so the nickname wins over the real name.
	test('should use nickname if available', () => {
		const result = Effect.runSync(greetUser(1))
		expect(result).toEqual('Hello, Engineer Alie!')
	})

	// User 2 exists but has no profile: `ProfileNotFound` is swallowed and the
	// real name is used instead.
	test('should use name as fallback if profile not available', () => {
		const result = Effect.runSync(greetUser(2))
		expect(result).toEqual('Hello, Designer Bob!')
	})

	// Unknown user: `UserNotFound` must escape. `Cause.squash` unwraps the
	// failure cause back to the original tagged error for assertions.
	test('should fail if user not found', () => {
		const exit = Effect.runSyncExit(greetUser(3))
		expect(Exit.isFailure(exit)).toBe(true)
		if (Exit.isFailure(exit)) {
			const error = Cause.squash(exit.cause)
			expect(error).toBeInstanceOf(UserNotFound)
			if (error instanceof UserNotFound) {
				expect(error.id).toBe(3)
			}
		}
	})
})
