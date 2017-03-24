import Docset from '../src/Docset'
import * as cf from '../src/config'
import {
  readFile,
} from '../src/fs.promise'
import {
  join,
  resolve,
} from 'path'

(async () => {
  const tokensXml = await readFile(
    join(cf.docset.docsetDir, 'Python 2.docset', cf.docset.tokensPath))
  // console.log(tokensXml.toString().replace(/\n/g, ''))
  const result = Docset._toJsonTokensXml(tokensXml.toString())
  console.log(result)
})()