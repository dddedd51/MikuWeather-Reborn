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
  CURRENT_PROJECT_VERSION=11 MARKETING_VERSION="$version" build 2>&1 | tee work/ios-build.log
app=work/ios-derived/Build/Products/Release-iphoneos/App.app
test -f "$app/App"
# Use a fresh staging directory so repeat runs cannot include obsolete resources.
stage="$(mktemp -d "$PWD/work/ipa.XXXXXX")"
mkdir -p "$stage/Payload"
cp -R "$app" "$stage/Payload/App.app"
output="$PWD/release/MikuWeather-Reborn-$version-iOS-unsigned.ipa"
(cd "$stage" && /usr/bin/zip -qry "$output" Payload)
unzip -t "$output"
file "$app/App"
echo 'Unsigned IPA built; it must be signed before installation on an iPhone.'
