# 初音天气 · Reborn

**让初音，回到桌面。** Windows、Android 与 iOS 的非官方初音天气重制版。

![初音天气重制版实测](docs/images/cover.jpg)

重制自 [lzcapp/MikuWeather_Windows](https://github.com/lzcapp/MikuWeather_Windows)，保留随天气变化的初音插画，重做天气页面、Windows 透明桌宠和 Android 桌面小组件。天气数据来自[和风天气](https://www.qweather.com/)。当前版本 **0.3.4**。

**[下载 Windows / Android / iOS 安装包](https://github.com/dddedd51/MikuWeather-Reborn/releases/tag/v0.3.4)**。Windows 完整解压到 **`D:\MikuWeatherReborn`** 等不含中文的目录后运行。

📖 [开发日志：我用约 3636 万累计 token，重写了初音天气](docs/DEVLOG.md) · [用量统计范围](docs/token-usage.json) · [构建说明](docs/BUILD.md) · [第三方来源](THIRD_PARTY_NOTICES.md)

> 标题里的累计用量包含缓存输入，不代表新生成 token 数或实际费用。

## 0.3.4 · 刷新成功提示自动消失

小组件“更新成功”显示约 3 秒后自动清除。再次刷新时，旧提示的计时器不会清掉新状态。详见 [0.3.4 更新说明](docs/UPDATE-0.3.4.md)。

## 0.3.3 · 城市完整显示、外观同步与刷新反馈

城市名使用独立底部行，按 Android 实际文字行高测量上方内容，修复被截断的问题。小组件跟随手动浅色、深色或系统外观，自动模式才按日出日落切换。点击刷新会在按钮上方显示等待、更新中、成功、无网络或失败提示，失败时保留缓存天气。

详见 [0.3.3 更新说明](docs/UPDATE-0.3.3.md)。

## 0.3.2 · 日夜卡牌与留白修复

恢复最初的日夜渐变卡牌：按所选城市日出日落切换浅薄荷色/深蓝绿色，文字同步明暗，保留当前透明度设置。

根据 MIUI 桌面实机截图修复小组件文字贴住遮罩、进入圆角的问题。内容单独增加内边距，字号按扣除留白后的空间适配；圆角按组件比例绘制，避免宽版横向拉伸。保留大温度、小时间、左下角刷新与透明度调节。0.3.1 可在设置中检查更新。

详见 [0.3.2 更新说明](docs/UPDATE-0.3.2.md)。

## 0.3.1 更新

Android 小组件增加 **0–100% 背景不透明度**和 **100–140% 字号**调节，设置里实时预览；时间缩小并与温度分行，左下角恢复小刷新按钮；温度改为独立大字，保留左侧初音、右侧时钟与天气。文字与初音不随背景一起变透明。

切换简体中文 / 繁體中文 / English / 日本語后，城市、地区和国家名称从城市服务按同一城市 ID 获取对应语言，同步桌宠与小组件；离线保留已知名称。

新增启动检查与设置内检查更新。Windows 下载、SHA256 校验后退出替换并重启；Android 校验文件、包名、版本与安装签名后打开系统安装界面。**0.3.0 用户需要手动安装一次 0.3.1，之后才能使用应用内更新。**

iPhone 继续提供 iOS 14+ 未签名 IPA，检查到更新后打开下载页，需重新签名侧载。当前 iOS 不含 WidgetKit 扩展。详见 [0.3.1 更新说明](docs/UPDATE-0.3.1.md)。

## 可以做什么

| Windows | Android | 共享功能 |
| --- | --- | --- |
| 透明桌宠、天气气泡、拖动、右键菜单和托盘 | 天气页面、宽版与紧凑版原生桌面小组件 | 当前天气、逐小时和七日预报 |
| 腾讯 IP 定位，保留系统定位入口 | 系统 GPS / 网络定位，候选城市确认 | 城市搜索与收藏、温度单位、缓存提示 |
| 日出日落主题与插画切换 | 主题与小组件同步、手动刷新 | 浅色、深色、跟随系统与太阳主题 |

## 实测画面

### Windows：桌宠陪伴

初音常驻桌面，天气气泡显示城市、温度与天气；插画随天气变化。支持拖动位置、点击打开详情、右键菜单、置顶和托盘。

<img src="docs/images/windows-desktop-pet.png" alt="Windows 初音桌宠与天气气泡实测" width="260">

### 不同天气下的初音

![安装包中的初音天气插画：晴、多云、阴、雨、大雨、雪、雷雨和雾](docs/images/weather-gallery.jpg)

以上为安装包内的角色插画，晴、多云等天气还提供昼夜版本。[提取路径与 SHA256](docs/weather-art-source.json)记录了素材来源。

<img src="docs/images/windows-overview.jpg" alt="Windows 天气详情实测" width="600">

### Android：天气页与桌面小组件

手机提供天气详情、城市管理与原生小组件，宽版和紧凑版卡片均保留天气、初音和刷新入口。

<img src="docs/images/android-overview.jpg" alt="Android 天气页实测" width="280">

![Android 桌面小组件实测](docs/images/android-widget.jpg)

截图来自用户的电脑和手机，裁切与缩放用于展示。更多画面及验证范围见开发日志。

## Windows 安装：务必使用非中文目录

1. 把完整 Windows ZIP 解压到不含中文的普通目录，例如 **`D:\MikuWeatherReborn`**。
2. 在解压后的目录运行 `Miku Weather Reborn.exe`，无需管理员权限。
3. 不要在压缩包内直接运行，不要只复制 EXE；`resources` 等配套文件必须保留。

上述是本次测试采用的运行方式。开发工作区曾出现界面进程启动失败，复制完整文件到普通目录后恢复；这不是对所有中文路径的兼容性结论。

Android 8.0+：安装维护者构建的 APK，打开应用选择城市，再通过桌面“小组件”入口添加初音天气。后台更新受系统省电策略限制。

## 下载与服务状态

在 [Release v0.2.3](https://github.com/dddedd51/MikuWeather-Reborn/releases/tag/v0.2.3) 下载 Windows x64 ZIP、Android APK、源码 ZIP 和 SHA256 校验文件。源码 ZIP 不能直接当安装包运行。

**公众安装包免填 API Key；和风私钥与腾讯 Key 保存在 Cloudflare Secrets，客户端只包含公开服务网址。** 已部署 Pages 中转和 Worker，城市搜索、当前天气、七日与逐小时预报、IP 定位已通过本机直连测试。免费配额、上游服务或网络情况可能影响可用性。

源码、Git 历史以及解包后的 Windows/Android 产物均做了本项目已知凭据扫描。历史 0.2.2 自用包含凭据，不在公开 Release 分发。自建维护者见 [构建说明](docs/BUILD.md) 和 [代理部署说明](worker/README.md)。Android 使用开发签名，Windows 未做商业代码签名。

## 开发

共享界面使用 Vite / JavaScript；Windows 为 Electron，Android 为 Capacitor + Java 原生插件。保留原生小组件、缓存、请求限制及定位候选确认。

```powershell
npm ci
npm test
npm run build
```

真实天气和原生打包需要维护者服务配置，详见 [BUILD.md](docs/BUILD.md)。开发验证记录见 [开发日志](docs/DEVLOG.md)。

## 配音与来源

宣传片使用 **GPT-SoVITS 初音未来 2.0 模型的 AI 合成配音**。模型来源：**[bilibili · BV18iA2e1Eok](https://www.bilibili.com/video/BV18iA2e1Eok)**。模型权重和参考音频不随本仓库分发。

原项目采用 Anti-996 许可证，原文保留在 [LICENSE](LICENSE)。角色、插画、Pixel 天气图标和语音模型分别属于各自权利人，并不因为本仓库公开而自动适用同一许可。具体来源和使用边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本项目为爱好者非官方重制，不代表原作者、初音未来权利人、和风天气或其他素材作者的官方产品。
