#!/usr/bin/env bash
# OpenViking 试点配置生成器（幂等）——从 .env.local 生成 ~/.openviking/ov.conf + ovcli.conf
# 依据：_backlog/plans/260928-openviking-install-release.md 决策 D2；
#       密钥纪律见 vendor/thirdparty/openviking/README.md「密钥纪律」。
# 红线：key 只从 .env.local 读取、只写入仓库外的 ~/.openviking/（0600），本脚本不回显任何密钥。
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO/.env.local"
[ -f "$ENV_FILE" ] || { echo "缺 $ENV_FILE"; exit 1; }
mkdir -p ~/.openviking
node -e '
const fs = require("fs"), os = require("os");
const env = Object.fromEntries(fs.readFileSync(process.argv[1], "utf8").split("\n")
  .filter(l => l && !l.startsWith("#") && l.includes("="))
  .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const key = env.SILICONFLOW_API_KEY, base = env.SILICONFLOW_BASE_URL,
      emb = env.SILICONFLOW_EMBEDDING_MODEL, vlm = env.SILICONFLOW_VLM_MODEL;
for (const [k, v] of Object.entries({SILICONFLOW_API_KEY: key, SILICONFLOW_BASE_URL: base,
    SILICONFLOW_EMBEDDING_MODEL: emb, SILICONFLOW_VLM_MODEL: vlm}))
  if (!v) { console.error("缺变量: " + k); process.exit(1); }
const home = os.homedir();
const ovConf = {
  embedding: { dense: { provider: "openai", api_key: key, api_base: base, model: emb, dimension: 1024 } },
  vlm: { provider: "openai", api_key: key, api_base: base, model: vlm, timeout: 1500 },
  storage: { workspace: home + "/.openviking/workspace",
             vectordb: { name: "context", backend: "local" }, agfs: { backend: "local" } },
  server: { host: "127.0.0.1", port: 1933 }
};
const cliConf = { url: "http://127.0.0.1:1933" };
fs.writeFileSync(home + "/.openviking/ov.conf", JSON.stringify(ovConf, null, 2));
fs.writeFileSync(home + "/.openviking/ovcli.conf", JSON.stringify(cliConf, null, 2));
console.log("已写入 ~/.openviking/ov.conf 与 ~/.openviking/ovcli.conf（key 不回显）");
' "$ENV_FILE"
chmod 600 ~/.openviking/ov.conf ~/.openviking/ovcli.conf
ls -l ~/.openviking/ov.conf ~/.openviking/ovcli.conf | awk '{print $1, $9}'
