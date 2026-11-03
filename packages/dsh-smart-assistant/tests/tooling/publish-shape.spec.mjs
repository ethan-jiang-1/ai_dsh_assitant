/**
 * Fixtures for the publish-shape judges (`scripts/release/publish-shape.mjs`).
 *
 * Each rule is proven red on the artifact shape it exists to refuse and green on the shape this
 * repository actually ships (BUG-027: the client sourcemap embedded 59 `src/` files and three
 * earlier gates could not see it; BUG-028's sibling rule guards the publishable manifest).
 * Plain `.mjs` on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it.
 */
import { describe, expect, it } from 'vitest'
import { docShapeProblems, localeShapeProblems, manualProfileCreateProblems, manifestShapeProblems, sourcemapLeakProblems } from '../../../../scripts/release/publish-shape.mjs'

const map = (sources, contents) => JSON.stringify({ version: 3, sources, sourcesContent: contents })

describe('sourcemapLeakProblems', () => {
  it('refuses a map that embeds this package\'s own sources', () => {
    const problems = sourcemapLeakProblems([{ path: 'package/lib/client/index.js.map', text: map(['../../src/client/index.ts'], ['export const x = 1']) }])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/embeds the source of \.\.\/\.\.\/src\/client\/index\.ts/)
  })

  it('refuses a map whose sourcesContent has no reviewable sources list', () => {
    expect(sourcemapLeakProblems([{ path: 'p.map', text: JSON.stringify({ sourcesContent: ['x'] }) }])[0]).toMatch(/no sources list/)
  })

  it('refuses a map that is not valid JSON', () => {
    expect(sourcemapLeakProblems([{ path: 'p.map', text: '{oops' }])[0]).toMatch(/not valid JSON/)
  })

  it('accepts dependency sources and an artifact with no maps at all', () => {
    expect(sourcemapLeakProblems([{ path: 'p.map', text: map(['node_modules/foo/index.js'], ['x']) }])).toEqual([])
    expect(sourcemapLeakProblems([])).toEqual([])
  })

  it('accepts a map that lists sources but carries no content', () => {
    expect(sourcemapLeakProblems([{ path: 'p.map', text: JSON.stringify({ sources: ['../../src/a.ts'] }) }])).toEqual([])
  })
})

describe('manifestShapeProblems', () => {
  const publishable = {
    name: 'x',
    description: 'one line',
    icon: './icon.svg',
    engines: { dsh: '>=0.2.1-rc.2 <0.3.0-0' },
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  }

  it('accepts the shape this repository ships', () => {
    expect(manifestShapeProblems(publishable)).toEqual([])
  })

  it('refuses private:true — npm publish answers EPRIVATE and a dry run does not', () => {
    expect(manifestShapeProblems({ ...publishable, private: true }).join(' ')).toMatch(/EPRIVATE/)
  })

  it('refuses a package with no bundle patch, no engines.dsh, no icon and no description', () => {
    const problems = manifestShapeProblems({ name: 'x' })
    expect(problems).toHaveLength(4)
    expect(problems.join(' ')).toMatch(/dsh\.bundle\.patch/)
    expect(problems.join(' ')).toMatch(/engines\.dsh/)
    expect(problems.join(' ')).toMatch(/icon/)
    expect(problems.join(' ')).toMatch(/description/)
  })
})

describe('localeShapeProblems', () => {
  it('accepts English plus a translation', () => {
    expect(localeShapeProblems({
      en: { meta: { title: 'Smart Assistant', description: 'x' } },
      zh: { meta: { title: '章鱼管家', description: 'y' } },
    })).toEqual([])
  })

  it('refuses a package with no English dictionary', () => {
    expect(localeShapeProblems({ zh: { meta: { title: '章鱼管家', description: 'y' } } })[0]).toMatch(/locale\/en\.json/)
  })

  it('refuses an empty title or a document without meta', () => {
    expect(localeShapeProblems({ en: { meta: { title: '  ', description: 'x' } } })[0]).toMatch(/meta\.title/)
    expect(localeShapeProblems({ en: {}, zh: { meta: { title: 'a', description: 'b' } } })[0]).toMatch(/no "meta" object/)
  })
})

describe('manualProfileCreateProblems', () => {
  it('accepts the dump form the manual ships', () => {
    const manual = 'dsh --profile assistant --from-default-profile web --dump-config   # ① 一次性建 profile\n'
    expect(manualProfileCreateProblems(manual)).toEqual([])
  })

  it('rejects a booting profile create (BUG-028: it also wipes an existing profile)', () => {
    const problems = manualProfileCreateProblems('dsh --profile assistant --from-default-profile web\n')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('--dump-config')
    // A line that is not a dsh command is prose, not an instruction.
    expect(manualProfileCreateProblems('`--from-default-profile` 只限首次，是破坏性重置\n')).toEqual([])
  })
})

describe('docShapeProblems', () => {
  const readme = ['## 装什么、装到哪', '## 安装', '## 验证', '## 配置', '## 升级', '## 卸载与数据', '## 排障'].join('\n')
  const manual = ['## 产品是什么', '## 〇、安装前提', '## 〇之二、选运行时', '## 一、安装', '## 二、首启', '## 三、验证安装', '## 五、配置', '## 七、升级', '## 八、卸载', '## 常见问题', '## 十二、安全'].join('\n')

  it('accepts the shape both documents ship', () => {
    expect(docShapeProblems({ readme, manual })).toEqual([])
  })

  it('refuses a README that lost the upgrade section', () => {
    expect(docShapeProblems({ readme: readme.replace('## 升级\n', ''), manual })[0]).toMatch(/README: missing "## 升级"/)
  })

  it('refuses a manual that lost security or the profile command section', () => {
    expect(docShapeProblems({ readme, manual: manual.replace('## 十二、安全', '') })[0]).toMatch(/manual: missing "## 十二、安全"/)
  })
})
