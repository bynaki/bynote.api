/**
 * DocsetAuthResolver
 */

import Docset from '../../Docset'
import DocsetResolver from './DocsetResolver'
import * as cf from '../../config'


export default class DocsetAuthResolver extends DocsetResolver {
  
  constructor() {
    super()
  }


  //
  // Mutation

  async download({feed_url}: {feed_url: string}): Promise<boolean> {
    await Docset.download(feed_url, cf.docset.docsetDir)
    return true
  }
}