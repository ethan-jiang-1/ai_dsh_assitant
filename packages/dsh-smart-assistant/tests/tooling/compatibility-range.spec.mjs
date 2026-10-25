/**
 * The install gate is the semver range in `engines.dsh`; DSH evaluates it with prereleases
 * included. `<0.3.0` would admit `0.3.0-rc.1` because a prerelease sorts before its release, so
 * the upper bound must be `<0.3.0-0`. This pins the declared range's actual boundary; it is a
 * range test, not a run against those DSH versions (that remains the T6 matrix).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8'))
const range = manifest.engines.dsh
const accepts = version => semver.satisfies(version, range, { includePrerelease: true })

describe('engines.dsh range boundary', () => {
  it('is a range, not an exact pin', () => {
    expect(range).toBe('>=0.2.1-rc.2 <0.3.0-0')
  })

  it('accepts the tested lower bound and future 0.2.x releases', () => {
    for (const version of ['0.2.1-rc.2', '0.2.1', '0.2.9', '0.2.10']) {
      expect(accepts(version), version).toBe(true)
    }
  })

  it('rejects older versions and every 0.3.0 prerelease or release', () => {
    for (const version of ['0.2.0-rc.2', '0.3.0-0', '0.3.0-alpha.1', '0.3.0-rc.1', '0.3.0', '0.3.1']) {
      expect(accepts(version), version).toBe(false)
    }
  })
})
