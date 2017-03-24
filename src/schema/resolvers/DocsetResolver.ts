/**
 * DocsetResolver
 */

import Docset from '../../Docset'
import {
  DocsetInfoPlist,
  DocsetFeedWithUrl,
  DocsetInfo,
  FindOptionWithScope,
  FindResult,
} from '../../interface'
import * as cf from '../../config'

export default class DocsetResolver {
  constructor() {
  }


  //
  // Query

  async officialFeedUrlList(): Promise<string[]> {
    const feedUrls = await Docset.officialFeedUrlList()
    return feedUrls
  }

  async list(): Promise<DocsetInfo[]> {
    const docsets = await Docset.docsetList(cf.docset.docsetDir)
    return docsets.map(docset => ({
      name: docset.name,
      keyword: docset.keyword,
      scope: docset.scope,
      info: docset.info,
      feed: docset.feed,
    }))
  }

  async find({name, option}: {name: string
    , option?: FindOptionWithScope}): Promise<FindResult[]> {
    const docsets = await Docset.docsetList(cf.docset.docsetDir)
    if(option && option.scope) {
      const doc = docsets.find(doc => option.scope.toLowerCase() === doc.scope)
      if(!doc) {
        throw new Error("socpe에 명시된 keyword에 해당하는 Docset를 찾을 수 없다!")
      }
      return doc.find(name, option)
    }
    const results = await Promise.all(docsets.map(doc => doc.find(name, option)))
    return [].concat(...results)
  }
}