/**
 * DocsetResolver
 */

import Docset from '../../Docset'

export default class DocsetResolver {
  constructor() {
  }


  //
  // Query

  async feedList(): Promise<string[]> {
    const feedInfos = await Docset.feedInfoList()
    return feedInfos.map(feedInfo => {
      return feedInfo.name
    })
  }
}