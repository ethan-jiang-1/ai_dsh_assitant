# viki-panel-disconnected —— 可选 OV 层缺席时的 Viki(调试) 面板

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> harness：[`dev/probes/web/webui-expected.mjs`](../../../dev/probes/web/webui-expected.mjs)（`--scenario` +
> 三段 `--eval`：新会话 → 打开右侧边栏 → Viki tab；`--wait-text` 钉住降级文案）。

## 场景是什么

隔离 home、`OPENVIKING_URL` 指向不可达端口时，右栏 `Viki(调试)` tab 的**降级态**：一条
「Viki 未连接——OpenViking server 不在线或未配置。这不会影响其他房间。」+「重试」；不白屏、
不抛 console/network 错误、不把 503 伪装成空列表。这是「可选层缺席时插件照常工作」的 web 面回归。

**边界**：本场景只覆盖**降级态与 tab 渲染**，不覆盖连接态的搜索命中、健康/任务/统计、转正入口；
后者需要稳定的 mock OV 数据，当前不在本场景伪造。连接态由 host 测试与 live 探针覆盖。

> **前置：专家档。** 三档界面默认标准会隐藏 Viki guide（`mount-rooms` 按 mode 过滤）。本场景是专家面：先在隔离 home 写 `assistant/ui-mode.json` 为 `{"mode":"expert"}`（或设置页切「专家」），再启动/比对；否则右侧栏没有 Viki 入口。这是场景前置，不是 Viki 面板回归。

## 怎么跑

```sh
export ASSISTANT_DSH_HOME="$PWD/.tmp/viki-scene-home"
bash dev/env/prepare.sh && bash dev/env/setup.sh
OPENVIKING_URL=http://127.0.0.1:9 pnpm dsh --profile dev --port 0 --no-open

pnpm web-expected '<url>' --scenario snapshots/web-face/viki-panel-disconnected \
  --eval "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='继续');b?.click();return true})()" \
  --eval "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim().includes('新会话'));b?.click();return !!b})()" \
  --eval "(()=>{const b=document.querySelector('button[aria-label=\"打开右侧边栏\"]');b?.click();return !!b})()" \
  --eval "(()=>{const el=[...document.querySelectorAll('button,[role=tab],a')].find(e=>e.textContent?.trim().startsWith('Viki'));if(!el)return false;el.click();return true})()" \
  --wait-text 'Viki 未连接'
```

重录：加 `--refresh`，过目 DOM diff 后再提交 `expected.dom.json`。首开若被「预览版说明」挡住，
先点一次「继续」（隔离 home 只发生一次；本场景基线录制时已点过）。

## 判据

比对面是 shots 的 DOM 证据 JSON（`visibleText`/`controls`/`consoleErrors`/`networkFailures` 等）；
console 与 network 必须为空。基线录制：2026-10-21，隔离 home `.tmp/viki-scene/home`，服务端口 54947。
