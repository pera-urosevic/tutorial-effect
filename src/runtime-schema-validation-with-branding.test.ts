import { describe, expect, test } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
import { parseUser, ValidationError, type User } from './runtime-schema-validation-with-branding.ts'

// Decoding is synchronous and effectful, so `runSyncExit` gives us the full Exit.
const run = (input: unknown) => Effect.runSyncExit(parseUser(input))

const expectSuccess = (input: unknown, expected: User) => {
	const exit = run(input)

	if (Exit.isFailure(exit)) {
		expect.fail(`expected success, got: ${JSON.stringify(exit.cause)}`)
	}

	// On success the decoded value should be structurally identical to the input.
	expect(exit.value).toEqual(expected)
}

const expectFailure = (input: unknown) => {
	const exit = run(input)

	Exit.match(exit, {
		onSuccess: value => expect.fail(`expected failure, got: ${JSON.stringify(value)}`),
		onFailure: cause => {
			// `Cause.squash` unwraps the tagged error so the test proves *which*
			// failure occurred instead of accepting any failure at all.
			const error = Cause.squash(cause)
			expect(error).toBeInstanceOf(ValidationError)
		},
	})
}

// A valid payload reused by the tests below; each case breaks one field.
const example = { id: 'Jack', age: 30 }

describe('Runtime Schema Validation with Branding', () => {
	// Baseline: a valid payload decodes into a branded `User`.
	test('should succeed parsing user', () => expectSuccess(example, example as User))
	// `UserId` must be a non-empty string.
	test('should fail parsing blank id', () => expectFailure({ ...example, id: '' }))
	test('should fail parsing undefined id', () => expectFailure({ ...example, id: undefined }))
	// `UserAge` must be an integer...
	test('should fail parsing floating point age', () => expectFailure({ ...example, age: 30.5 }))
	// ...within the inclusive range 0..150.
	test('should fail parsing negative age', () => expectFailure({ ...example, age: -1 }))
	test('should fail parsing age out of range', () => expectFailure({ ...example, age: 151 }))
	// ...and of type number.
	test('should fail parsing age as string', () => expectFailure({ ...example, age: 'thirty' }))
	test('should fail parsing age as undefined', () => expectFailure({ ...example, age: undefined }))
	// Non-object inputs must be rejected before field validation even starts.
	test('should fail parsing null', () => expectFailure(null))
	test('should fail parsing empty array', () => expectFailure([]))
	// Missing required fields are validation errors too.
	test('should fail parsing empty object', () => expectFailure({}))
})
