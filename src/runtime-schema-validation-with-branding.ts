/*

Runtime Schema Validation with Branding

Define a schema `UserId` (a branded non-empty string) and a user payload schema `UserSchema` with
`id: UserId` and `age: number` (integer between 0 and 150). Create a function `parseUser` that
decodes an unknown object into a valid `User` model, mapping validation errors to a custom
`ValidationError`.

*/

import { Effect, Schema, Data } from 'effect'

// Branding is compile-time only: `UserId` is still a string at runtime, but the
// brand prevents arbitrary strings from being passed where an id is expected.
export const UserIdSchema = Schema.NonEmptyString.pipe(Schema.brand('UserId'))
export type UserId = Schema.Schema.Type<typeof UserIdSchema>

// Integer plus inclusive range: floats, negatives and values above 150 all fail.
export const UserAgeSchema = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 150 }))
export type UserAge = Schema.Schema.Type<typeof UserAgeSchema>

// Our own domain error, so callers never depend on Schema's internal error type.
export class ValidationError extends Data.TaggedError('ValidationError')<{
	readonly message: string
}> {}

// The payload shape: both fields must validate before a `User` can exist.
const UserSchema = Schema.Struct({
	id: UserIdSchema,
	age: UserAgeSchema,
})
export type User = Schema.Schema.Type<typeof UserSchema>

// Turn the schema into an Effect-returning decoder so validation composes with
// the rest of the effect pipeline (and stays lazy until the effect is run).
export const decodeUser = Schema.decodeUnknownEffect(UserSchema)

export const parseUser = (input: unknown) =>
	// `mapError` translates the library's parse error into `ValidationError`,
	// keeping the public API independent of Effect's schema internals.
	decodeUser(input).pipe(Effect.mapError(cause => new ValidationError({ message: cause.message })))
