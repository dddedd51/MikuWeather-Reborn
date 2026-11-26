const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {checkUpdate} = require('../shared/updates.cjs');
const fetchUpdate = require('./update-fetch.cjs');

let running = false;
const hosts = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com']);

async function download(url, file, size, sha, onProgress, fetchImpl = fetch) {
  const controller = new AbortController();
  let timer, response;
  // Allow large packages on slow connections while still detecting a stalled download.
  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(Error('Download stopped receiving data')), 90000);
  };
  try {
    for (let i = 0; i < 6; i++) {
      const u = new URL(url);
      if (u.protocol !== 'https:' || !hosts.has(u.hostname) || u.port || u.username || u.password) throw Error('Invalid download host');
      resetTimer();
      response = await fetchImpl(u.href, {redirect: 'manual', signal: controller.signal});
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw Error('Missing download redirect');
      url = new URL(location, u).href;
    }
    if (!response?.ok || !response.body) throw Error('Download HTTP ' + response?.status);
    const handle = await fs.open(file, 'wx');
    const hash = crypto.createHash('sha256');
    let bytes = 0, previous = -1;
    try {
      for await (const chunk of response.body) {
        resetTimer();
        bytes += chunk.length;
        if (bytes > size) throw Error('Oversized update');
        hash.update(chunk);
        await handle.writeFile(chunk);
        const percent = Math.floor(bytes / size * 85);
        if (percent !== previous) { previous = percent; onProgress({percent}); }
      }
    } finally { await handle.close(); }
    if (bytes !== size || hash.digest('hex') !== sha) throw Error('Update checksum mismatch');
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

const powershell = path.join(process.env.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
function startHelper(script, args) {
  return spawn(powershell, ['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,...args],
    {windowsHide:true, stdio:['ignore','ignore','pipe'], cwd:path.dirname(script)});
}
function runHelper(script, args) {
  return new Promise((resolve, reject) => {
    const child = startHelper(script, args);
    let error = '';
    child.stderr.on('data', chunk => { error = (error + chunk.toString()).slice(-1500); });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(Error(path.basename(script) + ' (' + code + ') ' + error.trim())));
  });
}
function waitForReady(child, file, timeout = 300000) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const done = error => {
      if (finished) return;
      finished = true; clearInterval(poll); clearTimeout(deadline);
      child.off('error', onError); child.off('exit', onExit);
      error ? reject(error) : resolve();
    };
    const onError = () => done(Error('Update helper could not start'));
    const onExit = (code, signal) => done(Error('Update helper exited before readiness (' + (code ?? signal) + ')'));
    const poll = setInterval(async () => {
      try { if ((await readJson(file)).status === 'ready') done(); } catch {}
    }, 100);
    const deadline = setTimeout(() => { done(Error('Update helper readiness timed out')); child.kill(); }, timeout);
    child.once('error', onError); child.once('exit', onExit);
    if (child.exitCode !== null && child.exitCode !== undefined) onExit();
  });
}
async function readJson(file) {
  return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/,''));
}
async function takeResult(app) {
  const file = path.join(app.getPath('userData'), 'update-result.json');
  try {
    const result = await readJson(file);
    await fs.unlink(file);
    if (result.status === 'applied' && app.getVersion && result.version !== app.getVersion()) {
      result.status = 'failed'; result.message = 'Expected ' + result.version + ', running ' + app.getVersion();
    }
    return result;
  } catch { return null; }
}
function check(app) { return checkUpdate(app.getVersion(), 'windows', fetchUpdate); }

async function install(app, onProgress, beforeQuit) {
  if (running) throw Error('Update already running');
  running = true;
  const profile = app.getPath('userData'), log = path.join(profile, 'update.log');
  const report = message => fs.appendFile(log, new Date().toISOString() + ' ' + message + '\n').catch(() => {});
  let base, handedOff = false, step = 'check';
  try {
    if (!app.isPackaged) throw Error('Packaged app required');
    const release = await check(app);
    if (!release.available) return {status:'current'};
    const target = path.dirname(process.execPath);
    await report('Updating ' + app.getVersion() + ' to ' + release.version + ' in ' + target);
    step = 'directory';
    const probe = path.join(target, '.miku-write-' + crypto.randomUUID());
    await fs.writeFile(probe, '', {flag:'wx'}); await fs.unlink(probe);
    base = await fs.mkdtemp(path.join(app.getPath('temp'), 'miku-update-'));
    const zip = path.join(base, 'update.zip'), stage = path.join(base, 'stage');
    const ready = path.join(base, 'ready.json'), settings = path.join(base, 'update.json');
    step = 'download';
    await download(release.url, zip, release.size, release.sha256, onProgress, fetchUpdate);
    step = 'stage';
    onProgress({percent:86, stage:step});
    // fs.readFile addresses an entry in app.asar, whereas PowerShell needs an ordinary file.
    for (const name of ['stage-update.ps1','read-package.ps1','apply-update.ps1']) {
      await fs.writeFile(path.join(base,name), await fs.readFile(path.join(__dirname,name)));
    }
    await runHelper(path.join(base,'stage-update.ps1'), [zip,stage,release.version]);
    step = 'backup';
    onProgress({percent:94, stage:step});
    const resultFile = path.join(profile,'update-result.json');
    const profileOverride = app.commandLine.hasSwitch('user-data-dir') ? profile : null;
    await fs.writeFile(settings,JSON.stringify({pid:process.pid,target,stage,version:release.version,
      executable:path.basename(process.execPath),ready,log,result:resultFile,profileOverride}));
    const helper = path.join(base,'apply-update.ps1');
    try {
      await runHelper(helper,[settings,'Prepare']);
      if ((await readJson(ready)).status !== 'ready') throw Error('Backup was not confirmed');
    }
    catch (error) {
      const failure = await readJson(resultFile).catch(() => null);
      if (failure?.status === 'failed' && failure.version === release.version) throw Error(failure.message);
      throw error;
    }
    // Electron's native relauncher waits for the old process to terminate before it
    // starts PowerShell. No live child needs to survive destruction of its GUI parent.
    app.relaunch({execPath:powershell,args:['-NoLogo','-NoProfile','-NonInteractive','-WindowStyle','Hidden',
      '-ExecutionPolicy','Bypass','-File',helper,settings,'Resume']});
    handedOff = true;
    onProgress({percent:100, stage:'restart'}); beforeQuit(); app.quit();
    return {status:'restarting'};
  } catch (error) {
    await report(step + ' failed: ' + error.message);
    return {status:'failed', step, log};
  } finally {
    running = false;
    if (!handedOff && base) {
      const tmp = path.resolve(app.getPath('temp'));
      if (path.dirname(base) === tmp && path.basename(base).startsWith('miku-update-'))
        await fs.rm(base, {recursive:true,force:true,maxRetries:2}).catch(() => {});
    }
  }
}
module.exports = {check, install, download, waitForReady, takeResult};
