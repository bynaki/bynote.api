/**
 * NoteRenderer
 */

import {Renderer} from 'marked'
import {parse as parseUrl} from 'url'
import {hash} from './utils'
import {
  IHeadline
} from './interface'



export default class NoteRenderer extends Renderer {
  private _heads: IHeadline[] = []
  private _images: Map<string, string>

  private _levelHeads: string[] = []
  private static _pattern = /[^\w]+/g
  private _newHeading = false

  constructor(public uuid: string) {
    super()
  }

  heading(headline: string, level: number): string {
    const uuid = this.uuid
    const hash = headline.toLowerCase().replace(NoteRenderer._pattern, '-')
    for(let i = level; i < 6; i++) {
      this._levelHeads[i] = null
    }
    this._levelHeads[level - 1] = headline
    this._heads.push({
      uuid,
      level: (this._heads.length == 0)? 0 : level,
      hash,
      headline,
      fullHeadline: this._levelHeads.filter((head) => {
        return head
      }).join(' - '),
      content: '',
    })
    this._newHeading = true
    return `
<h${level}>
  <a name="${hash}" class="anchor" href="#${hash}">
    <span class="header-link">#</span>
  </a>
  ${headline}
</h>
`
  }

  paragraph(content: string): string {
    if(this._newHeading) {
      this._heads[this._heads.length - 1].content = content.slice(0, 80)
      this._newHeading = false
    }
    return super.paragraph(content)
  }

  image(href: string, title: string, text: string): string {
    const parsed = parseUrl(href)
    const realHref = (parsed.protocol)? hash(href) : href
    this._images.set(href, realHref)
    return super.image(href, title, text)
  }

  get heads(): IHeadline[] {
    return this._heads
  }

  get images(): Map<string, string> {
    return this._images
  }
}
