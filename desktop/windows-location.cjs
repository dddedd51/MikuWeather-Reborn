const { spawn } = require('node:child_process');
const path = require('node:path');
const { systemPosition } = require('../shared/location.cjs');
let pending=null;
function cancel() { if(pending)pending.finish(new Error('定位已取消')); }
function locate(app,{allowApproximate=false}={}) {
  if(pending)return Promise.reject(new Error('正在定位，请稍候'));
  const helper=app.isPackaged?path.join(process.resourcesPath,'app.asar.unpacked/desktop/location-helper/MikuLocation.exe'):path.join(__dirname,'location-helper/MikuLocation.exe');
  return new Promise((resolve,reject)=>{
    let output='',finished=false,timer;
    const child=spawn(helper,allowApproximate?['--approximate']:[],{windowsHide:true,stdio:['ignore','pipe','ignore']});
    function finish(error,value) {
      if(finished)return;finished=true;clearTimeout(timer);pending=null;
      if(child.exitCode===null)child.kill();
      if(error)reject(error);else resolve(value);
    }
    pending={finish};
    timer=setTimeout(()=>finish(new Error('定位超时，请检查系统定位服务或手动选择城市')),28000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{output+=chunk;if(output.length>2048)finish(new Error('定位服务返回异常'));});
    child.once('error',()=>finish(new Error('无法启动系统定位，请手动选择城市')));
    child.once('close',()=>{
      if(finished)return;
      try {
        const result=JSON.parse(output.trim());
        if(!result.ok){const error=new Error(({DENIED:'系统未允许初音天气访问位置，请在 Windows 定位设置中自行允许，或手动选择城市',DISABLED:'Windows 定位服务未开启，请手动选择城市',TIMEOUT:'暂时无法确定位置，请稍后重试或手动选择城市',UNAVAILABLE:'此设备暂不支持定位，请手动选择城市',LOW_ACCURACY:'系统只提供了大致位置，可点“查看系统大致位置”确认候选城市，或手动搜索城市',DEFAULT_POSITION:'系统返回的是默认位置，无法判断所在地，请手动搜索城市',STALE_POSITION:'系统只提供了较旧的位置，请重新定位或手动选择城市',CANCELLED:'系统定位已取消'})[result.code]||'系统定位暂不可用，请手动选择城市');error.code=result.code;throw error;}
        finish(null,systemPosition(result,{allowApproximate}));
      } catch(error) { finish(error.code?error:new Error('定位服务暂不可用，请手动选择城市')); }
    });
  });
}
module.exports={locate,cancel};
