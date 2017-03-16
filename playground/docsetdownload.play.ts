import Docset from '../src/Docset'
import * as cf from '../src/config'
import {basename} from 'path'

(async () => {
  const feedUrls = await Docset.officialFeedUrlList()
  const chaiFeed = feedUrls.find(feed => basename(feed) === 'Mocha.xml')
  await Docset.download(chaiFeed, cf.docset.docsetDir)
  console.log('finish')
})()