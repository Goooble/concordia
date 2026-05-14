import { ElectronAPI } from '@electron-toolkit/preload'
interface API {
  selectFolder: () => Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
