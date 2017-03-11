/**
 * test Docset
 */

import {expect} from 'chai'
import {join, extname} from 'path'
import * as cheerio from 'cheerio'
import {
  exists,
  writeFile,
  ensureDir,
  remove,
} from '../fs.promise'
import Docset, {
  FeedInfo,
} from '../Docset'
import {docset as config} from '../config'


describe('test Docset ----------', function() {
  this.timeout(20000)
  before(async () => {
    feeds = await Docset.feedInfoList()
  })
  let feeds: FeedInfo[];

  it('Docset.feedInfoList()', async () => {
    expect(feeds).to.have.length.above(0)
    feeds.forEach(feed => {
      expect(extname(feed.name)).to.eql('.xml')
    })
  })  

  it('Docset.feedXml(): remote', async () => {
    const feedInfo = feeds.find(feed => (feed.name === 'Chai.xml'))
    const feed = await Docset.feedXml(feedInfo.download_url)
    const $ = cheerio.load(feed)
    const url = $('entry > url')[0].childNodes[0].nodeValue
    expect(url).to.be.ok
  })

  it('Docset.feedXml(): local', async () => {
    const feed = await Docset.feedXml(join(__dirname, 'Chai.xml'))
    const $ = cheerio.load(feed)
    const url = $('entry > url')[0].childNodes[0].nodeValue
    expect(url).to.be.ok
  })

  it('Docset.feedJson()', async () => {
    const feed = await Docset.feedJson(join(__dirname, 'Chai.xml'))
    expect(feed).to.deep.equal({
      version: '4.0.0',
      ios_version: '1',
      urls: 
      [ 'http://sanfrancisco.kapeli.com/feeds/Chai.tgz',
        'http://london.kapeli.com/feeds/Chai.tgz',
        'http://newyork.kapeli.com/feeds/Chai.tgz',
        'http://tokyo.kapeli.com/feeds/Chai.tgz',
        'http://frankfurt.kapeli.com/feeds/Chai.tgz',
        'http://sydney.kapeli.com/feeds/Chai.tgz',
        'http://singapore.kapeli.com/feeds/Chai.tgz' ],
      other_versions: 
      [ '4.0.0',
        '3.5.0',
        '2.3.0',
        '2.2.0',
        '2.1.2',
        '2.1.1',
        '2.1.0',
        '2.0.0',
        '1.10.0',
        '1.9.2',
        '1.9.1',
        '1.9.0',
        '1.8.1' ]
    })
  })
  
  it('Docset.docsetList()', async () => {
    const docsets = await Docset.docsetList(config.docsetDir)
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
  //   await Docset.download(mochaFeed, config.docsetDir)
  //   expect(await exists(join(config.docsetDir, 'Mocha.docset')))
  //   .to.be.true
  // })
})