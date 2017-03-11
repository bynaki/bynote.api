import 'isomorphic-fetch'
import * as cheerio from 'cheerio'

(async () => {
  const feedXml = await (await fetch(
    'https://raw.githubusercontent.com/Kapeli/feeds/master/Chai.xml')).text()
  const $ = cheerio.load(feedXml)
  const json = {
    version: $('entry > version').html(),
    ios_version: $('entry > ios_version').html(),
    urls: _map($('entry > url'), (elem, idx) => elem.childNodes[0].nodeValue),
    other_versions: _map($('other-versions > version > name')
      , (elem, idx) => elem.childNodes[0].nodeValue),
  }
  console.log(json)
})()

function _map($: Cheerio, callbackfn: (value: CheerioElement, index: number) => string): string[] {
  const map: string[] = []
  $.each((idx, elem) => {
    map.push(callbackfn(elem, idx))
  })
  return map
}