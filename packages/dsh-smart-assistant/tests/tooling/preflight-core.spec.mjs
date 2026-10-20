/**
 * Preflight Remote-namespace extraction (`dev/probes/web/preflight-core.mjs`).
 *
 * Acceptance points:
 * - the generated remotes bundle's `<namespace>/<method>` keys are the manifest;
 * - the built client bundle's double-quoted `const inject` list is read, as is the source's
 *   single-quoted form;
 * - an empty parse is a failure, not a green (the old `namespace: "..."` regex parsed zero
 *   and every preflight passed vacuously);
 * - a declared namespace absent from the manifest is a failure.
 */
import { describe, expect, it } from 'vitest'
import {
  declaredRemoteNamespaces,
  inspectRemoteNamespaces,
  remoteNamespacesFromBundle,
} from '../../../../dev/probes/web/preflight-core.mjs'

const manifest = `
const TYPERT_REMOTE$1 = createTypertRemoteInfo({
  package: "@deepseek-ai/dsh-agent-preset-registry",
  methods: {
    "agentPresets/list": { service: "agentPresets" },
    "agentPresets/select": { service: "agentPresets" },
  },
})
const TYPERT_REMOTE$2 = createTypertRemoteInfo({
  package: "@deepseek-ai/dsh-api-session-controller",
  methods: {
    "session/prompt": { service: "sessionController" },
    "skills/list": { service: "sessionController" },
  },
})
`

describe('remoteNamespacesFromBundle', () => {
  it('reads namespaces from method keys, not from service or namespace fields', () => {
    expect(remoteNamespacesFromBundle(manifest)).toEqual(['agentPresets', 'session', 'skills'])
  })

  it('returns nothing when only service lines are present (the old vacuum-green shape)', () => {
    expect(remoteNamespacesFromBundle('service: "agentPresets"')).toEqual([])
  })
})

describe('declaredRemoteNamespaces', () => {
  it('reads the built bundle double-quoted inject list', () => {
    const bundle = 'const inject = [\n\t"slots",\n\t"remote.agentPresets",\n\t"remote.session"\n];'
    expect(declaredRemoteNamespaces([bundle])).toEqual(['agentPresets', 'session'])
  })

  it('reads the source single-quoted inject list too', () => {
    const bundle = "const inject = ['slots', 'remote.workspaceFiles', 'remote.schedule']"
    expect(declaredRemoteNamespaces([bundle])).toEqual(['schedule', 'workspaceFiles'])
  })
})

describe('inspectRemoteNamespaces', () => {
  it('passes when every declared namespace is in the manifest', () => {
    const bundle = 'const inject = ["remote.agentPresets", "remote.session"]'
    expect(inspectRemoteNamespaces({ manifestText: manifest, bundleTexts: [bundle] })).toEqual({
      namespaces: ['agentPresets', 'session', 'skills'],
      declared: ['agentPresets', 'session'],
      problems: [],
    })
  })

  it('fails when the manifest parses zero namespaces', () => {
    const result = inspectRemoteNamespaces({ manifestText: 'service: "agentPresets"', bundleTexts: ['const inject = ["remote.agentPresets"]'] })
    expect(result.problems.join('\n')).toContain('parsed 0 namespaces')
  })

  it('fails when our bundle declares no remote injects', () => {
    const result = inspectRemoteNamespaces({ manifestText: manifest, bundleTexts: ['const inject = ["slots"]'] })
    expect(result.problems.join('\n')).toContain('carries no remote.* injects')
  })

  it('fails when a declared namespace is absent from the manifest', () => {
    const result = inspectRemoteNamespaces({ manifestText: manifest, bundleTexts: ['const inject = ["remote.schedule"]'] })
    expect(result.problems.join('\n')).toContain('remote.schedule')
  })
})
