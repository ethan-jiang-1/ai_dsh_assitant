# 2026-09-23 · Service 私有字段 × cordis shadow receiver（战役首只产品面真虫，已修复）

日期：2026-09-23 · 状态：**implemented（本切片）**

## 现象（日志实证）

live 验证战役步骤 1 的第一个真实 turn（会话 `e0ac2cf8`，`agentPreset: assistant` —— preset
挂载本身已实证）在 5ms 内死亡，两次重试同错：

> Cannot read private member #digestCache from an object whose class did not declare it

## 根因（vendor 源码逐帧追到）

1. `AssistantMemory` 经 `ctx.assistantMemory`（属性代理）被消费——digest 段落
   （`text: () => ctx.assistantMemory.digestSnapshot()`）与三个工具全是这条路。
2. cordis 的服务解析把实例包进 traceable proxy（`reflect.ts` get trap → `getTraceable`）；
   非 noShadow 服务的方法再被 `createShadowMethod`（`utils.ts`）包一层，apply trap 里
   **`if (thisArg === outer) thisArg = shadow`**——方法执行时的 `this` 是一个转发覆盖对象，
   不是真实实例。
3. JS `#` 私有字段带运行时 brand check：`this.#digestCache` 在 shadow receiver 上必炸。
   这就是报错原文。
4. **vendor 生态约定**：全部 vendor Service 子类 0 处 `#` 私有字段（逐一核对）——服务类
   只能用 TypeScript `private`（编译期私有、运行时无 brand check）。本仓服务类用了 `#`，
   第一次真实跨 preset 访问即炸。

## 为什么以前从未炸过（证据自洽）

one-shot 不进 preset（无人经代理调服务）；13:55 的 preset 壳从未对话；vitest 直接构造实例
（不走代理）——三重巧合使这条路径直到战役步骤 1 才第一次被点亮。骨架全绿 ≠ 产品点亮，
这正是战役存在的理由。

## 修复

`AssistantMemory` 类的 6 个 `#` 字段与 3 个 `#` 方法全部转 TypeScript `private`
（`src/index.ts`，类内注释记原因与 vendor 出处）。内部类（Room 等）不经代理消费，保持 `#`
不变。回归测试 `tests/service-shadow-access.spec.ts`：真 cordis `Context` + 经属性代理调
`digestSnapshot` / `saveMemory` / `digest` / `curate`——生产同款路径，红证即本虫。

## 教训（登记不立案）

- "API 漂移在编译期暴露"挡不住**运行时习语**差异：类型系统对 `#` vs `private` 的选择完全
  沉默。此类差异只能靠 live 验证与读 vendor 源码吸收——战役步骤 1–4 的价值又添一证。
- 顺带验证了 vendor 包规则那句警告的含义："the property proxy is topology-sensitive" ——
  服务消费面（段落/工具）走 `ctx.<name>` 是受支持的姿势，前提是服务类不用 `#`。

## 验证（真跑过 / 待验）

- 真跑：`pnpm typecheck` / `pnpm test` 68/68（新增 2 例：冷摘要走代理、写读走代理 + digest
  反映写入）/ `pnpm build` / `pnpm verify` 15/15。
- 待验：重启 dev web 后用户重试会话 A，turn 应正常完成——证据回填战役 note 开跑补记。
