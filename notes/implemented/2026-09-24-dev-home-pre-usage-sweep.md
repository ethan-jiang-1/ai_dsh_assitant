# 2026-09-24 · 使用前清扫：dev home 夹具尸体清场 + 家 parked 线索 promote

日期：2026-09-24 · 状态：**implemented（真服务执行，curate 零发现在案）**

ROADMAP 🧹「使用前清扫」落账。dev home（`dev/harness-home/assistant`，gitignore 的运行残留）
是 ▶「真实使用开跑」要住的家——**本 note 是这次清扫的唯一账本**。

## 判据：编造的离场，真实的一律留下

清扫只删两类东西：**编造的故事**（live E2E 为走通桥而虚构的数据）与**自我声明的测试夹具**
（文件里写明"fixture"/"测试"的）。真实观察哪怕薄、哪怕已过时也留下——过时的活跃记忆
（如"kfcf：用户正在做 live 验证战役"，战役已结束）正是 live 助手**自己的**养护素材，
替它清掉等于把第一手观察素材扫没了。

## 移除（14 件 + 账本）

- **虚构的 deploy-pipeline 簇**（session d417555d 桥验证残留）：知识页 `darb`（悬链
  `[[staging-gate]]` 所在页）+ 从它 pin 的记忆 `gxsn`（"Deploys must pass the staging gate"
  ——对不存在的流水线的假事实，留着会持续误导）+ 它的 promote 源线索 `exvz`。
- **自我声明的房间夹具**：`promote-4sva`（"promote 测试的目的地记录"）、`promote-td3f`、
  `park-6nq4`、`stale-fixture-for-i13`（I13 验证完成即 drop 的夹具）。
- **技能夹具**：`proposal-fixture`（技能 + skill-proposals/ 落地记录一对）+ 归档三 bundle
  `audit-fixture`（内含假 `api_key` 凭据夹具）/`snapshot-fixture`/`legacy-migration-notes`
  + `archive/snapshots/` 全部。
- **skill-usage.json 重置（删除）**：campaign 期的加载计数会污染 ⏳ 全自动蒸馏的触发判据
  （用量账本正是延后项的数据源）；缺文件 = 合法空读、零 finding，合同明说 safe to delete。

## 保留（真实数据）

活跃记忆 4 条：tri-line 决策（`zrxy`，kind: decision）、同名遮蔽事实（`thug`）、park
非破坏回归验证（`ie34`）、战役语境（`kfcf`，留给助手自己 forget/supersede）；归档历史
2 条：`bug-found-uvpl`（被 `ie34` 的 `supersedes` 指着的真实 bug 史）、`note-ko0j`；
R1/R2 两条 open 线索（`zt0j`/`i519`，多个 ⏳ 触发型条目的依据锚）；真技能
`campaign-evidence-recording`。

## promote（真服务，非手改）

`promoteThread('20260923-how-should-the-knowledge-room-land-3e8i',
{ promotedTo: '20260923-the-tri-line-synthesis-proposal-was-zrxy' })`——经
`new AssistantMemory(new Context(), { dataDir })`（与测试同一构造路径），线程入
`research/archive/`，`promotedTo` 指向既有 decision 记忆；知识房间早已落地，问题有了答案。

## 验证（一次脚本跑完即删，操作清单如上）

`curate` 返回 **Home is clean: no findings.**——悬链 finding 随页消失，删除未引入任何新
finding；counts：4 active memories / 2 open threads / 1 learned skill / 0 knowledge pages /
**0 retired bundles, 0 snapshots**（[归档规模计数](2026-09-24-curate-archive-scale.md)在真实
家上的首读）；digest 1941/4096 字节，只含真实数据。
