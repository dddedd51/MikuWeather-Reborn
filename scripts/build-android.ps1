param([switch]$SkipWeb)

$ErrorActionPreference = 'Stop'
$mikuProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$mikuPreviousAndroidUserHome = $env:ANDROID_USER_HOME
$mikuPreviousErrorMode = $null

function Assert-MikuCommand([string]$description) {
    if ($LASTEXITCODE -ne 0) { throw "$description 失败，退出码 $LASTEXITCODE" }
}

Push-Location -LiteralPath $mikuProjectRoot
try {
    # Suppress only child-process crash dialogs in this build shell; restore afterward.
    # No Windows security policy, antivirus setting or global registry value is changed.
    if (-not ('MikuBuildProcess' -as [type])) {
        Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public static class MikuBuildProcess {
    [DllImport("kernel32.dll")]
    public static extern uint SetErrorMode(uint mode);
}
'@
    }
    $mikuPreviousErrorMode = [MikuBuildProcess]::SetErrorMode(3)

    if (-not $SkipWeb) {
        & npm.cmd run build
        Assert-MikuCommand '天气界面构建'
    }
    & (Join-Path $mikuProjectRoot 'node_modules/.bin/cap.cmd') sync android
    Assert-MikuCommand 'Android 资源同步'

    if (-not (Test-Path -LiteralPath 'android/app/src/main/assets/service.json')) {
        throw '公开构建需要先运行 node scripts/configure-proxy.mjs https://YOUR-WORKER.workers.dev'
    }

    $mikuAndroidUserHome = Join-Path $mikuProjectRoot '.toolchain/android-user-home'
    New-Item -ItemType Directory -Path $mikuAndroidUserHome -Force | Out-Null
    $env:ANDROID_USER_HOME = $mikuAndroidUserHome
    $mikuLocalGradle = Join-Path $mikuProjectRoot '.toolchain/gradle/gradle-8.11.1/bin/gradle.bat'
    $mikuGradle = if (Test-Path -LiteralPath $mikuLocalGradle) { $mikuLocalGradle } else { Join-Path $mikuProjectRoot 'android/gradlew.bat' }
    $mikuArgs = @('-p', (Join-Path $mikuProjectRoot 'android'), '-g', (Join-Path $mikuProjectRoot '.toolchain/gradle-cache'), '--no-daemon', '--max-workers=1')
    # Keep Java @argfile paths readable on Windows without relocating this project.
    $mikuArgs += '-Dorg.gradle.jvmargs=-Xmx1536m -Dfile.encoding=COMPAT'
    $mikuMirrors = Join-Path $mikuProjectRoot '.toolchain/mirrors.gradle'
    if (Test-Path -LiteralPath $mikuMirrors) { $mikuArgs += @('-I', $mikuMirrors) }
    $mikuSdkAapt2 = Join-Path $mikuProjectRoot '.toolchain/android-sdk/build-tools/35.0.0/aapt2.exe'
    if (Test-Path -LiteralPath $mikuSdkAapt2) { $mikuArgs += "-Pandroid.aapt2FromMavenOverride=$mikuSdkAapt2" }
    $mikuArgs += @('assembleDebug', 'testDebugUnitTest', 'lintDebug')
    & $mikuGradle @mikuArgs
    Assert-MikuCommand 'APK 编译与验证'

    $mikuRelease = Join-Path $mikuProjectRoot 'release'
    New-Item -ItemType Directory -Path $mikuRelease -Force | Out-Null
    $mikuVersion = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
    $mikuApkMetadata = Get-Content -LiteralPath 'android/app/build/outputs/apk/debug/output-metadata.json' -Raw | ConvertFrom-Json
    if ($mikuApkMetadata.elements[0].versionName -ne $mikuVersion) { throw 'Android 版本与 package.json 不一致，停止发布 APK' }
    $mikuApk = Join-Path $mikuRelease "MikuWeather-Reborn-$mikuVersion-Android.apk"
    $mikuBuiltApk = Join-Path $mikuProjectRoot 'android/app/build/outputs/apk/debug/app-debug.apk'
    $mikuSigner = Join-Path $mikuProjectRoot '.toolchain/android-sdk/build-tools/35.0.0/apksigner.bat'
    if (Test-Path -LiteralPath $mikuSigner) {
        & $mikuSigner verify --verbose $mikuBuiltApk
        Assert-MikuCommand 'APK 签名检查'
    }
    Copy-Item -LiteralPath $mikuBuiltApk -Destination $mikuApk -Force
    Write-Output "已生成：$mikuApk"
    (Get-FileHash -LiteralPath $mikuApk -Algorithm SHA256).Hash
} finally {
    $env:ANDROID_USER_HOME = $mikuPreviousAndroidUserHome
    if ($null -ne $mikuPreviousErrorMode) { [MikuBuildProcess]::SetErrorMode($mikuPreviousErrorMode) | Out-Null }
    Pop-Location
}
