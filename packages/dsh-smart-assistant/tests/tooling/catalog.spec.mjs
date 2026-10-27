/**
 * Fixtures for the catalog generator's pure parts (`scripts/generate/gen-catalog.mjs`). The real catalog
 * is freshness-gated by `pnpm verify`; these pin the extraction rules that make the gate
 * trustworthy: disable-only rows are legal, a nameless-and-disabled-less row fails loud, an
 * unrecognised tool declaration fails loud instead of silently thinning the catalog, and the
 * client seat extraction reads every seat family and fails loud on an undiscoverable tab.
 */
import { describe, expect, it } from 'vitest'
import { collectCatalog, extractClientSurface, extractTool, parseRows, renderCatalog } from '../../../../scripts/generate/gen-catalog.mjs'

describe('parseRows', () => {
  it('reads id/name/disabled rows and accepts a disable-only directive', () => {
    const rows = parseRows([
      '- id: headless-runner',
      '  disabled: true',
      '- insert:',
      '    - id: preset-runner',
      '      name: dsh-smart-assistant/preset-runner',
      '      config:',
      '        task: x',
    ].join('\n'))
    expect(rows).toEqual([
      { id: 'headless-runner', indent: 0, disabled: 'true' },
      { id: 'preset-runner', indent: 4, name: 'dsh-smart-assistant/preset-runner' },
    ])
  })

  it('fails loud on a row with neither name nor disabled', () => {
    expect(() => parseRows('- id: broken\n  config:\n    x: 1\n')).toThrow(/neither name nor disabled/)
  })
})

describe('extractTool', () => {
  it('reads a const ACTIONS enum and an inline enum alike', () => {
    const viaConst = "const ACTIONS = ['recall', 'save'] as const\nname: 'assistant_memory',\n"
    expect(extractTool(viaConst, 'fixture')).toEqual({ name: 'assistant_memory', actions: ['recall', 'save'] })
    const inline = "name: 'assistant_reflect',\n  action: { type: 'string', enum: ['brief', 'save_skill'] },\n"
    expect(extractTool(inline, 'fixture')).toEqual({ name: 'assistant_reflect', actions: ['brief', 'save_skill'] })
  })

  it('fails loud when the name or the action enum is missing', () => {
    expect(() => extractTool("const ACTIONS = ['x'] as const\n", 'fixture')).toThrow(/no tool name/)
    expect(() => extractTool("name: 'assistant_x',\n", 'fixture')).toThrow(/no action enum/)
  })
})

describe('extractClientSurface', () => {
  const fixture = [
    "function clientFactory(require: ClientRequire): Record<string, unknown> {",
    "  ctx.slots.inject('sidebar.brand.mark', () => mark)",
    "  ctx.slots.inject('sidebar.brand.name', function* () { yield name })",
    "  const roomTabs = [",
    "    {",
    "      id: 'dsh-smart-assistant-desk', kind: 'desk', title: '我的桌面', body: DeskTabBody,",
    "      description: '现在要采取什么行动',",
    "      icon: DeskIcon, order: 10,",
    "    },",
    "  ] as const",
    "  for (const room of roomTabs) {",
    "    ctx.sidebarRightTabs.register({",
    "      id: room.id,",
    "      kind: room.kind,",
    "      guide: [{ id: `${room.id}-guide`, order: room.order }],",
    "    })",
    "    ctx.slots.inject('sidebar.right.pane.tab', () =>",
    "      ctx.slots.register({ name: 'sidebar.right.pane.tab', key: room.id }, room.body))",
    "    ctx.slots.inject('sidebar.right.pane.tab.title', () =>",
    "      ctx.slots.register({ name: 'sidebar.right.pane.tab.title', key: room.id }, title))",
    "  }",
    "  ctx.slots.inject('conversation.session.header.utilities', () =>",
    "    ctx.slots.register({ name: 'conversation.session.header.utilities', id: 'assistant-desk-chip' }, chip))",
    "  ctx.inject?.(['commandUi'], (scope) => {",
    "    for (const contribution of roomCommands(openBeside)) commandUi.register(contribution)",
    "  })",
    "  ctx.slots.inject('conversation.hero.brand.mark', () => hero)",
    "  ctx.slots.inject('conversation.input.dock', () => dock)",
    "  ctx.slots.inject('conversation.chat.assistant-actions', () => actions)",
    '}',
    "function roomCommands(open: (kind: RoomKind) => void): CommandContribution[] {",
    "  return [",
    "    {",
    "      name: 'desk',",
    "      label: () => DESK_LABEL,",
    "      ui: { kind: 'action', run: () => { open('desk') } },",
    "    },",
    "    {",
    "      name: 'desk-activity',",
    "      label: () => ACTIVITY_LABEL,",
    "      ui: { kind: 'action', run: () => { open('activity') } },",
    "    },",
    "  ]",
    '}',
  ].join('\n')

  it('reads every consumed seat, the room tab definitions, and the command names', () => {
    const surface = extractClientSurface(fixture)
    expect(surface.seats).toEqual([
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'sidebar.right.pane.tab',
      'sidebar.right.pane.tab.title',
      'conversation.session.header.utilities',
      'conversation.hero.brand.mark',
      'conversation.input.dock',
      'conversation.chat.assistant-actions',
    ])
    expect(surface.roomTabs).toEqual([
      { id: 'dsh-smart-assistant-desk', kind: 'desk' },
    ])
    expect(surface.commands).toEqual(['desk', 'desk-activity'])
  })

  it('fails loud when the source carries no recognizable seat surface', () => {
    expect(() => extractClientSurface('export const x = 1\n')).toThrow(/no recognizable seat surface/)
  })

  it('fails loud when tabs are registered without any guide entry', () => {
    const undiscoverable = fixture.replace('guide: [{ id: `${room.id}-guide`, order: room.order }],\n    })', '    })')
    expect(() => extractClientSurface(undiscoverable)).toThrow(/without any guide entry/)
  })

  it('accepts a dynamic, mode-gated guide builder as discoverable', () => {
    const dynamic = fixture.replace(
      'guide: [{ id: `${room.id}-guide`, order: room.order }],',
      'guide: guideFor(room, mode),',
    )
    const surface = extractClientSurface(dynamic)
    expect(surface.roomTabs).toEqual([{ id: 'dsh-smart-assistant-desk', kind: 'desk' }])
    expect(surface.guideEntries).toBe(1)
  })
})

describe('renderCatalog', () => {
  const input = {
    exports: ['.', './tool-memory', './client', './src/*', './package.json'],
    hostRows: [{ id: 'assistant-memory', indent: 0, name: 'dsh-smart-assistant' }],
    // 2026-10-04: host rows may carry a package subpath too (assistant-knowledge-approve 先例)——
    // collectCatalog 按组合位置（preset 行嵌套深度）分平面，renderCatalog 只消费分好的三桶。
    hostSubRows: [{ id: 'assistant-knowledge-approve', indent: 4, name: 'dsh-smart-assistant/knowledge-approve-remote' }],
    agentRows: [{ id: 'assistant-memory-tool', indent: 10, name: 'dsh-smart-assistant/tool-memory' }],
    devRows: [],
    tools: [{ name: 'assistant_memory', actions: ['recall'], label: 'src/agent/tool-memory/index.ts' }],
    skills: ['memory-hygiene'],
    pin: 'dsh-v0.0.0',
    bins: { 'ov-doctor': './bin/ov-doctor.mjs' },
    engines: { node: '^22.19.0 || >=24', dsh: '>=0.2.1-rc.2 <0.3.0', pnpm: '>=10.6.0' },
    clientSurface: {
      seats: ['sidebar.brand.mark', 'sidebar.brand.name'],
      roomTabs: [{ id: 'dsh-smart-assistant-desk', kind: 'desk' }],
      guideEntries: 1,
      commands: ['desk'],
    },
    releases: ['0.0.0'],
    dependencies: ['yaml'],
    peers: ['@deepseek-ai/cordis'],
    client: true,
  }

  it('names every plane, lists non-plugin exports separately, and marks the file generated', () => {
    const text = renderCatalog(input)
    expect(text).toContain('GENERATED by scripts/generate/gen-catalog.mjs')
    expect(text).toContain('HOST')
    expect(text).toContain('AGENT')
    expect(text).toContain('CLIENT（浏览器面）')
    expect(text).toContain('非 plugin 导出（不挂组合行）：`./src/*`、`./package.json`')
    expect(text).toContain('当前机器兼容范围：`dsh >=0.2.1-rc.2 <0.3.0`；Node `^22.19.0 || >=24`；pnpm `>=10.6.0`')
    expect(text).toContain('包入口（bin）：`ov-doctor` → `./bin/ov-doctor.mjs`')
    expect(text).toContain('历史 verified 的 DSH release（不构成当前支持承诺）：`0.0.0`')
    expect(text).toContain('`assistant_memory` | `recall`')
  })

  it('lands a package-subpath HOST row in the host plane and the host-side row table, not the agent one', () => {
    const text = renderCatalog(input)
    expect(text).toContain('| `./knowledge-approve-remote` | HOST | assistant-knowledge-approve |')
    expect(text).toContain('| cordis.patch.yml（host 面） | `assistant-knowledge-approve` | `dsh-smart-assistant/knowledge-approve-remote` |')
    expect(text).not.toContain('agent 面 = preset 行的 plugins） | `assistant-knowledge-approve`')
  })

  it('renders the client seat surface from the extracted input', () => {
    const text = renderCatalog(input)
    expect(text).toContain('客户端座位面')
    expect(text).toContain('`sidebar.brand.mark`、`sidebar.brand.name`')
    expect(text).toContain('`dsh-smart-assistant-desk`（desk）')
    expect(text).toContain('`desk`')
  })

  it('omits the client section when no client surface is declared', () => {
    const text = renderCatalog({ ...input, clientSurface: undefined })
    expect(text).not.toContain('客户端座位面')
  })

  it('is deterministic: same input renders the same text', () => {
    expect(renderCatalog(input)).toBe(renderCatalog(input))
  })
})

describe('collectCatalog reads the real dev runner patch (devRows never silently empty)', () => {
  // Red proof: before 2026-10-05 the reader still pointed at the pre-P2 path
  // (dev/preset-runner.patch.yml) while the renderer already labelled the new location —
  // existsSync made the empty devRows a silent lie in the shipped catalog.
  it('finds the dev runner row at its post-P2 location', () => {
    const catalog = collectCatalog()
    expect(catalog.devRows.length, 'devRows must not be silently empty — the reader path must track the real patch').toBeGreaterThan(0)
    expect(catalog.devRows.some(row => (row.name ?? '').includes('preset-runner'))).toBe(true)
  })
})

describe('collectCatalog discovers tools by wire name across the whole src/agent tree', () => {
  // Red proof 2026-10-10: the reader hardcoded four tool dirs, so the mounted fifth tool
  // (assistant_operating, src/agent/tool-operating/) never reached the shipped catalog's
  // tool table while the freshness gate stayed green — an undercount no gate could see.
  // Discovery rule: an index.ts carrying a wire name (`name: 'assistant_<snake>'`) is a tool;
  // section/shield rows declare kebab plugin names (`export const name = 'assistant-…'`) and
  // must never be picked up.
  const catalog = collectCatalog()
  const wireNames = catalog.tools.map(tool => tool.name)

  for (const wireName of ['assistant_memory', 'assistant_research', 'assistant_knowledge', 'assistant_reflect', 'assistant_operating']) {
    it(`extracts ${wireName} (identity.md §一 row 4)`, () => {
      expect(wireNames, `tools found: ${wireNames.join(', ')}`).toContain(wireName)
    })
  }

  it('picks up no non-tool agent module (kebab plugin names are not wire names)', () => {
    expect(catalog.tools.length).toBeGreaterThan(0)
    for (const tool of catalog.tools) {
      expect(tool.name).toMatch(/^assistant_[a-z_]+$/)
    }
  })

  it('reads the shipped bin map and the pnpm engine', () => {
    expect(catalog.bins['assistant-data']).toBe('./bin/assistant-data.mjs')
    expect(catalog.bins['ov-doctor']).toBe('./bin/ov-doctor.mjs')
    expect(catalog.engines.pnpm).toBe('>=10.6.0')
  })
})
