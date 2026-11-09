import { Data, Effect } from 'effect'

/*

User Greeting with Profile Fallback

Write a function `greetUser` that takes a numeric user ID. Look up the user with
`fetchUser(id: number): Effect.Effect<User, UserNotFound>`, then look up their profile with
`fetchProfile(id: number): Effect.Effect<Profile, ProfileNotFound>`. If the user does not
exist, fail with UserNotFound. If the profile is unavailable, fall back to the user's real
name instead of failing. Return "Hello, <role> <name/nickname>!", preferring the profile nickname when it
exists. Implement greet with Effect.gen.

*/

// Errors are values, not exceptions: each one records the data needed to
// explain the failure to the caller.
export class UserNotFound extends Data.TaggedError('UserNotFound')<{ readonly id: number }> {}

export class ProfileNotFound extends Data.TaggedError('ProfileNotFound')<{
	readonly id: number
	readonly reason: string
}> {}

// Plain domain models: data shapes need no Effect wrapper.
export interface User {
	readonly id: number
	readonly role: string
	readonly name: string
}

export interface Profile {
	readonly id: number
	readonly nickname: string
}

// Stubbed "database": it returns an Effect instead of a Promise, so the error
// type (`UserNotFound`) is tracked statically in the signature.
export const fetchUser = (id: number): Effect.Effect<User, UserNotFound> => {
	if (id === 1) return Effect.succeed({ id: 1, role: 'Engineer', name: 'Alice' })
	if (id === 2) return Effect.succeed({ id: 2, role: 'Designer', name: 'Bob' })
	return Effect.fail(new UserNotFound({ id }))
}

// Only user 1 has a profile; everyone else exercises the fallback path.
export const fetchProfile = (id: number): Effect.Effect<Profile, ProfileNotFound> => {
	if (id === 1) return Effect.succeed({ id: 1, nickname: 'Alie' })
	return Effect.fail(new ProfileNotFound({ id, reason: 'Unknown Profile' }))
}

export const greetUser = (id: number): Effect.Effect<string, UserNotFound> =>
	// `Effect.gen` allows sequential, async-looking code: every `yield*` unwraps
	// a success value and short-circuits the generator on failure.
	Effect.gen(function* () {
		// A missing user is fatal: the error escapes the generator untouched.
		const user = yield* fetchUser(id)
		// Recover *only* from a missing profile. `catchTag` removes
		// `ProfileNotFound` from the error channel and substitutes the real name,
		// so `nicknameOrName` is always a `string`.
		const nicknameOrName = yield* fetchProfile(id).pipe(
			Effect.map(profile => profile.nickname),
			Effect.catchTag('ProfileNotFound', () => Effect.succeed(user.name)),
		)
		return `Hello, ${user.role} ${nicknameOrName}!`
	})
