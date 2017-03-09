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
      expect(extname(feed.name)).to.eql('.xml')
    })
  })  

  it('Docset.docsetUrls()', async () => {
    const mochaFeed = feeds.find(feed => feed.name === 'Chai.xml')
    const docsetUrls = await Docset.docsetUrls(mochaFeed.download_url)
    expect(docsetUrls).to.have.length.above(0)
    expect(docsetUrls).to.include('http://sanfrancisco.kapeli.com/feeds/Chai.tgz')
  })
  
  it('Docset.docsetList()', async () => {
    const docsets = await Docset.docsetList()
    expect(docsets).to.have.length.above(0)
    const chai = docsets.find(docset => {
      return docset.path === join(config.docsetDir, 'Chai.docset')
    })
    expect(chai).to.be.ok
    expect(chai.name).to.eql('Chai')
  })

  it('Docset.get()', async () => {
    const chai = await Docset.get('Chai')
    expect(chai).to.be.ok
    expect(chai.name).to.eql('Chai')
  })

  it('Docset.docsetInfo()', async () => {
    const path = join(config.docsetDir, 'Chai.docset')
    const info = await Docset.docsetInfo(path)
    expect(info.CFBundleIdentifier).to.eql('chai')
    expect(info.CFBundleName).to.eql('Chai')
    expect(info.DocSetPlatformFamily).to.eql('chai')
    expect(info.isDashDocset).to.be.true
  })

  it('Docset.find(): 일반 검색', async () => {
    const docset = await Docset.get('Chai')
    const items = await docset.find('equal')
    expect(items).to.have.length.above(0)
    items.forEach(item => {
      expect(/equal/.test(item.name.toLowerCase())).to.be.true
    })
  })

  it('Docset.find(): 퍼지 검색', async () => {
    const docset = await Docset.get('Chai')
    const items = await docset.find('adeequ', {fuzzy: true})
    expect(items).to.have.length.above(0)
    items.forEach(item => {
      expect(/a.*d.*e.*e.*q.*u/.test(item.name.toLowerCase())).to.be.true
    })
  })

  it('Docset.find(): limit: 10', async () => {
    const docset = await Docset.get('Chai')
    const items = await docset.find('a', {fuzzy: true, limit: 10})
    expect(items).to.have.lengthOf(10)
  })

  // it('Docset.download()', async () => {
  //   const mochaFeed = feeds.find(feed => feed.name === 'Mocha.xml')
  //   await Docset.download(mochaFeed)
  //   expect(await exists(join(config.docsetDir, 'Mocha.docset')))
  //   .to.be.true
  // })
})