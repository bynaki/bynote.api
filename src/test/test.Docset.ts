/**
 * test Docset
 */

import {expect} from 'chai'
import {
  join,
  extname,
  basename,
  resolve,
} from 'path'
import * as cheerio from 'cheerio'
import {
  exists,
  writeFile,
  ensureDir,
} from '../fs.promise'
import Docset, {
} from '../Docset'
import * as cf from '../config'
import {
  readJson,
} from '../fs.promise'
import {
  DocsetFeedWithUrl,
} from '../interface'
cf.docset.docsetDir = resolve(__dirname, '../../docsets.test')


describe('test Docset ----------', function() {
  this.timeout(30000)
  before(async () => {
    feeds = await Docset.officialFeedUrlList()
  })
  let feeds: string[];

  it('Docset.officialFeedUrlList()', async () => {
    expect(feeds).to.have.length.above(0)
    feeds.forEach(feed => {
      expect(extname(feed)).to.eql('.xml')
    })
  })  

  it('Docset.feedXml(): remote', async () => {
    const feedUrl = feeds.find(feed => (basename(feed) === 'Chai.xml'))
    const feed = await Docset.feedXml(feedUrl)
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

  it('Docset.feedJson(): local', async () => {
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

  it('Docset.feedJson(): remote', async () => {
    const feed = await Docset.feedJson('https://raw.githubusercontent.com/Kapeli/feeds/master/CoffeeScript.xml')
    expect(feed.urls[0]).to.equal('http://sanfrancisco.kapeli.com/feeds/CoffeeScript.tgz')
  })

  // it('Docset.download()', async () => {
  //   const feedUrl = feeds.find(feed => basename(feed) === 'Chai.xml')
  //   await Docset.download(feedUrl, cf.docset.docsetDir)
  //   expect(await exists(join(cf.docset.docsetDir, 'Chai.docset')))
  //   .to.be.true
  // })

  // it('Docset.download()', async () => {
  //   const feedUrl = 'https://raw.githubusercontent.com/Kapeli/feeds/master/CoffeeScript.xml'
  //   await Docset.download(feedUrl, cf.docset.docsetDir)
  //   expect(await exists(join(cf.docset.docsetDir, 'CoffeeScript.docset')))
  //   .to.be.true
  // })

  it('Docset.download()', async () => {
    const feedUrl = feeds.find(feed => basename(feed) === 'Gulp.xml')
    await Docset.download(feedUrl, cf.docset.docsetDir)
    expect(await exists(join(cf.docset.docsetDir, 'Gulp.docset')))
    .to.be.true
  })

  it('Docset#delete()', async () => {
    await (await Docset.docsetList(cf.docset.docsetDir))
    .find(doc => doc.name === 'Gulp')
    .delete()
    expect(await exists(join(cf.docset.docsetDir, 'Gulp.docset')))
    .to.be.false
    expect((await Docset.docsetList(cf.docset.docsetDir))
    .find(doc => doc.keyword === 'gulp')).to.be.undefined
  })

  it('feed.json', async () => {
    const feedPath = join(cf.docset.docsetDir, 'Chai.docset', 'feed.json')
    expect(await exists(feedPath)).to.be.true
    const feed: DocsetFeedWithUrl = await readJson(feedPath)
    expect(feed).to.have.property('feed_url')
  })
  
  it('Docset.docsetList()', async () => {
    const docsets = await Docset.docsetList(cf.docset.docsetDir)
    expect(docsets).to.have.length.above(0)
    const chai = docsets.find(docset => {
      return docset.path === join(cf.docset.docsetDir, 'Chai.docset')
    })
    expect(chai).to.be.ok
    expect(chai.name).to.eql('Chai')
  })

  it('Docset.find(): 일반 검색', async () => {
    const docset = (await Docset.docsetList(cf.docset.docsetDir))
      .find(docset => docset.name === 'Chai')
    const items = await docset.find('equal')
    expect(items).to.have.length.above(0)
    items.forEach(item => {
      expect(/equal/.test(item.name.toLowerCase())).to.be.true
    })
  })

  it('Docset.find(): 퍼지 검색', async () => {
    const docset = (await Docset.docsetList(cf.docset.docsetDir))
      .find(docset => docset.name === 'Chai')
    const items = await docset.find('adeequ', {fuzzy: true})
    expect(items).to.have.length.above(0)
    items.forEach(item => {
      expect(/a.*d.*e.*e.*q.*u/.test(item.name.toLowerCase())).to.be.true
    })
  })

  it('Docset.find(): limit: 10', async () => {
    const docset = (await Docset.docsetList(cf.docset.docsetDir))
      .find(docset => docset.name === 'Chai')
    const items = await docset.find('a', {fuzzy: true, limit: 10})
    expect(items).to.have.lengthOf(10)
  })

  it('Docset.find(): Python 2', async () => {
    const docset = (await Docset.docsetList(cf.docset.docsetDir))
      .find(docset => docset.name === 'Python 2')
    const items = await docset.find('edit')
    expect(items).to.have.length.above(0)
    items.forEach(item => {
      expect(/edit/.test(item.name.toLowerCase())).to.be.true
    })
  })

  // function findDocset(docsetList: Docset[], name: string): Docset {
  //   return docsetList.find(doc => doc.name === name) 
  // }
})