import { Effect } from 'effect'

/*

Safe Divide

Implement `safeDivide` that returns a `Effect` that either succeeds with the result of the
division or fails with an error (if the divisor is zero).

*/

export const safeDivide = (dividend: number, divisor: number) =>
	// Division by zero becomes a *typed* failure: `Effect.fail` puts the error in
	// the error channel instead of throwing, so callers must handle it explicitly.
	divisor === 0
		? Effect.fail(new Error('Division by zero'))
		: // Happy path: `Effect.succeed` keeps the result in the success channel.
			Effect.succeed(dividend / divisor)
