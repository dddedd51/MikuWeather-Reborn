# 初音天气：服务端天气代理

Cloudflare Worker 持有和风 Ed25519 私钥及腾讯服务 Key。客户端只配置 HTTPS 代理网址，发布包不包含凭据。

支持固定的城市搜索、当前天气、七日和 24 小时预报接口；不是通用 URL 转发器。天气缓存 5 分钟、预报 30 分钟、搜索 60 分钟。配置每 IP 每 Cloudflare 地点 30 次/分钟的限流；此限制不是全局日额度上限，维护者仍需设置上游服务配额。

在 Cloudflare 中以 Secret 保存 `QWEATHER_HOST`、`QWEATHER_KID`、`QWEATHER_ISS`、`QWEATHER_SUB`、`QWEATHER_PRIVATE_KEY`、`TENCENT_KEY`，有腾讯 SK 时再保存 `TENCENT_SK`。不要把值写进 wrangler 配置或提交到 Git。

`/ip` 仅在用户主动定位时调用。代理读取 Cloudflare 提供的实际请求端 IP，交给腾讯定位；不接受客户端自填 IP，不缓存该结果，返回值移除 IP。Worker 不自行记录 IP 或坐标日志。Cloudflare 与腾讯各自的网络服务仍按各自政策处理请求。

`/health` 只返回服务名、协议版本和配置是否齐备，不回传配置值。

公开客户端使用 `https://miku-weather-reborn-api.pages.dev`。`pages-relay/_worker.js` 将请求转给固定的主 Worker，两个服务通过 Cloudflare Secret `RELAY_SECRET` 认证，主 Worker 仅对认证过的中转请求接受客户端 IP 标头。外部调用者不能用自填标头更改 IP 定位和限流身份。Pages 入口避免本次测试网络中 workers.dev 无法直连的问题，不保证所有地区和网络都可达。

部署主服务使用 `wrangler deploy --config worker/wrangler.jsonc`；Pages 项目创建后，在生产环境设置相同的 `RELAY_SECRET`，再运行 `wrangler pages deploy worker/pages-relay --project-name YOUR-PROJECT --branch main`。本次 Pages 使用 Wrangler 4.50.0，主 Worker 使用 4.162.0。自建时修改中转内的固定目标网址，并在项目根目录运行 `node scripts/configure-proxy.mjs https://YOUR-PUBLIC-ENDPOINT` 写入客户端配置。

使用 Cloudflare 免费方案，不需要添加自定义域名。Pages Functions 同样消耗 Workers 配额；一次经过中转的请求涉及两个服务，缓存不能代替平台和上游的用量控制。没有启用付费套餐，也没有上传密钥到 GitHub。
