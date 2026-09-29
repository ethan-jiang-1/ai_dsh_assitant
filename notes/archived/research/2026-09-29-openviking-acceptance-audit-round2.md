# OpenViking 验收第二轮（复核第一轮修复 + 盲区扫描）

日期：2026-09-29 · 状态：已收卷 · 证据范围：本机全量重跑（registry 复测 / npm attestations 专用端点 /
第三轮同语料抽取 `dsh-accept-probe-004` / dump-config 全段 / server 外联面 / pnpm test）。
对象 = [第一轮台账](2026-09-29-openviking-acceptance-audit.md)的修复与盲区；方法如法炮制：不信任自己刚写下的手。

## 头号发现：第一轮的「SLSA 降级存疑」是误修，已回改

- 一轮只查了 packument 的 `versions[0.5.8].attestations`（None）就降级——**packument 面本来就不带 attestations**。
- 二轮查 npm 专用端点 `GET /-/npm/v1/attestations/@openviking/dsh-memory-plugin@0.5.8`：
  返回 sigstore DSSE publish attestation（predicateType `…/specs/publish/v0.1`），**subject sha512 与本仓
  钉存 tgz 逐位一致**（`4bdd1657…fff5a`），带公共透明日志条目（tlogIndex 2952534023）。
- 结论：原始 runbook 的 provenance 声明**成立**；一轮降级 = 修复过头引入的新错误。runbook 已回改为
  「发布证明双源确认」并记录误判根因。教训：**证伪前先排除"查错了面"**。

## 第一轮修复的复核（其余项）

| 项 | 判定 | 证据 |
|---|---|---|
| 「五周 16 版」 | ✅ 复测成立 | 全版本列表 16 个（0.1.0@08-20 → 0.5.8@09-25，5.00 周，3.2 版/周）；顺带坐实 5 个旧版（0.1.0–0.3.2）被 deprecated——RFC「上游旧版强制 deprecated」注有实据 |
| ov-rt.mjs 容错补丁 | ✅ 实测生效 | 第三轮抽取并发窗口内两个 find 探针返回 200 空集（劣化第二形态），驱动不崩、exit 0 走完全程 |

## 第一轮盲区补扫

| 盲区 | 判定 | 证据 |
|---|---|---|
| dump-config 参数是否真生效（一轮只验了行在场） | ✅ | config 块完整：`endpoint: http://127.0.0.1:1933`、`commitTokenThreshold: 2000`、`skipSubagentSessions: true` |
| 「数据流向全本地 / telemetry 非外发」 | ✅ | server 进程唯一外联 = 4 条 TCP 到 `47.239.184.63:443` ∈ `api.siliconflow.cn` DNS 集 {47.239.184.63, 47.239.215.199}；监听仅 127.0.0.1:1933；ov.conf 无 telemetry 段、vectordb/agfs 全 local、workspace 在本地 |
| handoff 其余声明 | ✅ | `pnpm test` 288/288（39 文件）独立复现；`_done/_closed_plans/` 22 个 md（21 卡+README）全带去向指针 |

## 第二轮新发现：重复累积证伪一轮判断 + 失败模式

第三轮同语料抽取（`dsh-accept-probe-004`）**失败**：`Request timed out.`，603s 判死，但**部分写入已落库
（+5 事件，不回滚）**。三轮抽取时长分布 **713s / 1110s / 603s(failed)**——试点记的「6-8 分钟」是乐观端。

1. **事件级重复随轮次累积，非"轻度"**：失败轮留下 5 个**改名近重复**事件（Q3回款进展↔进度、女儿↔小满
   生日、教训↔经验总结、会面↔会议、饮品偏好更新）。事件去重按标题记忆——**改述即新文件**；实体去重
   正常（canonical 名稳定，三轮全合并增富）。一轮"轻度重复可接受"的判断**作废**：常态会话不踩，但
   失败重试/语料回放场景会踩，需要清理配方（见下）。
2. **find 劣化有两种形态**：重载时 500/超时（一轮所见）；embedding 队列忙时 **200 空集**（二轮所见）。
   验收/健康检查不能拿 find 空集当"无记忆"证据。
3. **token 成本基线**（同语料一次 commit）：LLM 17k–56k tokens（cached 7k–30k 可观）+ embedding 1–2k。

## 自修复记录（本轮当场执行）

- **失败残留清理**：发现 `DELETE /api/v1/fs?uri=<encoded>` 删除路径可用，删掉失败轮 5 个残留 →
  库回 18 条（prefs 2/entities 8/events 8），find 恢复（小满.md 0.788）。配方入 runbook。
- runbook SLSA 误修回改（见头号发现）。
- 一轮台账按纪律冻结不动，本轮台账在"重复可接受"与"SLSA 存疑"两点上**取代**其结论。

## 输掉的方案（本审计自身的取舍）

- **为省成本不跑第三轮抽取**（只静态复核修复）：弃——重复累积与失败模式是只有重复实验才暴露的行为面，两轮数据都来自真实 server，值得这一次 API 成本（~60k tokens）。
- **重试失败的任务验证可重入性**：未做——会再花 10+ 分钟与 tokens，且失败重入语义属 ov-install.sh 实施切片的验收项，立卡时一并测。
