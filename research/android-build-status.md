# Android 构建诊断（2026-11-13）

本机 Java 21、Gradle 8.11.1、SDK 35。定位功能加入前的完整 `assembleDebug`、5 项业务 JUnit、`lintDebug` 与 APK v2 签名检查已成功。随后增加了可读性调整和用户主动定位；最终定位版本的验证记录将在构建后更新。

早期不依赖 AAPT2 的核心检查使用现有 JDK21、Gradle 自带的 JUnit 4.13.2/EdDSA 0.3.0 和 SDK35 `android.jar`，输出 `OK (5 tests)`。完整构建随后也成功验证了这些测试；它们覆盖 JWT 独立验签、坐标/请求限制、按坐标区分缓存、缺失温度、摄华氏和插画分类。无意义的 `2+2=4` 模板测试已经移除。

0.2.0 新增 4 个定位业务测试：回调前量化坐标且只完成一次、超时后拒绝晚到定位、取消后拒绝晚到定位、非法坐标/边界/负零检查；另有 3 个 Pixel 图标测试：昼夜、冰雹/冻雨/雨雪、雾霾区分与沙尘回退。该阶段共 12 项业务 JUnit。

尚无 Android 实机或模拟器运行验证。adb 枚举本身因本机临时日志权限问题失败，不能据此宣称无连接设备，也不能宣称小组件或权限对话框已实机测试。

## 实际失败

- sandbox 内 Maven AAPT2 daemon 启动失败。Gradle 提示检查 Universal C Runtime；用户观察到 `0xc0000142` 启动错误弹窗。
- 独立启动 SDK 35 `aapt2.exe version` 同样没有正常版本输出，不能认定 SDK 版本能够绕过错误。
- `C:/Windows/System32/ucrtbase.dll` 文件实际存在。
- PE 导入表静态检查：两个 AAPT2 都为 x64，均使用 KERNEL32、SHELL32 和 `api-ms-win-crt-*` API-set；Maven 版本还直接导入 USER32。
- API-set DLL 名称不要求逐个具有同名 System32 文件，其解析由 Windows API-set 映射负责；文件查询结果不能证明运行库缺失。
- Capacitor CLI 在 sandbox 内另报 `os.userInfo()` / `uv_os_get_passwd ENOMEM`；实际最新资源同步仍须在可正常启动子进程的环境完成。

这些观察表明失败发生在本机构建进程启动/运行环境，尚不足以唯一确定原因。没有修改系统安全策略、注册表或杀毒设置，也没有安装额外系统运行库。

## 中文路径测试进程修复

主会话解除隔离后 AAPT2、资源、Java、DEX 与 `assembleDebug` 已通过，生成约 6.4MB 的 APK；随后 Gradle 测试进程报 `ClassNotFoundException: worker.org.gradle.process.internal.worker.GradleWorkerMain`。

worker JAR 确实存在且包含该类。读取实际三个 Gradle worker `@argfile`，路径含中文，文件为 UTF-8。使用同一 classpath 的独立 Java 探针观察到：UTF-8 argfile 中首个 worker JAR `File.exists()` 为 false，CP936 argfile 为 true。Gradle 8.11.1 `ArgWriter` 使用 `new PrintWriter(File)`（默认字符集）写参数文件。

最小修复：本项目 Gradle daemon 使用 `-Dfile.encoding=COMPAT`，使 `@argfile` 与 Windows Java launcher 的本地字符集一致；全部 `JavaCompile` 源文件编码明确为 UTF-8。构建脚本同步带上该 JVM 参数，无需迁移项目或更改系统编码。

## 工具身份

| 工具 | 长度 | SHA256 |
| --- | ---: | --- |
| SDK build-tools 35.0.0 AAPT2 | 4740896 | CBFE5DEDA5F7074CE47B6F33818B456EE8046A076A11AF13E29C837D3C80C564 |
| Maven aapt2-8.7.2-12006047-windows | 4945920 | F50F50225413B5CBEF6CD0E662C91B0023EB9E0063656C9970FF8F63FE4100E7 |

## 复现脚本

`scripts/build-android.ps1`：构建天气界面、Capacitor 同步、Gradle 编译/单元测试/lint、复制 APK、签名验证。使用 SDK 35 AAPT2 override、单 worker、本项目 Gradle 缓存与 Android 用户目录。

脚本只在当前构建 shell 及其子进程设置错误模式，以免失败反复弹窗，结束后恢复；不更改系统安全或全局配置。编译失败不会生成或宣称新的 APK。

```powershell
pwsh -NoProfile -File "C:/Users/xtt20/Downloads/文学史资料网页版/MikuWeatherReborn/scripts/build-android.ps1"
```

新界面已构建时可使用 `-SkipWeb`，仍会执行 Capacitor 同步。成功后的 APK 为 `release/MikuWeather-Reborn-<package.json.version>-Android.apk`（开发签名），同时核对 Android metadata 版本与 package.json 一致。

## 0.2.1 单卡小组件检查（2026-11-14）

本轮新增 11 项业务 JUnit，共 23 项。直接使用本机 JDK21、Gradle 自带 JUnit/Hamcrest/EdDSA 与 SDK35 `android.jar` 编译实际核心源码和六份 Test，运行输出 `OK (23 tests)`。新增覆盖太阳边界、UTC 跨日与所选城市日期、缺失/错日期/倒置 astro、当天预报缓存复用（包括有效预报缺 astro）、外观与太阳状态分离、无效时区回退、窄/矮尺寸大字体、负华氏长温度，以及太阳状态覆盖缓存夜间代码。

独立 `javac` 返回 0 并生成测试类，但本机 sandbox 下 JDK ZipFS 在退出关闭 JAR 时仍输出 `AccessDeniedException`。将依赖 JAR 复制到本机 ASCII 临时目录后关闭异常仍出现，不能归因为中文路径。本轮测试在新输出目录运行全部 23 项并通过；这不能替代 Gradle/AAPT2/lint 与 APK 签名检查。记录为 `qa/android-junit-23.log`，编译诊断为 `qa/android-javac-clean.log`（名字含 clean 但内容仍有上述关闭异常）。

Android Manifest、两份布局与两份 widget metadata XML 均已解析；无旧 `widget_date/widget_status` 引用，无按宽度切换 Provider 的分支。查看实际资源绘制的六案例设计 PNG，单卡中的城市、天气与角色无跨卡分离；此图片不是 Android 实机截图。

源码 Android metadata 已更新 `versionName=0.2.1 / versionCode=3`。主会话最终完整构建调用再次未执行：自动审批服务 AgentRouter 返回 HTTP 400 `content-blocked`（request `2026111400565254917543272v5hRHM2b29s`），输出为 review failure，并未给出 unsafe 操作判定。因此未生成本轮 0.2.1 APK，不能用旧 APK 代替本轮布局和主题的验收。未重复尝试 elevated 构建或修改审批配置；23 项核心 JUnit 与设计 PNG 已完成，但最终 APK 编译、Android lint、签名检查及实机/模拟器运行验证仍未完成。

## 0.2.2 GPS 版本完整构建（2026-11-14）

用户明确电脑使用腾讯 IP、手机使用 Android GPS / 系统定位。手机新增精确位置权限，与大致位置一起请求；只允许大致位置仍支持系统网络定位，拒绝权限仍可手动选城。精确权限可用时订阅 GPS 并优先等待 8 秒，随后允许有效系统网络 / 融合位置。超时 30 秒、精度上限 5 公里、位置最大年龄两分钟；完成/取消/离开界面移除监听和临时候选，不后台定位。

新增 LocationQuality 两项测试，独立核心测试共 25 项全部通过。使用 SDK35 android.jar 独立编译包含真实 ForegroundLocation 在内的核心源码成功；JDK ZipFS 关闭时仍有 AccessDenied 噪声，因此最终仍以完整 Gradle 构建为准。

此前自动审批服务 HTTP400 未执行构建。用户改用手动批准后，真实 assembleDebug / testDebugUnitTest / lintDebug 构建成功（首次1分28秒、版本文案同步后36秒）。Gradle app 25 项测试，failures=0 / errors=0；lint 无 Error/Fatal，69 条 Warning（包含既有布局、资源与工程提示）。APK v2 签名验证成功，versionName=0.2.2 / versionCode=4，沿用原 debug 签名可覆盖升级。

最终 APK：release/MikuWeather-Reborn-0.2.2-Android.apk；SHA256：2DA3E41DD20147D2C35C2ED2F1AB24A2E7FD4FF7EE5373F4A809A689CCA5FF59。包中不包含腾讯位置 Key；手机坐标不发送到腾讯或和风，只在本地匹配。实机权限/GPS准确性及桌面小组件显示仍需手机验收，构建通过不等于实机验证。
