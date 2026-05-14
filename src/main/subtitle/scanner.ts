//recursively scans through folders to find subtitle files
//supports .srt, .ass
import fs from 'fs'
import path from 'path'

export function scanFolderForSubtitles(dir: string): string[] {
  console.log('hello')
  let results: string[] = []

  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)

    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      results = results.concat(scanFolderForSubtitles(fullPath))
    } else if (fullPath.endsWith('.srt') || fullPath.endsWith('.ass')) {
      results.push(fullPath)
    }
  }
  console.log(results)
  return results
}
