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
import { createSnapshotStore, defineStore } from '@deepseek-ai/dsh-client-store'
import * as clientTestSurface from './client-surface.harness.ts'

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
  // S2 (261007 bigfile-split): the browser half is multi-module source bundled by tsdown,
  // so the entry imports its sibling modules — vitest follows those relative imports and
  // evaluates the tree the way the bundler would inline it.
  await import('../../src/client/index.ts')
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
  return {
    // The test-only surface stays out of the serving entry; the factory still supplies inject/apply
    // and the live desk store, and binding happens before any component is called.
    ...clientTestSurface,
    ...registration.factory((spec) => {
      if (spec === 'react') return react
      if (spec === '@deepseek-ai/dsh-client-store') return { createSnapshotStore, defineStore }
      throw new Error(`unexpected module-table require: ${spec}`)
    }),
  }
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

/**
 * Collect every text node a React tree renders, invoking custom components the way
 * React would so rows delegated to other components (CorrectableRow) contribute
 * their copy. Booleans render nothing; numbers render their digits — both branches
 * are load-bearing for specs that assert on rendered copy.
 *
 * Specs whose traversal differs on purpose (no component invocation, different
 * filtering) keep a local walker instead of bending this one to match: unifying
 * them would silently change what those specs assert on.
 */
export function textsOf(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string') return [node]
  if (typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(textsOf)
  const element = node as { type?: unknown, props?: { children?: unknown } }
  // A custom component is an element whose type is a function: invoke it the way React would.
  if (typeof element.type === 'function') {
    return textsOf((element.type as (props: unknown) => unknown)(element.props))
  }
  return element.props === undefined ? [] : textsOf(element.props.children)
}
