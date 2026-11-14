# Android 用户主动定位

用户点击定位按钮才调用原生 `locate()`。手动选城与桌面小组件不需要授权定位。

- 只声明、请求 `ACCESS_COARSE_LOCATION`。不声明 fine 或 background location。
- 位置由 `LocationManager` 的可用 network/fused provider 取得；可使用不超过 60 秒的系统缓存 fix，否则授权后等待约 20 秒。
- 系统返回的 `Location` 只在回调内存中读取，坐标在返回 JS 前校验并量化到两位小数。
- 拒绝权限、系统定位关闭、服务不可用、超时均有中文提示，并可继续手动选城；没有失败后的自动权限重试。
- `cancelLocate()` 不需定位权限。页面停止/销毁会取消，包括尚在等待权限回调的请求；旧回调不会重新开始定位。
- 一次请求只完成一次，在成功、失败、超时或取消时先移除监听与 timeout，再交付结果。不会后台续定位。
- 定位类不使用 SharedPreferences、文件或日志；Capacitor `android.loggingBehavior=none`，避免框架 debug 日志记录插件参数。

JS 将近似位置与内置城市中心库在本机匹配，用户选择城市后只保存城市中心。设备定位坐标不会传给和风天气，原生天气客户端也未新增按设备位置调用 Geo API 的路由。天气与小组件继续按选择的城市中心请求数据。

定位单元测试验证量化/边界、清理先于回调、timeout/cancel 后晚到 fix 被忽略、只完成一次。系统权限、各厂商定位 provider 与页面切换仍需 Android 实机验证。
