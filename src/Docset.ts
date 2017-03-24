/**
 * Docset
 */

import 'isomorphic-fetch'
import * as cheerio from 'cheerio'
import p from 'fourdollar.promisify'
import {v1 as newUuid} from 'uuid'
import {
  join,
  extname,
  basename,
  sep,
} from 'path'
import * as request from 'superagent'
import * as targz from 'tar.gz'
import {
  createWriteStream,
  createReadStream,
} from 'fs'
import * as Knex from 'knex'
import * as _ from 'lodash'
import * as plist from 'plist'
import {
  parse as parseUrl,
} from 'url'
import * as decompress from 'decompress'
import * as decompressTargz from 'decompress-targz'
import {
  readdir,
  stat,
  ensureDir,
  readFile,
  writeJson,
  readJson,
  move, 
} from './fs.promise'
import * as cf from './config'
import {
  DocsetFeed,
  DocsetFeedWithUrl,
  DocsetInfoPlist,
  FindOption,
  FindResult,
  DocItem,
} from './interface'


export default class Docset {
  // {
  //   "name": "CoffeeScript.xml",
  //   "path": "CoffeeScript.xml",
  //   "sha": "d8dee34a29b04fcc74761fd5f2a84fa118bf44d5",
  //   "size": 1365,
  //   "url": "https://api.github.com/repos/Kapeli/feeds/contents/CoffeeScript.xml?ref=master",
  //   "html_url": "https://github.com/Kapeli/feeds/blob/master/CoffeeScript.xml",
  //   "git_url": "https://api.github.com/repos/Kapeli/feeds/git/blobs/d8dee34a29b04fcc74761fd5f2a84fa118bf44d5",
  //   "download_url": "https://raw.githubusercontent.com/Kapeli/feeds/master/CoffeeScript.xml",
  //   "type": "file",
  //   "_links": {
  //     "self": "https://api.github.com/repos/Kapeli/feeds/contents/CoffeeScript.xml?ref=master",
  //     "git": "https://api.github.com/repos/Kapeli/feeds/git/blobs/d8dee34a29b04fcc74761fd5f2a84fa118bf44d5",
  //     "html": "https://github.com/Kapeli/feeds/blob/master/CoffeeScript.xml"
  //   }
  // }
  static async officialFeedUrlList(): Promise<string[]> {
    const feeds: any[] = await (await fetch(cf.docset.officialFeedUrl)).json()
    return feeds.filter(feed => (extname(feed.name) === '.xml'))
      .map(feed => feed.download_url)
  }

  static async feedXml(path: string): Promise<string> {
    if(parseUrl(path).protocol === 'http:' 
      || parseUrl(path).protocol === 'https:') {   // remote
      return (await fetch(path)).text()
    } else {                                      // local
      return (await readFile(path)).toString()
    }
  }

  // <entry>
  //   <version>1.63.0</version>
  //   <ios_version>1</ios_version>
  //   <url>http://sanfrancisco.kapeli.com/feeds/Boost.tgz</url>
  //   <url>http://london.kapeli.com/feeds/Boost.tgz</url>
  //   <url>http://newyork.kapeli.com/feeds/Boost.tgz</url>
  //   <url>http://tokyo.kapeli.com/feeds/Boost.tgz</url>
  //   <url>http://frankfurt.kapeli.com/feeds/Boost.tgz</url>
  //   <url>http://sydney.kapeli.com/feeds/Boost.tgz</url>
  //   <url>http://singapore.kapeli.com/feeds/Boost.tgz</url>
  //   <other-versions>
  //     <version><name>1.63.0</name></version>
  //     <version><name>1.62.0</name></version>
  //     <version><name>1.61.0</name></version>
  //     <version><name>1.60.0</name></version>
  //     <version><name>1.59.0</name></version>
  //     <version><name>1.58.0</name></version>
  //     <version><name>1.57.0</name></version>
  //   </other-versions>
  // </entry>
  static async feedJson(path: string): Promise<DocsetFeed> {
    const feedXml = await Docset.feedXml(path)
    const $ = cheerio.load(feedXml)
    return {
      version: $('entry > version').html(),
      ios_version: $('entry > ios_version').html(),
      urls: Docset._elemMap($('entry > url'), (elem, idx) => elem.childNodes[0].nodeValue),
      other_versions: Docset._elemMap($('other-versions > version > name')
        , (elem, idx) => elem.childNodes[0].nodeValue),
    }
  }

  private static _elemMap($: Cheerio, callbackfn: (value: CheerioElement, index: number) => string): string[] {
    const map: string[] = []
    $.each((idx, elem) => {
      map.push(callbackfn(elem, idx))
    })
    return map
  }

  static async download(feedUrl: string, docsetDir: string): Promise<void> {
    const feedJson = await Docset.feedJson(feedUrl)
    const tgzPath = join(docsetDir, basename(feedJson.urls[0]))
    await ensureDir(docsetDir)
    const writer = request.get(feedJson.urls[0]).pipe(createWriteStream(tgzPath))
    await p(writer.on, writer)('close')
    const files = await decompress(tgzPath, docsetDir)
    return writeJson(join(docsetDir, basename(files[0].path), 'feed.json')
      , _.assign({feed_url: feedUrl}, feedJson))
  }

  static async docsetList(docsetDir: string): Promise<Docset[]> {
    const promises = (await readdir(docsetDir))
      .filter(filename => extname(filename) === '.docset')
      .map(filename => join(docsetDir, filename))
      .map(async path => {
        return new Docset(path, await Docset._docsetInfoPlist(path)
          , await Docset._docsetFeed(path), await Docset._docsetKnex(path))
      })
    const docsets = await Promise.all(promises)
    docsets.map(doc => {
      if(doc.info.DashDocSetKeyword) {
        return doc.info.DashDocSetKeyword.toLowerCase()
      } else {
        return doc.info.DocSetPlatformFamily.toLowerCase()
      }
    })
    .forEach((key, idx, keys) => {
      if(keys.indexOf(key, keys.indexOf(key) + 1) !== -1) {
        docsets[idx]._key = docsets[idx].info
          .CFBundleName.toLowerCase().replace(/[^\w]+/g, '')
      } else {
        docsets[idx]._key = key
      }
    })
    return docsets
  }

  private static async _docsetInfoPlist(path: string): Promise<DocsetInfoPlist> {
    const infoXml = await readFile(join(path, cf.docset.infoPath))
    return plist.parse(infoXml.toString())
  }

  private static async _docsetFeed(path: string): Promise<DocsetFeedWithUrl> {
    return readJson(join(path, cf.docset.feedPath))
  }

  private static async _docsetKnex(path: string): Promise<Knex> {
    const knex = Knex({
      client: 'sqlite3',
      connection: {
        filename: join(path, cf.docset.dbPath)
      },
    })
    if(!(await knex.schema.hasTable('searchIndex'))) {
      const tokensXml = await readFile(join(path, cf.docset.tokensPath))
      const json = Docset._toJsonTokensXml(tokensXml.toString())
      await knex.schema.createTable('searchIndex', table => {
        table.increments('id')
        table.text('name')
        table.text('type')
        table.text('path')
      })
      const inserts = json.map(item => knex('searchIndex').insert(item))
      await Promise.all(inserts)
    }
    return knex
  }

  private static _toJsonTokensXml(tokensXml: string): DocItem[] {
    const $ = cheerio.load(tokensXml, {xmlMode: true})
    const json: DocItem[] = []
    $('Token').each((idx, elem) => {
      const item: DocItem = {
        name: $(elem).find('Name').text(),
        type: $(elem).find('Type').text(),
        path: $(elem).find('Path').text(),
      }
      if($(elem).find('Anchor').text() !== '') {
        item.path += '#' + $(elem).find('Anchor').text().replace(/\./g, '%2E')
      }
      json.push(item)
    })
    return json
  }

  private _path: string;
  private _info: DocsetInfoPlist;
  private _feed: DocsetFeedWithUrl;
  private _knex: Knex;
  private _key: string;

  constructor(path: string, info: DocsetInfoPlist
    , feed: DocsetFeedWithUrl, knex: Knex) {
    this._path = path
    this._info = info
    this._feed = feed
    this._knex = knex
  }

  async find(name: string, option: FindOption = {}): Promise<FindResult[]> {
    const vOption = _.assign<FindOption, FindOption>({
      fuzzy: false, limit: 50}, option)
    if(vOption.fuzzy) {
      name = name.split('').join('%')
    }
    return this.knex('searchIndex')
      .where(this.knex.raw(`lower("name") like '%${name.toLowerCase()}%'`))
      .limit(vOption.limit)
      .map<FindResult, FindResult>(result => {
        result.scope = this.scope
        return result
      })
  }

  get path(): string {
    return this._path
  }

  get name(): string {
    return this.info.CFBundleName
  }

  get keyword(): string {
    return this._key
  }

  get scope(): string {
    return this.keyword
  }

  get info(): DocsetInfoPlist {
    return this._info
  }

  get feed(): DocsetFeedWithUrl {
    return this._feed
  }

  get knex(): Knex {
    return this._knex
  }
}