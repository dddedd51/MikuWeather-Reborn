const RELEASE_API='https://api.github.com/repos/dddedd51/MikuWeather-Reborn/releases/latest';
const RELEASE_PAGE='https://github.com/dddedd51/MikuWeather-Reborn/releases/latest';
function compareVersion(a,b){
 const parse=v=>{const m=String(v).match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);return m?m.slice(1).map(Number):null;};
 const x=parse(a),y=parse(b);if(!x||!y)throw Error('Invalid stable version');
 for(let i=0;i<3;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);return 0;
}
function releaseUpdate(data,current,platform){
 if(data?.draft||data?.prerelease)throw Error('Not a stable release');
 const version=String(data?.tag_name||'').replace(/^v/,'');
 if(compareVersion(version,current)<=0)return {available:false,current,version:current};
 const suffix={windows:'Windows-x64.zip',android:'Android.apk',ios:'iOS-unsigned.ipa'}[platform];
 if(!suffix)throw Error('Unsupported platform');
 const name=`MikuWeather-Reborn-${version}-${suffix}`;
 const asset=data.assets?.find(a=>a.name===name&&a.state==='uploaded');
 const url=`https://github.com/dddedd51/MikuWeather-Reborn/releases/download/v${version}/${name}`;
 if(!asset||asset.browser_download_url!==url||!/^sha256:[0-9a-f]{64}$/i.test(asset.digest)||!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>512*1024*1024)throw Error('Invalid update asset');
 return {available:true,current,version,url,name,size:asset.size,sha256:asset.digest.slice(7).toLowerCase(),page:`https://github.com/dddedd51/MikuWeather-Reborn/releases/tag/v${version}`};
}
async function checkUpdate(current,platform,fetchImpl=fetch){
 const r=await fetchImpl(RELEASE_API,{headers:{Accept:'application/vnd.github+json','User-Agent':'MikuWeather-Reborn'},signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!r.ok)throw Error('Update check failed');return releaseUpdate(await r.json(),current,platform);
}
export {RELEASE_API,RELEASE_PAGE,compareVersion,releaseUpdate,checkUpdate};
