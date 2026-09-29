// OpenViking 试点 · server 级记忆往返 + 抽取质量抽评驱动（试点六步的第 5/6 步）
// 运行：pnpm ov-trial-rt    （前提：OpenViking server 在 127.0.0.1:1933，dev 认证无需 key）
// 可选参数：session id（默认 dsh-trial-probe-002）——复现/验收用新 id 避免污染首批证据：
//   node dev/ov-rt.mjs dsh-accept-probe-003
// 做什么：建会话 → 塞 14 条模拟 CEO↔分身语料（含一处"先说错再改口"的修正探针）→ commit →
//         等后台抽取 → find 找回三组事实 → 读抽取物原文，输出结构化报告。
// 语料是虚构人设的哨兵事实（测抽取准头，非真实数据）；质量判分属人——机器只守地板。
// 依据：_backlog/plans/260928-openviking-install-release.md 六步计划第 5/6 步。
const BASE = 'http://127.0.0.1:1933'
const SID = process.argv[2] ?? 'dsh-trial-probe-002'

const msgs = [
  ['user', '我下周三（10月8日）上午要去苏州见华芯半导体的张总，谈第二轮融资的事，估值底线是 3.5 亿，这个底线只有你和我知道。'],
  ['assistant', '已记下：10月8日上午赴苏州，会面华芯半导体张总，议题二轮融资，估值底线 3.5 亿（保密，仅你与我知）。'],
  ['user', '另外我个人对咖啡因敏感，开会只喝温水，以后别给我订咖啡。'],
  ['assistant', '好的，已更新你的偏好：会议饮品只备温水，不再订咖啡。'],
  ['user', '公司 Q3 回款目标是 800 万，但 9 月只回了 460 万，缺口主要卡在恒基地产那一单。'],
  ['assistant', '明白：Q3 回款目标 800 万，9 月实收 460 万（完成 57.5%），缺口集中在恒基地产单。'],
  ['user', '我女儿小满的生日是 10 月 18 日……不对，我记错了，是 10 月 20 日，她想要一个天文望远镜当礼物，我打算去实体店买。'],
  ['assistant', '已修正并记下：小满生日 10 月 20 日，礼物天文望远镜，采购方式为实体店。'],
  ['user', '上次跟明州数据合作踩了个坑——他们交付的数据集有 15% 是重复记录，以后跟他们签合同必须加数据质量赔偿条款。'],
  ['assistant', '已记入合作经验：明州数据交付质量问题（15% 重复记录），后续合同需附数据质量赔偿条款。'],
  ['user', '报销的事直接找财务部的王姐最快，她周三下午一般在工位。'],
  ['assistant', '记下了：报销走财务部王姐，周三下午在岗时段办理最快。'],
  ['user', '估值底线的事再强调一次，3.5 亿以下免谈，对方压价就先拖着。'],
  ['assistant', '收到：估值底线 3.5 亿为硬性约束，低于此价不成交，对方压价则暂缓推进。'],
].map(([role, content]) => ({ role, content }))

const j = (r) => JSON.stringify(r, null, 1)

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let parsed
  try { parsed = JSON.parse(text) } catch { parsed = { raw: text.slice(0, 400) } }
  return { status: res.status, body: parsed }
}

const isOk = (r) => r.body && r.body.status === 'ok'

async function main() {
  console.log('== 1) create session', SID)
  let r = await api('POST', '/api/v1/sessions', { session_id: SID })
  console.log(isOk(r) ? 'ok' : j(r))

  console.log('== 2) batch add 14 messages')
  r = await api('POST', `/api/v1/sessions/${SID}/messages/batch`, { messages: msgs })
  console.log(isOk(r) ? j(r.body.result) : j(r))

  console.log('== 3) commit')
  r = await api('POST', `/api/v1/sessions/${SID}/commit`, {})
  console.log(j(r.body.result ?? r.body))

  console.log('== 4) wait processed（分段等，最多 ~3.5 分钟）')
  for (let round = 1; round <= 8; round++) {
    r = await api('POST', '/api/v1/system/wait', { timeout: 25 })
    const q = r.body?.result ?? {}
    const busy = Object.entries(q).some(([, v]) => (v.pending ?? 0) > 0 || (v.in_progress ?? 0) > 0)
    const errs = Object.entries(q).filter(([, v]) => (v.error_count ?? 0) > 0).map(([k, v]) => `${k}:${v.error_count}`)
    console.log(`round ${round}: ${errs.length > 0 ? 'ERRORS ' + errs.join(',') : busy ? 'queues busy' : 'queues drained'}`)
    if (errs.length > 0) break
    if (!busy) break
  }

  console.log('== 5) memory stats')
  r = await api('GET', '/api/v1/stats/memories')
  const stats = r.body?.result
  console.log(j({ total: stats?.total_memories, by_category: stats?.by_category }))

  console.log('== 6) commit task status')
  r = await api('GET', '/api/v1/tasks?limit=5')
  for (const t of (r.body?.result ?? []).slice(0, 5)) {
    console.log(j({ id: String(t.task_id ?? '').slice(0, 8), type: t.type ?? t.task_type, status: t.status, error: String(t.error ?? '').slice(0, 160) }))
  }

  console.log('== 7) find-back probes（该找回的三组事实）')
  for (const query of ['我女儿小满的生日是哪天', '我开会应该喝什么', '去苏州见谁 谈什么']) {
    try {
      r = await api('POST', '/api/v1/search/find', { query, limit: 5 })
    } catch (e) {
      // 抽取任务并发时 find 会间歇 500/超时（2026-09-29 验收亲历）——记错不崩，drained 后重跑即恢复
      console.log(`\nQ: ${query}\n  ERROR: ${e.cause?.code ?? e.message}（server 忙？等抽取 drained 后重跑）`)
      continue
    }
    const hits = (r.body?.result?.items ?? r.body?.result?.results ?? r.body?.result ?? [])
    const brief = Array.isArray(hits) ? hits.slice(0, 5).map((h) => {
      const s = String(h.content ?? h.text ?? h.uri ?? JSON.stringify(h))
      return { uri: String(h.uri ?? ''), score: h.score, content: s.slice(0, 120) }
    }) : hits
    console.log(`\nQ: ${query}`)
    console.log(j(brief))
  }

  console.log('\n== 8) 抽取物原文（质量抽评材料）')
  r = await api('GET', '/api/v1/fs/ls?uri=' + encodeURIComponent('viking://user/default/memories'))
  const lsRaw = r.body?.result
  console.log('ls memories:', j(Array.isArray(lsRaw) ? lsRaw.map((e) => e.name ?? e.uri ?? e) : lsRaw).slice(0, 600))
  const entries = Array.isArray(lsRaw) ? lsRaw : (lsRaw?.entries ?? lsRaw?.items ?? [])
  for (const e of entries.slice(0, 12)) {
    const uri = e.uri ?? (typeof e === 'string' ? e : null)
    if (uri === null || !String(uri).includes('memories')) continue
    let content
    try {
      const rr = await api('GET', '/api/v1/content/read?uri=' + encodeURIComponent(String(uri)))
      content = rr.body?.result?.content ?? rr.body?.result?.text ?? JSON.stringify(rr.body?.result).slice(0, 200)
    } catch (err) {
      content = `<read failed: ${err.cause?.code ?? err.message}>`
    }
    console.log(`\n--- ${uri}\n${String(content).slice(0, 500)}`)
  }

  console.log('\n== done（报告完；质量判分属人——机器只守地板）')
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
