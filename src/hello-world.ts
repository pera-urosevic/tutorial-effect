import { Effect } from 'effect'

/*

Hello World

Create a simple effect that succeeds with a value "Hello World!"

*/

// `Effect.succeed` lifts a plain value into the Effect world.
// Nothing runs yet: an Effect is a *description* of a computation, and this
// one can only succeed, so its error type is `never`.
export const helloWorld = Effect.succeed('Hello World!')
