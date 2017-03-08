import Docset from '../src/Docset'

(async () => {
  const feeds = await Docset.feedList()
  const mochaFeed = feeds.find(feed => feed.name === 'Mocha.xml')
  await Docset.download(mochaFeed)
  console.log('finish.')
})()