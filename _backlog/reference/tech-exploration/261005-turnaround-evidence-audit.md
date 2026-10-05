# 转向承重技术主张：审批、OV 隔离与 verify 覆盖审计

> 查证日：2026-10-05。喂 [转向自洽卡](../../_done/_closed_plans/261005-turnaround-coherence.md) 与 [定位卡](../../_done/_closed_plans/261005-open-value-deficit.md)。只读源码/配置与廉价检查；未改产品代码、未启动服务或模型评测、未读写日用 `~/.dsh` / `~/.openviking`。

## 查证基线与证据强度

- DSH pin = `dsh-v0.2.0-rc.2` / `639ed015397290b3745d163aafe02ffee4aa3f84`：[vendor 簿记:11–14](../../../vendor/UPSTREAM.md#L11-L14)；本轮 `git -C vendor/dsh rev-parse HEAD` 与之相同。以下 gateway 判断针对这份源码，不代表其他 DSH 版本或当前 GUI 必定运行此构建。
- OV plugin = `@openviking/dsh-memory-plugin` 0.5.8；钉存物和完整性见 [第三方簿记:8–19](../../../vendor/thirdparty/openviking/README.md#L8-L19)。本轮重算 tgz SHA512 与所载 SRI 相同；下文引用的 dev 安装副本中 `package.json`、`config.mjs`、`runtime.mjs`、`client.mjs`、`shared/{config-schema,workspace-peer,recall-core,ov-http,credentials}.mjs` 九个文件逐字节与 tgz 同名文件一致。安装副本属忽略的运行残留，复查需从钉存 tgz 恢复同名文件，不能把该目录存在当分发保证。
- OV server `0.4.22` 是 [安装脚本:23–34](../../../dev/experiments/openviking/ov-install.sh#L23-L34) 的目标版本；本轮未运行 server `--version`、未验证活进程版本或 server 实现。源码事实、由此导出的推论、需要运行证据的未验证项在各节分开。

## 1. knowledge approve Remote 与 UI 审批

### 事实

1. Host bundle 声明伴生行 [patch:29–38](../../../packages/dsh-smart-assistant/cordis.patch.yml#L29-L38)，方法暴露为 `assistantKnowledge.approvePage`：[服务:56–85](../../../packages/dsh-smart-assistant/src/host/knowledge-approve-remote/index.ts#L56-L85)。行声明、服务代码存在不等于浏览器通道已经贯通。
2. Client 的手写贡献将 request codec 标为 `src-json`：[client:2167–2178](../../../packages/dsh-smart-assistant/src/client/index.ts#L2167-L2178)。当前 pin 的 `$mount → mountContribution → validateContribution` 在注册 namespace 前执行 `requireStrictInputs`：[gateway:202–209、241–246、288–291](../../../vendor/dsh/packages/api/gateway/src/client/index.ts#L202-L291)；该检查要求每个 client 输入的 codec 为 `strict`，否则抛 `has no strict codec`：[gateway:790–804](../../../vendor/dsh/packages/api/gateway/src/client/index.ts#L790-L804)。[gateway README:52、85](../../../vendor/dsh/packages/api/gateway/README.md#L52-L85) 同样明确拒绝 SRC 输入；不是猜 API。
3. Client 自己已记录当前 pin 确定性拒绝挂载并回退：[client:2199–2220](../../../packages/dsh-smart-assistant/src/client/index.ts#L2199-L2220)。按钮只有在 namespace 方法存在且有 sessionId 时直调；通常走 `sendPrompt`：[client:817–837](../../../packages/dsh-smart-assistant/src/client/index.ts#L817-L837)。`sendPrompt` 通过 `remote.session.prompt` 发送带 `[桌面]` 标记的审批指令：[client:648–675](../../../packages/dsh-smart-assistant/src/client/index.ts#L648-L675)，再由模型调用 `assistant_reflect action=promote_page`：[learn:433–441](../../../packages/dsh-smart-assistant/src/agent/learn/index.ts#L433-L441)。是否某次点击实际成功，仍需该次会话日志。
4. 共同底层 `promotePage` 只读页、改 `status: stable`、写回：[服务:875–886](../../../packages/dsh-smart-assistant/src/index.ts#L875-L886)。它不新增 `verified`、审批记录，也不按 session 做页归属或操作者校验；已 stable 幂等返回，代码亦未拒绝 deprecated。模型调用该方法的权限约束不能由这段机械翻转代码证明。
5. Remote 若被直接调用，顺序是先 promote，再 `recordAudit`：[Remote:83–85](../../../packages/dsh-smart-assistant/src/host/knowledge-approve-remote/index.ts#L83-L85)。实际审计是 `<dataDir>/audit/approvals.jsonl`，字段只有 at/pageId/title/sessionId：[Remote:88–106](../../../packages/dsh-smart-assistant/src/host/knowledge-approve-remote/index.ts#L88-L106)。方法未检查 session 存活/归属，sessionId 是请求字段。文件头、方法注释和 patch 的“审计进会话日志”说法与代码不符：[Remote:11–15、63–65](../../../packages/dsh-smart-assistant/src/host/knowledge-approve-remote/index.ts#L11-L65)、[patch:33–34](../../../packages/dsh-smart-assistant/cordis.patch.yml#L33-L34)。

### 推论

- 对本 pin 和本 client 源码，UI 即时直调主张不成立；可用通道是“审批指令 → 模型回合 → promote + 刷新”。该通道的证据落在审批提示、工具调用/结果的会话日志；不能把伴生 Remote 的 JSONL 当成所有 UI 审批的统一审计。
- 即使未来打通 Remote，也尚不能承诺审批与审计一致：审计写入失败可发生在页面已 stable 之后。追加 JSONL 本身不保证事务、操作者身份、撤销或失败恢复。可追溯亦不等于内容判断正确。

### 未验证 / 需要补跑

- 一次性 dev home 内、无模型的浏览器挂载检查：记录 `$mount` 拒绝原因、namespace 是否存在、点击产生何种 Remote 调用；确认实际构建与本 pin 对齐。无需再次烧模型证明静态 codec 冲突。
- 后续实施若获授权，再补临时知识页的 Remote/模型路径合同测试：status、verified、审计文件、重复调用、审计写失败后的页面状态与恢复；并查真实审批日志是否充分标记“谁、何时、批了什么、执行是否成功”。本轮不实现修复。
- Remote 注释称 gateway 自带 remote journal，但本轮未找到可引用的实际审批持久化调用，不能列为第二份已验证审计。组合测试只是挂载伴生服务：[composition:118–122](../../../packages/dsh-smart-assistant/tests/composition/preset-composition.spec.ts#L118-L122)，不是浏览器贯通或审计失败测试。

## 2. OV 实验 home、server/storage/peer 与数据边界

### 事实

1. 本仓启动器用 `ASSISTANT_DSH_HOME` 替换 DSH_HOME：[启动器:44–60](../../../dev/env/dsh.mjs#L44-L60)。OV installer 的 `HOME_DIR` 只用于 DSH profile：[installer:20–25、60–77](../../../dev/experiments/openviking/ov-install.sh#L20-L77)；它检查/复用固定 `127.0.0.1:1933`，从用户 home 的 `.openviking/ov.conf` 起 server：[installer:38–54](../../../dev/experiments/openviking/ov-install.sh#L38-L54)。生成器的 storage workspace 固定为用户 home `/.openviking/workspace`，server 固定 1933：[生成器:21–31](../../../dev/experiments/openviking/ov-trial.sh#L21-L31)。换 DSH home 不会自动换这些东西。
2. Installer 追加的 endpoint 仍是 1933，而且未设置实验臂 peerId、account/user 或 recallPeerScope：[installer:89–99](../../../dev/experiments/openviking/ov-install.sh#L89-L99)。当前 dev profile 残留显式 `peerId: assistant`：[dev patch:18–27](../../../dev/harness-home/profiles/dev/cordis.patch.yml#L18-L27)，是本机观察，不是 tracked 模板保证。
3. 0.5.8 的默认 peer source 是 git（remote 优先、否则 root）：[workspace-peer:19–39](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/workspace-peer.mjs#L19-L39)。显式 peer 优先；默认派生还有 legacy cwd peer：[workspace-peer:166–196](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/workspace-peer.mjs#L166-L196)。runtime 按 session cwd 解析、召回时传 actor 和 legacy peer：[runtime:33–49、130–145](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/runtime.mjs#L33-L145)，没有使用 DSH home 作为 peer 隔离键。
4. `recallPeerScope` 默认 `all`：[config-schema:86](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/config-schema.mjs#L86)。`actor` 模式也可能额外召回 legacy peer：[recall-core:677–694](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/recall-core.mjs#L677-L694)，未知 `peer_scope` 字段遭 400/422 拒绝时，会删字段重试并记降级：[recall-core:625–659](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/recall-core.mjs#L625-L659)。不能仅靠改 peer 或 actor 旋钮就宣布互斥。
5. Plugin 默认配置文件来自用户 home `.openviking`，可用专门环境变量指定路径；与 DSH_HOME 无关：[credentials:6–7、82–88](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/credentials.mjs#L6-L88)。会话捕获 payload 经 HTTP POST messages 到配置 endpoint：[runtime:150–174](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/runtime.mjs#L150-L174)、[client:36–55](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/client.mjs#L36-L55)、[HTTP:60–79](../../../dev/harness-home/profiles/dev/node_modules/@openviking/dsh-memory-plugin/shared/ov-http.mjs#L60-L79)；召回亦提交用户 query。
6. OV 生成器将 embedding/VLM 的 `api_base` 都设为 `SILICONFLOW_BASE_URL`：[生成器:16–24](../../../dev/experiments/openviking/ov-trial.sh#L16-L24)。本轮只读取该非密钥字段，[本地配置:7](../../../.env.local#L7) 为 `https://api.siliconflow.cn/v1`。这证明生成配置的远端意图，不证明运行 server 正在使用该配置；installer 已有配置则跳过生成。当前 [根合同:14、31](../../../README.md#L14-L31) 的“严格本地/不出企业边界”不能由 localhost storage 推出。
7. 通用 eval 固定一个 home、同 repo cwd、串行会话：[runner:9–10、32、76–87](../../../dev/eval/run.mjs#L9-L87)。domain 隔离仅搬 `deliverables/`：[domain-run:288–305、349–372](../../../dev/eval/domain-run.mjs#L288-L372)，不隔离房间、OV server/storage/peer 或模型学习状态。

### 推论

- 四个 DSH home 不构成四个独立 OV 实验臂。当前脚本会复用 server/store；同 cwd 默认 peer 或固定 assistant peer、默认跨 peer 召回，以及 legacy/降级重试都可污染臂间归因。是否已发生污染不能靠源码判断。
- “本地文件 / 本地 server”与“推理数据留域”是两项判断。按所见生成器，embedding/VLM 可能将业务内容送到 SiliconFlow；DSH 主模型、搜索抓取、导出和日志的数据流还需分别检查，不能把其中一条本地通道扩大成全链路保证。

### 未验证 / 需要补跑

- 本轮不调用 OV、不读取用户 home 配置、不提交/删除记忆。活 server 版本、实际配置、存储位置、account/user、peer_scope 服务端支持、真实出网 payload 均未核实。
- 实验前建立臂清单：各臂 DSH/dataDir、OV endpoint/配置/storage、account/user/peer、学习和pending队列基线。优先独立测试 server/store；共享服务方案必须先验证服务端隔离，不能只认 client 参数。
- 在全新测试存储补跨臂哨兵负测（profile、query recall、legacy peer、scope 降级都不得读到他臂唯一标记），明确重置学习状态；只让同臂内配对会话共享记忆。先测仪器，再跑模型实验。
- 先做不含密钥的解析配置/网络端点清单；后续需实际脱敏流量证据才能宣布数据边界。四格若比较“知识有/无 × OV有/无”，只能估可用性；要归因 OKF 结构，还需等内容普通 Markdown 对照，本轮不跑。

## 3. verify 原漏扫与本轮修复

本节下列“事实/推论”记录代码审计开始时的状态；父代理随后修链接与语料接线。最终状态见节末补充，不把原快照继续当当前缺陷。

### 事实

- `markdownCorpus` 只收根 AGENTS/README、docs、notes、snapshots：[verify:444–450](../../../scripts/checks/verify.mjs#L444-L450)；relative-link 检查仅接收这个数组：[verify:483–484](../../../scripts/checks/verify.mjs#L483-L484)。`_backlog/reference` 未进入语料。
- 纯核按 linking file 所在目录解析相对路径，缺失就报错：[relativeLinkProblems:278–296](../../../scripts/checks/verify-checks.mjs#L278-L296)。例如定位子目录里的 `../plans/` 实际指向 `reference/plans/`；正确父层应为 `../../plans/`。纯核忽略 anchors/query，不能验证行号真实性。
- `backlogLivenessProblems` 对 reference 递归检查的是“文件路径是否被 index 字符串包含”，没有解析其正文链接：[liveness:761–773](../../../scripts/checks/verify-checks.mjs#L761-L773)。它能管索引成员，不能替代链接检查。
- 本轮用现有 `relativeLinkProblems` 直接递归扫 reference：14 个 Markdown 文件中报 11 个缺失目标；包含入口 `plans/README.md`、`bugs/README.md`，定位/upstream 的 `../plans`，tech 的 `../../docs` / `../../notes` 与同目录替代品链接。这是父代理并行修订期间的时点快照，不能当最终未修计数。本轮没有再跑全仓 verify。

### 推论

绿的是已纳入语料的检查，不是全仓断链已修。漏报主因是语料缺失，非 `../` 解析算法错误；仅修眼前链接而不补语料覆盖，下一次搬子目录仍会漏报。

### 已交付补充

- [verify 的相对链接语料](../../../scripts/checks/verify.mjs#L483) 现在收原 markdownCorpus + `_backlog/README.md` + 活跃 plans/bugs/reference 递归 Markdown；`_done` 不扩扫。其他 backtick/section/机器路径门仍使用原 corpus，未改纯核或做历史全面治理。
- [真实 runner 接线夹具](../../../packages/dsh-smart-assistant/tests/tooling/verify-gates.spec.mjs#L125) 对九个活跃路径造断链。旧接线漏报导致新增夹具红；新接线检出所有目标、补目标后链接门绿，冻结与未约定根材料作为负控制未扩扫。verify-gates 49/49 通过；pnpm verify 34 检查通过。
- 父代理直接扫活跃 backlog 的22个 Markdown，缺失相对目标已清零，包含原 reference 和首开卡历史 BUG 指针；最终收尾证据归 [资料归位决定](../../../notes/implemented/2026-10-05-turnaround-deliberation-routing.md)。链接检查不验证 URL、anchors、引用行号、原始事实或产品效果。
