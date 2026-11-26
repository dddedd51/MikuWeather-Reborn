#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work/widget-previews
device_type="$(xcrun simctl list devicetypes -j | python3 -c 'import json,sys;v=json.load(sys.stdin)["devicetypes"];print(next((d["identifier"] for d in v if d["name"]=="iPhone 16"),next(d["identifier"] for d in v if d["name"].startswith("iPhone"))))')"
runtime="$(xcrun simctl list runtimes -j | python3 -c 'import json,sys;v=[r for r in json.load(sys.stdin)["runtimes"] if r.get("isAvailable") and "iOS" in r["name"]];print(max(v,key=lambda r:tuple(map(int,r["version"].split("."))))["identifier"])')"
sim="$(xcrun simctl create MikuWidgetReview "$device_type" "$runtime")"
xcrun simctl boot "$sim"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination "platform=iOS Simulator,id=$sim" -derivedDataPath work/ios-sim \
  CODE_SIGNING_ALLOWED=NO CURRENT_PROJECT_VERSION=14 MARKETING_VERSION=0.3.8 build 2>&1 | tee work/ios-sim-build.log
xcrun simctl bootstatus "$sim" -b
app="$PWD/work/ios-sim/Build/Products/Debug-iphonesimulator/App.app"
if [[ -d "$app/Frameworks" ]]; then
  for framework in "$app"/Frameworks/*.framework; do
    [[ -d "$framework" ]] && codesign --force --sign - "$framework"
  done
fi
codesign --force --sign - --entitlements ios/App/MikuWeatherWidget/MikuWeatherWidget.entitlements "$app/PlugIns/MikuWeatherWidgetExtension.appex"
codesign --force --sign - --entitlements ios/App/App/App.entitlements "$app"
xcrun simctl install "$sim" "$app"
xcrun simctl launch "$sim" io.mikuweather.reborn --widget-store-test
sleep 8
container="$(xcrun simctl get_app_container "$sim" io.mikuweather.reborn data)"
python3 - "$container/Documents/widget-store-test.json" <<'PY'
import json,sys
value=json.load(open(sys.argv[1]));assert all(value.get(key) for key in ['privateCacheAvailable','cacheRoundTrip','olderCacheRejected','bridgeControllerReady','nativeBridgeReady']),value
print('Simulator private cache round-trip and native bridge startup passed')
PY
xcrun simctl terminate "$sim" io.mikuweather.reborn
for spec in 'small,zh-CN,light' 'medium,en,light' 'large,ja,dark' 'medium,zh-TW,dark' 'small,en,light,F'; do
  xcrun simctl launch "$sim" io.mikuweather.reborn "--widget-preview=$spec"
  sleep 4
  xcrun simctl io "$sim" screenshot "work/widget-previews/$spec.png"
  xcrun simctl terminate "$sim" io.mikuweather.reborn
done
xcrun simctl shutdown "$sim"
