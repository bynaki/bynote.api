/**
 * Docset
 */

import {Parser as XMLParser} from 'xml2js'
import 'isomorphic-fetch'
import p from 'fourdollar.promisify'
import {v1 as newUuid} from 'uuid'
import {join, extname} from 'path'
import * as request from 'superagent'
import * as targz from 'tar.gz'
import {createWriteStream} from 'fs'
import * as Knex from 'knex'
import * as _ from 'lodash'
import {readdir, stat} from './fs.promise'
import {docset as config} from './config'
import {ensureDir} from './fs.promise'


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
  ignoreCase?: boolean
  limit?: 50
}

export interface DocItem {
  id: string
  name: string
  type: string
  path: string
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
    const parser = new XMLParser()
    const feedJson = await p<(str: string) => Promise<any>>(parser.parseString)(feedXml)
    return feedJson.entry.url
  }
  
  static async download(feed: FeedInfo) {
    const urls = await Docset.docsetUrls(feed.download_url)
    await ensureDir(config.docsetDir)
    request.get(urls[0])
    .pipe(targz().createWriteStream(config.docsetDir))
  }

  static async docsetList(): Promise<Docset[]> {
    const docsetPaths = (await readdir(config.docsetDir)).filter(path => {
      return extname(path) === '.docset'
    })
    docsetPaths.forEach(path => {
      if(Docset._docsetList.findIndex(docset => docset.path === path) === -1) {
        Docset._docsetList.push(new Docset(path))
      }
    })
    return Docset._docsetList
  }
  private static _docsetList: Docset[] = []

  private _path: string;
  private _knex: Knex;

  constructor(path: string) {
    this._path = path
    this._knex = Knex({
      client: 'sqlite3',
      connection: {
        filename: join(path, config.dbPath)
      }
    })
  }

  async find(name: string, option: FindOption = {}): Promise<DocItem[]> {
    const vOption = _.assign<FindOption, FindOption>({
      fuzzy: false, ignoreCase: true, limit: 50
    }, option)
    if(vOption.fuzzy) {
      name = name.split('').join('%')
    }
    if(vOption.ignoreCase) {
      return this.knex('searchIndex')
        .where(this.knex.raw(`lower("name") like '%${name.toLowerCase()}%'`))
        .limit(vOption.limit)
    } else {
      return this.knex('searchIndex')
        .where('name', 'like', `%${name}%`)
        .limit(vOption.limit)
    }
  }

  get path(): string {
    return this._path
  }

  get knex(): Knex {
    return this._knex
  }
}