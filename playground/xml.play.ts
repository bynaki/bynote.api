import 'isomorphic-fetch'
import * as cheerio from 'cheerio'

(async () => {
  const feedXml = await (await fetch(
    'https://raw.githubusercontent.com/Kapeli/feeds/master/CoffeeScript.xml')).text()
  const $ = cheerio.load(feedXml)
  $('url').each((index, elem) => {
    console.log(elem.childNodes[0].nodeValue)
  })
})()