# 结构归位：主包尾部拆分与 dev 共享库的约束

日期：2026-10-16 · 状态：**implemented**

2026-10-16 的结构评估结论：骨架与分层立住，尾部只剩两处「改得动但不好找」——主包组合根的臂编排、
账本归约器的 if 链与重复拒绝样板，以及 dev 面缺共享库抽屉。本 note 只留拆分后仍约束以后的后果与
当时击败的做法；逐文件账在 git 与测试里。

## 还会约束以后的后果

- **`src/client` 是经典脚本**：tsdown 把整棵树内联进一个 `lib/client/index.js`，硬约束是「无裸运行时
  import」（`verify` 的 `clientScriptSafetyProblems` 守）。面向 vendor 的依赖一律走参数——`desk-arms.ts`
  的 deps 袋是这个约束的产物，不是风格选择。
- **改过 `src/client` 后，跑 lib/ 消费型测试与 `verify` 之前必须 `pnpm build`**：`tsc -b` 会把 ESM 写进
  `lib/client/index.js`、覆盖 tsdown 的 classic bundle；正确顺序 `typecheck → build → test → verify`
  （[docs/dev.md](../../docs/dev.md) §五）。
- **每 apply 一份，不落模块态**：臂的 launch 锁与绑定、desk store、settle 观察器都是每次
  materialization 一份（`createDeskArms` / `createSettleRefreshObserver` 的工厂形态）——落模块级会被
  同页多实例共享。
- **纯搬迁的证据形态**：逐字 diff（含浏览器侧字符串里的空白）、字面量多重集核对、特征 spec 跨搬迁
  零改动、生成表达式在假 DOM 上真跑；结构等价要能「数得出来」。
- **测试与被测模块同名对齐**：搬走逻辑时同 diff 搬或拆对名 spec（例：`tests/tooling/session-logs.spec.mjs`
  从 `usage-report.spec.mjs` 拆出）。
- **改导入按运行验，不按印象**：`node --check` 不解析 import；一个文件有多处 import 时逐处核对，
  纯搬迁后对每个消费方至少做一次真加载。
- **编辑与提交分开**：编辑 + verify 一条链（编辑失败即中断），提交单独一条；别让管道吞掉门的退出码
  （`set -o pipefail` 或 `${PIPESTATUS[0]}`）。这两条与 `docs/dev.md` §五的「链式命令吞退出码」同源。

## 输掉的方案

- **client/ 子目录分组**（projection-\* / desk-\* / room-data-\* 三族进子目录）：命名前缀已可导航，
  tsdown 内联后 import 面收益为零；触发条件：client/ 文件数 > 30 或出现第四族。
- **learn/index.ts 的 schema 抽离**：评估结论「大而合理」；触发条件：超 ~550 行再拆。
- **webui-shots 与 cdp-driver 两份 CDP 客户端合并**：能力矩阵真有差；触发条件：出现第三份 CDP 客户端
  或两份行为分歧出 bug，届时单独立卡。
- **ledger 用 mixin/继承拆**：消费面与类型身份耦合；handler 表 + 辅助函数比继承层次可测。
- **单文件 tool-\*/ 目录扁平化**：每目录一 index.ts 统一可导航，扁平化零收益。
- **desk-process-e2e 只抽执行器不拆文件**：治样板不治导航；拆三模块 + dispatcher 保命令面不变。
- **把四臂执行器参数化成八参数执行器**：claim/wake 是条件支路、flow 是主体，四臂在作用域、种子回合、
  投票选项、断言集与失败相位上都不同；再抽一层会把可 grep 的显式代码换成间接层。
