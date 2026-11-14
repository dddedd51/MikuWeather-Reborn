# 第三方来源

初音天气重制版改编自 [lzcapp/MikuWeather_Windows](https://github.com/lzcapp/MikuWeather_Windows)。原项目著作权声明为 Copyright (c) 2019 RainySummer，采用 Anti-996 License Version 1.0 (Draft)。原许可证未经修改保存在 LICENSE，应用的关于页面可查看完整文本。

天气插画和图标来自原仓库 MikuWeather_CS/Resources。角色与插画权利属于各自权利人；源仓库未为这些素材另附独立授权文本。本项目为非官方爱好者重制，公开或商业发行时应另行核实素材使用范围。未使用原仓库中的非商用字体文件。

天气服务由和风天气 QWeather 提供：https://www.qweather.com/ 。天气页提供可点击的明确署名，并保留 API 返回的 metadata.attributions。接口文档：https://dev.qweather.com/docs/api/ 。

本地城市库由和风官方 qwd/LocationList 的 China-City-List-latest.csv 转换，3577 个城市/区县；原始版本、URL 和 SHA256 保存在 public/assets/locations/source.json。该数据用于本机最近城市中心匹配，不构成行政边界识别。

Pixel 天气图标来自用户提供的 pixel-icon-provider-v4.apk（org.breezyweather.pixeliconprovider 4.0）。13 类完整静态 PNG 保持原始像素；来源成员路径与 SHA256 在 public/assets/pixel-weather/manifest.json。上游 https://github.com/breezy-weather/breezy-weather-icon-packs 明确列出 Pixel 的代码为 LGPL-3.0-only、Assets 为 non-free，素材作者 WangDaYeeeeee。本仓库保留来源与原像素，不对这些素材重新授予 Anti-996 或其他开源许可；独立再分发、商用或改作前须向相应权利人确认授权范围。

运行时及依赖：Electron（MIT）、Capacitor（MIT）、Lucide（ISC）、Vite（MIT）、EdDSA-Java（CC0-1.0）。具体依赖版本由 package-lock.json 与 Android Gradle 文件记录；依赖自带的许可证应一并遵守。

## 宣传视频配音

使用用户提供的 GPT-SoVITS 初音未来 2.0 模型（MikuEX-e15.ckpt / MikuEX_e8_s200.pth）进行 AI 合成配音，不是官方录制。模型来源：https://www.bilibili.com/video/BV18iA2e1Eok 。推理框架：https://github.com/RVC-Boss/GPT-SoVITS （MIT）。仓库不分发模型权重或参考音频，模型与角色权利属于各自权利人。
