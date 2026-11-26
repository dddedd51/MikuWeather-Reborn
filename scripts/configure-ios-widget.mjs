import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const assets=path.join(root,'ios/App/SharedWidget/WidgetAssets.xcassets');
fs.mkdirSync(assets,{recursive:true});fs.writeFileSync(path.join(assets,'Contents.json'),JSON.stringify({info:{author:'xcode',version:1}},null,2));
const illustrations={'miku-clear-day':'晴_日','miku-clear-night':'晴_夜','miku-cloudy-day':'多云_日','miku-cloudy-night':'多云_夜','miku-overcast':'阴','miku-rain-day':'雨_日','miku-rain-night':'雨_夜','miku-heavy-rain':'大雨','miku-thunder-day':'雷雨','miku-thunder-night':'雷雨_夜','miku-snow-day':'雪_日','miku-snow-night':'雪_夜','miku-heavy-snow':'大雪','miku-sleet':'雨雪','miku-fog':'雾'};
for(const [name,source] of Object.entries(illustrations)){const folder=path.join(assets,name+'.imageset');fs.mkdirSync(folder,{recursive:true});fs.copyFileSync(path.join(root,'public/assets',source+'.png'),path.join(folder,'art.png'));fs.writeFileSync(path.join(folder,'Contents.json'),JSON.stringify({images:[{filename:'art.png',idiom:'universal'}],info:{author:'xcode',version:1}},null,2));}
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/locales.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'ios/App/SharedWidget/WidgetLocalizations.json'), JSON.stringify(catalog));
