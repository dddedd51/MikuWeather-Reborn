const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('miku', {
  request: (kind, params) => ipcRenderer.invoke('weather:request', { kind, params }),
  locate: () => ipcRenderer.invoke('location:once'),
  locateIp: () => ipcRenderer.invoke('location:ip'),
  cancelLocate: () => ipcRenderer.send('location:cancel'),
  setWeather: summary => ipcRenderer.send('weather:summary', summary),
  setMini: enabled => ipcRenderer.send('window:mini', !!enabled),
  togglePin: () => ipcRenderer.invoke('window:pin'),
  getCity: () => ipcRenderer.invoke('weather:city'),
  setCity: city => ipcRenderer.send('weather:city:set', city),
  getPreferences: () => ipcRenderer.invoke('weather:preferences'),
  setPreferences: preferences => ipcRenderer.send('weather:preferences:set', preferences),
  openDetails: name => ipcRenderer.send('pet:details',name),
  petMenu: () => ipcRenderer.send('pet:menu'),
  dragStart: point => ipcRenderer.send('pet:dragStart',point),
  dragMove: point => ipcRenderer.send('pet:dragMove',point),
  dragEnd: () => ipcRenderer.send('pet:dragEnd'),
  onCity: callback => ipcRenderer.on('weather:cityChanged', (_event,city) => callback(city)),
  onPreferences: callback => ipcRenderer.on('weather:preferencesChanged', (_event,preferences) => callback(preferences)),
  onDialog: callback => ipcRenderer.on('ui:dialog', (_event,name) => callback(name)),
  onRefresh: callback => ipcRenderer.on('weather:refresh', () => callback())
});
