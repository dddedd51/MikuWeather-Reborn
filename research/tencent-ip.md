# Windows 腾讯 IP 定位（2026-11-14）

用户指定接入 https://lbs.qq.com/service/webService/webServiceGuide/position/webServiceIp，并明确电脑使用 IP、手机使用系统 GPS。按官方文档 GET https://apis.map.qq.com/ws/location/v1/ip，传 key/output=json，省略 ip 以识别请求端公网 IP。精度可从区县到国家，不覆盖所有 IP，返回 location 是所属行政区政府坐标，不能当作设备 GPS。

Key 只保存在忽略的 secrets/tencent.local.json 与 desktop/private.json，Android 原生配置明确排除腾讯 Key。共享网页不包含 Key。客户端固定请求腾讯 HTTPS 域名，禁止重定向，12 秒超时，取消会中止请求，响应不缓存、不写盘、不记录。删除原始 ip 与原始错误，只把量化行政中心和国家/省/市/区信息传给界面。

界面明确说明公网 IP 会被腾讯服务看到。默认定位仅在点击后请求，按腾讯报告的行政城市匹配本地库，优先城市记录；不依据政府中心坐标自动挑中附近区县，不自动切换城市。省/市信息不足、境外或本地库无法匹配时要求手动搜索。

使用维护者 Key 的实际请求成功，返回城市信息；检查输出仅含 success/source/cityInformation/ipOmitted，不记录 IP 或位置。新增测试覆盖省略 IP/设备坐标、响应移除 IP、同名行政区、无市级数据、取消晚到响应、并发拒绝和错误脱敏。安装包界面及用户实际所在地仍需实测，IP 路由可能受 VPN/代理/运营商出口影响。

## 0.2.2 原生界面运行检查

完整包复制至 C:/Users/xtt20/Downloads/MikuWeatherReborn-0.2.2，用户手动批准退出旧0.2.1并启动新版后，实际显示透明初音、气泡和实时天气详情。通过原生窗口点击搜索城市与腾讯 IP 定位按钮，实际请求成功，出现 IP 地区说明及城市候选列表。保持用户当前所选城市，不点击候选、不自动切换。此次证明新包启动、入口和腾讯请求可用，不能据此保证每个公网 IP 都准确。
