import * as path from 'path'

{
  const filename = 'hello'
  console.log(`
  filename: ${filename}
  ext: ${path.extname(filename)}
  `)
  if(path.extname(filename)) {
    console.log('exist extname')
  }
}
