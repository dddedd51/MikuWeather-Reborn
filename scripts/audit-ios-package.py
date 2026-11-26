from pathlib import Path
import hashlib
import json
import plistlib
import struct
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
for ent in (root / 'ios/App').rglob('*.entitlements'):
    assert 'com.apple.security.application-groups' not in plistlib.loads(ent.read_bytes()), ent

def inspect(file, has_widget):
    with zipfile.ZipFile(file) as archive:
        names = archive.namelist()
        assert archive.testzip() is None and len(names) == len(set(names))
        assert not any(n.endswith(('private.json', '.pem', '.keystore', '.jks', '.p12', '.mobileprovision')) for n in names)
        app = 'Payload/App.app/'
        widget = app + 'PlugIns/MikuWeatherWidgetExtension.appex/'
        assert any(n.startswith(widget) for n in names) == has_widget
        assert not any('.appex/' in n and not n.startswith(widget) for n in names)
        targets = [(app, 'io.mikuweather.reborn')]
        if has_widget:
            targets.append((widget, 'io.mikuweather.reborn.widget'))
            assert len(json.loads(archive.read(widget + 'china.json'))) > 3000
        for folder, bundle_id in targets:
            info = plistlib.loads(archive.read(folder + 'Info.plist'))
            assert info['CFBundleIdentifier'] == bundle_id
            assert info['CFBundleShortVersionString'] == version and info['CFBundleVersion'] == '14'
            exe = folder + info['CFBundleExecutable']
            binary = archive.read(exe)
            assert struct.unpack_from('<II', binary) == (0xfeedfacf, 0x100000c)
            assert archive.getinfo(exe).external_attr >> 16 & 0o111
            assert b'group.io.mikuweather.reborn' not in binary
            assert b'com.apple.security.application-groups' not in binary
            assert folder + 'Assets.car' in names
            if folder == widget:
                assert info['NSExtension']['NSExtensionPointIdentifier'] == 'com.apple.widgetkit-extension'
                assert b'WeatherLocationIntent' in binary
        return dict(file=file.name, version=version, widget=has_widget, bytes=file.stat().st_size,
                    sha256=hashlib.sha256(file.read_bytes()).hexdigest())

full, app_only = map(Path, sys.argv[1:])
report = [inspect(full, True), inspect(app_only, False)]
with zipfile.ZipFile(full) as a, zipfile.ZipFile(app_only) as b:
    expected = {name for name in a.namelist() if '/PlugIns/' not in name}
    assert expected == set(b.namelist())
    assert all(a.read(name) == b.read(name) for name in expected)
(root / 'work').mkdir(exist_ok=True)
(root / 'work/ios-widget-package-audit.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
