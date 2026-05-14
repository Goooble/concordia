//main/index registers all these handlers at once
import { registerSubtitleHandlers } from './subtitle'
import { registerDialogHandlers } from './utility'
export function registerIpcHandlers(): void {
  registerSubtitleHandlers()
  registerDialogHandlers()
}
