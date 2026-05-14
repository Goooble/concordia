//simple store for main process state
interface SubtitleStore {
  folder: string
  subtitleFiles: string[]
}

export const subtitleStore: SubtitleStore = {
  folder: '',
  subtitleFiles: []
}
