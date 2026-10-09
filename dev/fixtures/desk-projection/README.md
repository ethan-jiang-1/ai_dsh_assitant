# 固定投影下载资料（模拟）

这里的 [JSON](desk-projection.json) 只验证下载字节，不是实际经营账本、业务 schema 或经营 writer 输出。Host 下载器不校验业务字段；Client 消费 schema 的证据另验。

## 复跑真实认证下载

用一次性 home 按 [开发手册](../../../docs/dev.md) 的 prepare/setup 序列准备 profile。在 workspace 中创建 overlay，仅覆盖 `assistant-desk-projection` 的 Config `dataDir` 为本资料目录的绝对路径（不要覆盖 assistant-memory）。工作区也固定到该隔离 home，不读共享 Documents。

```sh
# --patch 必须在转发给 Web 的 --port/--no-open 之前。
ASSISTANT_DSH_HOME='<isolated-home>' pnpm dsh --profile dev --patch '<overlay>' --port 0 --no-open
node dev/probes/web/desk-projection-download.mjs '<authenticated-url>' dev/fixtures/desk-projection/desk-projection.json
```

探针不写业务文件，不打印 token/cookie：匿名/直接在 API 携带 token 为 401；index 登录交换得 cookie 后读取固定 JSON，与独立资料逐字比对；异域 Origin 403；调用者 path query 400；POST 不返回成功下载。验证结束停止服务。该探针不证明 mount proxy、Web Client 断连取消、UI 空/错态、Session 或业务持久成功。

## 注册与错误复验

```sh
pnpm build
pnpm --filter dsh-smart-assistant exec vitest run tests/host/desk-projection-download.spec.ts tests/composition/desk-projection-lifecycle.spec.mjs
```

真实 Loader/Connection 组合钉住精确路由、卸载撤销和重复重挂，文件缺失/损坏/修复状态由临时目录产生。下载核另验完整 byte cap、多字节、无效 UTF-8 与预取消。直调 shared Fetch handler 不经过物理认证，因此不能替代上述 HTTP 探针。
