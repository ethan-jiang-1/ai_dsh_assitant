/**
 * Fixtures for the catalog generator's pure parts (`scripts/gen-catalog.mjs`). The real catalog
 * is freshness-gated by `pnpm verify`; these pin the extraction rules that make the gate
 * trustworthy: disable-only rows are legal, a nameless-and-disabled-less row fails loud, an
 * unrecognised tool declaration fails loud instead of silently thinning the catalog, and the
 * client seat extraction reads every seat family and fails loud on an undiscoverable tab.
 */
import { describe, expect, it } from 'vitest'
import { extractClientSurface, extractTool, parseRows, renderCatalog } from '../../../scripts/gen-catalog.mjs'

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
    '}',
    "function roomCommands(open: (kind: RoomKind) => void): CommandContribution[] {",
    "  return [",
    "    {",
    "      name: 'desk',",
    "      label: () => DESK_LABEL,",
    "      ui: { kind: 'action', run: () => { open('desk') } },",
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
    ])
    expect(surface.roomTabs).toEqual([
      { id: 'dsh-smart-assistant-desk', kind: 'desk' },
    ])
    expect(surface.commands).toEqual(['desk'])
  })

  it('fails loud when the source carries no recognizable seat surface', () => {
    expect(() => extractClientSurface('export const x = 1\n')).toThrow(/no recognizable seat surface/)
  })

  it('fails loud when tabs are registered without any guide entry', () => {
    const undiscoverable = fixture.replace('guide: [{ id: `${room.id}-guide`, order: room.order }],\n    })', '    })')
    expect(() => extractClientSurface(undiscoverable)).toThrow(/without any guide entry/)
  })
})

describe('renderCatalog', () => {
  const input = {
    exports: ['.', './tool-memory', './client', './src/*', './package.json'],
    hostRows: [{ id: 'assistant-memory', indent: 0, name: 'dsh-smart-assistant' }],
    agentRows: [{ id: 'assistant-memory-tool', indent: 0, name: 'dsh-smart-assistant/tool-memory' }],
    devRows: [],
    tools: [{ name: 'assistant_memory', actions: ['recall'], label: 'src/tool-memory/index.ts' }],
    skills: ['memory-hygiene'],
    pin: 'dsh-v0.0.0',
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
    expect(text).toContain('GENERATED by scripts/gen-catalog.mjs')
    expect(text).toContain('HOST')
    expect(text).toContain('AGENT')
    expect(text).toContain('CLIENT（浏览器面）')
    expect(text).toContain('非 plugin 导出（不挂组合行）：`./src/*`、`./package.json`')
    expect(text).toContain('`assistant_memory` | `recall`')
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
