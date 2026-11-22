from pathlib import Path
import hashlib,json,plistlib,struct,sys,zipfile
file=Path(sys.argv[1]);base='Payload/App.app/'
with zipfile.ZipFile(file) as z:
    names=z.namelist()
    assert not any(n.endswith(('private.json','.pem','.keystore','.jks','.p12')) or '/secrets/' in n for n in names),'Private file in IPA'
    app=plistlib.loads(z.read(base+'Info.plist'))
    extension=base+'PlugIns/MikuWeatherWidgetExtension.appex/'
    widget=plistlib.loads(z.read(extension+'Info.plist'))
    assert app['CFBundleIdentifier']=='io.mikuweather.reborn'
    assert widget['CFBundleIdentifier']=='io.mikuweather.reborn.widget'
    assert widget['NSExtension']['NSExtensionPointIdentifier']=='com.apple.widgetkit-extension'
    assert app['CFBundleShortVersionString']==widget['CFBundleShortVersionString']=='0.3.7'
    assert app['CFBundleVersion']==widget['CFBundleVersion']=='13'
    for folder,info in [(base,app),(extension,widget)]:
        binary=z.read(folder+info['CFBundleExecutable'])
        assert struct.unpack('<I',binary[:4])[0]==0xfeedfacf,'Expected Mach-O binary'
        assert struct.unpack('<I',binary[4:8])[0]==0x100000c,'Expected arm64'
        assert b'group.io.mikuweather.reborn' in binary,'Missing shared data group'
        assert folder+'Assets.car' in names,'Missing widget artwork'
        assert folder+'WidgetLocalizations.json' in names,'Missing four-language catalog'
    audit={'version':'0.3.7','build':'13','minimumOS':app.get('MinimumOSVersion'),'widgetMinimumOS':widget.get('MinimumOSVersion'),'widgetBundleId':widget['CFBundleIdentifier'],'extensionEmbedded':True,'architecture':'arm64','privateFiles':0,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
Path('work/ios-widget-package-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print(json.dumps(audit))
