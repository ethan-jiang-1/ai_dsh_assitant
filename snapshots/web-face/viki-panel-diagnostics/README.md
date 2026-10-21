# viki-panel-diagnostics —— Viki(调试) 诊断展开（固定 OV mock）

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> fixture：复用 [`../viki-panel-connected/seed.mjs`](../viki-panel-connected/seed.mjs)（固定 health/tasks/skills/stats）。

## 场景是什么

连接态下点开 Viki tab 的「诊断」：折叠面板展开，显示健康行（`已连接 · 0.5.1.1 · dev`）、
统计/任务/技能/pending 等无源项按「—」或空态呈现；钉住诊断入口的懒加载与 host `?view=diagnostics`
的渲染。不钉转正入口（未实现）。

## 怎么跑

```sh
export ASSISTANT_DSH_HOME="$PWD/.tmp/viki-scene-home"
bash dev/env/prepare.sh && bash dev/env/setup.sh

node snapshots/web-face/viki-panel-connected/seed.mjs --port 19433 &
OPENVIKING_URL=http://127.0.0.1:19433 pnpm dsh --profile dev --port 0 --no-open

pnpm web-expected '<url>' --scenario snapshots/web-face/viki-panel-diagnostics \
  --eval "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim().includes('新会话'));b?.click();return !!b})()" \
  --eval "(()=>{const b=document.querySelector('button[aria-label=\"打开右侧边栏\"]');b?.click();return !!b})()" \
  --eval "(()=>{const el=[...document.querySelectorAll('button,[role=tab],a')].find(e=>e.textContent?.trim().startsWith('Viki'));if(!el)return false;el.click();return true})()" \
  --eval "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='诊断');b?.click();return !!b})()" \
  --wait-text '健康'
```

重录：加 `--refresh`，过目 DOM diff 后提交 `expected.dom.json`。首开若被「预览版说明」挡住，先点一次「继续」。
