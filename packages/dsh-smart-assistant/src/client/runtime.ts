/**
 * The factory's module-table require, held for the split modules.
 *
 * The client source is multi-module now (relative imports, bundled by tsdown into one
 * classic script), but every runtime dependency still comes through the synchronous
 * require the page-global facade hands to the factory — no bare external import anywhere
 * in the source tree. The entry binds the require once per factory run; the modules take
 * `createElement` from that binding (the single destructure the single-file original
 * performed at materialization) and call {@link reactSurface} wherever a component used to
 * destructure hooks from an inline `require('react')`.
 *
 * @module dsh-smart-assistant/client/runtime
 */

import type { ClientRequire } from './contracts'

/** The react createElement, bound at materialization (live binding — see bindClientRequire). */
export let createElement: typeof import('react')['createElement']

let boundRequire: ClientRequire | undefined

/**
 * Bind the synchronous module-table require handed to the factory and take the react
 * surface from it ('react' is a baseline external every dynamic bundle may request).
 * @param require - Synchronous module-table require; one binding per factory run.
 */
export function bindClientRequire(require: ClientRequire): void {
  boundRequire = require
  const surface = require('react') as typeof import('react')
  createElement = surface.createElement
}

/**
 * The react surface for per-use hook destructures — the exact shape of the original's
 * inline `const { useState } = require('react')` inside component bodies.
 * @returns the react surface of the bound module-table require.
 */
export function clientRequire<T = unknown>(specifier: string): T {
  if (boundRequire === undefined) throw new Error('client factory not materialized — no module-table require is bound')
  return boundRequire(specifier) as T
}

export function reactSurface(): typeof import('react') {
  if (boundRequire === undefined) {
    throw new Error('client factory not materialized — no module-table require is bound')
  }
  return boundRequire('react') as typeof import('react')
}
