# viki-panel-search —— Viki(调试) 搜索命中（固定 OV mock）

> 场景契约（snapshots/AGENTS.md：录制命令、profile、判据与 fixture 同 diff）。
> fixture：复用 [`../viki-panel-connected/seed.mjs`](../viki-panel-connected/seed.mjs)（同一固定 OV mock，含 `/search/find`）。

## 场景是什么

连接态下在 Viki tab 输入「夹具」并点「搜索」：host 走 stateless `/search/find`，面板显示
`搜索「夹具」· 1 条` 与固定命中行；钉住搜索的三态之一（有命中），不钉空结果/未连接（另一场景）。

## 怎么跑

```sh
export ASSISTANT_DSH_HOME="$PWD/.tmp/viki-scene-home"
bash dev/env/prepare.sh && bash dev/env/setup.sh

node snapshots/web-face/viki-panel-connected/seed.mjs --port 19433 &
OPENVIKING_URL=http://127.0.0.1:19433 pnpm dsh --profile dev --port 0 --no-open

pnpm web-expected '<url>' --scenario snapshots/web-face/viki-panel-search \
  --eval "(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim().includes('新会话'));b?.click();return !!b})()" \
  --eval "(()=>{const b=document.querySelector('button[aria-label=\"打开右侧边栏\"]');b?.click();return !!b})()" \
  --eval "(()=>{const el=[...document.querySelectorAll('button,[role=tab],a')].find(e=>e.textContent?.trim().startsWith('Viki'));if(!el)return false;el.click();return true})()" \
  --eval "(()=>{const i=[...document.querySelectorAll('input')].find(e=>e.placeholder?.includes('搜索记忆'));if(!i)return false;const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'夹具');i.dispatchEvent(new Event('input',{bubbles:true}));const b=[...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='搜索');b?.click();return !!b})()" \
  --wait-text '搜索「夹具」'
```

重录：加 `--refresh`，过目 DOM diff 后提交 `expected.dom.json`。首开若被「预览版说明」挡住，先点一次「继续」。
