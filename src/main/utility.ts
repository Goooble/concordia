//general functions

import { dialog } from 'electron'
export async function getFolder(): Promise<string | Error> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  if (result.canceled) {
    throw Error('dialog closed')
  }
  console.log(result.filePaths[0])
  return result.filePaths[0]
}
