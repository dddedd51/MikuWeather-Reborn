# Windows 定位修正（2026-11-14）

用户在 0.2.0 报告附近城市全部落在上海，而实际不在上海。该版使用 System.Device.GeoCoordinateWatcher 的默认精度，并按本地城市中心距离排序；没有检测系统位置来源、误差与时效。

0.2.1 改用 Windows.Devices.Geolocation.Geolocator：使用前台 WinForms UI 和 STA UI 线程调用 RequestAccessAsync，授权后请求 High / 1000 米目标精度、零缓存年龄的新位置。Microsoft 文档明确要求 RequestAccessAsync 在前台 UI 线程调用：
https://learn.microsoft.com/en-us/uwp/api/windows.devices.geolocation.geolocator.requestaccessasync

结果为 IPAddress、Default，误差超过 5000 米，或时间超过两分钟时，明确失败并保留手动选城。不会用额外的 IP 查询服务补猜城市。可靠性检查不保证系统报告的位置一定正确；本地中心点排序也不是行政边界识别。

定位只在主动点击时进行。返回坐标先取两位小数，数据仅通过进程管道保留在内存中，本机城市库完成匹配，选城后只保存城市的公开中心。没有位置日志、轨迹文件或向和风发送设备定位坐标。原生窗口取消、主窗口关闭、超时会终止请求/助手。系统定位服务自身的数据处理由系统设置控制。

已通过：C# 编译，JS 对 IP/默认/低精度/旧位置的拒绝测试、本地匹配和不上传坐标的测试。旧的无前台 Geolocator 诊断只返回 DENIED，不能将它等同于用户全局定位关闭；只读检查的三个 Windows 全局位置开关均为 Allow。

尚未验证：新助手的前台授权交互及实际城市准确性。GUI 启动检查遇到自动审批后端 AgentRouter HTTP 400 content-blocked，操作未执行；不绕过审批，也不把编译通过称为定位已准确。

0.2.2 Windows 包已在普通下载目录实际启动，桌宠、天气详情和腾讯 IP 入口已操作验证。系统定位作为备用入口保留；此次未请求 Windows 系统定位权限，不把腾讯 IP 运行检查当成 GPS 或系统位置准确性验证。
