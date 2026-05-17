import { ElectronAPI } from '@electron-toolkit/preload'

interface ConnectionConfig {
  type: 'serial' | 'udp'
  port?: string
  baudRate?: number
  udpPort?: number
  udpHost?: string
}

interface WaypointUpload {
  lat: number
  lng: number
  alt: number
}

interface GCSAPI {
  listPorts: () => Promise<Array<{ path: string; manufacturer?: string }>>
  connect: (config: ConnectionConfig) => Promise<void>
  disconnect: () => Promise<void>
  uploadMission: (wps: WaypointUpload[]) => Promise<void>
  onTelemetry: (cb: (data: unknown) => void) => () => void
  onMessage: (cb: (msg: unknown) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    gcs: GCSAPI
  }
}
