import {
  readFile,
  readdir,
  stat,
  copy,
  remove,
  exists
} from '../src/fs.promise'
import {join} from 'path'


process.nextTick(async () => {
  const files = await readdir(__dirname)
  console.log('files: ', files)
  files.forEach(async file => {
    const stats = await stat(join(__dirname, file))
    console.log(`
    filenmae: ${file}
    stats: ${JSON.stringify(stats, null, '  ')}
    `)
  })
  const filtered = files.filter(async file => {
    return (await stat(join(__dirname, file))).isFile()
  })
  console.log(`filtered: ${filtered}`)
})

process.nextTick(async () => {
  const ironman = join(__dirname, 'ironman-copy.npm')
  await copy(join(__dirname, 'ironman.png'), ironman)
  if(await exists(ironman)) {
    console.log('ironman exists.')
  }
  await remove(ironman)
  if(!(await exists(ironman))) {
    console.log('ironman don\'t exists.')
  }
})
