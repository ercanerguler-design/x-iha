import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const gcsAPI = {
  listPorts: () => ipcRenderer.invoke('ports:list'),
  connect: (config: unknown) => ipcRenderer.invoke('mavlink:connect', config),
  disconnect: () => ipcRenderer.invoke('mavlink:disconnect'),
  uploadMission: (wps: unknown) => ipcRenderer.invoke('mission:upload', wps),
  onTelemetry: (cb: (data: unknown) => void) => {
    ipcRenderer.on('mavlink:telemetry', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('mavlink:telemetry')
  },
  onMessage: (cb: (msg: unknown) => void) => {
    ipcRenderer.on('mavlink:message', (_e, msg) => cb(msg))
    return () => ipcRenderer.removeAllListeners('mavlink:message')
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('gcs', gcsAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.gcs = gcsAPI
}
