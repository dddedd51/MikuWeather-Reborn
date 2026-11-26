import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');
const assets=path.join(root,'ios/App/SharedWidget/WidgetAssets.xcassets');
fs.mkdirSync(assets,{recursive:true});fs.writeFileSync(path.join(assets,'Contents.json'),JSON.stringify({info:{author:'xcode',version:1}},null,2));
const illustrations={'miku-clear-day':'晴_日','miku-clear-night':'晴_夜','miku-cloudy-day':'多云_日','miku-cloudy-night':'多云_夜','miku-overcast':'阴','miku-rain-day':'雨_日','miku-rain-night':'雨_夜','miku-heavy-rain':'大雨','miku-thunder-day':'雷雨','miku-thunder-night':'雷雨_夜','miku-snow-day':'雪_日','miku-snow-night':'雪_夜','miku-heavy-snow':'大雪','miku-sleet':'雨雪','miku-fog':'雾'};
for(const [name,source] of Object.entries(illustrations)){const folder=path.join(assets,name+'.imageset');fs.mkdirSync(folder,{recursive:true});fs.copyFileSync(path.join(root,'public/assets',source+'.png'),path.join(folder,'art.png'));fs.writeFileSync(path.join(folder,'Contents.json'),JSON.stringify({images:[{filename:'art.png',idiom:'universal'}],info:{author:'xcode',version:1}},null,2));}
const catalog=JSON.parse(fs.readFileSync(path.join(root,'src/locales.json')));
Object.assign(catalog,{
 '打开初音天气设置城市':['開啟初音天氣設定城市','Open Miku Weather to choose a city','ミク天気で都市を設定'],
 '预报暂不可用':['預報暫不可用','Forecast unavailable','予報を取得できません'],
 '预览':['預覽','Preview','プレビュー'],'缓存':['快取','Cached','キャッシュ'],'更新于':['更新於','Updated','更新'],
 'iPhone 桌面小组件':['iPhone 桌面小工具','iPhone home screen widgets','iPhoneホーム画面ウィジェット'],
 '长按主屏幕空白处，点击“编辑”→“添加小组件”，搜索“初音天气”，选择小、中或大尺寸。小组件跟随当前城市、语言、温度单位和明暗主题；点击小组件打开天气。':['長按主畫面空白處，點選「編輯」→「加入小工具」，搜尋「初音天氣」，選擇小、中或大尺寸。小工具會同步目前城市、語言、溫度單位和明暗主題；點選即可開啟天氣。','Touch and hold the home screen, choose Edit → Add Widget, search for Miku Weather, and choose a small, medium or large widget. Widgets follow the current city, language, temperature unit and theme. Tap one to open the weather.','ホーム画面の空白部分を長押しし、「編集」→「ウィジェットを追加」で「初音天气」を検索してサイズを選んでください。都市、言語、温度単位、テーマをアプリから同期します。タップすると天気を開きます。'],
 '小组件由 iOS 安排刷新，断网时保留最近数据并标注缓存；时钟按分钟更新，无需每分钟联网。':['小工具由 iOS 安排更新，離線時保留最近資料並標示快取；時鐘每分鐘更新，不需每分鐘連線。','iOS schedules weather refreshes. Offline widgets keep recent data and label it as cached. The clock updates each minute without a new weather request.','天気の更新はiOSが管理します。オフラインでは前回のデータにキャッシュ表示を付けます。時計は毎分更新され、毎分の通信は不要です。'],
 '小组件数据共享未启用，请使用包含 App Groups 权限的签名':['小工具資料共享未啟用，請使用包含 App Groups 權限的簽名','Widget sharing is unavailable. Sign the app and extension with matching App Groups permissions.','共有データを利用できません。アプリと拡張を同じApp Groups権限で署名してください。']
});
fs.writeFileSync(path.join(root,'src/locales.json'),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(root,'ios/App/SharedWidget/WidgetLocalizations.json'),JSON.stringify(catalog));
let s=fs.readFileSync(project,'utf8').replaceAll('\r\n','\n');
if(s.includes('/* MikuWeatherWidgetExtension */')){console.log('Widget assets refreshed; target already configured');process.exit(0);}
const id=name=>crypto.createHash('sha1').update('miku-ios-widget:'+name).digest('hex').slice(0,24).toUpperCase();
const add=(section,body)=>{const marker=`/* End ${section} section */`;if(!s.includes(marker))throw Error('Missing '+section);s=s.replace(marker,body+'\n'+marker);};
const newSection=(section,body)=>{s=s.replace('/* Begin PBXBuildFile section */',`/* Begin ${section} section */\n${body}\n/* End ${section} section */\n\n/* Begin PBXBuildFile section */`);};
const shared=['WidgetData.swift','WidgetStore.swift','WidgetView.swift','WidgetAssets.xcassets','WidgetLocalizations.json'];
const appFiles=['MikuWeatherPlugin.swift','WidgetPreview.swift','App.entitlements'];
const widgetFiles=['MikuWeatherWidget.swift','Info.plist','MikuWeatherWidget.entitlements'];
const ref=(group,file)=>id('ref:'+group+':'+file);
const fileType=file=>file.endsWith('.swift')?'sourcecode.swift':file.endsWith('.xcassets')?'folder.assetcatalog':file.endsWith('.json')?'text.json':file.endsWith('.entitlements')?'text.plist.entitlements':'text.plist.xml';
add('PBXFileReference',[...shared.map(f=>[f,'SharedWidget']),...appFiles.map(f=>[f,'App']),...widgetFiles.map(f=>[f,'MikuWeatherWidget'])].map(([file,group])=>`\t\t${ref(group,file)} /* ${file} */ = {isa = PBXFileReference; lastKnownFileType = ${fileType(file)}; path = ${file}; sourceTree = "<group>"; };`).join('\n')+`\n\t\t${id('product')} /* MikuWeatherWidgetExtension.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = MikuWeatherWidgetExtension.appex; sourceTree = BUILT_PRODUCTS_DIR; };`);
const sourceBuilds=[];
for(const target of ['App','Widget'])for(const file of shared.filter(f=>f.endsWith('.swift')))sourceBuilds.push({target,file,group:'SharedWidget'});
sourceBuilds.push(...appFiles.filter(f=>f.endsWith('.swift')).map(file=>({target:'App',file,group:'App'})),{target:'Widget',file:'MikuWeatherWidget.swift',group:'MikuWeatherWidget'});
const resources=['App','Widget'].flatMap(target=>shared.filter(f=>!f.endsWith('.swift')).map(file=>({target,file,group:'SharedWidget'})));
const build=b=>id('build:'+b.target+':'+b.file);
add('PBXBuildFile',[...sourceBuilds,...resources].map(b=>`\t\t${build(b)} /* ${b.file} in ${b.target} */ = {isa = PBXBuildFile; fileRef = ${ref(b.group,b.file)} /* ${b.file} */; };`).join('\n')+`\n\t\t${id('embed-build')} /* MikuWeatherWidgetExtension.appex in Embed App Extensions */ = {isa = PBXBuildFile; fileRef = ${id('product')}; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };`);
add('PBXGroup',[['SharedWidget',shared],['MikuWeatherWidget',widgetFiles]].map(([group,files])=>`\t\t${id('group:'+group)} /* ${group} */ = {isa = PBXGroup; children = (${files.map(f=>ref(group,f)+' /* '+f+' */').join(', ')}, ); path = ${group}; sourceTree = "<group>"; };`).join('\n'));
s=s.replace('958DCC722DB07C7200EA8C5F /* debug.xcconfig */,','958DCC722DB07C7200EA8C5F /* debug.xcconfig */,\n\t\t\t\t'+id('group:SharedWidget')+' /* SharedWidget */,\n\t\t\t\t'+id('group:MikuWeatherWidget')+' /* MikuWeatherWidget */,');
s=s.replace('504EC3041FED79650016851F /* App.app */,','504EC3041FED79650016851F /* App.app */,\n\t\t\t\t'+id('product')+' /* MikuWeatherWidgetExtension.appex */,');
s=s.replace('504EC3071FED79650016851F /* AppDelegate.swift */,','504EC3071FED79650016851F /* AppDelegate.swift */,\n'+appFiles.map(f=>'\t\t\t\t'+ref('App',f)+' /* '+f+' */,').join('\n'));
s=s.replace('504EC3081FED79650016851F /* AppDelegate.swift in Sources */,','504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n'+sourceBuilds.filter(b=>b.target==='App').map(b=>'\t\t\t\t'+build(b)+' /* '+b.file+' */,').join('\n'));
s=s.replace('504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,','504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,\n'+resources.filter(b=>b.target==='App').map(b=>'\t\t\t\t'+build(b)+' /* '+b.file+' */,').join('\n'));
add('PBXSourcesBuildPhase',`\t\t${id('sources')} = {isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = (${sourceBuilds.filter(b=>b.target==='Widget').map(b=>build(b)).join(', ')}, ); runOnlyForDeploymentPostprocessing = 0; };`);
add('PBXResourcesBuildPhase',`\t\t${id('resources')} = {isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = (${resources.filter(b=>b.target==='Widget').map(b=>build(b)).join(', ')}, ); runOnlyForDeploymentPostprocessing = 0; };`);
add('PBXFrameworksBuildPhase',`\t\t${id('frameworks')} = {isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; };`);
newSection('PBXCopyFilesBuildPhase',`\t\t${id('embed-phase')} /* Embed App Extensions */ = {isa = PBXCopyFilesBuildPhase; buildActionMask = 2147483647; dstPath = ""; dstSubfolderSpec = 13; files = (${id('embed-build')}, ); name = "Embed App Extensions"; runOnlyForDeploymentPostprocessing = 0; };`);
newSection('PBXContainerItemProxy',`\t\t${id('proxy')} = {isa = PBXContainerItemProxy; containerPortal = 504EC2FC1FED79650016851F; proxyType = 1; remoteGlobalIDString = ${id('target')}; remoteInfo = MikuWeatherWidgetExtension; };`);
newSection('PBXTargetDependency',`\t\t${id('dependency')} = {isa = PBXTargetDependency; target = ${id('target')}; targetProxy = ${id('proxy')}; };`);
s=s.replace('504EC3021FED79650016851F /* Resources */,','504EC3021FED79650016851F /* Resources */,\n\t\t\t\t'+id('embed-phase')+' /* Embed App Extensions */,');
s=s.replace('dependencies = (\n\t\t\t);','dependencies = (\n\t\t\t\t'+id('dependency')+',\n\t\t\t);');
add('PBXNativeTarget',`\t\t${id('target')} /* MikuWeatherWidgetExtension */ = {isa = PBXNativeTarget; buildConfigurationList = ${id('configs')}; buildPhases = (${id('sources')}, ${id('frameworks')}, ${id('resources')}, ); buildRules = (); dependencies = (); name = MikuWeatherWidgetExtension; productName = MikuWeatherWidgetExtension; productReference = ${id('product')}; productType = "com.apple.product-type.app-extension"; };`);
s=s.replace('targets = (\n\t\t\t\t504EC3031FED79650016851F /* App */,','targets = (\n\t\t\t\t504EC3031FED79650016851F /* App */,\n\t\t\t\t'+id('target')+' /* MikuWeatherWidgetExtension */,');
add('XCBuildConfiguration',['Debug','Release'].map(name=>`\t\t${id('config:'+name)} /* ${name} */ = {isa = XCBuildConfiguration; buildSettings = { APPLICATION_EXTENSION_API_ONLY = YES; CODE_SIGN_STYLE = Automatic; CODE_SIGN_ENTITLEMENTS = MikuWeatherWidget/MikuWeatherWidget.entitlements; CURRENT_PROJECT_VERSION = 13; MARKETING_VERSION = 0.3.8; INFOPLIST_FILE = MikuWeatherWidget/Info.plist; IPHONEOS_DEPLOYMENT_TARGET = 14.0; LD_RUNPATH_SEARCH_PATHS = ("$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks", ); PRODUCT_BUNDLE_IDENTIFIER = io.mikuweather.reborn.widget; PRODUCT_NAME = "$(TARGET_NAME)"; SKIP_INSTALL = YES; SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = "1,2"; SWIFT_ACTIVE_COMPILATION_CONDITIONS = ${name==='Debug'?'DEBUG':'""'}; }; name = ${name}; };`).join('\n'));
add('XCConfigurationList',`\t\t${id('configs')} = {isa = XCConfigurationList; buildConfigurations = (${id('config:Debug')}, ${id('config:Release')}, ); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; };`);
s=s.replaceAll('CURRENT_PROJECT_VERSION = 12;','CURRENT_PROJECT_VERSION = 13;').replaceAll('MARKETING_VERSION = 0.3.6;','MARKETING_VERSION = 0.3.8;');
s=s.replaceAll('INFOPLIST_FILE = App/Info.plist;','INFOPLIST_FILE = App/Info.plist;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
fs.writeFileSync(project,s);console.log('Configured WidgetKit extension, shared assets, App Groups and embed dependency');
