# Effect Tutorial

## [Hello World](./src/hello-world.ts)

Create a simple Effect that succeeds with a value "Hello World!"

## [Safe Divide](./src/safe-divide.ts)

Implement `safeDivide` that returns an `Effect` that either succeeds with the result of the
division or fails with an error (if the divisor is zero).

## [Safe Array Element Access](./src/safe-array-element-access.ts)

Write a function `getElementAt` that safely accesses an element from an array by index. If the
index is negative or out of bounds, fail with an explicit tagged error `IndexOutOfBounds`.

## [User Greeting with Profile Fallback](./src/user-greeting-with-profile-fallback.ts)

Write a function greetUser that takes a numeric user ID. Look up the user with
`fetchUser(id: number): Effect.Effect<User, UserNotFound>`, then look up their profile with
`fetchProfile(id: number): Effect.Effect<Profile, ProfileNotFound>`. If the user does not
exist, fail with UserNotFound. If the profile is unavailable, fall back to the user's real
name instead of failing. Return "Hello, <role> <name>!", preferring the profile nickname when it
exists. Implement greetUser with Effect.gen.

## [Parallel Batch Fetcher with Partial Fallback](./src/parallel-batch-fetcher-with-partial-fallback.ts)

Write a function `fetchBatch` that takes an array of numeric IDs and fetches items using
`fetchItem(id: number): Effect.Effect<string, NotFound | NetworkError>`. If any lookup fails with
`NotFound`, substitute the result with `"UNKNOWN"`. If any lookup fails with `NetworkError`, fail
the entire batch effect.

## [Runtime Schema Validation with Branding](./src/runtime-schema-validation-with-branding.ts)

Define a schema `UserId` (a branded non-empty string) and a user payload schema `UserSchema` with
`id: UserId` and `age: number` (integer between 0 and 150). Create a function `parseUser` that
decodes an unknown object into a valid `User` model, mapping validation errors to a custom
`ValidationError`.

## [Resilience Policy with Exponential Backoff](./src/resilience-policy-with-exponential-backoff.ts)

Write a function `executeWithRetry` that executes an untrusted effect. Retry up to 4 times with
exponential backoff starting at 100ms (doubling each time) with jitter, but **only** retry if the
error is a `TransientError`. If a `FatalError` occurs, fail immediately without retrying.

## [Managed File Handler with Scope](./src/managed-file-handler-with-scope.ts)

Implement `withFile`, which opens a file resource, executes a user-provided operation, and
guarantees that `close()` is invoked on the file handle whether the operation succeeds, fails, or
is interrupted.
