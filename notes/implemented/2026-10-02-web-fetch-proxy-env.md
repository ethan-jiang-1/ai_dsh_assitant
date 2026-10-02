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

- `dev/harness-home/.env` 与 `dev/trial-home/.env` 各写两行：
  `HTTP_PROXY=http://127.0.0.1:7897`、`HTTPS_PROXY=http://127.0.0.1:7897`（端口随系统代理，
  变更要同步改——踩坑清单已登记）。
- `.env` 进 home 是 DSH 的设计通道（home `.env` 恰好只放行四个代理名；项目目录 `.env` 不放行
  bootstrap 变量——仓库控制不了出网路由）。

## 验证（真跑过的命令与判决）

1. **before**：本 harness `web_fetch` 取 `https://www.cnblogs.com/sylvesterzhang/articles/23002451`
   → 同款 `non-public IP` 报错（上机实证）。
2. **代理连通**：`curl -x http://127.0.0.1:7897 <同 URL>` → HTTP 200 / 24,837 bytes（正文到手）。
3. **after**：`pnpm dsh --profile dev-task --patch dev/preset-runner.patch.yml "<取数任务>"`
   → 会话经 `web_fetch` 真拿到正文（作者/日期/内容梗概逐字报出，会话日志 `tool/call`+`tool/result`
   配对在案）；同一会话正常完成 ⇒ **LLM API 经代理无回归**（loopback 内建豁免，本地 Web UI 不受影响）。
4. 后续批次收益：G2 批四题的"外部证据只到标题级"限制自此解除——下一批可取一手全文。

## 输掉的方案

- **改 vendor 放宽 SSRF**（把 198.18.0.0/15 加白）：违反"永不改 vendor"硬规则 1，且改错了层——
  fake-ip 是本机代理的产物，不是攻击面；SSRF 防护对真直连场景仍然正确。
- **换掉本机 DNS / 关 fake-ip**：机器的网络栈是用户环境，不该为 DSH 会话改全局行为。
- **给 web_fetch 加"跳过检查"配置**：即便 vendor 有此配置也不取——走代理后检查被跳过是
  **因为代理承担了远端解析**（信任模型成立），裸跳检查是把 SSRF 防护整个关掉。
- **只在跑评测时注入 env**：修在 runner 里则 Web UI/真用会话仍带病；`.env` 落 home 对该 home
  的所有会话（dev-task、dev web、trial 真用）一次生效——正确的半径。

## 边界（如实登记）

- 日用 `~/.dsh`（本 harness 所在 home）按硬规则 1 **不碰**——若用户要给自己的日用 harness 开
  抓取，同样两行 `.env` 自己落即可。
- 代理端口（7897）来自当前系统配置，硬编码在 `.env`；代理软件换端口需手改（踩坑清单已注明）。
