# viki-panel-connected —— 连接态 Viki(调试) 面板（固定 OV mock）

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> fixture：同目录 [`seed.mjs`](seed.mjs)（固定 OV mock：1 条 identity 记忆，无时间漂移）。

## 场景是什么

DSH + `assistant-viki` 指向本目录的 mock OV 时，右栏 `Viki(调试)` tab 的**连接态**：计数行
`共 1 条（user 1 · peers 0 · events 0）`、identity 记忆行与其固定摘要、搜索框/诊断入口在场。
钉住 host route → client 面板的列表渲染与 attrs summary；不钉搜索命中、健康/任务展开、转正入口。

## 怎么跑

```sh
export ASSISTANT_DSH_HOME="$PWD/.tmp/viki-scene-home"
bash dev/env/prepare.sh && bash dev/env/setup.sh

node snapshots/web-face/viki-panel-connected/seed.mjs --port 19433 &
OPENVIKING_URL=http://127.0.0.1:19433 pnpm dsh --profile dev --port 0 --no-open

pnpm web-expected '<url>' --scenario snapshots/web-face/viki-panel-connected \
  --eval "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim().includes('新会话'));b?.click();return !!b})()" \
  --eval "(()=>{const b=document.querySelector('button[aria-label=\"打开右侧边栏\"]');b?.click();return !!b})()" \
  --eval "(()=>{const el=[...document.querySelectorAll('button,[role=tab],a')].find(e=>e.textContent?.trim().startsWith('Viki'));if(!el)return false;el.click();return true})()" \
  --wait-text '固定夹具'
```

重录：加 `--refresh`，过目 DOM diff 后提交 `expected.dom.json`。首开若被「预览版说明」挡住，先点一次「继续」。
mock 常驻，跑完 `kill %1`；不要指向 live dev-ov，live 记忆会漂移。
