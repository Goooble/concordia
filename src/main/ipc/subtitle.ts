//subtitle related handlers
import { startIndexing } from '../subtitle/indexing'
import { ipcMain } from 'electron/main'
export function registerSubtitleHandlers(): void {
  ipcMain.on('startIndexing', async () => {
    startIndexing()
  })
}
