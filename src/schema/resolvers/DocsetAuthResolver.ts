/**
 * DocsetAuthResolver
 */

import Docset from '../../Docset'
import DocsetResolver from './DocsetResolver'
import * as cf from '../../config'
import {
  ErrorWithStatusCode,
} from '../../utils'


export default class DocsetAuthResolver extends DocsetResolver {
  
  constructor() {
    super()
  }


  //
  // Mutation

  async download({feed_url}: {feed_url: string}): Promise<boolean> {
    await Docset.download(feed_url, cf.docset.docsetDir)
    DocsetResolver.resetDocset()
    return true
  }

  async delete({keyword}: {keyword: string}): Promise<boolean> {
    const docsets = await this._docsetList()
    const docset = docsets.find(doc => doc.keyword === keyword)
    if(docset) {
      await docset.delete()
      DocsetResolver.resetDocset()
      return true
    }
    throw new ErrorWithStatusCode(
      `keyword 를 갖는 docset 이 없다. keyword: ${keyword}`, 500)
  }
}