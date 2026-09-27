/**
 * Shared harness for the browser half.
 *
 * The browser half is a client-module registration script, not an importable module: the
 * facade must be installed before the script is evaluated, and the factory it submits is
 * materialized with a module-table require stub. Every client spec needs that much; only
 * the React shim differs per spec, so that stays with the spec.
 */
import { createElement } from 'react'
import { vi } from 'vitest'

/** One bundle registration as it arrives through the page-global facade. */
export interface ClientRegistration {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

let cached: ClientRegistration | undefined

/**
 * Install the facade and evaluate the browser half, once per test file (the module cache
 * makes a second import a no-op, so the registration is cached rather than re-collected).
 * @returns the single registration the script submits.
 */
export async function loadClientRegistration(): Promise<ClientRegistration> {
  if (cached !== undefined) return cached
  const registrations: ClientRegistration[] = []
  ;(globalThis as Record<string, unknown>).__ModuleLoader__ = {
    load: (registration: ClientRegistration) => { registrations.push(registration) },
  }
  // @ts-expect-error TS2306 the browser half is intentionally not a module
  await import('../src/client/index.ts')
  const registration = registrations[0]
  // The bundle must submit exactly one registration: two would mean the script ran twice
  // (a duplicate-load bug the shell would also see), none means it never registered.
  if (registration === undefined || registrations.length !== 1) {
    throw new Error(`expected exactly one registration, got ${registrations.length}`)
  }
  cached = registration
  return registration
}

/**
 * Materialize the factory with a module-table require stub.
 * @param registration - the registration to materialize.
 * @param react - the React surface this spec's components need.
 * @returns the plugin's exported surface.
 */
export function materializeClient(
  registration: ClientRegistration,
  react: unknown,
): Record<string, unknown> {
  return registration.factory((spec) => {
    if (spec === 'react') return react
    throw new Error(`unexpected module-table require: ${spec}`)
  })
}

/**
 * The React surface the presentational specs need: `createElement` plus inert hooks, so a
 * component that calls `useState`/`useEffect` renders one snapshot without a DOM.
 * @returns the shim to hand to {@link materializeClient}.
 */
export function inertReactShim(): Record<string, unknown> {
  return {
    createElement,
    useState: <T,>(initial: T): [T, (next: T) => void] => [initial, vi.fn()],
    useEffect: vi.fn(),
    useRef: <T,>(initial: T): { current: T } => ({ current: initial }),
  }
}
