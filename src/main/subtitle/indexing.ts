//the entire workflow of indexing the subtitle files begins here

import { getFolder } from '../utility'
import { subtitleStore } from '../store/subtitle'
import { scanFolderForSubtitles } from './scanner'
export async function startIndexing(): Promise<void> {
  const folder: string | Error = await getFolder()
  if (folder instanceof Error) {
    throw folder
  }
  subtitleStore.folder = folder
  const files: string[] = scanFolderForSubtitles(folder)
  subtitleStore.subtitleFiles = files
  console.log(subtitleStore)
}
