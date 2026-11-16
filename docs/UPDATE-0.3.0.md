# 0.3.0 · 四种语言与 iPhone 版本

- 设置新增简体中文、繁體中文、English、日本語，立即生效并保存。天气描述、日期、设置、Windows 菜单和 Android 小组件同步语言。城市地名保持原始名称。
- Android 4×2 与 2×2 小组件改为透明背景：初音在左、时钟与日期天气在右。时钟使用系统 TextClock；点击初音刷新，点击时钟区域打开天气详情。
- Windows 桌宠和 Android 小组件移除和风天气来源字样；应用详情、关于页和许可证说明继续保留来源。
- 新增 iOS 14+ 工程和 GitHub macOS 构建流程，输出 arm64 未签名 IPA，需要自行签名侧载安装。iOS 版本包含天气应用，当前没有 iOS 主屏幕 WidgetKit 扩展。

## 构建

Windows 执行 `npm ci`、`npm test`、`npm run package:win`。Android 本机构建保持原有 `scripts/build-android.ps1`，CI 构建未签名 Release APK 后用维护者现有密钥签名。iOS 使用 GitHub Actions 的 **Build unsigned iPhone IPA**，也可在 Mac 上执行 `npm ci`、`npm run ios:sync`、`npm run ios:unsigned`。

未签名 IPA 不能直接安装。用自己的 Apple 签名通过 AltStore、Sideloadly 等侧载工具安装；签名有效期由使用的 Apple 账号类型决定。

天气服务仍使用原来的公开 HTTPS 代理，安装包不包含服务私钥。手机定位仍须主动点击才调用，结果只在本地匹配城市。

## 验证范围

Web 端四种语言切换、页面重载后的保留、手机尺寸布局、天气描述和日期显示已检查。iOS 的 Xcode 真机架构编译通过并生成 IPA；尚未在真实 iPhone 上完成签名安装及定位验收。Android 的尺寸预算测试不能代替不同桌面启动器上的实机排版验证。
