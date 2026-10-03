# OpenViking 采用：AGPL 合规复核决策包

> 给本人的一页纸（2026-10-04）。你只需要回答一个问题：**AGPL 边界的初判你认不认**——认，层 1
> 一条命令落地（`bash dev/ov-install.sh <profile>`，已双验收）；不认，OpenViking 线停在这，自研
> 记忆层现状继续服务。技术事实全部经过活体验证（证据链见文末）。

## 你在批什么

**采用一个记忆增强组件**（OpenViking）：本地 server 进程 + 它的 DSH 插件。它给助手加一层
「情景记忆」（对话经历自动抽取、按相关性召回），与自研的四房间记忆并存。

## 技术事实（全部实测在案，2026-10-04 活体）

| 事实 | 证据 |
|---|---|
| 我们**零改动、零重分发** AGPL 侧：上游 tgz 原样安装（`ov-install.sh` 七步），server 独立进程（127.0.0.1:1933） | 安装器幂等+全新 home 端到端双验收（`d8f9d66`） |
| 治理执法全在**我们自己 MIT 代码**里（ov-shield：拒 `mcp__openviking__*` 前缀 + per-server 资源桥封堵 + 技能遮蔽） | 四量测活体全绿 + 旁路发现即修即复验（`b1446d5`/`10241b7`） |
| 数据全本地：vectordb/agfs 内置，telemetry 请求级 opt-in 非外发 | RFC 准入表（registry 元数据亲验） |
| 版本双钉：插件 0.5.8 + server 0.4.22，升级=人工触发重跑准入 | RFC 提案 1 |
| 回退干净：`uv tool uninstall openviking` + 删 profile 行，repo 零留痕 | RFC 准入表 |

## 法务判断点（RFC 提案 6 初判，你的复核对象）

**初判**：AGPL-3.0 的义务由「分发/传播」触发。我们的形态是——AGPL 的 server 作为**本地独立进程**
运行，DSH（我们的 MIT 代码）经 **HTTP/MCP 协议**与之通信；我们不分发、不修改、不 fork server。
进程边界 + 协议消费不构成 AGPL 意义上的「链接」，故不触发 copyleft 传染。

**会触发复核的条件**（任一出现即重新过这道门）：
1. 我们**分发** OpenViking 二进制或源码（哪怕打进我们发布物）——现状：否，安装器从钉存 tgz 装；
2. 我们**修改** server 源码——现状：永不改 vendor 的纪律在案；
3. 上游许可证变更（0.5.x 为 AGPL-3.0；升版时重验）。

**边界之外的诚实提示**：插件本体是 Apache-2.0（宽松）；真正的 AGPL 面只有 server 进程一个。
若你对「协议消费不构成链接」的初判不放心，保守选项是**不采用**——自研记忆层现状（房间事实
记忆 + digest）已服务 G2 全部评测题，情景记忆是增强不是地基。

## 落地后你会得到什么

- 助手对**对话经历**的长期记忆（「上次说过的车位/貔貅」类问题跨会话可答——活体已验）
- 画像块（用户偏好蒸馏，每轮 ~700 字符）+ 召回块（相关性命中内联进上下文）
- 治理不变：写入自研房间仍走人审路径；ov 侧只读召回，写面被 shield 全封

## 证据链

- [RFC](../notes/proposed/2026-09-29-openviking-adoption-rfc.md)（准入表+提案 6）·
  [推敲卡](../_backlog/plans/260929-openviking-formal-integration.md)（§六 v3 旋钮、§七 缝法、四量测活体节）·
  安装器 `dev/ov-install.sh` · shield `packages/dsh-smart-assistant/src/ov-shield/`
