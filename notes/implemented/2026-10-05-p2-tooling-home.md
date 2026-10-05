# P2 研发工具归位：scripts 与 dev 按职责分家（五片迁移 + 两处纪律适配）

日期：2026-10-05 · 状态：**implemented**

## 决定

按[冻结卡](../../_backlog/_done/_closed_plans/261005-repo-navigability.md)「主要迁移归属」表，五片把研发工具从
scripts/dev 两个杂物桶归位到职责树（文件名、根 pnpm 命令名、两个 profile 语义、默认 home 全程不变）：

1. **试点片**（`e29e0b9`）：webui 探针家族 + CDP 驱动 → `dev/probes/web/`——先啃最硬的（验证导航、局部执行、发现集合三件事后再扩展）。
2. **patch 家族**（`49c660d`）：基础 profile patch → `dev/profiles/`；session 探针 patch ×4 → `dev/probes/session/`；replay 夹具 ×3 → `dev/fixtures/`（replay patch 内部 cwd 路径表达式同片改）。
3. **report/deploy/experiments**（`576c5f8`）：usage/desk-loop 报告 → `dev/reports/`；import-knowledge/expert-setup → `dev/deploy/`（仓库用，非发行命令）；OV 三件 → `dev/experiments/openviking/`（只归位不执行）。
4. **scripts 四类**（`e155666`）：verify*→`scripts/checks/`、gen-*→`scripts/generate/`、release/export→`scripts/release/`、sync*/repair→`scripts/maintenance/`（门禁自身搬家：REQUIRED_PATHS、resolution 期望、startPath 期望清单、生成器自述头全部随家搬）。
5. **env 家族**（`e8d1625`）：启动器 + env 兜底 + prepare/setup → `dev/env/`（repoRoot 加层，仓根 cwd 与原 home 语义不变）。

`dev/AGENTS.md` 补布局表（东西在哪个抽屉；命令判据 owner 仍是根 AGENTS 命令表与 docs/dev.md）。

**两处纪律适配（非搭车改行为，各带门禁/夹具证据）**：
- `webui-preflight` 的 home 解析 `process.env.DSH_HOME` → `ASSISTANT_DSH_HOME`（launcher 唯一合法出口；所有 sanctioned 路径语义不变，被杀死的恰是 1337a58 记录过的错家报绿陷阱）——搬进 dev/ 树撞「dev tooling never inherits DSH_HOME」后的最小适配。
- 启动器（`dev/env/dsh.mjs`）按**精确路径豁免**同一条门禁：它读继承的 DSH_HOME 恰是为了覆盖它并打 stderr 警告行（硬规则 1 的执法者不是违规者）；verify-gates 夹具钉两面（启动器过、同目录 lookalike 仍红），规则对其他 dev 工具咬合力不变。

## 证据（真跑过的命令）

- 每片收尾：`node --check`（累计 19 文件）+ `bash -n`（累计 9 脚本）+ 受影响 spec 定向跑 + `pnpm verify` 34 全绿（每片至少一次）。
- **启动链三证**（env 片，全新隔离 home）：`bash dev/env/{prepare,setup}.sh` → 双 profile 建立；`pnpm dsh --profile dev --dump-config` → preset-assistant + assistant-memory-tool 组合行在场；`pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "probe"` → 「probe turn complete」（keyless，真实 preset 挂载，迁移后的启动器/patch/夹具三家协同）。裸 one-shot 无 key 在 LLM 适配器处停——boot 面已证通。
- **浏览器两场景**（试点时一次 + 终态树复跑一次，共两轮四 PASS）：blank-first-open 与 first-open-draft-banner（含 seed patch → 触发工作区创建的诚实 FAIL → 种桌面 → 凭据 refs 只增不改合并 → 带 wait-text 比对）在五片迁完的最终树上全部 PASS。
- **段末三连**：`pnpm typecheck` exit 0；`pnpm test` 43 文件 374 断言全绿无 skip；`pnpm verify` 34 全绿。
- spec 计数增长：366 → 374（新增 DSH 豁免夹具等），无既有断言删除。

## 输掉的方案

1. **弱化 DSH_HOME 门禁**（如全 dev 树跳过）：规则的咬合力对 usage/desk-loop/eval 这些真读 home 的工具必须保留；精确路径豁免 + 双面夹具是唯一不失牙的豁免。
2. **dsh.mjs 留在 scripts/ 不搬**：规避了门禁冲突但违反已确认的归属表，且 scripts/ 重新变成杂物桶——输给「冲突正面解决」。
3. **五片一次性全搬**：路径失效面会叠加到不可定位；试点先行验证方法论（卡上 P2 出口明文要求）。
4. **历史记录全量重写**：eval 答卷、代码栅栏里的命令转录、cdp-driver 的上游仓来源注记按「当时为真」保留，只修**活指针**（链接/backtick 路径）——历史归 git。

## 范围与后果

P2 完成：研发工具各归其位，根命令面零变化，全消费者（repoRoot/patch/fixture/生成器/门禁期望）路径闭合。**未验项（如实）**：`pnpm release-smoke` 未跑（五片只动仓库内布局，不改包 files/exports/发行 patch——dev/ 树不进包；P4 出口必跑）；真模型行为（`pnpm eval`/`loop-probe --ask`）未跑（keyless 车道已证装载与组装，行为地板归 P5 验收）；`pnpm export-dist` 未跑（同 release 理由）。**发现的缺口（不搭车修，留待拍板）**：① 场景二的凭据合并是 README 记载的手工步骤，`seed.mjs` 无 creds 子命令（两次实跑均靠只增不改的 inline 合并脚本）；② 流程教训：`git add` 原子性 × 旧路径清单三次炸片（靠提交后 status 检查 + amend 收口）——后续片一律显式现存目录。当前 goal（P0 残尾 + P2）至此全部交付，段间复核后另立 P3（测试资产分层——套路已钉提案）。
