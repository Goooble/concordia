import { ElectronAPI } from '@electron-toolkit/preload'
interface API {
  startIndexing: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
