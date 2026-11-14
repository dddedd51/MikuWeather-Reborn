# Android 桌面小组件参考

用户提供：`C:/Users/xtt20/WorkBuddy/2026-11-13-17-36-49/miku_re/miku_original.apk`

SHA256：`D32E9B2037C7E0112599FA5806E34FF59E2CF096398A2B2BAC0767F41BBB497C`

## 直接 APK 静态观察

使用 Android SDK 35 `aapt dump badging/xmltree/resources` 只读检查，未运行参考 APK。

- 包名 `net.gddhy.mikuwidget`，minSdk 17，targetSdk 30。
- `net.gddhy.mikuwidget.MikuWeatherWidget` 注册 `APPWIDGET_UPDATE` 与 provider 元数据。
- 压缩资源名称：`layout/miku_weather_widget` 为 `res/J7.xml`，`xml/miku_weather_widget_info` 为 `res/eY.xml`。
- `res/J7.xml`：透明 `RelativeLayout`，左侧可点击 `ImageView` 宽 170dp，右侧 `TextClock` 时间 54sp、日期 12sp，天气 `TextView` 12sp，文字白色。
- `res/eY.xml`：最小 250×110dp，可横向/纵向调整，home_screen 类别，更新间隔 86400000ms。

以上来自常规 SDK 工具，不属于 REA Evidence。REA `inspect_android_package` 首次调用被自动审批中止，报 AgentRouter `content-blocked` HTTP 400；工具未执行，未修改审批配置或重复被中止的调用。未获得 APK 运行截图，也不宣称与原作行为完全等价。

## 重制实现

保留初音角色、透明桌面布局与原生时钟，使用原 Windows 开源仓库已有插画，没有复制参考 APK 的插画文件。

- 提供 4×2 天气卡和 2×2 迷你天气卡；Provider 类型决定样式，宽版缩小时不会切换成紧凑版。
- `AppWidgetProvider` 与 `RemoteViews`，无需应用界面常驻；点击打开天气，↻ 请求刷新。
- 应用选中城市、单位同步至原生 `SharedPreferences`；只读取对应坐标的缓存，避免换城市后显示上一城市天气。
- 原生共享 `QWeatherClient` 调用和风 v1，JWT 与请求缓存共用。缺失天气不会填充假温度。
- `JobScheduler` 约每 30 分钟更新，有网络约束，系统省电可能延后。不存在小组件时取消任务；无精确闹钟、悬浮窗或后台定位权限。
- 时钟/日期由 `TextClock` 按所选城市时区更新；插画和 Pixel 晴天/多云昼夜按城市日出日落选择。
- 显示数据来自和风天气、观测时间和失败时的缓存状态。

0.2.0 小组件额外显示用户提供 Pixel 天气资源中 13 张原样透明 PNG，复制到 `drawable-nodpi`，只复制 `weather_*_pixel.png` 业务文件。宽版/紧凑版图标 24/20dp；晴、多云按昼夜变化，冰雹、雷暴、雨雪、雪、雨、雾、霾、风按与 JS 相同的有限类别映射。沙尘或未知代码没有对应专图时隐藏图标并保留天气文字，不把未知情况伪装成晴天。初音角色映射保持原 Windows 素材逻辑。

需要 Android 实机或模拟器核对各厂商桌面的添加、缩放、点击、重启、断网与省电行为；本地编译/静态检查不能替代这些运行验证。

## 0.2.1 单卡布局与太阳主题

根据用户实机反馈，移除旧版独立大时钟和浮在卡外的角色布局。两个尺寸现在都是透明外底上的一张半透明圆角卡：顶部城市与小日期时间，左侧大温度、Pixel 天气、体感和高低温，右侧初音，底部短提示、和风来源与刷新。宽版角色 `fitCenter`；紧凑版 `centerCrop` 放大主体，会裁掉少量边缘装饰和头发。

`WidgetCardLayout` 按 Launcher 提供的宽高和系统字体缩放预算字号。空间不足时依次隐藏高低温、体感、短提示，窄尺寸隐藏日期时间；来源与刷新保留。最终字号用有效 dp，避免预算之后再次受到系统 fontScale 放大。4×2 和 2×2 都可缩放到元数据规定的最小 130×110dp。

默认 `solar` 外观按选中城市时区匹配七日缓存当天 `astro.sunrise/sunset`；日出时转浅色，日落时转深色。缺失或异常 astro 回退该城市当地 06:00/18:00。有效日预报缺 astro 时当天复用缓存，不每半小时重复拉取。新城市、跨城市本地日或缺当天预报才请求 daily；current 成功时 daily 失败不会把当前天气改成错误。

主应用同步 `theme=solar/light/dark/system` 和单位。明确外观只覆盖卡片背景与字色；初音和 Pixel 天气昼夜继续取真实太阳状态，避免白天选择深色主题后显示月亮。`AlarmManager.RTC` 在下一个太阳边界安排纯本地重绘，无网络请求、非唤醒、非精确闹钟；系统省电和批处理可能延迟切换，不能承诺秒级刷新。时间/时区/配置变化和开机触发重绘，开机恢复天气 Job。

设计预览生成脚本：`scripts/preview-android-widgets.ps1`。它直接运行同一 `WidgetCardLayout` 导出尺寸预算，使用实际初音和 Pixel PNG，通过 System.Drawing 模拟绘制六种日夜/大小场景。输出 `qa/widget-preview/widgets-0.2.1.png` 与 `layout-plans.json`，图片明确标记“设计渲染预览 · 非实机截图”。Android 字体度量、RemoteViews 测量与各桌面留白仍须实机验证。
