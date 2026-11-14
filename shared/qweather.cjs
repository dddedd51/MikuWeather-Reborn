const { createPrivateKey, sign } = require('node:crypto');

class WeatherError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const messages = {
  400: '天气请求参数有误', 401: '天气服务认证失败，请联系应用维护者',
  402: '天气服务额度不足', 403: '天气接口未开通或访问受限',
  404: '没有找到该地点的天气', 429: '天气服务繁忙，请稍后再试'
};
function validateConfig(config) {
  if (!config || !config.host || !config.kid || !config.iss || !config.sub || !config.privateKey) {
    throw new WeatherError('NOT_CONFIGURED', '天气服务正在配置中，暂时无法获取实时数据');
  }
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+qweatherapi\.com$/i.test(config.host)) throw new WeatherError('CONFIG', 'API Host 格式不正确');
  for (const key of ['kid', 'iss', 'sub']) if (!/^[a-zA-Z0-9]{10}$/.test(config[key])) throw new WeatherError('CONFIG', key + ' 格式不正确');
  if (!/^Q/.test(config.iss)) throw new WeatherError('CONFIG', '开发者 ID 必须以 Q 开头');
  if (createPrivateKey(config.privateKey).asymmetricKeyType !== 'ed25519') throw new WeatherError('CONFIG', '需要 Ed25519 私钥');
}
function createJwt(config, now = Date.now()) {
  validateConfig(config);
  const iat = Math.floor(now / 1000) - 30;
  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const input = encode({ alg: 'EdDSA', kid: config.kid }) + '.' + encode({ iss: config.iss, sub: config.sub, iat, exp: iat + 900 });
  return input + '.' + sign(null, Buffer.from(input), createPrivateKey(config.privateKey)).toString('base64url');
}
function buildPath(kind, params = {}) {
  if (kind === 'lookup') {
    const query = String(params.query || '').trim();
    if (!query || query.length > 80) throw new WeatherError('INPUT', '请输入城市名称');
    return '/geo/v2/city/lookup?' + new URLSearchParams({ location: query, lang: 'zh', number: '12' });
  }
  if (!['current', 'daily', 'hourly'].includes(kind)) throw new WeatherError('INPUT', '未知天气请求');
  const { lat, lon } = params;
  if (lat == null || lon == null || String(lat).trim() === '' || String(lon).trim() === '' || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) throw new WeatherError('INPUT', '城市坐标无效');
  const query = new URLSearchParams({ lang: 'zh', localTime: 'true' });
  if (kind === 'daily') query.set('days', '7');
  if (kind === 'hourly') query.set('hours', '24');
  return `/weather/v1/${kind}/${Number(lat).toFixed(2)}/${Number(lon).toFixed(2)}?${query}`;
}
function createClient(config, fetchImpl = fetch) {
  const cache = new Map(), pending = new Map();
  let token = '', expires = 0;
  return {
    configured() { try { validateConfig(config); return true; } catch { return false; } },
    async request(kind, params) {
      validateConfig(config);
      const path = buildPath(kind, params);
      const entry = cache.get(path);
      if (entry && entry.expires > Date.now()) return entry.data;
      if (pending.has(path)) return pending.get(path);
      const job = (async () => {
        if (Date.now() >= expires) { token = createJwt(config); expires = Date.now() + 12 * 60_000; }
        let response;
        try {
          response = await fetchImpl('https://' + config.host + path, {
            headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
            signal: AbortSignal.timeout(15_000), redirect: 'error'
          });
        } catch { throw new WeatherError('NETWORK', '连接天气服务失败，请检查网络后重试'); }
        if (!response.ok) { if (response.status === 401) expires = 0; throw new WeatherError(String(response.status), messages[response.status] || '天气服务暂时不可用'); }
        let data;
        try { data = await response.json(); } catch { throw new WeatherError('RESPONSE', '天气服务返回了无效数据'); }
        if (data.code && String(data.code) !== '200') throw new WeatherError(String(data.code), messages[data.code] || '暂时没有天气数据');
        if (data.error) throw new WeatherError('RESPONSE', '天气服务暂时不可用');
        const ttl = kind === 'current' ? 5 : kind === 'lookup' ? 60 : 30;
        cache.set(path, { data, expires: Date.now() + ttl * 60_000 });
        if (cache.size > 256) cache.delete(cache.keys().next().value);
        return data;
      })();
      pending.set(path, job);
      try { return await job; } finally { pending.delete(path); }
    }
  };
}
module.exports = { WeatherError, validateConfig, createJwt, buildPath, createClient };
