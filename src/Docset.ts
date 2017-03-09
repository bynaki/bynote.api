/**
 * Docset
 */

import 'isomorphic-fetch'
import * as cheerio from 'cheerio'
import p from 'fourdollar.promisify'
import {v1 as newUuid} from 'uuid'
import {join, extname} from 'path'
import * as request from 'superagent'
import * as targz from 'tar.gz'
import {createWriteStream} from 'fs'
import * as Knex from 'knex'
import * as _ from 'lodash'
import {parse as parsePlist} from 'plist'
import {
  readdir,
  stat,
  ensureDir,
  readFile,
} from './fs.promise'
import {docset as config} from './config'


export interface FeedInfo {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
  _links: {
    self: string
    git: string
    html: string
  }
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
  static async feedList(): Promise<FeedInfo[]> {
    const feeds: any[] = await (await fetch(config.feedUrl)).json()
    return feeds.filter(feed => {
      return (extname(feed.name) === '.xml')
    })
  }

  static async docsetUrls(feedUrl: string): Promise<string[]> {
    const feedXml = await (await fetch(feedUrl)).text()
    const $ = cheerio.load(feedXml)
    const urls: string[] = [] 
    $('url').each((idx, elem) => {
      urls.push(elem.childNodes[0].nodeValue)
    })
    return urls
  }
  
  static async download(feed: FeedInfo) {
    const urls = await Docset.docsetUrls(feed.download_url)
    await ensureDir(config.docsetDir)
    request.get(urls[0])
    .pipe(targz().createWriteStream(config.docsetDir))
  }

  static async docsetList(): Promise<Docset[]> {
    const docsetPaths = (await readdir(config.docsetDir))
      .filter(filename => extname(filename) === '.docset')
      .map(filename => join(config.docsetDir, filename))
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
    const infoXml = await readFile(join(path, config.infoPath))
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
        filename: join(path, config.dbPath)
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