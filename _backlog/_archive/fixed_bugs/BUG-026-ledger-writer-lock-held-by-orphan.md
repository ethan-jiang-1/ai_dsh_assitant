---
status: 已修
severity: P2
opened: 2026-10-25
---

# BUG-026：共享 dev home 的账本写锁被残留实验进程长期占用，运行中的实例整轮写不进去

> 严重级别：P2（次要但阻断）｜发现：2026-10-25｜状态：已修（2026-10-25，选项②：拒绝可处置 + 契约）

## 症状

2026-10-25 03:47（本地）一次首页页上动作（`[面板]`，m-1 确认核对点）经 `assistant_operating` 提交时被拒：

```
operating ledger at <repo>/dev/harness-home/assistant-operating is owned by another writer
(host ethans-MacBook-Pro-5.local, pid 82016); refusing a second writer
```

同轮读（`desk` / `read`）全部正常——**只有写被挡**，所以界面上看起来是"点按钮没反应"。
GUI 实例是 pid 87117（`lsof -nP -i :51629` 指向它）；锁的持有者 82016 是另一个进程，cwd =
`<repo>/.tmp/ab-rerun/workspace`（一次 A/B 实验的残留），`2026-10-24T18:41:28Z` 取得锁后一直存活，
没有监听端口、没有在跑会话。

## 根因（已确认）

两层，证据都在本次现场：

1. **接管条件只看"死没死"**：`src/host/operating-ledger/index.ts` 的 `claimWriter` → `isProcessAlive`
   只在持有进程已退出时接管；**活着但闲置**的外部进程能永久挡锁。
2. **实验运行借用了共享 home**：`.tmp/ab-rerun` 的进程用的是 `dev/harness-home`（同一把锁的目录），
   实验与正式实例因此可以互相堵死。

**2026-10-25 复核**：认领本身是**惰性**的（`submitOperation` 第一次写才抢锁，boot 不占锁），所以本次不是
"启动即占锁"——实验实例在 A/B 复跑里**写过一次**（Q1 的 report 留痕）后继续存活，锁就跟着进程活到退出；
第二实例的写被拒在 `claimWriter` 的"活着就拒绝"分支。真正缺的是两点：拒绝信息不可处置（无 cwd、无处置
命令），以及共用 home 的实验没有隔离纪律。

## 复现

1. 在 `.tmp/ab-rerun/workspace` 名下起一个进程做一次账本写（锁文件即落在 `dev/harness-home/assistant-operating/writer.lock`）；
2. 另起实例（`pnpm start`）在该会话里提交任意 `assistant_operating` 写 → 报上面那句；
3. `kill -TERM <holder>` 后再提交 → 立即成功（本次实测：87117 自动接管，写入 revision 5/6）。

## 已知影响

挡住的不是读而是**所有写**：页上按钮（确认提案、改核对点、记结果）整轮失效；模型侧没有自助通道，
只能靠人 `lsof` 定位再杀进程。2026-10-25 就是这样恢复的（处置记录见账本 m-1 `op-20261025-m1-confirm-checkpoint-1027`）。

## 修复（2026-10-25，选项②）

- `writer.lock` 身份加 `cwd`（旧锁缺该字段仍可读）；拒绝信息点名 host / pid / cwd / 取得时刻 / 锁文件路径，
  并给唯一安全恢复：确认持有进程空闲后 `kill -TERM <pid>`，死持锁者在**下一次写入**时按既有规则接管；
  明确"持锁者可能仍会写时不要删锁"（两个写者会丢更新）。跨机持锁与不可读锁各给各自的处置。
- 契约写进 [`docs/operating.md`](../../docs/operating.md) §一（拒绝必须可处置 + 实验隔离）；`docs/dev.md`
  并行会话节补"会写账本的实验/复跑用隔离 home"。
- 测试：同进程案断言锁里 `pid`/`cwd`；跨进程案断言拒绝含 `cwd`、`kill -TERM <pid>` 与"不要删锁"。
- 证据：`pnpm test:host`（26 files / 159 tests）、`pnpm build`、`pnpm verify` 45 项。
- **不做自动接管**（选项①）：没有 OS 级 flock，按时间或"看起来闲置"抢锁会在两个写者并存时丢更新；
  卡的验收明确要求不丢写，故只做可处置拒绝（选项②），并用隔离纪律（选项③）从源头减少撞锁。

**修好定义对照**：模拟"活着的闲置持有者"后，第二个实例得到可执行处置提示（pid/cwd/命令）；不引入
双写者路径，`ledger.json` 无丢写。三项判据满足。

## 修好定义

任选其一并写进契约：

- ① 锁带心跳/租约：持有者超过 N 分钟无写即可被接管，接管留痕；
- ② 拒绝时把"活着的异 cwd 持有者"报成可操作错误（点名 pid、cwd、一条处置命令），或给受控的接管入口；
- ③ 实验/AB 运行一律强制隔离 home，撞锁从源头不发生。

判据：模拟"活着的闲置持有者"后，第二个实例要么按规则接管、要么给出可执行的处置提示；
`ledger.json` 不出现丢写（现写路径是 temp+fsync+rename，两个写者并存会丢更新，验收要覆盖这一点）。
