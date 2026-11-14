# 用户提供的 Pixel 天气图标包分析

目标：`C:/Users/xtt20/Downloads/pixel-icon-provider-v4.apk`（988,501 字节）。

SHA256：`a63e7289762a72231b68aff246f2811267219395123fc24431aeadd32e1c65e5`。

## 证据和边界

REA `open_binary` 识别为 APK；静态中央目录库存包含 92 个文件、无符号链接、无库存完整性冲突。没有安装或运行 APK。

- 完整库存 Evidence：`ev_b9c87093235d4c5b5af06b272e28ffeac1f2420a24606b39704059ad44d346a9`
- `inspect_artifact` 父 Evidence：`ev_bd16ba4dbd03a1c684b7a7a68bec825ea17c7edaa8f36f53fcc1f972e3ce8e7f`
- 摘要 Evidence：`ev_c614106d637750c634513237d1b22bdc62bde02bda1949440b76273d5d596b55`

库存只覆盖 ZIP 成员，不验证 APK 签名，也不建立运行行为。随后使用已有 apktool 2.11.1 和 Java 21 静态解码资源表与 XML。首次解码因框架缓存目录不可写失败；通过审批后把框架缓存限定到本项目新资源目录，解码成功。没有修改 REA 配置或系统设置。

## 确认结果

解码 manifest 的包名为 `org.breezyweather.pixeliconprovider`，显示名 Pixel，版本 4.0 / 4，目标 SDK 34，最低 SDK 11。APK 有一个供 Breezy Weather 发现的图标 Provider Activity。

`res/xml/config.xml` 声明 weather icons、shortcut icons、sun/moon drawables 和 animators。`drawable_filter.xml` 明确声明原包的天气分类与资源名，使用这个声明而非从混淆 ZIP 文件名猜测。

已将 13 个完整、静态的 256×256 透明 PNG 原样复制到 `public/assets/pixel-weather/`。每个文件的 SHA256 都与原 APK 中对应 ZIP 成员相同，原成员路径保留在 `manifest.json`。图片合计 129,647 字节。缩略预览已人工目视核对，见 `public/assets/pixel-weather/preview.png`。

| 分类 | 实际文件 | 建议和风代码 |
| --- | --- | --- |
| 晴天 | weather_clear_day_pixel.png | 100，按当地时段切换晴夜 |
| 晴夜 | weather_clear_night_pixel.png | 150，或晴天气的当地夜间 |
| 少云/多云，白天 | weather_partly_cloudy_day_pixel.png | 101–103 |
| 少云/多云，夜间 | weather_partly_cloudy_night_pixel.png | 151–153，或多云天气的当地夜间 |
| 阴 | weather_cloudy_pixel.png | 104 |
| 雨 | weather_rain_pixel.png | 300–301、305–318、350–351、399 |
| 雪 | weather_snow_pixel.png | 400–403、407–410、457、499 |
| 雨夹雪 | weather_sleet_pixel.png | 404–406、456 |
| 冰雹 | weather_hail_pixel.png | 304（雷阵雨伴冰雹） |
| 雷暴/雷阵雨 | weather_thunderstorm_pixel.png | 302–303 |
| 雾 | weather_fog_pixel.png | 500–501、509–510、514–515 |
| 霾 | weather_haze_pixel.png | 502、511–513 |
| 风 | weather_wind_pixel.png | 200–213（若服务仍返回该旧分类） |

和风代码映射是维护者接入建议，不是原包声明。其余类别需通用回退，并保留原始天气文字，避免给未知、沙尘、极冷/极热伪装成晴或雪。

原包的雪/冰雹图字节完全相同；雾/霾图字节也完全相同。图标强度不随小雨/暴雨、小雪/暴雪区分，此包只提供这组通用静态分类图。静态 PNG 显示为圆形太阳、紫色月亮、白灰云、蓝雨滴等，未使用动画分层或快捷方式背景。

## 来源与授权未知项

92 个 ZIP 文件中未发现单独命名的 license/copyright/notice 文件；解码 XML 没有图标许可证说明。目标 DEX 字符串筛选命中了包内类名和一个通用 `copyright` 属性名，没有作者来源 URL或许可证正文。该有限搜索不能证明没有权利限制。

没有据此推断 Google 或 Breezy Weather 对这些图标的再分发授权。用户授权用于此自用测试包；公开发行前必须核实素材授权。资源目录中的 `SOURCE.md` 和 `manifest.json` 保存这个边界。

临时解码目录、框架缓存、原始 DEX 与分析脚本已清理，最终资源目录只保留 PNG、预览、来源说明和清单。
