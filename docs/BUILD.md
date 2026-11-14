# 构建与技术说明

对 [MikuWeather_Windows](https://github.com/lzcapp/MikuWeather_Windows) 的非官方重制，保留随天气变化的初音插画，重新设计 Windows 与 Android 界面。天气数据来自[和风天气](https://www.qweather.com/)。

## 功能

- 当前天气、体感、湿度、风速、降水量、能见度。
- 24 小时预报、七日预报、白天/夜间详情、日出日落。
- 搜索城市、收藏与管理城市、摄氏/华氏、自动日出/日落主题、深色/浅色/跟随系统。
- 网络失败时显示本地缓存与缓存状态；每 15 分钟在前台自动更新。
- Windows 默认显示透明初音桌宠与天气气泡；拖动初音移动位置，点击打开天气详情，右键切换城市、刷新、置顶、隐藏与退出。支持托盘。
- Android 8.0+，天气界面之外提供原生 4×2 宽版与 2×2 紧凑版桌面小组件：透明外层、一张半透明圆角天气卡片，左侧温度与天气、右侧初音，保留刷新与数据来源。按尺寸隐藏次要信息，城市、温度单位与主题同步，后台通过 JobScheduler 更新。
- 无需天气账号或密钥输入。Windows 默认使用腾讯位置服务 IP 定位，保留系统定位入口；Android 使用系统 GPS / 融合 / 网络定位，不调用腾讯 IP 定位。两端只在点击后定位并显示候选城市，由用户确认。
- 内置 3577 个国内城市及区县中心点，定位坐标不上传、不留存，选择后仅保存城市；不后台定位，不记录轨迹。境外位置可手动搜索城市。
- 使用用户提供的 Pixel 天气图标，当前天气、逐小时/七日预报、桌宠气泡与 Android 小组件按天气类型切换图标，晴与多云支持昼夜版本。

## 安装与使用

Windows：请把完整 ZIP 解压到不含中文的普通目录，再运行 `Miku Weather Reborn.exe`。建议运行目录为 `D:/MikuWeatherReborn/`。请用普通模式运行，启动后桌宠默认出现在屏幕右下方；无需管理员权限。

**不要直接运行 Codex 工作区里的 `release/win-unpacked/`。**本机该目录带有工作区专用权限标记，曾导致 Electron 界面进程创建失败（`launch-failed`、退出码 18）。同一 EXE 和 ASAR（SHA256 相同）复制到普通英文下载目录后显示正常。出现同类错误时，先把完整 ZIP 解压到工作区之外的普通目录；不需要关闭系统安全功能。

Android：本版 0.2.2，完整构建成功后生成 `release/MikuWeather-Reborn-0.2.2-Android.apk`。安装后打开应用选择城市，长按手机桌面→小组件→初音天气，选择宽版或紧凑版；也可在应用设置中点“添加”。部分桌面不支持应用请求添加时，请使用桌面的手动入口。实际构建状态见 ../research/android-build-status.md。

定位：Windows 右键桌宠→“切换城市 / IP 定位”，默认按钮使用腾讯 IP 定位；省略请求中的 `ip` 参数，由腾讯识别请求端公网 IP，应用不保存或展示 IP。IP 只表示网络出口地区，VPN、代理、运营商出口可能使结果偏城；只显示腾讯报告城市内的候选，不自动切换天气。Windows 系统定位仍可单独选择。

Android：点搜索城市，再点“定位当前城市 · GPS / 系统定位”。首次请求精确与大致位置权限；精确位置允许时订阅 GPS，优先等候 8 秒，再接受有效的系统网络 / 融合位置，总超时 30 秒。只允许大致位置时继续用系统网络定位。拒绝超过 5 公里误差、超过两分钟或时间异常的位置；完成、取消或离开界面后停止监听。坐标先取两位小数，仅在本机匹配，不上传、不保存。城市中心匹配不是行政边界识别，请确认候选。失败时可手动选城。

主题默认跟随所选城市的实际日出、日落，日出后浅色、日落后深色；缺少天文数据时使用当地 6:00/18:00。桌宠与小组件同样按当地日落切换插画和背景，小组件本地切换受系统后台调度影响，可能稍有延迟。

小组件后台更新受系统省电策略与网络影响，不保证固定的分钟数；更新时间和缓存状态会显示在组件中，右侧刷新按钮可主动请求更新。

## 已完成的验证

- 真实和风城市搜索、当前天气、逐日与逐小时接口曾返回 HTTP 200；腾讯 IP 接口使用本机配置实际请求成功并返回城市信息。20 项 Node 测试通过，覆盖 IP 请求省略设备坐标/IP、响应移除 IP、取消、错误脱敏、行政城市匹配及已有天气功能。
- 0.1.0/0.2.0 Windows 独立目录中的打包程序已实际运行，显示透明初音和真实天气气泡；天气详情、设置和右键菜单已操作检查。0.2.2 已实际启动并检查桌宠、天气详情和腾讯 IP 入口，点击后返回行政城市候选；备用系统定位的前台授权与实际位置仍需验证。
- 0.2.2 Android `assembleDebug`、`testDebugUnitTest`、`lintDebug` 已实际成功，25 项核心测试通过，APK Signature Scheme v2 签名验证通过。包含单卡小组件、太阳主题与 GPS / 系统网络定位；现已补充用户提供的手机页面与小组件截图；更多机型、实际定位精度与持续后台更新仍需验证。此前审批服务故障导致 0.2.1 未构建，本轮用户手动批准后已解决构建阻碍。详情见 ../research/android-build-status.md。
- 六种尺寸及昼夜卡片设计预览位于 `qa/widget-preview/widgets-0.2.1.png`，它是设计模拟图，不能代替 Android 实机或模拟器验收。

## 技术

共享 Vite/JavaScript 界面，Windows 使用 Electron，Android 使用 Capacitor 和 Java 原生天气插件。Windows 默认在原生层调用腾讯 IP 接口，备用系统定位使用 WinRT；Android 使用 LocationManager、精确与大致位置权限。天气接口使用 `/weather/v1/current`、`daily`、`hourly`；手动城市搜索使用 `/geo/v2/city/lookup`，定位匹配使用内置城市库。

JWT 使用 Ed25519，Header 包含 `alg/kid`，Payload 包含 `iss/sub/iat/exp`。有效期 15 分钟，提前续签，签发时间回退 30 秒。私钥在原生层，网页脚本无法直接读取。请求固定到配置的和风 Host，并限制为支持的操作。

服务缓存：当前天气 5 分钟，逐日/逐小时 30 分钟，搜索 60 分钟；Windows 并发相同请求合并。缓存和错误提示避免将缺失值误显示为 0。

## 维护者配置

普通用户无需操作。维护者按[和风 JWT 文档](https://dev.qweather.com/docs/configuration/authentication/#json-web-token)创建凭据，然后建立本地 `secrets/qweather.local.json`：

Windows 腾讯 IP 定位额外读取 `secrets/tencent.local.json`，内容为 `{"key":"YOUR_TENCENT_WEBSERVICE_KEY"}`；启用 SK 校验时增加 `sk`。运行 configure 后仅写入 Windows 原生配置，Android 不包含腾讯 Key。源码包排除所有本地凭据。接口文档：https://lbs.qq.com/service/webService/webServiceGuide/position/webServiceIp。

```json
{
  "host": "your-host.re.qweatherapi.com",
  "kid": "YOUR_KEYID",
  "iss": "QDEVELOPER",
  "sub": "PROJECT_ID",
  "privateKeyPath": "C:/private/ed25519-private.pem"
}
```

Host 不含协议、端口或路径，ID 使用控制台实际的 10 位值。`privateKeyPath` 可省略，默认读取 `secrets/ed25519-private.pem`。首次生成新密钥可执行 `node scripts/generate-keys.mjs`；该命令不会覆盖已有密钥对。**已有和风凭据必须使用与已上传公钥配套的私钥。**

```powershell
npm install
node scripts/configure.mjs
node scripts/check-service.mjs
npm test
npm run build
npm run desktop
npm run package:win
```

Android：安装 Android SDK 35、build-tools 35 与 Java 21，执行 `pwsh -NoProfile -File scripts/build-android.ps1`。本项目已经包含 Android 工程。脚本执行同步、编译、单元测试、lint 与签名检查，成功后才复制最终 APK。

中文 Windows 路径下，Gradle 8.11 的 Java 测试参数文件需与 Windows launcher 编码一致；已配置 `file.encoding=COMPAT`，JavaCompile 单独保持 UTF-8 源码编码。构建脚本设置本项目 Android 用户目录和缓存，不修改系统编码。

本地网页测试先构建，再执行 `node scripts/dev-server.mjs`，访问 http://127.0.0.1:5180 。开发服务只监听回环地址。`?demo=1` 开启显著标注的界面演示，默认使用真实天气。

## 分发边界

当前原生直连构建会把维护者私钥放入应用包中，适合持有者自用测试。原生隔离并不能阻止安装包被反编译后取出私钥。**向公众分发前，应使用部署在维护者服务器的天气代理，并由服务器持有私钥，客户端只内置代理地址**，同时配置额度与访问限流。源码分享时不能包含 `secrets/`、`desktop/private.json`、Android `assets/private.json`、签名密钥或带私钥的已构建包；这些路径已加入本项目 `.gitignore`。

当前 Android debug APK 使用开发签名，可以安装测试；正式发行需维护者签名并保持签名密钥，以便后续覆盖更新。Windows 包未做商业代码签名。

## 许可和隐私

原作 Anti-996 许可证原文保留在 LICENSE，来源说明见 THIRD_PARTY_NOTICES.md。关于页展示原作者、数据来源、许可和本地隐私说明。

应用只在用户搜索时发送城市搜索词，在请求天气时发送所选城市的公开中心坐标。手机 GPS 和 Windows 系统定位坐标只用于本机匹配，不发送给和风或腾讯，不写入日志/缓存/轨迹文件。Windows IP 定位由用户点击触发 HTTPS 请求，腾讯可以看到请求端公网 IP；应用立即从响应中移除 IP，仅在内存中使用行政区信息匹配城市。本机仅保存选择的城市与天气缓存。系统定位服务自身的数据处理由系统控制。无后台定位、账号或广告。

