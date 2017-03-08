/**
 * test Docset
 */

import {expect} from 'chai'
import {join, extname} from 'path'
import {exists} from '../fs.promise'
import server from './testserver'
import Docset, {
  FeedInfo,
} from '../Docset'
import {docset as config} from '../config'
import * as request from 'superagent'
import * as targz from 'tar.gz'


describe('test Docset ----------', function() {
  this.timeout(20000)
  before(async () => {
    feeds = await Docset.feedList()
  })
  let feeds: FeedInfo[];

  it('Docset.feedList()', async () => {
    expect(feeds).to.have.length.above(0)
    feeds.forEach(feed => {
      expect(extname(feed.name)).to.eq('.xml')
    })
  })  

  it('Docset.docsetUrls()', async () => {
    const mochaFeed = feeds.find(feed => feed.name === 'Mocha.xml')
    const docsetUrls = await Docset.docsetUrls(mochaFeed.download_url)
    expect(docsetUrls).to.have.length.above(0)
    expect(docsetUrls).to.include('http://sanfrancisco.kapeli.com/feeds/Mocha.tgz')
  })

  // it('Docset.download()', async () => {
  //   const mochaFeed = feeds.find(feed => feed.name === 'Mocha.xml')
  //   await Docset.download(mochaFeed)
  //   expect(await exists(join(config.docsetDir, 'Mocha.docset')))
  //   .to.be.true
  // })
})