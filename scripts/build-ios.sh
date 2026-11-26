#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'The iOS compiler requires macOS and Xcode. Run the GitHub workflow instead.' >&2
  exit 1
fi
version="$(node -p 'require("./package.json").version')"
mkdir -p work release
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -sdk iphoneos -derivedDataPath work/ios-derived \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' \
  CURRENT_PROJECT_VERSION=14 MARKETING_VERSION="$version" build 2>&1 | tee work/ios-build.log
app=work/ios-derived/Build/Products/Release-iphoneos/App.app
test -f "$app/App"
test -f "$app/PlugIns/MikuWeatherWidgetExtension.appex/MikuWeatherWidgetExtension"
# Use a fresh staging directory so repeat runs cannot include obsolete resources.
stage="$(mktemp -d "$PWD/work/ipa.XXXXXX")"
mkdir -p "$stage/Payload"
cp -R "$app" "$stage/Payload/App.app"
output="$PWD/release/MikuWeather-Reborn-$version-iOS-unsigned.ipa"
# Create fresh archives on every build. zip otherwise retains removed entries.
rm -f "$output"
(cd "$stage" && /usr/bin/zip -qry "$output" Payload)
app_only="$PWD/release/MikuWeather-Reborn-$version-iOS-AppOnly-unsigned.ipa"
rm -f "$app_only"
(cd "$stage" && /usr/bin/zip -qry "$app_only" Payload -x 'Payload/App.app/PlugIns/*')
unzip -t "$output"
file "$app/App"
python3 scripts/audit-ios-package.py "$output" "$app_only"
echo 'Unsigned IPA built; it must be signed before installation on an iPhone.'
