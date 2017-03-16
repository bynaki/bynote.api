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
} from 'path'
import * as request from 'superagent'
import * as targz from 'tar.gz'
import {
  createWriteStream,
  createReadStream,
} from 'fs'
import * as Knex from 'knex'
import * as _ from 'lodash'
import {parse as parsePlist} from 'plist'
import {parse as parseUrl} from 'url'
import {
  readdir,
  stat,
  ensureDir,
  readFile,
  writeJson,
  move, 
} from './fs.promise'
import * as cf from './config'


// export interface FeedInfo {
//   name: string
//   path: string
//   sha: string
//   size: number
//   url: string
//   html_url: string
//   git_url: string
//   download_url: string
//   type: string
//   _links: {
//     self: string
//     git: string
//     html: string
//   }
// }

export interface DocsetFeed {
  version: string
  ios_version: string
  urls: string[]
  other_versions: string[]
}

export interface DocsetFeedWithUrl extends DocsetFeed {
  feed_url: string
}

export interface FindOption {
  fuzzy?: boolean
  limit?: number
}

export interface DocItem {
  id: string
  name: string
  type: string
  path: string
}

export interface DocsetInfo {
  CFBundleIdentifier: string
  CFBundleName: string
  DocSetPlatformFamily: string
  isDashDocset: boolean
}


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
    const feeds: any[] = await (await fetch(cf.docset.feedUrl)).json()
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
  
  static async download(feedUrl: string, docsetDir: string) {
    const feedJson = await Docset.feedJson(feedUrl)
    const docPath = join(docsetDir
      , basename(feedJson.urls[0], extname(feedJson.urls[0])) + '.docset')
    await ensureDir(docPath)
    await writeJson(join(docPath, 'feed.json')
      , _.assign({feed_url: feedUrl}, feedJson))
    await request.get(feedJson.urls[0]).pipe(targz().createWriteStream(docsetDir))
  }

  static async docsetList(docsetDir: string): Promise<Docset[]> {
    const docsetPaths = (await readdir(docsetDir))
      .filter(filename => extname(filename) === '.docset')
      .map(filename => join(docsetDir, filename))
    const oldDocsets = Docset._docsetList
      .filter(docset => _.includes(docsetPaths, docset.path))
    const promises = docsetPaths
      .filter(path => !Docset._docsetList.find(docset => docset.path === path))
      .map(async path => new Docset(path, await Docset.docsetInfo(path)))
    const newDocsets = await Promise.all(promises)
    Docset._docsetList = [...oldDocsets, ...newDocsets]
    return Docset._docsetList
  }
  private static _docsetList: Docset[] = []

  static async get(name: string) {
    return (await Docset._docsetList).find(docset => docset.name === name)
  }

  static async docsetInfo(path: string): Promise<DocsetInfo> {
    const infoXml = await readFile(join(path, cf.docset.infoPath))
    return parsePlist(infoXml.toString())
  }

  private _path: string;
  private _info: DocsetInfo;
  private _knex: Knex;

  constructor(path: string, info: DocsetInfo) {
    this._path = path
    this._info = info
    this._knex = Knex({
      client: 'sqlite3',
      connection: {
        filename: join(path, cf.docset.dbPath)
      }
    })
  }

  async find(name: string, option: FindOption = {}): Promise<DocItem[]> {
    const vOption = _.assign<FindOption, FindOption>({
      fuzzy: false, limit: 50}, option)
    if(vOption.fuzzy) {
      name = name.split('').join('%')
    }
    return this.knex('searchIndex')
      .where(this.knex.raw(`lower("name") like '%${name.toLowerCase()}%'`))
      .limit(vOption.limit)
  }

  get path(): string {
    return this._path
  }

  get info(): DocsetInfo {
    return this._info
  }

  get name(): string {
    return this.info.CFBundleName
  }

  get knex(): Knex {
    return this._knex
  }
}