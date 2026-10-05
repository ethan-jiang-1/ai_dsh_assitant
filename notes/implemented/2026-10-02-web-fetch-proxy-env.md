# web_fetch 代理环境修复：fake-ip DNS 撞 SSRF 防护，home .env 装代理

日期：2026-10-02 · 状态：**implemented**

来源：G2 机器预判批的读数③——四题（竞品/市场费用/股权/行业增速）自报"web_fetch 被沙箱拒、
外部证据只到标题级"；用户 2026-10-02 拍板"帮忙解决一下"。

## 诊断（证据链）

1. **报错原文**（评测会话日志逐字）：`Error: URL hostname "www.cnblogs.com" resolves to a
   non-public IP address`——cnblogs 是正常公网站点，被拒说明**解析结果**非公网。
2. **本机实测**：`dscacheutil` / node `dns.lookup` 都把 `www.cnblogs.com` 解析到
   **198.18.0.77**——TUN 模式代理（系统代理 `127.0.0.1:7897`，scutil 确认）的 **fake-ip DNS**，
   把所有域名映射进 198.18.0.0/15 保留段。
3. **机制**（`vendor/dsh/packages/web/web-fetch-http/src/network.ts:101` + `provider.ts:123-125`）：
   SSRF 防护只对**直连** hop 做本机 DNS 预解析并拒绝非公网地址；**走代理的 hop 跳过检查**
   （代理远端解析，本机解析无意义）。DSH 的代理来自 env / home `.env` 的
   `HTTP(S)_PROXY/NO_PROXY/ALL_PROXY`（`util/http-proxy/src/policy.ts:40-53`，loopback 内建豁免）；
   dev home 与 trial home **都没有 `.env`** ⇒ 代理从未安装 ⇒ 一切直连 ⇒ fake-ip 全灭。
   `web_search` 不受影响（搜索在 API 服务端执行，不经本机 fetch）。
4. **旁证**：修复前用本 harness 自己的 web_fetch 取同一 URL，同样报错——机制全机一致，
   不是评测会话特有。

## 决定

- **当日先做的静态版**（dev/trial 两 home 的 `.env` 写死 `HTTP_PROXY/HTTPS_PROXY=http://127.0.0.1:7897`）
  **当日即被取代**：用户追问"有没有 VPN 都能跑怎么弄"——静态 `.env` 在代理进程退出时会把
  一切出网（含模型调用）指向死端口，硬依赖代理存活。两个 `.env` 已删除。
- **现行方案：启动器条件注入**（`dev/env/dsh.mjs` 规则第 4 条）——启动时探测本地代理端口，
  活着才把 `HTTP(S)_PROXY` 注入子进程环境，死了什么都不注入（直连 + 真实 DNS，SSRF 预解析
  自然通过）。端口候选优先序：`ASSISTANT_PROXY_URL` 显式指定（也探活；空串=禁用注入）＞
  系统代理口（macOS `scutil --proxy`）＞默认混合口 7897，先探测先得；调用者显式导出过的
  `HTTP(S)_PROXY` 不被覆盖。注入时打印一行 `[dsh] outbound via local proxy …`（可见性）。

## 验证（真跑过的命令与判决）

1. **before**：本 harness `web_fetch` 取 `https://www.cnblogs.com/sylvesterzhang/articles/23002451`
   → 同款 `non-public IP` 报错（上机实证）。
2. **代理连通**：`curl -x http://127.0.0.1:7897 <同 URL>` → HTTP 200 / 24,837 bytes（正文到手）。
3. **after**：`pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "<取数任务>"`
   → 会话经 `web_fetch` 真拿到正文（作者/日期/内容梗概逐字报出，会话日志 `tool/call`+`tool/result`
   配对在案）；同一会话正常完成 ⇒ **LLM API 经代理无回归**（loopback 内建豁免，本地 Web UI 不受影响）。
4. **条件注入四态实测**（静态 `.env` 取代后补验）：
   - 自动探测、代理活（现状）→ 打印 `outbound via local proxy http://127.0.0.1:7897` 并注入；
     真会话 `web_fetch` 取回页面标题（端到端）；
   - `ASSISTANT_PROXY_URL=http://127.0.0.1:9`（死端口）→ **不注入**；one-shot LLM 任务直连
     正常完成（`direct-ok`）——代理不在时出网不断；
   - `ASSISTANT_PROXY_URL=""` → 禁用注入；显式导出 `HTTP_PROXY` → 不覆盖。
   - 中途修正一个 bug：显式 URL 初版未探活即注入（死端口同样会断网），改为显式也探测。
4. 后续批次收益：G2 批四题的"外部证据只到标题级"限制自此解除——下一批可取一手全文。

## 输掉的方案

- **静态 `.env`（当日第一版）**：代理进程退出即全断（出网硬依赖代理存活），被条件注入取代。
- **改 vendor 放宽 SSRF**（把 198.18.0.0/15 加白）：违反"永不改 vendor"硬规则 1，且改错了层——
  fake-ip 是本机代理的产物，不是攻击面；SSRF 防护对真直连场景仍然正确。
- **换掉本机 DNS / 关 fake-ip**：机器的网络栈是用户环境，不该为 DSH 会话改全局行为。
- **给 web_fetch 加"跳过检查"配置**：即便 vendor 有此配置也不取——走代理后检查被跳过是
  **因为代理承担了远端解析**（信任模型成立），裸跳检查是把 SSRF 防护整个关掉。
- **只在跑评测时注入 env**：修在 runner 里则 Web UI/真用会话仍带病；条件注入在启动器，
  对该 home 的所有会话（dev-task、dev web、trial 真用）一次生效——正确的半径。
- **DSH 侧加"代理不可达自动回退直连"**：上游 `http-proxy` 的语义是启动时装一次、运行中不回退
  （这是刻意的：策略每进程一条答案）——回退会引入"检查时直连、连接时代理"的新竞态；在启动器
  探活已给出等价且更简单的行为。

## 边界（如实登记）

- 日用 `~/.dsh`（本 harness 所在 home）按硬规则 1 **不碰**——它不经本仓启动器。用户若要给日用
  harness 同款"有 VPN 没 VPN 都行"，可在 shell 里放同款探活函数（或干脆保持代理常开）。
- 探活发生在**启动那一刻**：进程跑着的时候代理退出，已注入的变量不会消失（重启即恢复直连）——
  与上游"策略每进程一条答案"的语义一致。
- 代理端口候选是 scutil 系统代理口 + 默认 7897：TUN-only（系统代理开关关着）时 scutil 无读数，
  靠 7897 兜底命中；代理软件改成非常见口且关掉系统代理开关时需 `ASSISTANT_PROXY_URL` 显式指定。
