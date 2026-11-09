import { describe, expect, test } from 'vitest'
import { Effect } from 'effect'
import { helloWorld } from './hello-world.ts'

describe('Hello World', () => {
	// `runSync` is safe here because the effect is pure, synchronous and cannot
	// fail: it simply unwraps the success value.
	test('should hello world', () => {
		const result = Effect.runSync(helloWorld)
		expect(result).toEqual('Hello World!')
	})
})
