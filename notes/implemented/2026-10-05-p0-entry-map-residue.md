# P0 残尾：空壳 preset 文件处置 + 三链导航与五条功能路由

日期：2026-10-05 · 状态：**implemented**

## 决定

P0「真实入口与地图」的残尾两片收口（大半已随 `f25d686` 交付）：

1. **删除 `packages/dsh-smart-assistant/presets/assistant/` 下的空壳 `agent.cordis.yml` 并修光全部指向它的误导**（`b49f9c3`）。删除依据：全仓搜消费者为零——vendor agent-preset-registry 明文「不扫目录、不接受 preset 路径」；组合代际跟踪的是声明 preset 的组合文件（`cordis.patch.yml`）的 mtime/size；0.1.7 迁移 note §二已裁决「删除并吸收」而文件残留为空壳。同片修正：`dev/env/setup.sh` 尾部 touch 提示（0.1.5 roster 时代残留，改指真实纪律：src→build、技能目录随请求重扫、组合编辑按 stamp 进新会话）、setup.sh 头注释第 3 条（roster「指向 presets/」同属旧形状；行名 `agent-presets`→`agent-preset-registry`）、`src/index.ts` 文件头注释、`vendor/UPSTREAM.md` 重审触发表两行、README 与 `docs/dev.md` 的否定句（docs 只写现在）。
2. **[architecture.md](../../docs/architecture.md) 新增 §七「三条真实链路」与 §八「五条功能路由」**（`6376733`）。三条链（启动/模型请求/浏览器动作）逐节点标调用者、interface、主要失败模式、最小证据；agent loop 归属明确写 vendor（§三 L3），不为目录对称性造假 harness。五条功能路由（记忆保存/检索、知识草稿/批准/检索、提示词摘要、桌面刷新、插件装载）各给主链、实现入口、最低 keyless 验证命令、失败先看、live 边界——规则 owner 链 home.md、证据阶梯 owner 链 testing.md，只路由不复制。README 入口表加指针（根入口可达）；docs/AGENTS.md 的 architecture 职责行与钉定关系同步。

## 证据（真跑过的命令）

- `bash -n dev/env/setup.sh`；`pnpm build`（lib 注释同步；lib 为 gitignore 产物不入库）。
- 组合消费者 spec：`preset-composition` + `preset-skill-root` + `export-shape` 3 文件 20 断言全绿（空文件删除后真实 shipped YAML 装配、包内技能根解析、四 runner patch 身份均不受影响）。
- 路由表五条验证命令逐条实跑：记忆+知识+摘要 specs（record/recall/knowledge-write/digest/digest-prewarm）35 断言、桌面 client specs（client-panels/client-commands）41 断言、`pnpm test:composition`（先 build）6 断言，全绿。
- `pnpm verify` 34 项全绿（×3：处置片后、链路片后、red 还原后）。
- **prove-it-red**：向 architecture.md 临时塞一条 `packages/` 深处不存在的反引号假路径，backtick 路径门禁点名抓红；还原后终态 diff 与绿跑逐字节一致（本片为 test-first 证据环落章后第一片，红侧不是纸面推演）。
- 链路锚点全部本 session 一手回读：`src/client/index.ts` 发送路径（sendPrompt/remote.session.prompt/mode:queue/[桌面] 标记/pending 轮询）、批准路径（approveKnowledgePage 直调+回退）、挂载处理（本 pin 确定性拒绝=设计状态）、host `promotePage`、`dev/env/dsh.mjs` 全文、`dev/env/setup.sh`、`dev/profiles/profile-patch.yml`、vendor web-app bundle 行 id。

## 输掉的方案

1. **保留空文件、只修正提示文案**：死文件配上"它已失效"的说明＝把误导改成墓志铭；迁移 note 早已裁决删除，残留才是异常。
2. **重编号把链路插成 §六**（紧邻数据流的理想阅读序）：换来 identity.md §六、signal-tier-dedup note 等 5-6 处活指针的语义漂移风险，零机制收益——追加为 §七/§八，零漂移。
3. **五条路由表放 testing.md**：验证半边确是 testing 的职责，但路由缝合"主链+入口+失败层"是运行知识，归 architecture；testing 链接过去即可，不拆两半逼读者跳。
4. **链路图只画框图不配失败模式表**：列不出"会因它而红的检查"＝该图不可验收，退回 P5 时也无法做失败定位验收——每链强制配失败×证据表。

## 范围与后果

P0 全部收口：入口修正+三链导航+五条功能路由从根 README 可达，循链无需普查。本片不证明：浏览器渲染两场景与 loop-probe 未跑（文档片不改渲染面；命令为合同既有命令）；五问驾驭验收（无指引定位 ≤5 分钟）归 P5。当前 goal 第一段剩 P2（研发工具归位）。
