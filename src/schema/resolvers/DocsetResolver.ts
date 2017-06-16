/**
 * DocsetResolver
 */

import * as _ from 'lodash'
import Docset from '../../Docset'
import {
  DocsetInfoPlist,
  DocsetFeedWithUrl,
  ExtendedFindOption,
  FindResult,
  ExtendedFindResult,
  DocsetScope,
} from '../../interface'
import * as cf from '../../config'
import {
  ErrorWithStatusCode,
} from '../../utils'


export default class DocsetResolver {
  static resetDocset() {
    DocsetResolver._officialDocsets = null
  }
  private static _officialDocsets: Docset[] = null


  constructor() {
  }

  //
  // Query

  async officialFeedUrlList(): Promise<string[]> {
    const feedUrls = await Docset.officialFeedUrlList()
    return feedUrls
  }

  async list({scope}: {scope: string}): Promise<Docset[]> {
    return await this._docsetList(scope)
    // return (await this._docsetList(scope)).map(docset => ({
    //   name: docset.name,
    //   keyword: docset.keyword,
    //   scope: docset.scope,
    //   info: docset.info,
    //   feed: docset.feed,
    // }))
  }

  async find({name, option}: {name: string
    , option?: ExtendedFindOption}): Promise<ExtendedFindResult[]> {
    const docsets = await this._docsetList(option && option.scope)
    if(option && option.keyword) {
      const doc = docsets.find(doc => option.keyword.toLowerCase() === doc.keyword)
      if(!doc) {
        throw new Error("keyword에 해당하는 Docset를 찾을 수 없다!")
      }
      return (await doc.find(name, option))
        .map(result => this._toExtendedFindResult(result, doc.keyword, doc.scope))
    }
    const results = await Promise.all(
      docsets.map(async doc => {
        return (await doc.find(name, option))
          .map(result => this._toExtendedFindResult(result, doc.keyword, doc.scope))
      })
    )
    return [].concat(...results)
  }


  //
  // Mutation

  async download({feed_url}: {feed_url: string}): Promise<boolean> {
    // throw new Error('must be authenticate!!')
    throw new ErrorWithStatusCode('must be authenticate!!', 401)
  }


  private async _docsetList(scope: string = null): Promise<Docset[]> {
    // Docset 가져오기 && scope 작성하기
    if(!DocsetResolver._officialDocsets) {
      DocsetResolver._officialDocsets = await Docset.docsetList(cf.docset.docsetDir)
      DocsetResolver._officialDocsets
        .forEach(doc => doc.scope = DocsetScope.OfficialDocset)
    }
    // Docset 한대 모으기
    let allDocsets = [...DocsetResolver._officialDocsets]
    // keyword가 없는 Docset 확인하고 없으면 keyword 작성하기
    if(allDocsets.find(doc => !doc.keyword)) {
      allDocsets = this._addKeyword(allDocsets)
    }
    // 나머지 작업
    if(scope) {
      return allDocsets.filter(doc => doc.scope === scope)
    } else {
      return allDocsets
    }
  }

  private  _addKeyword(docsets: Docset[]): Docset[] {
    docsets
    .map(doc => {
      if(doc.info.DashDocSetKeyword) {
        return doc.info.DashDocSetKeyword.toLowerCase()
      } else {
        return doc.info.DocSetPlatformFamily.toLowerCase()
      }
    })
    .forEach((key, idx, keys) => {
      if(keys.indexOf(key, keys.indexOf(key) + 1) !== -1) {
        docsets[idx].keyword = docsets[idx].info
          .CFBundleName.toLowerCase().replace(/[^\w]+/g, '')
      } else {
        docsets[idx].keyword = key
      }
    })
    return docsets
  }

  private _toExtendedFindResult(result: FindResult, keyword: string, scope: string): ExtendedFindResult {
    const r: ExtendedFindResult = _.clone(result) as ExtendedFindResult
    r.keyword = keyword
    r.scope = scope
    r.path = `${cf.url.host}/docsets/${scope.toLowerCase()}/${keyword}/${result.path}`
    return r
  }
}