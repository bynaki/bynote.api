import Docset from '../src/Docset'

(async () => {
  const feeds = await Docset.feedList()
  const mochaFeed = feeds.find(feed => feed.name === 'Chai.xml')
  await Docset.download(mochaFeed)
  console.log('finish.')
})()