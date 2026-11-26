// Use Chromium's Windows proxy settings for both the release API and its asset CDN.
const {Readable} = require('node:stream');

module.exports = function fetchUpdate(url, options = {}) {
  const {net} = require('electron');
  return new Promise((resolve, reject) => {
    const request = net.request({url, method: 'GET', redirect: 'manual', useSessionCookies: false});
    const abort = () => {
      reject(options.signal.reason || Error('Update request timed out'));
      request.abort();
    };
    request.on('error', reject);
    request.on('close', () => options.signal?.removeEventListener('abort', abort));
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, {once: true});
    for (const [key, value] of Object.entries(options.headers || {})) request.setHeader(key, value);
    request.on('redirect', (status, method, location) => {
      if (options.redirect === 'manual') resolve(new Response(null, {status, headers: {Location: location}}));
      else reject(Error('Unexpected release API redirect'));
      request.abort();
    });
    request.on('response', message => {
      const headers = new Headers();
      for (const [key, values] of Object.entries(message.headers)) {
        for (const value of Array.isArray(values) ? values : [values]) headers.append(key, value);
      }
      const empty = [204, 205, 304].includes(message.statusCode);
      resolve(new Response(empty ? null : Readable.toWeb(message), {status: message.statusCode, headers}));
    });
    request.end();
  });
};
